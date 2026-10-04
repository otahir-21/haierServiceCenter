export function money(n: number) {
  const formatted = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
  return `Rs ${formatted}`;
}

export function when(date: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function dayOnly(date: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}
