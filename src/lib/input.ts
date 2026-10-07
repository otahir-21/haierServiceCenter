export type ActionState = { error?: string };

export function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function clip(value: string, max: number) {
  return value.slice(0, max);
}

export function moneyOrNull(formData: FormData, key: string) {
  const raw = str(formData, key).replace(/,/g, "");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(value * 100) / 100;
}

export function optionalWhole(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return Number.NaN;
  const value = Number(raw);
  if (value > 100000) return Number.NaN;
  return value;
}

export function wholeQty(formData: FormData, key = "qty") {
  const raw = str(formData, key);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return Number.NaN;
  const value = Number(raw);
  if (value < 1 || value > 100000) return Number.NaN;
  return value;
}

export function usernameOf(value: string) {
  return value.trim().toLowerCase();
}

export function validUsername(value: string) {
  return /^[a-z0-9._-]{3,30}$/.test(value);
}
