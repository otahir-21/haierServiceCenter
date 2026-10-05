import { isMessageKey, t, type Lang } from "@/lib/i18n";

export function Flash({ msg, lang }: { msg?: string; lang: Lang }) {
  if (!msg || !isMessageKey(msg)) return null;
  return (
    <p className="mb-4 rounded-lg border border-ok/20 bg-green-50 px-3 py-2 text-sm text-ok">{t(lang, msg)}</p>
  );
}

export function PageHeader({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {text ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{text}</p> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-sm font-semibold">{children}</span>;
}

const control =
  "w-full min-h-11 rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-brand sm:text-sm";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} min-h-24 ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function buttonClass(kind: "primary" | "ghost" = "primary") {
  if (kind === "ghost") {
    return "inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper";
  }
  return "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-1 text-xl font-semibold break-words sm:text-2xl" dir="ltr">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}
