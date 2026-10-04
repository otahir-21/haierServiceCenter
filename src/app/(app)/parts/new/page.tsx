import { redirect } from "next/navigation";
import { createPart } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Label, PageHeader, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function NewPartPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  return (
    <div>
      <PageHeader title={t(lang, "addPart")} text={t(lang, "retailHelp")} />
      <Card className="max-w-2xl">
        <ActionForm action={createPart} lang={lang} className="grid gap-4">
          <label>
            <Label>{t(lang, "partCode")}</Label>
            <TextInput name="code" required dir="ltr" placeholder="000001" />
            <span className="mt-1 block text-xs text-muted">{t(lang, "codeHint")}</span>
          </label>
          <label>
            <Label>{t(lang, "partName")}</Label>
            <TextInput name="name" required />
          </label>
          <label>
            <Label>{t(lang, "product")}</Label>
            <select name="productId" className="w-full rounded-lg border border-line bg-white px-3 py-2.5" defaultValue={products[0]?.id}>
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
            <TextInput name="model" />
            <span className="mt-1 block text-xs text-muted">{t(lang, "modelHint")}</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "margin")}</Label>
              <TextInput name="margin" inputMode="decimal" dir="ltr" placeholder="30" />
            </label>
            <label>
              <Label>{t(lang, "retail")}</Label>
              <TextInput name="retail" inputMode="decimal" dir="ltr" />
            </label>
          </div>
          <p className="text-sm text-muted">{t(lang, "openingHelp")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "firstQty")}</Label>
              <TextInput name="firstQty" inputMode="numeric" dir="ltr" />
            </label>
            <label>
              <Label>{t(lang, "firstCost")}</Label>
              <TextInput name="firstCost" inputMode="decimal" dir="ltr" />
            </label>
          </div>
          <SubmitButton label={t(lang, "savePart")} />
        </ActionForm>
      </Card>
    </div>
  );
}
