import { redirect } from "next/navigation";
import { Suspense } from "react";
import { login } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { LangSwitch } from "@/components/lang-switch";
import { Card, Flash, Label, PageHeader, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if ((await prisma.user.count()) === 0) redirect("/setup");
  if (await currentUser()) redirect("/");
  const lang = await getLang();
  const { msg } = await searchParams;
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
      <PageHeader title={t(lang, "loginTitle")} text={t(lang, "loginHelp")} />
      <Flash msg={msg} lang={lang} />
      <Card>
        <ActionForm action={login} lang={lang} className="grid gap-4">
          <label>
            <Label>{t(lang, "username")}</Label>
            <TextInput name="username" autoComplete="username" required dir="ltr" />
          </label>
          <label>
            <Label>{t(lang, "password")}</Label>
            <TextInput name="password" type="password" autoComplete="current-password" required dir="ltr" />
          </label>
          <SubmitButton label={t(lang, "signIn")} />
        </ActionForm>
      </Card>
    </main>
  );
}
