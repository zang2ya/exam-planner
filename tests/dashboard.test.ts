import { describe, expect, it } from "vitest";

import { buildDashboardSummary } from "@/lib/dashboard";
import type { BootstrapPayload } from "@/lib/types";

const fixture: BootstrapPayload = {
  plans: [
    { id: "plan_1", date: "2026-03-20", subject: "Math", plannedMinutes: 180, startTime: "", endTime: "", note: "" },
    { id: "plan_2", date: "2026-03-20", subject: "English", plannedMinutes: 120, startTime: "", endTime: "", note: "" },
  ],
  logs: [
    { id: "log_1", date: "2026-03-20", subject: "Math", actualMinutes: 150, startTime: "", endTime: "", review: "", planId: "plan_1" },
  ],
  todos: [
    { id: "todo_1", title: "Past paper review", status: "todo", priority: "high", createdAt: "2026-03-20", dueDate: "2026-03-21", subject: "Math" },
    { id: "todo_2", title: "Wrong answer review", status: "done", priority: "medium", createdAt: "2026-03-20", dueDate: "2026-03-20", subject: "English" },
  ],
  exams: [
    { id: "exam_1", name: "Mock exam", examDate: "2026-03-25", registrationStart: "", registrationEnd: "", memo: "", importance: "important" },
  ],
  diaryEntries: [
    { id: "diary_1", date: "2026-03-20", title: "Solid focus", content: "Math went well.", mood: "great" },
  ],
  settings: {
    id: "settings_default",
    subjects: ["Math", "English"],
    dailyTargetMinutes: 480,
  },
  spreadsheetId: "sheet_123",
};

describe("buildDashboardSummary", () => {
  it("calculates daily totals and completion rate", () => {
    const summary = buildDashboardSummary(fixture, "2026-03-20");

    expect(summary.todayPlanMinutes).toBe(300);
    expect(summary.todayActualMinutes).toBe(150);
    expect(summary.completionRate).toBe(50);
    expect(summary.remainingTodos).toBe(1);
    expect(summary.completedTodos).toBe(1);
    expect(summary.hasDiaryToday).toBe(true);
    expect(summary.nearestExam?.name).toBe("Mock exam");
  });
});
