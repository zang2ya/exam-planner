import { format, isValid, parseISO } from "date-fns";

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function safeDateLabel(isoDate: string) {
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) {
    return isoDate;
  }
  return format(parsed, "MMM d");
}

export function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

export function getTodayInSeoul() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
}
