import { z } from "zod";

export const planSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  subject: z.string().min(1),
  plannedMinutes: z.coerce.number().int().min(0),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export const logSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  subject: z.string().min(1),
  actualMinutes: z.coerce.number().int().min(0),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  review: z.string().optional().default(""),
  planId: z.string().optional().default(""),
});

export const todoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  createdAt: z.string().min(1),
  dueDate: z.string().optional().default(""),
  subject: z.string().optional().default(""),
});

export const examSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  examDate: z.string().min(1),
  registrationStart: z.string().optional().default(""),
  registrationEnd: z.string().optional().default(""),
  memo: z.string().optional().default(""),
  importance: z.enum(["normal", "important", "critical"]).default("normal"),
});

export const diarySchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  title: z.string().optional().default(""),
  content: z.string().min(1),
  mood: z.enum(["great", "steady", "tired", "stressed"]).optional(),
});

export const settingsSchema = z.object({
  id: z.string().optional(),
  subjects: z.array(z.string()).default([]),
  dailyTargetMinutes: z.coerce.number().int().min(0).default(0),
});
