import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const { q = "", status = "all" } = await searchParams;
  const query = q.trim().toLowerCase();
  const phone = query.replace(/\s+/g, "");
  const found = await prisma.complaint.findMany({
    where: status === "OPEN" || status === "CLOSED" ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const rows = (
    query
      ? found.filter(
          (job) => job.customerName.toLowerCase().includes(query) || job.phone.replace(/\s+/g, "").includes(phone),
        )
      : found
  ).slice(0, 100);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t(lang, "complaintHeading")} text={t(lang, "complaintHelp")} />
        <Link href="/complaints/new" className={`${buttonClass()} mb-6 w-full justify-center sm:w-auto`}>
          {t(lang, "newComplaint")}
        </Link>
      </div>
      <form action="/complaints" className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="min-w-0 text-sm font-semibold sm:min-w-56 sm:flex-1">
          {t(lang, "search")}
          <input
            name="q"
            defaultValue={query}
            placeholder={t(lang, "searchHelp")}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5"
          />
        </label>
        <label className="text-sm font-semibold">
          {t(lang, "status")}
          <select name="status" defaultValue={status} className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2.5 sm:w-auto">
            <option value="all">{t(lang, "all")}</option>
            <option value="OPEN">{t(lang, "openOnly")}</option>
            <option value="CLOSED">{t(lang, "closedOnly")}</option>
          </select>
        </label>
        <button className={`${buttonClass()} w-full sm:w-auto`} type="submit">
          {t(lang, "phoneSearch")}
        </button>
      </form>
      <p className="mb-4 text-sm text-muted">{t(lang, "repeatHelp")}</p>
      {rows.length === 0 ? <p className="text-sm text-muted">{t(lang, "noComplaints")}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "customerName")}</th>
              <th className="px-4 py-3">{t(lang, "phone")}</th>
              <th className="px-4 py-3">{t(lang, "where")}</th>
              <th className="px-4 py-3">{t(lang, "technician")}</th>
              <th className="px-4 py-3">{t(lang, "status")}</th>
              <th className="px-4 py-3">{t(lang, "collection")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{when(job.createdAt)}</td>
                <td className="px-4 py-3" data-label={t(lang, "customerName")}>
                  <Link href={`/complaints/${job.id}`} className="font-semibold text-brand">
                    {job.customerName}
                  </Link>
                </td>
                <td className="num px-4 py-3" dir="ltr" data-label={t(lang, "phone")}>
                  <a href={`tel:${job.phone}`}>{job.phone}</a>
                </td>
                <td className="px-4 py-3" data-label={t(lang, "where")}>{job.visitType === "WORKSHOP" ? t(lang, "workshop") : t(lang, "field")}</td>
                <td className="px-4 py-3" data-label={t(lang, "technician")}>{job.technicianName}</td>
                <td className="px-4 py-3" data-label={t(lang, "status")}>{job.status === "CLOSED" ? t(lang, "closed") : t(lang, "open")}</td>
                <td className="num px-4 py-3" data-label={t(lang, "collection")}>{money(job.collectionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
