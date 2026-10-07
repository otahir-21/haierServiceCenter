import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass, Flash, PageHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { stockAlert, stockByPart } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const { msg } = await searchParams;
  const admin = user.role === "ADMIN";
  const parts = await prisma.part.findMany({
    where: admin ? {} : { active: true },
    include: { product: true },
    orderBy: { code: "asc" },
  });
  const stock = admin ? await stockByPart() : new Map<string, number>();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={admin ? t(lang, "parts") : t(lang, "staffPriceList")}
          text={admin ? t(lang, "adminPartsHelp") : t(lang, "staffPriceHelp")}
        />
        {admin ? (
          <Link href="/parts/new" className={`${buttonClass()} mb-6 w-full justify-center sm:w-auto`}>
            {t(lang, "addPart")}
          </Link>
        ) : null}
      </div>
      <Flash msg={msg} lang={lang} />
      {!admin ? <p className="mb-4 text-sm text-muted">{t(lang, "noStockNumbers")}</p> : null}
      {parts.length === 0 ? <p className="text-sm text-muted">{admin ? t(lang, "noPartsAdmin") : t(lang, "noPartsStaff")}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t(lang, "partCode")}</th>
              <th className="px-4 py-3 font-semibold">{t(lang, "partName")}</th>
              <th className="px-4 py-3 font-semibold">{t(lang, "product")}</th>
              <th className="px-4 py-3 font-semibold">{t(lang, "model")}</th>
              {admin ? <th className="px-4 py-3 font-semibold">{t(lang, "cost")}</th> : null}
              <th className="px-4 py-3 font-semibold">{t(lang, "retail")}</th>
              {admin ? <th className="px-4 py-3 font-semibold">{t(lang, "onHand")}</th> : null}
              {admin ? <th className="px-4 py-3 font-semibold">{t(lang, "status")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => {
              const qty = stock.get(part.id) ?? 0;
              const alert = admin ? stockAlert(qty, part.minQty, part.maxQty) : null;
              return (
              <tr
                key={part.id}
                className={`border-b border-line last:border-0 ${alert === "low" ? "bg-red-50" : alert === "high" ? "bg-amber-50" : ""}`}
              >
                <td className="num px-4 py-3 font-semibold" dir="ltr" data-label={t(lang, "partCode")}>
                  {admin ? (
                    <Link href={`/parts/${part.id}`} className="text-brand">
                      {part.code}
                    </Link>
                  ) : (
                    part.code
                  )}
                </td>
                <td className="px-4 py-3" data-label={t(lang, "partName")}>{part.name}</td>
                <td className="px-4 py-3" data-label={t(lang, "product")}>{lang === "ur" ? part.product.nameUr : part.product.nameEn}</td>
                <td className="px-4 py-3" data-label={t(lang, "model")}>{part.model}</td>
                {admin ? <td className="num px-4 py-3" data-label={t(lang, "cost")}>{money(part.costPrice)}</td> : null}
                <td className="num px-4 py-3" data-label={t(lang, "retail")}>{money(part.retailPrice)}</td>
                {admin ? <td className="num px-4 py-3" data-label={t(lang, "onHand")}>{qty}</td> : null}
                {admin ? (
                  <td className="px-4 py-3" data-label={t(lang, "status")}>
                    {alert === "low" ? t(lang, "reorder") : alert === "high" ? t(lang, "overStock") : part.active ? t(lang, "active") : t(lang, "hidden")}
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
