export const SHEET_HEADERS = {
  DailyPlans: ["id", "date", "subject", "plannedMinutes", "startTime", "endTime", "note"],
  StudyLogs: ["id", "date", "subject", "actualMinutes", "startTime", "endTime", "review", "planId"],
  Todos: ["id", "title", "status", "priority", "createdAt", "dueDate", "subject"],
  Exams: ["id", "name", "examDate", "registrationStart", "registrationEnd", "memo", "importance"],
  DailyDiary: ["id", "date", "title", "content", "mood"],
  Settings: ["id", "subjects", "dailyTargetMinutes"],
} as const;

export const SHEET_TITLES = Object.keys(SHEET_HEADERS) as Array<keyof typeof SHEET_HEADERS>;

export const DEFAULT_SETTINGS_ROW = {
  id: "settings_default",
  subjects: "Korean,English,Math",
  dailyTargetMinutes: "480",
};
