"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLang } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const next = query ? `${path}?${query}` : path;
  return (
    <form action={setLang} className="flex rounded-full bg-black/15 p-0.5 text-sm font-semibold">
      <input type="hidden" name="next" value={next} />
      <button
        name="lang"
        value="en"
        className={`min-h-9 rounded-full px-3 py-1 ${lang === "en" ? "bg-white text-ink" : "text-white"}`}
        type="submit"
      >
        English
      </button>
      <button
        name="lang"
        value="ur"
        className={`min-h-9 rounded-full px-3 py-1 ${lang === "ur" ? "bg-white text-ink" : "text-white"}`}
        type="submit"
      >
        اردو
      </button>
    </form>
  );
}
