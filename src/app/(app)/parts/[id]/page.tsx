import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updatePart } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Flash, Label, PageHeader, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { onHand } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function EditPartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const { id } = await params;
  const { msg } = await searchParams;
  const part = await prisma.part.findUnique({ where: { id }, include: { product: true } });
  if (!part) notFound();
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  const qty = await onHand(part.id);
  return (
    <div>
      <PageHeader title={`${part.code} · ${part.name}`} text={t(lang, "retailHelp")} />
      <Flash msg={msg} lang={lang} />
      <p className="num mb-4 text-sm text-muted">
        {t(lang, "onHand")}: {qty} · {t(lang, "latestCost")}: {money(part.costPrice)} · {t(lang, "priceMode")}:{" "}
        {part.marginPercent == null ? t(lang, "manual") : `${t(lang, "formula")} ${part.marginPercent}%`}
      </p>
      <Card className="max-w-2xl">
        <ActionForm action={updatePart} lang={lang} className="grid gap-4">
          <input type="hidden" name="id" value={part.id} />
          <label>
            <Label>{t(lang, "partName")}</Label>
            <TextInput name="name" required defaultValue={part.name} />
          </label>
          <label>
            <Label>{t(lang, "product")}</Label>
            <select name="productId" defaultValue={part.productId} className="w-full rounded-lg border border-line bg-white px-3 py-2.5">
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {lang === "ur" ? product.nameUr : product.nameEn}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>
                {t(lang, "productNew")} · {t(lang, "optional")}
              </Label>
              <TextInput name="newProductEn" />
            </label>
            <label>
              <Label>
                {t(lang, "productUr")} · {t(lang, "optional")}
              </Label>
              <TextInput name="newProductUr" />
            </label>
          </div>
          <label>
            <Label>{t(lang, "model")}</Label>
            <TextInput name="model" defaultValue={part.model} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "margin")}</Label>
              <TextInput name="margin" inputMode="decimal" dir="ltr" defaultValue={part.marginPercent ?? ""} placeholder="30" />
            </label>
            <label>
              <Label>{t(lang, "retail")}</Label>
              <TextInput name="retail" inputMode="decimal" dir="ltr" defaultValue={part.retailPrice} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="active" defaultChecked={part.active} />
            {t(lang, "active")}
          </label>
          <p className="text-xs text-muted">{t(lang, "hiddenHelp")}</p>
          <div className="flex gap-2">
            <SubmitButton label={t(lang, "savePart")} />
            <Link href="/parts" className="inline-flex items-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold">
              {t(lang, "back")}
            </Link>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
