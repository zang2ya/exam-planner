"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarRange, CheckCircle2, Clock3, ListTodo, NotebookPen, Target } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { buildDashboardSummary } from "@/lib/dashboard";
import { upsertDiaryLocally } from "@/lib/diary";
import type { BootstrapPayload, DailyDiary, Exam, Plan, StudyLog, Todo } from "@/lib/types";
import { formatMinutes, getTodayInSeoul, safeDateLabel } from "@/lib/utils";

type Props = {
  initialData: BootstrapPayload;
};

const today = getTodayInSeoul();

const emptyPlan = { date: today, subject: "", plannedMinutes: 120, startTime: "", endTime: "", note: "" };
const emptyLog = { date: today, subject: "", actualMinutes: 90, startTime: "", endTime: "", review: "", planId: "" };
const emptyTodo = { title: "", status: "todo", priority: "medium", createdAt: today, dueDate: today, subject: "" };
const emptyExam = { name: "", examDate: today, registrationStart: "", registrationEnd: "", memo: "", importance: "important" };

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed.");
  }

  return response.json();
}

function groupExamsByMonth(exams: Exam[]) {
  return exams.reduce<Record<string, Exam[]>>((acc, exam) => {
    const key = format(parseISO(exam.examDate), "yyyy MMM");
    acc[key] = [...(acc[key] ?? []), exam];
    return acc;
  }, {});
}

export function StudyManager({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(today);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [logForm, setLogForm] = useState(emptyLog);
  const [todoForm, setTodoForm] = useState(emptyTodo);
  const [examForm, setExamForm] = useState(emptyExam);
  const [diaryForm, setDiaryForm] = useState<Partial<DailyDiary>>({ date: today, title: "", content: "", mood: "steady" });
  const [subjectInput, setSubjectInput] = useState(data.settings.subjects.join(", "));
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const currentDiary = data.diaryEntries.find((entry) => entry.date === selectedDate);
    setDiaryForm(currentDiary ?? { date: selectedDate, title: "", content: "", mood: "steady" });
    setPlanForm((current) => ({ ...current, date: selectedDate }));
    setLogForm((current) => ({ ...current, date: selectedDate }));
  }, [data.diaryEntries, selectedDate]);

  const summary = useMemo(() => buildDashboardSummary(data, selectedDate), [data, selectedDate]);
  const dayPlans = useMemo(() => data.plans.filter((item) => item.date === selectedDate), [data.plans, selectedDate]);
  const dayLogs = useMemo(() => data.logs.filter((item) => item.date === selectedDate), [data.logs, selectedDate]);
  const monthGroups = useMemo(() => groupExamsByMonth(data.exams), [data.exams]);

  function withNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function removeItem<T extends { id: string }>(items: T[], id: string) {
    return items.filter((item) => item.id !== id);
  }

  function upsertItem<T extends { id: string }>(items: T[], value: T) {
    const index = items.findIndex((item) => item.id === value.id);
    if (index === -1) {
      return [value, ...items];
    }
    const clone = [...items];
    clone[index] = value;
    return clone;
  }

  function submitPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const created = await request<Plan>("/api/plans", "POST", planForm);
      setData((current) => ({ ...current, plans: upsertItem(current.plans, created) }));
      setPlanForm({ ...emptyPlan, date: selectedDate });
      withNotice("Plan saved.");
    });
  }

  function submitLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const created = await request<StudyLog>("/api/logs", "POST", logForm);
      setData((current) => ({ ...current, logs: upsertItem(current.logs, created) }));
      setLogForm({ ...emptyLog, date: selectedDate });
      withNotice("Study log saved.");
    });
  }

  function submitTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const created = await request<Todo>("/api/todos", "POST", todoForm);
      setData((current) => ({ ...current, todos: upsertItem(current.todos, created) }));
      setTodoForm({ ...emptyTodo, createdAt: today, dueDate: today });
      withNotice("Todo added.");
    });
  }

  function submitExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const created = await request<Exam>("/api/exams", "POST", examForm);
      setData((current) => ({ ...current, exams: upsertItem(current.exams, created).sort((a, b) => a.examDate.localeCompare(b.examDate)) }));
      setExamForm(emptyExam);
      withNotice("Exam saved.");
    });
  }

  function submitDiary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const created = await request<DailyDiary>("/api/diary", "POST", diaryForm);
      setData((current) => ({
        ...current,
        diaryEntries: upsertDiaryLocally(current.diaryEntries, created),
      }));
      withNotice("Diary saved.");
    });
  }

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const subjects = subjectInput.split(",").map((item) => item.trim()).filter(Boolean);
      const payload = { ...data.settings, subjects };
      const saved = await request<BootstrapPayload["settings"]>("/api/settings", "PATCH", payload);
      setData((current) => ({ ...current, settings: saved }));
      withNotice("Settings saved.");
    });
  }

  async function deleteResource(path: string, id: string, key: keyof BootstrapPayload) {
    startTransition(async () => {
      await request(`${path}/${id}`, "DELETE");
      setData((current) => ({
        ...current,
        [key]: removeItem(current[key] as Array<{ id: string }>, id),
      }));
      withNotice("Deleted.");
    });
  }

  async function cycleTodo(todo: Todo) {
    const nextStatus = todo.status === "todo" ? "doing" : todo.status === "doing" ? "done" : "todo";
    startTransition(async () => {
      const updated = await request<Todo>(`/api/todos/${todo.id}`, "PATCH", { ...todo, status: nextStatus });
      setData((current) => ({ ...current, todos: upsertItem(current.todos, updated) }));
      withNotice("Todo status changed.");
    });
  }

  return (
    <main className="pageShell">
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Exam Planner</p>
          <h1>Plan, execute, and review your study day in one flow.</h1>
          <p className="heroCopy">
            This app syncs your study schedule directly to Google Sheets. Manage daily plans, actual study time,
            todos, exam dates, and a one-note diary from the same dashboard.
          </p>
        </div>
        <div className="dateCard">
          <span>Selected date</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <p>You are viewing the full study flow for {safeDateLabel(selectedDate)}.</p>
          {notice ? <strong>{notice}</strong> : null}
        </div>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <Clock3 size={20} />
          <span>Planned today</span>
          <strong>{formatMinutes(summary.todayPlanMinutes)}</strong>
        </article>
        <article className="statCard">
          <Target size={20} />
          <span>Actual today</span>
          <strong>{formatMinutes(summary.todayActualMinutes)}</strong>
        </article>
        <article className="statCard">
          <CheckCircle2 size={20} />
          <span>Completion</span>
          <strong>{summary.completionRate}%</strong>
        </article>
        <article className="statCard">
          <ListTodo size={20} />
          <span>Todos left</span>
          <strong>{summary.remainingTodos}</strong>
        </article>
        <article className="statCard">
          <CalendarRange size={20} />
          <span>Nearest exam</span>
          <strong>{summary.nearestExam ? summary.nearestExam.name : "None"}</strong>
          <small>
            {summary.nearestExam
              ? `D-${differenceInCalendarDays(parseISO(summary.nearestExam.examDate), parseISO(selectedDate))}`
              : "Manual entries"}
          </small>
        </article>
        <article className="statCard">
          <NotebookPen size={20} />
          <span>Diary today</span>
          <strong>{summary.hasDiaryToday ? "Done" : "Missing"}</strong>
        </article>
      </section>

      <section className="contentGrid">
        <div className="column">
          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Daily Planner</p>
                <h2>Daily study plan</h2>
              </div>
              <strong>{formatMinutes(dayPlans.reduce((sum, item) => sum + item.plannedMinutes, 0))}</strong>
            </div>
            <form className="formGrid" onSubmit={submitPlan}>
              <input type="date" value={planForm.date} onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })} />
              <input placeholder="Subject" value={planForm.subject} onChange={(e) => setPlanForm({ ...planForm, subject: e.target.value })} list="subject-list" />
              <input type="number" min="0" placeholder="Planned minutes" value={planForm.plannedMinutes} onChange={(e) => setPlanForm({ ...planForm, plannedMinutes: Number(e.target.value) })} />
              <input type="time" value={planForm.startTime} onChange={(e) => setPlanForm({ ...planForm, startTime: e.target.value })} />
              <input type="time" value={planForm.endTime} onChange={(e) => setPlanForm({ ...planForm, endTime: e.target.value })} />
              <textarea placeholder="Memo" value={planForm.note} onChange={(e) => setPlanForm({ ...planForm, note: e.target.value })} />
              <button className="primaryButton" disabled={pending}>Save plan</button>
            </form>
            <div className="listStack">
              {dayPlans.map((plan) => (
                <div className="listItem" key={plan.id}>
                  <div>
                    <strong>{plan.subject}</strong>
                    <p>{formatMinutes(plan.plannedMinutes)} | {plan.startTime || "--:--"} to {plan.endTime || "--:--"}</p>
                    {plan.note ? <small>{plan.note}</small> : null}
                  </div>
                  <button className="ghostButton" type="button" onClick={() => deleteResource("/api/plans", plan.id, "plans")}>Delete</button>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Study Log</p>
                <h2>Actual study time</h2>
              </div>
              <strong>{formatMinutes(dayLogs.reduce((sum, item) => sum + item.actualMinutes, 0))}</strong>
            </div>
            <form className="formGrid" onSubmit={submitLog}>
              <input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
              <input placeholder="Subject" value={logForm.subject} onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })} list="subject-list" />
              <input type="number" min="0" placeholder="Actual minutes" value={logForm.actualMinutes} onChange={(e) => setLogForm({ ...logForm, actualMinutes: Number(e.target.value) })} />
              <input type="time" value={logForm.startTime} onChange={(e) => setLogForm({ ...logForm, startTime: e.target.value })} />
              <input type="time" value={logForm.endTime} onChange={(e) => setLogForm({ ...logForm, endTime: e.target.value })} />
              <select value={logForm.planId} onChange={(e) => setLogForm({ ...logForm, planId: e.target.value })}>
                <option value="">No linked plan</option>
                {dayPlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.subject}</option>)}
              </select>
              <textarea placeholder="Review note" value={logForm.review} onChange={(e) => setLogForm({ ...logForm, review: e.target.value })} />
              <button className="primaryButton" disabled={pending}>Save log</button>
            </form>
            <div className="listStack">
              {dayLogs.map((log) => (
                <div className="listItem" key={log.id}>
                  <div>
                    <strong>{log.subject}</strong>
                    <p>{formatMinutes(log.actualMinutes)} | {log.startTime || "--:--"} to {log.endTime || "--:--"}</p>
                    {log.review ? <small>{log.review}</small> : null}
                  </div>
                  <button className="ghostButton" type="button" onClick={() => deleteResource("/api/logs", log.id, "logs")}>Delete</button>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Daily Diary</p>
                <h2>One diary note per day</h2>
              </div>
              <strong>{selectedDate === today ? "Today" : safeDateLabel(selectedDate)}</strong>
            </div>
            <form className="formGrid" onSubmit={submitDiary}>
              <input type="date" value={String(diaryForm.date ?? selectedDate)} onChange={(e) => setDiaryForm({ ...diaryForm, date: e.target.value })} />
              <input placeholder="Short title" value={String(diaryForm.title ?? "")} onChange={(e) => setDiaryForm({ ...diaryForm, title: e.target.value })} />
              <select value={String(diaryForm.mood ?? "steady")} onChange={(e) => setDiaryForm({ ...diaryForm, mood: e.target.value as DailyDiary["mood"] })}>
                <option value="great">Great</option>
                <option value="steady">Steady</option>
                <option value="tired">Tired</option>
                <option value="stressed">Stressed</option>
              </select>
              <textarea
                className="largeTextarea"
                placeholder="Write a short reflection on your study flow, mood, and what to improve tomorrow."
                value={String(diaryForm.content ?? "")}
                onChange={(e) => setDiaryForm({ ...diaryForm, content: e.target.value })}
              />
              <button className="primaryButton" disabled={pending}>Save diary</button>
            </form>
          </article>
        </div>

        <div className="column">
          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Todos</p>
                <h2>Todo list</h2>
              </div>
              <strong>{data.todos.filter((item) => item.status === "done").length}/{data.todos.length}</strong>
            </div>
            <form className="formGrid" onSubmit={submitTodo}>
              <input placeholder="Task title" value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} />
              <input type="date" value={todoForm.dueDate} onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })} />
              <input placeholder="Subject" value={todoForm.subject} onChange={(e) => setTodoForm({ ...todoForm, subject: e.target.value })} list="subject-list" />
              <select value={todoForm.priority} onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as Todo["priority"] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button className="primaryButton" disabled={pending}>Add todo</button>
            </form>
            <div className="listStack">
              {data.todos
                .slice()
                .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                .map((todo) => (
                  <div className="listItem" key={todo.id}>
                    <div>
                      <strong>{todo.title}</strong>
                      <p>{todo.subject || "General"} | {todo.dueDate ? safeDateLabel(todo.dueDate) : "No due date"} | {todo.priority}</p>
                      <small>Status: {todo.status}</small>
                    </div>
                    <div className="inlineActions">
                      <button className="ghostButton" type="button" onClick={() => cycleTodo(todo)}>Cycle status</button>
                      <button className="ghostButton" type="button" onClick={() => deleteResource("/api/todos", todo.id, "todos")}>Delete</button>
                    </div>
                  </div>
                ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Exams</p>
                <h2>Yearly exam schedule</h2>
              </div>
              <strong>{data.exams.length} items</strong>
            </div>
            <form className="formGrid" onSubmit={submitExam}>
              <input placeholder="Exam name" value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
              <input type="date" value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} />
              <input type="date" value={examForm.registrationStart} onChange={(e) => setExamForm({ ...examForm, registrationStart: e.target.value })} />
              <input type="date" value={examForm.registrationEnd} onChange={(e) => setExamForm({ ...examForm, registrationEnd: e.target.value })} />
              <select value={examForm.importance} onChange={(e) => setExamForm({ ...examForm, importance: e.target.value as Exam["importance"] })}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
              <textarea placeholder="Memo" value={examForm.memo} onChange={(e) => setExamForm({ ...examForm, memo: e.target.value })} />
              <button className="primaryButton" disabled={pending}>Save exam</button>
            </form>
            <div className="monthGrid">
              {Object.entries(monthGroups).map(([month, exams]) => (
                <div className="monthCard" key={month}>
                  <strong>{month}</strong>
                  {exams.map((exam) => (
                    <div className="miniItem" key={exam.id}>
                      <div>
                        <span>{exam.name}</span>
                        <small>{safeDateLabel(exam.examDate)} | D-{differenceInCalendarDays(parseISO(exam.examDate), parseISO(selectedDate))}</small>
                      </div>
                      <button className="ghostButton" type="button" onClick={() => deleteResource("/api/exams", exam.id, "exams")}>Delete</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Default subjects</h2>
              </div>
              <strong>Sheets sync</strong>
            </div>
            <form className="formGrid" onSubmit={saveSettings}>
              <input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Korean, English, Math" />
              <input
                type="number"
                min="0"
                value={data.settings.dailyTargetMinutes}
                onChange={(e) => setData((current) => ({
                  ...current,
                  settings: { ...current.settings, dailyTargetMinutes: Number(e.target.value) },
                }))}
                placeholder="Daily target minutes"
              />
              <button className="primaryButton" disabled={pending}>Save settings</button>
            </form>
            <p className="metaText">Spreadsheet ID: {data.spreadsheetId}</p>
          </article>
        </div>
      </section>

      <datalist id="subject-list">
        {data.settings.subjects.map((subject) => (
          <option value={subject} key={subject} />
        ))}
      </datalist>
    </main>
  );
}
