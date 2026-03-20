import { differenceInCalendarDays, parseISO } from "date-fns";

import type { BootstrapPayload, DashboardSummary, Exam } from "@/lib/types";
import { getTodayInSeoul, percent } from "@/lib/utils";

export function getNearestExam(exams: Exam[], fromDate = getTodayInSeoul()) {
  return exams
    .filter((exam) => differenceInCalendarDays(parseISO(exam.examDate), parseISO(fromDate)) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))[0];
}

export function buildDashboardSummary(data: BootstrapPayload, today = getTodayInSeoul()): DashboardSummary {
  const todayPlanMinutes = data.plans
    .filter((plan) => plan.date === today)
    .reduce((sum, item) => sum + item.plannedMinutes, 0);

  const todayActualMinutes = data.logs
    .filter((log) => log.date === today)
    .reduce((sum, item) => sum + item.actualMinutes, 0);

  const remainingTodos = data.todos.filter((todo) => todo.status !== "done").length;
  const completedTodos = data.todos.filter((todo) => todo.status === "done").length;

  return {
    todayPlanMinutes,
    todayActualMinutes,
    completionRate: percent(todayActualMinutes, todayPlanMinutes),
    remainingTodos,
    completedTodos,
    nearestExam: getNearestExam(data.exams, today),
    hasDiaryToday: data.diaryEntries.some((entry) => entry.date === today),
  };
}
