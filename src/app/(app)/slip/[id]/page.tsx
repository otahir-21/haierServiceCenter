import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SlipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const { id } = await params;
  const move = await prisma.stockMove.findUnique({
    where: { id },
    include: { part: true, createdBy: { select: { name: true, id: true } } },
  });
  if (!move || (move.type !== "SALE" && move.type !== "ISSUE")) notFound();
  if (user.role !== "ADMIN" && move.createdBy.id !== user.id) redirect("/sale");
  return (
    <div className="mx-auto max-w-md">
      <div className="no-print mb-4 flex gap-2">
        <Link href="/sale" className="text-sm font-semibold text-brand">
          {t(lang, "back")}
        </Link>
        <PrintButton label={t(lang, "printSlip")} />
      </div>
      <article className="rounded-2xl border border-line bg-white p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-brand">HAIER</p>
        <h1 className="text-xl font-semibold">{t(lang, "shopLine")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "cashSlip")}</p>
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(lang, "madeOn")}</dt>
            <dd>{when(move.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(lang, "crt")}</dt>
            <dd className="num font-semibold" dir="ltr">
              {move.crtNumber}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(lang, "type")}</dt>
            <dd>{move.type === "ISSUE" ? t(lang, "issued") : t(lang, "direct")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(lang, "forItem")}</dt>
            <dd className="text-right">
              {move.part.code} · {move.part.name}
              {move.part.model ? ` · ${move.part.model}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(lang, "qtySlip")}</dt>
            <dd className="num">{move.qty}</dd>
          </div>
          {move.technicianName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t(lang, "technician")}</dt>
              <dd>{move.technicianName}</dd>
            </div>
          ) : null}
          {move.customerName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t(lang, "customer")}</dt>
              <dd>{move.customerName}</dd>
            </div>
          ) : null}
          {move.note ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t(lang, "slipNote")}</dt>
              <dd className="text-right">{move.note}</dd>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
            <dt>{t(lang, "total")}</dt>
            <dd className="num">{money(move.amount)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-muted">
          {t(lang, "servedBy")}: {move.createdBy.name}
        </p>
        <p className="mt-2 text-sm">{t(lang, "thankYou")}</p>
      </article>
    </div>
  );
}
