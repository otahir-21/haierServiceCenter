import Link from "next/link";
import { buttonClass, PageHeader, Stat } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { reportRange } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { buildReport } from "@/lib/report";
import { stockByPart } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const user = await currentUser();
  const lang = await getLang();
  if (!user) return null;
  const open = await prisma.complaint.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  const openCount = await prisma.complaint.count({ where: { status: "OPEN" } });

  if (user.role === "STAFF") {
    return (
      <div>
        <PageHeader title={t(lang, "desk")} text={t(lang, "deskStaff")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/sale" className={`${buttonClass()} w-full justify-center`}>
            {t(lang, "newSale")}
          </Link>
          <Link href="/sale?type=issue" className={`${buttonClass()} w-full justify-center`}>
            {t(lang, "issuePart")}
          </Link>
          <Link href="/complaints/new" className={`${buttonClass("ghost")} w-full justify-center`}>
            {t(lang, "newComplaint")}
          </Link>
        </div>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t(lang, "deskOpen")} · {openCount}
            </h2>
            <Link href="/complaints" className="text-sm font-semibold text-brand">
              {t(lang, "seeAll")}
            </Link>
          </div>
          {open.length === 0 ? <p className="text-sm text-muted">{t(lang, "noOpen")}</p> : null}
          <div className="grid gap-2">
            {open.map((job) => (
              <Link key={job.id} href={`/complaints/${job.id}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-line bg-card px-4 py-3">
                <span className="font-semibold">{job.customerName}</span>
                <span className="num text-sm text-muted" dir="ltr">
                  {job.phone}
                </span>
                <span className="text-sm text-muted">{job.technicianName}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const range = reportRange("today");
  const report = await buildReport(range.start, range.end);
  const parts = await prisma.part.findMany({ select: { id: true, costPrice: true } });
  const stock = await stockByPart();
  let pieces = 0;
  let value = 0;
  for (const part of parts) {
    const qty = stock.get(part.id) ?? 0;
    pieces += qty;
    value += qty * part.costPrice;
  }

  return (
    <div>
      <PageHeader title={t(lang, "desk")} text={t(lang, "deskAdmin")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(lang, "cashCollected")} value={money(report.cashCollected)} />
        <Stat label={t(lang, "shopExpenses")} value={money(report.expenseTotal)} />
        <Stat label={t(lang, "left")} value={money(report.left)} hint={t(lang, "leftHelp")} />
        <Stat label={t(lang, "openComplaints")} value={String(openCount)} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat label={t(lang, "stockValue")} value={money(value)} hint={`${pieces} ${t(lang, "pieces")}. ${t(lang, "atLatestCost")}`} />
        <Stat label={t(lang, "grossProfit")} value={money(report.grossProfit)} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/sale" className={`${buttonClass()} w-full justify-center sm:w-auto`}>
          {t(lang, "newSale")}
        </Link>
        <Link href="/purchase" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
          {t(lang, "purchase")}
        </Link>
        <Link href="/complaints/new" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
          {t(lang, "newComplaint")}
        </Link>
        <Link href="/reports" className={`${buttonClass("ghost")} w-full justify-center sm:w-auto`}>
          {t(lang, "reports")}
        </Link>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{t(lang, "deskOpen")}</h2>
        {open.length === 0 ? <p className="text-sm text-muted">{t(lang, "noOpen")}</p> : null}
        <div className="grid gap-2">
          {open.map((job) => (
            <Link key={job.id} href={`/complaints/${job.id}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-line bg-card px-4 py-3">
              <span className="font-semibold">{job.customerName}</span>
              <span className="num text-sm text-muted" dir="ltr">
                {job.phone}
              </span>
              <span className="min-w-0 text-sm text-muted">
                {job.visitType === "WORKSHOP" ? t(lang, "workshop") : t(lang, "field")} · {job.technicianName} · {when(job.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
