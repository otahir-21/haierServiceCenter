import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get("hsc_lang")?.value;
  return value === "ur" ? "ur" : "en";
}
