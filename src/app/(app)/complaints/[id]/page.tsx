import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { reopenComplaint, takePartForComplaint, updateComplaint } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { SaveOrClose } from "@/components/save-or-close";
import { buttonClass, Card, Flash, Label, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money, when } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function ComplaintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const { id } = await params;
  const { msg } = await searchParams;
  const job = await prisma.complaint.findUnique({
    where: { id },
    omit: { billImage: true },
    include: {
      moves: { include: { part: { select: { code: true, name: true } } }, orderBy: { createdAt: "desc" } },
      createdBy: { select: { name: true } },
    },
  });
  if (!job) notFound();
  const parts = await prisma.part.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const techs = await prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title={job.customerName} text={t(lang, "feedbackHelp")} />
      <Flash msg={msg} lang={lang} />
      <p className="mb-4 text-sm text-muted">
        <span className="num" dir="ltr">
          {job.phone}
        </span>
        {" · "}
        {job.status === "CLOSED" ? t(lang, "closed") : t(lang, "stillOpen")}
        {" · "}
        {t(lang, "registered")} {when(job.createdAt)} · {job.createdBy.name}
      </p>
      <p className="mb-4 max-w-2xl text-sm text-muted">{t(lang, "closeHelp")}</p>

      <Card className="max-w-3xl">
        <ActionForm action={updateComplaint} lang={lang} encType="multipart/form-data" className="grid gap-4">
          <input type="hidden" name="id" value={job.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "customerName")}</Label>
              <TextInput name="customerName" required defaultValue={job.customerName} />
            </label>
            <label>
              <Label>{t(lang, "phone")}</Label>
              <TextInput name="phone" required dir="ltr" defaultValue={job.phone} />
            </label>
          </div>
          <label>
            <Label>{t(lang, "address")}</Label>
            <TextInput name="address" defaultValue={job.address} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "product")}</Label>
              <TextInput name="productName" defaultValue={job.productName} />
            </label>
            <label>
              <Label>{t(lang, "model")}</Label>
              <TextInput name="model" defaultValue={job.model} />
            </label>
          </div>
          <label>
            <Label>{t(lang, "complaintDetail")}</Label>
            <TextArea name="detail" defaultValue={job.detail} />
          </label>
          <fieldset className="flex flex-wrap gap-4 text-sm font-semibold">
            <legend className="mb-2 w-full">{t(lang, "where")}</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="visitType" value="FIELD" defaultChecked={job.visitType !== "WORKSHOP"} />
              {t(lang, "field")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visitType" value="WORKSHOP" defaultChecked={job.visitType === "WORKSHOP"} />
              {t(lang, "workshop")}
            </label>
          </fieldset>
          <label>
            <Label>{t(lang, "technician")}</Label>
            {techs.length > 0 ? (
              <Select name="technicianName" required defaultValue={job.technicianName}>
                {!techs.some((tech) => tech.name === job.technicianName) ? (
                  <option value={job.technicianName}>{job.technicianName}</option>
                ) : null}
                {techs.map((tech) => (
                  <option key={tech.id} value={tech.name}>
                    {tech.name}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput name="technicianName" required defaultValue={job.technicianName} />
            )}
          </label>
          <label>
            <Label>{t(lang, "estimate")}</Label>
            <TextInput name="estimate" inputMode="decimal" dir="ltr" defaultValue={job.estimate} />
            <span className="mt-1 block text-xs text-muted">{t(lang, "estimateHelp")}</span>
          </label>
          <label>
            <Label>{t(lang, "laborWork")}</Label>
            <TextArea name="laborWork" defaultValue={job.laborWork} />
            <span className="mt-1 block text-xs text-muted">{t(lang, "laborWorkHelp")}</span>
          </label>
          <label>
            <Label>{t(lang, "laborCharge")}</Label>
            <TextInput name="laborCharge" inputMode="decimal" dir="ltr" defaultValue={job.laborCharge} />
            <span className="mt-1 block text-xs text-muted">{t(lang, "laborChargeHelp")}</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "billNumber")}</Label>
              <TextInput name="billNumber" dir="ltr" defaultValue={job.billNumber} />
            </label>
            <label>
              <Label>{t(lang, "billPhoto")}</Label>
              <TextInput name="billPhoto" type="file" accept="image/jpeg,image/png,image/webp" />
              <span className="mt-1 block text-xs text-muted">{t(lang, "billPhotoHelp")}</span>
              {job.billImageType ? (
                <a className="mt-1 inline-block text-sm font-semibold text-brand" href={`/bills/${job.id}`} target="_blank">
                  {t(lang, "viewBill")}
                </a>
              ) : null}
            </label>
          </div>
          <h2 className="text-lg font-semibold">{t(lang, "feedback")}</h2>
          <label>
            <Label>{t(lang, "problem")}</Label>
            <TextArea name="problemFound" defaultValue={job.problemFound} />
          </label>
          <label>
            <Label>{t(lang, "partsFitted")}</Label>
            <TextArea name="partsFitted" defaultValue={job.partsFitted} />
          </label>
          <label>
            <Label>{t(lang, "offer")}</Label>
            <TextArea name="offerGiven" defaultValue={job.offerGiven} />
          </label>
          <label>
            <Label>{t(lang, "solution")}</Label>
            <TextArea name="solution" defaultValue={job.solution} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Label>{t(lang, "crt")}</Label>
              <TextInput name="crt" dir="ltr" defaultValue={job.crtNumber} />
            </label>
            <label>
              <Label>{t(lang, "collection")}</Label>
              <TextInput name="collection" inputMode="decimal" dir="ltr" defaultValue={job.collectionAmount} />
              <span className="mt-1 block text-xs text-muted">{t(lang, "collectionHelp")}</span>
            </label>
          </div>
          <SaveOrClose saveLabel={t(lang, "saveChanges")} closeLabel={t(lang, "closeJob")} />
        </ActionForm>
      </Card>

      {job.status === "CLOSED" ? (
        <form action={reopenComplaint} className="mt-4">
          <input type="hidden" name="id" value={job.id} />
          <button className={buttonClass("ghost")} type="submit">
            {t(lang, "reopen")}
          </button>
        </form>
      ) : null}

      <section className="mt-8 max-w-3xl">
        <h2 className="mb-2 text-lg font-semibold">{t(lang, "partsOnJob")}</h2>
        <p className="mb-3 text-sm text-muted">{t(lang, "jobPartsHelp")}</p>
        {job.moves.length === 0 ? <p className="mb-3 text-sm text-muted">{t(lang, "noPartsOnJob")}</p> : null}
        <ul className="mb-4 grid gap-2">
          {job.moves.map((move) => (
            <li key={move.id} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
              {move.part.code} · {move.part.name} · {t(lang, "qtyOnJob")} {move.qty}
              {user.role === "ADMIN" ? <span className="num"> · {t(lang, "cost")} {money(move.qty * move.unitCost)}</span> : null}
            </li>
          ))}
        </ul>
        {parts.length > 0 ? (
          <Card>
            <ActionForm action={takePartForComplaint} lang={lang} className="grid gap-4 md:grid-cols-[1fr_8rem_auto] md:items-end">
              <input type="hidden" name="complaintId" value={job.id} />
              <label>
                <Label>{t(lang, "choosePart")}</Label>
                <select name="partId" className="w-full rounded-lg border border-line bg-white px-3 py-2.5">
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.code} — {part.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Label>{t(lang, "qty")}</Label>
                <TextInput name="qty" inputMode="numeric" dir="ltr" defaultValue="1" />
              </label>
              <SubmitButton label={t(lang, "takePart")} />
            </ActionForm>
          </Card>
        ) : null}
        <Link href="/complaints" className="mt-4 inline-block text-sm font-semibold text-brand">
          {t(lang, "back")}
        </Link>
      </section>
    </div>
  );
}
