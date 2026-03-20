export type TodoStatus = "todo" | "doing" | "done";
export type TodoPriority = "low" | "medium" | "high";
export type ExamImportance = "normal" | "important" | "critical";
export type DiaryMood = "great" | "steady" | "tired" | "stressed";

export type Plan = {
  id: string;
  date: string;
  subject: string;
  plannedMinutes: number;
  startTime?: string;
  endTime?: string;
  note?: string;
};

export type StudyLog = {
  id: string;
  date: string;
  subject: string;
  actualMinutes: number;
  startTime?: string;
  endTime?: string;
  review?: string;
  planId?: string;
};

export type Todo = {
  id: string;
  title: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
  dueDate?: string;
  subject?: string;
};

export type Exam = {
  id: string;
  name: string;
  examDate: string;
  registrationStart?: string;
  registrationEnd?: string;
  memo?: string;
  importance: ExamImportance;
};

export type DailyDiary = {
  id: string;
  date: string;
  title?: string;
  content: string;
  mood?: DiaryMood;
};

export type Settings = {
  id: string;
  subjects: string[];
  dailyTargetMinutes: number;
};

export type BootstrapPayload = {
  plans: Plan[];
  logs: StudyLog[];
  todos: Todo[];
  exams: Exam[];
  diaryEntries: DailyDiary[];
  settings: Settings;
  spreadsheetId: string;
};

export type DashboardSummary = {
  todayPlanMinutes: number;
  todayActualMinutes: number;
  completionRate: number;
  remainingTodos: number;
  completedTodos: number;
  nearestExam?: Exam;
  hasDiaryToday: boolean;
};
