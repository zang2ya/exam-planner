import type { DailyDiary } from "@/lib/types";

export function upsertDiaryLocally(entries: DailyDiary[], nextEntry: DailyDiary) {
  return [nextEntry, ...entries.filter((entry) => entry.date !== nextEntry.date && entry.id !== nextEntry.id)].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
}
