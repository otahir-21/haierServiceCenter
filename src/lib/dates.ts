const OFFSET = 5 * 60 * 60 * 1000;

export function todayInputValue(now = new Date()) {
  return new Date(now.getTime() + OFFSET).toISOString().slice(0, 10);
}

export function karachiDayStart(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - OFFSET);
}

export function karachiDayEnd(isoDate: string) {
  return new Date(karachiDayStart(isoDate).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function reportRange(preset: string, from?: string, to?: string) {
  const today = todayInputValue();
  if (preset === "custom" && from && to) {
    let start = karachiDayStart(from);
    let end = karachiDayEnd(to);
    if (start.getTime() > end.getTime()) {
      start = karachiDayStart(to);
      end = karachiDayEnd(from);
    }
    return { start, end, preset: "custom" as const, from, to };
  }
  if (preset === "week") {
    const startToday = karachiDayStart(today);
    const dow = new Date(startToday.getTime() + OFFSET).getUTCDay();
    const mondayBack = dow === 0 ? 6 : dow - 1;
    const start = new Date(startToday.getTime() - mondayBack * 86400000);
    return { start, end: karachiDayEnd(today), preset: "week" as const, from: "", to: "" };
  }
  if (preset === "month") {
    const [y, m] = today.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1) - OFFSET);
    return { start, end: karachiDayEnd(today), preset: "month" as const, from: "", to: "" };
  }
  return {
    start: karachiDayStart(today),
    end: karachiDayEnd(today),
    preset: "today" as const,
    from: "",
    to: "",
  };
}
