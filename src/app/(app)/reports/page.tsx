import { redirect } from "next/navigation";
import { buttonClass, PageHeader, Stat } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { reportRange, todayInputValue } from "@/lib/dates";
import { dayOnly, money, when } from "@/lib/format";
import { categoryKey, t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { buildReport } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const query = await searchParams;
  const range = reportRange(query.preset ?? "today", query.from, query.to);
  const report = await buildReport(range.start, range.end);
  const today = todayInputValue();
  const presets = [
    ["today", t(lang, "today"), t(lang, "deskAdmin")],
    ["week", t(lang, "thisWeek"), t(lang, "weekHelp")],
    ["month", t(lang, "thisMonth"), t(lang, "monthHelp")],
  ] as const;

  return (
    <div>
      <PageHeader title={t(lang, "reportTitle")} text={t(lang, "reportIntro")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map(([preset, label]) => (
          <a
            key={preset}
            href={`/reports?preset=${preset}`}
            className={range.preset === preset ? buttonClass() : buttonClass("ghost")}
          >
            {label}
          </a>
        ))}
      </div>
      <form className="mb-6 grid gap-3 sm:flex sm:flex-wrap sm:items-end" action="/reports">
        <input type="hidden" name="preset" value="custom" />
        <label className="text-sm font-semibold">
          {t(lang, "from")}
          <input
            type="date"
            name="from"
            defaultValue={query.from || today}
            dir="ltr"
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 sm:w-auto"
          />
        </label>
        <label className="text-sm font-semibold">
          {t(lang, "to")}
          <input
            type="date"
            name="to"
            defaultValue={query.to || today}
            dir="ltr"
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 sm:w-auto"
          />
        </label>
        <button className={`${buttonClass()} w-full sm:w-auto`} type="submit">
          {t(lang, "show")}
        </button>
      </form>
      <p className="mb-4 text-sm text-muted">
        {range.preset === "week" ? t(lang, "weekHelp") : null}
        {range.preset === "month" ? t(lang, "monthHelp") : null}
        {range.preset === "custom" ? t(lang, "customHelp") : null}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t(lang, "cashCollected")} value={money(report.cashCollected)} />
        <Stat label={t(lang, "partsCash")} value={money(report.partsCash)} />
        <Stat label={t(lang, "complaintCash")} value={money(report.complaintCash)} />
        <Stat label={t(lang, "costOfSold")} value={money(report.costOfSold)} />
        <Stat label={t(lang, "grossProfit")} value={money(report.grossProfit)} />
        <Stat label={t(lang, "shopExpenses")} value={money(report.expenseTotal)} />
        <Stat label={t(lang, "left")} value={money(report.left)} hint={t(lang, "leftHelp")} />
        <Stat label={t(lang, "qtySold")} value={String(report.soldQty)} />
        <Stat
          label={t(lang, "partsReceived")}
          value={`${report.receivedQty}`}
          hint={`${t(lang, "purchaseValue")}: ${money(report.purchaseValue)}. ${t(lang, "partsReceivedHelp")}`}
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "byCategory")}</h2>
      {report.byCategory.length === 0 ? <p className="text-sm text-muted">{t(lang, "noExpenses")}</p> : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {report.byCategory.map(([category, amount]) => (
          <li key={category} className="flex justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm">
            <span>{t(lang, categoryKey(category))}</span>
            <span className="num font-semibold">{money(amount)}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "cashList")}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "type")}</th>
              <th className="px-4 py-3">{t(lang, "partMovement")}</th>
              <th className="px-4 py-3">{t(lang, "crtShort")}</th>
              <th className="px-4 py-3">{t(lang, "amount")}</th>
            </tr>
          </thead>
          <tbody>
            {report.moves
              .filter((move) => move.type !== "PURCHASE")
              .map((move) => (
                <tr key={move.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3" data-label={t(lang, "date")}>{when(move.createdAt)}</td>
                  <td className="px-4 py-3" data-label={t(lang, "type")}>{move.type === "ISSUE" ? t(lang, "issued") : t(lang, "direct")}</td>
                  <td className="px-4 py-3" data-label={t(lang, "partMovement")}>
                    {move.part.code} · {move.part.name} · {move.qty}
                  </td>
                  <td className="num px-4 py-3" dir="ltr" data-label={t(lang, "crtShort")}>
                    {move.crtNumber}
                  </td>
                  <td className="num px-4 py-3" data-label={t(lang, "amount")}>{money(move.amount)}</td>
                </tr>
              ))}
            {report.complaints.map((job) => (
              <tr key={job.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{job.collectedAt ? when(job.collectedAt) : ""}</td>
                <td className="px-4 py-3" data-label={t(lang, "type")}>{t(lang, "complaintJob")}</td>
                <td className="px-4 py-3" data-label={t(lang, "partMovement")}>
                  {job.customerName} · {job.phone}
                </td>
                <td className="num px-4 py-3" dir="ltr" data-label={t(lang, "crtShort")}>
                  {job.crtNumber}
                </td>
                <td className="num px-4 py-3" data-label={t(lang, "amount")}>{money(job.collectionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "expenseList")}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "category")}</th>
              <th className="px-4 py-3">{t(lang, "personOrTitle")}</th>
              <th className="px-4 py-3">{t(lang, "figure")}</th>
            </tr>
          </thead>
          <tbody>
            {report.expenses.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{dayOnly(row.date)}</td>
                <td className="px-4 py-3" data-label={t(lang, "category")}>{t(lang, categoryKey(row.category))}</td>
                <td className="px-4 py-3" data-label={t(lang, "personOrTitle")}>{row.title}</td>
                <td className="num px-4 py-3" data-label={t(lang, "figure")}>{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
