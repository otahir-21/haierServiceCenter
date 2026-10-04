import { redirect } from "next/navigation";
import { createComplaint } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Label, PageHeader, TextArea, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function NewComplaintPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const techs = await prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title={t(lang, "newComplaint")} text={t(lang, "freeOrCharge")} />
      <Card className="max-w-2xl">
        <ActionForm action={createComplaint} lang={lang} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "customerName")}</Label>
              <TextInput name="customerName" required />
            </label>
            <label>
              <Label>{t(lang, "phone")}</Label>
              <TextInput name="phone" required dir="ltr" inputMode="tel" />
            </label>
          </div>
          <label>
            <Label>{t(lang, "address")}</Label>
            <TextInput name="address" />
            <span className="mt-1 block text-xs text-muted">{t(lang, "addressHint")}</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "product")}</Label>
              <TextInput name="productName" />
            </label>
            <label>
              <Label>{t(lang, "model")}</Label>
              <TextInput name="model" />
            </label>
          </div>
          <label>
            <Label>{t(lang, "complaintDetail")}</Label>
            <TextArea name="detail" />
          </label>
          <fieldset className="flex flex-wrap gap-4 text-sm font-semibold">
            <legend className="mb-2 w-full">{t(lang, "fieldOrWorkshop")}</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="visitType" value="FIELD" defaultChecked />
              {t(lang, "field")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visitType" value="WORKSHOP" />
              {t(lang, "workshop")}
            </label>
          </fieldset>
          <label>
            <Label>{t(lang, "technician")}</Label>
            <TextInput name="technicianName" list="complaint-techs" required />
            <datalist id="complaint-techs">
              {techs.map((tech) => (
                <option key={tech.id} value={tech.name} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-muted">{t(lang, "exampleNames")}</span>
          </label>
          <label>
            <Label>{t(lang, "estimate")}</Label>
            <TextInput name="estimate" inputMode="decimal" dir="ltr" defaultValue="0" />
            <span className="mt-1 block text-xs text-muted">{t(lang, "estimateHelp")}</span>
          </label>
          <SubmitButton label={t(lang, "registerComplaint")} />
        </ActionForm>
      </Card>
    </div>
  );
}
