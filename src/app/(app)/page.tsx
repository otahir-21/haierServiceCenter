import Link from "next/link";
import { buttonClass, PageHeader, Stat } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { karachiDayStart, reportRange, todayInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { buildReport } from "@/lib/report";
import { stockByPart } from "@/lib/stock";

export const dynamic = "force-dynamic";

const LOW_AT = 2;

function daysOpen(date: Date) {
  const todayStart = karachiDayStart(todayInputValue());
  const jobStart = karachiDayStart(todayInputValue(date));
  return Math.max(0, Math.round((todayStart.getTime() - jobStart.getTime()) / 86400000));
}

function ageText(date: Date, lang: Lang) {
  const days = daysOpen(date);
  if (days === 0) return t(lang, "openedToday");
  if (days === 1) return t(lang, "openedYesterday");
  return `${days} ${t(lang, "daysOpen")}`;
}

function Actions({ lang, admin }: { lang: Lang; admin: boolean }) {
  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      <Link href="/sale" className={`${buttonClass()} w-full justify-center sm:w-auto`}>
        {t(lang, "newSale")}
      </Link>
      <Link href="/sale?type=issue" className={`${buttonClass()} w-full justify-center sm:w-auto`}>
        {t(lang, "issuePart")}
      </Link>
      <Link href="/complaints/new" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
        {t(lang, "newComplaint")}
      </Link>
      {admin ? (
        <>
          <Link href="/purchase" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
            {t(lang, "purchase")}
          </Link>
          <Link href="/reports" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
            {t(lang, "reports")}
          </Link>
        </>
      ) : null}
    </div>
  );
}

function CustomerSearch({ lang, query }: { lang: Lang; query: string }) {
  return (
    <form action="/" className="grid gap-3 sm:flex sm:items-end">
      <label className="min-w-0 flex-1 text-sm font-semibold">
        {t(lang, "deskSearch")}
        <input
          name="q"
          defaultValue={query}
          placeholder={t(lang, "deskSearchHelp")}
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base font-normal sm:text-sm"
        />
      </label>
      <button className={`${buttonClass()} w-full sm:w-auto`} type="submit">
        {t(lang, "deskFind")}
      </button>
    </form>
  );
}

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await currentUser();
  const lang = await getLang();
  if (!user) return null;
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const phone = query.replace(/\s+/g, "");
  const admin = user.role === "ADMIN";

  const open = await prisma.complaint.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  const openCount = await prisma.complaint.count({ where: { status: "OPEN" } });

  const matches = query
    ? (
        await prisma.complaint.findMany({
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      )
        .filter(
          (job) => job.customerName.toLowerCase().includes(query) || job.phone.replace(/\s+/g, "").includes(phone),
        )
        .slice(0, 8)
    : [];

  return (
    <div>
      <PageHeader title={t(lang, "desk")} text={admin ? t(lang, "deskAdmin") : t(lang, "deskStaff")} />
      <Actions lang={lang} admin={admin} />

      {admin ? <AdminMoney openCount={openCount} lang={lang} /> : null}

      <section className="mt-6">
        <CustomerSearch lang={lang} query={q.trim()} />
        {query ? (
          <div className="mt-3 grid gap-2">
            {matches.length === 0 ? <p className="text-sm text-muted">{t(lang, "noCustomer")}</p> : null}
            {matches.map((job) => (
              <Link
                key={job.id}
                href={`/complaints/${job.id}`}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-line bg-card px-4 py-3"
              >
                <span className="font-semibold">{job.customerName}</span>
                <span className="num text-sm text-muted" dir="ltr">
                  {job.phone}
                </span>
                <span className="text-sm text-muted">
                  {job.status === "OPEN" ? t(lang, "openOnly") : t(lang, "closedOnly")}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {t(lang, "deskOpen")} · {openCount}
          </h2>
          <Link href="/complaints" className="text-sm font-semibold text-brand">
            {t(lang, "seeAll")}
          </Link>
        </div>
        {open.length === 0 ? <p className="text-sm text-muted">{t(lang, "noOpen")}</p> : null}
        <div className="grid gap-2">
          {open.map((job) => {
            const days = daysOpen(job.createdAt);
            return (
              <Link
                key={job.id}
                href={`/complaints/${job.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-card px-4 py-3"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    days > 0 ? "bg-amber-100 text-amber-950" : "bg-paper text-muted"
                  }`}
                >
                  {ageText(job.createdAt, lang)}
                </span>
                <span className="font-semibold">{job.customerName}</span>
                <span className="num text-sm text-muted" dir="ltr">
                  {job.phone}
                </span>
                <span className="min-w-0 text-sm text-muted">
                  {job.visitType === "WORKSHOP" ? t(lang, "workshop") : t(lang, "field")}
                  {job.technicianName ? ` · ${job.technicianName}` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {admin ? <LowParts lang={lang} /> : null}
    </div>
  );
}

async function AdminMoney({ openCount, lang }: { openCount: number; lang: Lang }) {
  const range = reportRange("today");
  const report = await buildReport(range.start, range.end);
  return (
    <div className="mt-6 grid gap-3">
      <Stat large label={t(lang, "cashCollected")} value={money(report.cashCollected)} hint={t(lang, "today")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(lang, "shopExpenses")} value={money(report.expenseTotal)} />
        <Stat label={t(lang, "left")} value={money(report.left)} />
        <Stat label={t(lang, "grossProfit")} value={money(report.grossProfit)} />
        <Stat label={t(lang, "openComplaints")} value={String(openCount)} />
      </div>
    </div>
  );
}

async function LowParts({ lang }: { lang: Lang }) {
  const parts = await prisma.part.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const stock = await stockByPart();
  const low = parts
    .map((part) => ({ ...part, qty: stock.get(part.id) ?? 0 }))
    .filter((part) => part.qty <= LOW_AT)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 8);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{t(lang, "lowParts")}</h2>
      <p className="mt-1 text-sm text-muted">{t(lang, "lowPartsHelp")}</p>
      {low.length === 0 ? <p className="mt-3 text-sm text-muted">{t(lang, "noLowParts")}</p> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {low.map((part) => (
          <Link
            key={part.id}
            href={`/parts/${part.id}`}
            className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
          >
            <span className="min-w-0">
              <span className="num font-semibold text-brand" dir="ltr">
                {part.code}
              </span>
              <span className="text-sm"> {part.name}</span>
            </span>
            <span className="num shrink-0 text-sm font-semibold" dir="ltr">
              {part.qty}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
