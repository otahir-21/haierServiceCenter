import { redirect } from "next/navigation";
import { addExpense } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Flash, Label, PageHeader, TextInput } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/catalog";
import { currentUser } from "@/lib/auth";
import { todayInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { dayOnly, money } from "@/lib/format";
import { categoryKey, t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  const lang = await getLang();
  const { msg } = await searchParams;
  const rows = await prisma.expense.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 40,
  });
  return (
    <div>
      <PageHeader title={t(lang, "expenseTitle")} text={t(lang, "expenseHelp")} />
      <Flash msg={msg} lang={lang} />
      <Card className="max-w-2xl">
        <ActionForm action={addExpense} lang={lang} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "date")}</Label>
              <TextInput name="date" type="date" dir="ltr" required defaultValue={todayInputValue()} />
            </label>
            <label>
              <Label>{t(lang, "category")}</Label>
              <select name="category" className="w-full rounded-lg border border-line bg-white px-3 py-2.5" defaultValue="RENT">
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(lang, categoryKey(category))}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <Label>{t(lang, "personOrTitle")}</Label>
            <TextInput name="title" required placeholder={t(lang, "salary")} />
          </label>
          <label>
            <Label>{t(lang, "amount")}</Label>
            <TextInput name="amount" inputMode="decimal" dir="ltr" required />
          </label>
          <label>
            <Label>{t(lang, "expenseNote")}</Label>
            <TextInput name="note" />
          </label>
          <SubmitButton label={t(lang, "addExpense")} />
        </ActionForm>
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t(lang, "recent")}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="data-table w-full text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              <th className="px-4 py-3">{t(lang, "date")}</th>
              <th className="px-4 py-3">{t(lang, "category")}</th>
              <th className="px-4 py-3">{t(lang, "personOrTitle")}</th>
              <th className="px-4 py-3">{t(lang, "figure")}</th>
              <th className="px-4 py-3">{t(lang, "who")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3" data-label={t(lang, "date")}>{dayOnly(row.date)}</td>
                <td className="px-4 py-3" data-label={t(lang, "category")}>{t(lang, categoryKey(row.category))}</td>
                <td className="px-4 py-3" data-label={t(lang, "personOrTitle")}>
                  {row.title}
                  {row.note ? <span className="block text-xs text-muted">{row.note}</span> : null}
                </td>
                <td className="num px-4 py-3" data-label={t(lang, "figure")}>{money(row.amount)}</td>
                <td className="px-4 py-3" data-label={t(lang, "who")}>{row.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
