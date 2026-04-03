import type { BootstrapPayload } from "@/lib/types";
import { getTodayInSeoul } from "@/lib/utils";

const today = getTodayInSeoul();

export const demoData: BootstrapPayload = {
  plans: [
    {
      id: "plan_demo_1",
      date: today,
      subject: "국어",
      plannedMinutes: 120,
      startTime: "09:00",
      endTime: "11:00",
      note: "문학 기출 2세트",
    },
    {
      id: "plan_demo_2",
      date: today,
      subject: "영어",
      plannedMinutes: 90,
      startTime: "14:00",
      endTime: "15:30",
      note: "독해 10지문",
    },
  ],
  logs: [
    {
      id: "log_demo_1",
      date: today,
      subject: "국어",
      actualMinutes: 110,
      startTime: "09:10",
      endTime: "11:00",
      review: "집중은 좋았지만 시간 배분 아쉬움",
      planId: "plan_demo_1",
    },
  ],
  todos: [
    {
      id: "todo_demo_1",
      title: "수학 오답 정리",
      status: "todo",
      priority: "high",
      createdAt: today,
      dueDate: today,
      subject: "수학",
    },
    {
      id: "todo_demo_2",
      title: "영어 단어 2회독",
      status: "doing",
      priority: "medium",
      createdAt: today,
      dueDate: today,
      subject: "영어",
    },
  ],
  exams: [
    {
      id: "exam_demo_1",
      name: "6월 모의평가",
      examDate: "2026-06-04",
      registrationStart: "",
      registrationEnd: "",
      memo: "실전 시간 배분 점검",
      importance: "critical",
    },
    {
      id: "exam_demo_2",
      name: "수능",
      examDate: "2026-11-12",
      registrationStart: "",
      registrationEnd: "",
      memo: "최종 목표 시험",
      importance: "critical",
    },
  ],
  diaryEntries: [
    {
      id: "diary_demo_1",
      date: today,
      title: "집중 괜찮았던 날",
      content: "오전에 국어 집중력이 좋았고, 오후에는 피곤해서 짧게 쉬는 시간이 필요했다.",
      mood: "steady",
    },
  ],
  settings: {
    id: "settings_default",
    subjects: ["국어", "영어", "수학", "탐구"],
    dailyTargetMinutes: 480,
  },
  spreadsheetId: "demo-spreadsheet",
};
