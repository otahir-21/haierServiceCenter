import { Suspense } from "react";
import { logout } from "@/app/actions";
import type { SessionUser } from "@/lib/auth";
import { t, type Lang } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { SideNav } from "./nav";

const adminHrefs = [
  ["/", "desk"],
  ["/parts", "parts"],
  ["/purchase", "purchase"],
  ["/sale", "sale"],
  ["/complaints", "complaints"],
  ["/expenses", "expenses"],
  ["/reports", "reports"],
  ["/people", "people"],
] as const;

const staffHrefs = [
  ["/", "desk"],
  ["/sale", "sale"],
  ["/complaints", "complaints"],
  ["/parts", "parts"],
] as const;

export function Shell({
  user,
  lang,
  children,
}: {
  user: SessionUser;
  lang: Lang;
  children: React.ReactNode;
}) {
  const hrefs = user.role === "ADMIN" ? adminHrefs : staffHrefs;
  const items = hrefs.map(([href, key]) => ({ href, label: t(lang, key) }));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="no-print sticky top-0 z-20 bg-ink text-white lg:static lg:min-h-screen lg:px-4 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:block lg:px-2 lg:pt-0">
          <div className="w-full lg:w-auto">
            <p className="text-xs font-semibold tracking-[0.16em] text-rose-200">HAIER</p>
            <p className="text-sm font-semibold">{t(lang, "appName")}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:mt-4">
            <Suspense fallback={null}>
              <LangSwitch lang={lang} />
            </Suspense>
            <form action={logout} className="lg:hidden">
              <button className="min-h-11 px-1 text-sm font-semibold text-white" type="submit">
                {t(lang, "logout")}
              </button>
            </form>
          </div>
        </div>
        <div className="px-3 pb-3 lg:mt-6 lg:px-0">
          <SideNav items={items} />
        </div>
        <div className="hidden items-end justify-between px-2 lg:mt-8 lg:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-white/60">{user.role === "ADMIN" ? t(lang, "admin") : t(lang, "staff")}</p>
          </div>
          <form action={logout}>
            <button className="text-sm text-white/70 hover:text-white" type="submit">
              {t(lang, "logout")}
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
