import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setup } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { LangSwitch } from "@/components/lang-switch";
import { Card, Label, PageHeader, TextInput } from "@/components/ui";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await prisma.user.count()) > 0) redirect("/login");
  const lang = await getLang();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-[0.16em] text-brand">HAIER</p>
        <div className="rounded-full bg-ink">
          <Suspense fallback={null}>
            <LangSwitch lang={lang} />
          </Suspense>
        </div>
      </div>
      <PageHeader title={t(lang, "setupTitle")} text={t(lang, "setupHelp")} />
      <Card>
        <ActionForm action={setup} lang={lang} className="grid gap-4">
          <label>
            <Label>{t(lang, "yourName")}</Label>
            <TextInput name="name" required />
          </label>
          <label>
            <Label>{t(lang, "username")}</Label>
            <TextInput name="username" autoComplete="username" required dir="ltr" />
          </label>
          <label>
            <Label>{t(lang, "password")}</Label>
            <TextInput name="password" type="password" autoComplete="new-password" required dir="ltr" />
            <span className="mt-1 block text-xs text-muted">{t(lang, "passwordHelp")}</span>
          </label>
          <label>
            <Label>{t(lang, "confirmPassword")}</Label>
            <TextInput name="confirm" type="password" autoComplete="new-password" required dir="ltr" />
          </label>
          <SubmitButton label={t(lang, "createAdmin")} />
        </ActionForm>
      </Card>
    </main>
  );
}
