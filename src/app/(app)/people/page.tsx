import { redirect } from "next/navigation";
import { addTechnician, createLogin, setUserPassword, setUserRole, toggleTechnician, toggleUser } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { buttonClass, Card, Flash, Label, PageHeader, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const { msg } = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const techs = await prisma.technician.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title={t(lang, "peopleTitle")} text={t(lang, "peopleHelp")} />
      <Flash msg={msg} lang={lang} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t(lang, "newLogin")}</h2>
          <ActionForm action={createLogin} lang={lang} className="grid gap-4">
            <label>
              <Label>{t(lang, "yourName")}</Label>
              <TextInput name="name" required />
            </label>
            <label>
              <Label>{t(lang, "username")}</Label>
              <TextInput name="username" required dir="ltr" />
            </label>
            <label>
              <Label>{t(lang, "password")}</Label>
              <TextInput name="password" type="password" required dir="ltr" />
              <span className="mt-1 block text-xs text-muted">{t(lang, "passwordHelp")}</span>
            </label>
            <label>
              <Label>{t(lang, "role")}</Label>
              <select name="role" defaultValue="STAFF" className="w-full rounded-lg border border-line bg-white px-3 py-2.5">
                <option value="STAFF">{t(lang, "staff")}</option>
                <option value="ADMIN">{t(lang, "admin")}</option>
              </select>
            </label>
            <SubmitButton label={t(lang, "createLogin")} />
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t(lang, "addTechnician")}</h2>
          <p className="mb-4 text-sm text-muted">{t(lang, "techHelp")}</p>
          <ActionForm action={addTechnician} lang={lang} className="grid gap-4">
            <label>
              <Label>{t(lang, "technicianList")}</Label>
              <TextInput name="name" required placeholder={t(lang, "exampleNames")} />
            </label>
            <label>
              <Label>{t(lang, "kind")}</Label>
              <select name="kind" defaultValue="FIELD" className="w-full rounded-lg border border-line bg-white px-3 py-2.5">
                <option value="FIELD">{t(lang, "fieldOnly")}</option>
                <option value="WORKSHOP">{t(lang, "workshopOnly")}</option>
                <option value="BOTH">{t(lang, "both")}</option>
              </select>
            </label>
            <SubmitButton label={t(lang, "addTechnician")} />
          </ActionForm>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "staffLogins")}</h2>
      <div className="grid gap-3">
        {users.map((row) => (
          <article key={row.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="num text-sm text-muted" dir="ltr">
                  {row.username}
                  {row.id === user.id ? ` · ${t(lang, "yourLogin")}` : ""}
                </p>
              </div>
              <p className="text-sm">{row.active ? t(lang, "on") : t(lang, "off")}</p>
            </div>
            <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
              <form action={setUserRole} className="grid gap-2 sm:flex sm:items-end">
                <input type="hidden" name="id" value={row.id} />
                <label className="text-sm font-semibold">
                  {t(lang, "role")}
                  <select name="role" defaultValue={row.role} className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 sm:w-auto">
                    <option value="ADMIN">{t(lang, "admin")}</option>
                    <option value="STAFF">{t(lang, "staff")}</option>
                  </select>
                </label>
                <button className={`${buttonClass("ghost")} w-full sm:w-auto`} type="submit">
                  {t(lang, "changeRole")}
                </button>
              </form>
              <form action={toggleUser}>
                <input type="hidden" name="id" value={row.id} />
                <button className={`${buttonClass("ghost")} w-full sm:w-auto`} type="submit">
                  {row.active ? t(lang, "turnOff") : t(lang, "turnOn")}
                </button>
              </form>
            </div>
            <ActionForm action={setUserPassword} lang={lang} className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-end">
              <input type="hidden" name="id" value={row.id} />
              <label className="min-w-0 text-sm font-semibold sm:w-56">
                {t(lang, "newPassword")}
                <TextInput name="password" type="password" dir="ltr" className="mt-1" />
              </label>
              <SubmitButton label={t(lang, "updatePassword")} />
            </ActionForm>
          </article>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "technicians")}</h2>
      <div className="grid gap-2">
        {techs.map((tech) => (
          <form key={tech.id} action={toggleTechnician} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <input type="hidden" name="id" value={tech.id} />
            <span>
              {tech.name}
              <span className="mx-2 text-sm text-muted">
                {tech.kind === "WORKSHOP" ? t(lang, "workshop") : tech.kind === "BOTH" ? t(lang, "both") : t(lang, "field")}
                {" · "}
                {tech.active ? t(lang, "on") : t(lang, "off")}
              </span>
            </span>
            <button className="min-h-11 shrink-0 text-sm font-semibold text-brand" type="submit">
              {tech.active ? t(lang, "turnOff") : t(lang, "turnOn")}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
