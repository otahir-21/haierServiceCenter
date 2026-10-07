import { redirect } from "next/navigation";
import { recordSale } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { PartSelect } from "@/components/part-select";
import { Card, Label, PageHeader, Select, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SalePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const { type } = await searchParams;
  const admin = user.role === "ADMIN";
  const parts = await prisma.part.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      name: true,
      model: true,
      retailPrice: true,
      product: { select: { nameEn: true, nameUr: true } },
    },
    orderBy: { code: "asc" },
  });
  const choices = parts.map((part) => ({
    id: part.id,
    code: part.code,
    name: part.name,
    model: part.model,
    retailPrice: part.retailPrice,
    product: lang === "ur" ? part.product.nameUr : part.product.nameEn,
  }));
  const techs = await prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const recent = await prisma.stockMove.findMany({
    where: {
      type: { in: ["SALE", "ISSUE"] },
      ...(admin ? {} : { createdById: user.id }),
    },
    include: admin ? { part: true, createdBy: true } : { part: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div>
      <PageHeader title={t(lang, "saleTitle")} text={t(lang, "saleHelp")} />
      {!admin ? <p className="mb-4 text-sm text-muted">{t(lang, "stockCheck")}</p> : null}
      {choices.length === 0 ? (
        <p className="text-sm text-muted">{admin ? t(lang, "noPartsAdmin") : t(lang, "noPartsStaff")}</p>
      ) : (
        <Card className="max-w-2xl">
          <ActionForm action={recordSale} lang={lang} className="grid gap-4">
            <fieldset className="flex flex-wrap gap-4 text-sm font-semibold">
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="SALE" defaultChecked={type !== "issue"} />
                {t(lang, "directSale")}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="ISSUE" defaultChecked={type === "issue"} />
                {t(lang, "issueToTech")}
              </label>
            </fieldset>
            <PartSelect
              parts={choices}
              searchLabel={t(lang, "searchPart")}
              partLabel={t(lang, "choosePart")}
              retailLabel={t(lang, "retailEach")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <Label>{t(lang, "qty")}</Label>
                <TextInput name="qty" inputMode="numeric" dir="ltr" required defaultValue="1" />
              </label>
              <label>
                <Label>{t(lang, "crt")}</Label>
                <TextInput name="crt" dir="ltr" required />
                <span className="mt-1 block text-xs text-muted">{t(lang, "crtHelp")} {t(lang, "referenceHelp")}</span>
              </label>
            </div>
            <label>
              <Label>{t(lang, "amount")}</Label>
              <TextInput name="amount" inputMode="decimal" dir="ltr" />
              <span className="mt-1 block text-xs text-muted">{t(lang, "amountHelp")}</span>
            </label>
            <label>
              <Label>{t(lang, "technician")}</Label>
              {techs.length > 0 ? (
                <Select name="technicianName" defaultValue="">
                  <option value="">{t(lang, "selectTechnician")}</option>
                  {techs.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput name="technicianName" />
              )}
              <span className="mt-1 block text-xs text-muted">{t(lang, "issueHelp")}</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <Label>
                  {t(lang, "customer")} · {t(lang, "customerOptional")}
                </Label>
                <TextInput name="customerName" />
              </label>
              <label>
                <Label>{t(lang, "note")}</Label>
                <TextInput name="note" />
              </label>
            </div>
            <SubmitButton label={t(lang, "recordCash")} />
          </ActionForm>
        </Card>
      )}
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "recent")}</h2>
      {recent.length === 0 ? <p className="text-sm text-muted">{t(lang, "noMoves")}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "type")}</th>
              <th className="px-4 py-3">{t(lang, "partName")}</th>
              <th className="px-4 py-3">{t(lang, "qty")}</th>
              <th className="px-4 py-3">{t(lang, "crtShort")}</th>
              <th className="px-4 py-3">{t(lang, "amount")}</th>
              {admin ? <th className="px-4 py-3">{t(lang, "profit")}</th> : null}
              <th className="px-4 py-3">{t(lang, "slip")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((move) => (
              <tr key={move.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{when(move.createdAt)}</td>
                <td className="px-4 py-3" data-label={t(lang, "type")}>{move.type === "ISSUE" ? t(lang, "issued") : t(lang, "direct")}</td>
                <td className="px-4 py-3" data-label={t(lang, "partName")}>
                  {"code" in move.part ? move.part.code : ""} · {move.part.name}
                </td>
                <td className="num px-4 py-3" data-label={t(lang, "qty")}>{move.qty}</td>
                <td className="num px-4 py-3" dir="ltr" data-label={t(lang, "crtShort")}>
                  {move.crtNumber}
                  {move.technicianName ? ` · ${move.technicianName}` : ""}
                </td>
                <td className="num px-4 py-3" data-label={t(lang, "amount")}>{money(move.amount)}</td>
                {admin && "unitCost" in move ? (
                  <td className="num px-4 py-3" data-label={t(lang, "profit")}>{money(move.amount - move.qty * move.unitCost)}</td>
                ) : null}
                <td className="px-4 py-3" data-label={t(lang, "slip")}>
                  <a className="font-semibold text-brand" href={`/slip/${move.id}`}>
                    {t(lang, "viewSlip")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
