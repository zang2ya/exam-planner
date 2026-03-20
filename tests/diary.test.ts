import { describe, expect, it } from "vitest";

import { upsertDiaryLocally } from "@/lib/diary";
import type { DailyDiary } from "@/lib/types";

describe("upsertDiaryLocally", () => {
  it("keeps a single diary entry per date", () => {
    const entries: DailyDiary[] = [
      { id: "diary_1", date: "2026-03-19", title: "", content: "old", mood: "steady" },
      { id: "diary_2", date: "2026-03-20", title: "", content: "first", mood: "great" },
    ];

    const next = { id: "diary_3", date: "2026-03-20", title: "", content: "updated", mood: "tired" as const };
    const merged = upsertDiaryLocally(entries, next);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(next);
    expect(merged.find((entry) => entry.date === "2026-03-20")?.content).toBe("updated");
  });
});
