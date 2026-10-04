import { redirect } from "next/navigation";
import { purchaseStock } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Flash, Label, PageHeader, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function PurchasePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const { msg } = await searchParams;
  const parts = await prisma.part.findMany({ include: { product: true }, orderBy: { code: "asc" } });
  const recent = await prisma.stockMove.findMany({
    where: { type: "PURCHASE" },
    include: { part: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return (
    <div>
      <PageHeader title={t(lang, "purchaseTitle")} text={t(lang, "purchaseRetailHelp")} />
      <Flash msg={msg} lang={lang} />
      {parts.length === 0 ? (
        <p className="text-sm text-muted">{t(lang, "noPartsAdmin")}</p>
      ) : (
        <Card className="max-w-2xl">
          <ActionForm action={purchaseStock} lang={lang} className="grid gap-4">
            <label>
              <Label>{t(lang, "choosePart")}</Label>
              <select name="partId" className="w-full rounded-lg border border-line bg-white px-3 py-2.5">
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.code} — {part.name}
                    {part.model ? ` — ${part.model}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <Label>{t(lang, "qty")}</Label>
                <TextInput name="qty" inputMode="numeric" dir="ltr" required />
              </label>
              <label>
                <Label>{t(lang, "unitCost")}</Label>
                <TextInput name="unitCost" inputMode="decimal" dir="ltr" required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <Label>{t(lang, "marginOnPurchase")}</Label>
                <TextInput name="margin" inputMode="decimal" dir="ltr" placeholder="30" />
              </label>
              <label>
                <Label>{t(lang, "retailAfter")}</Label>
                <TextInput name="retail" inputMode="decimal" dir="ltr" />
              </label>
            </div>
            <label>
              <Label>{t(lang, "note")}</Label>
              <TextInput name="note" />
            </label>
            <SubmitButton label={t(lang, "receive")} />
          </ActionForm>
        </Card>
      )}
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "recent")}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "partName")}</th>
              <th className="px-4 py-3">{t(lang, "qty")}</th>
              <th className="px-4 py-3">{t(lang, "cost")}</th>
              <th className="px-4 py-3">{t(lang, "who")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((move) => (
              <tr key={move.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{when(move.createdAt)}</td>
                <td className="px-4 py-3" data-label={t(lang, "partName")}>
                  {move.part.code} · {move.part.name}
                </td>
                <td className="num px-4 py-3" data-label={t(lang, "qty")}>{move.qty}</td>
                <td className="num px-4 py-3" data-label={t(lang, "cost")}>{money(move.amount)}</td>
                <td className="px-4 py-3" data-label={t(lang, "who")}>{move.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
