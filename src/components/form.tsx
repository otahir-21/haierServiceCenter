"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { isMessageKey, t, type Lang } from "@/lib/i18n";
import type { ActionState } from "@/lib/input";
import { buttonClass } from "./ui";

export function ActionForm({
  action,
  lang,
  children,
  className = "",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  lang: Lang;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error && isMessageKey(state.error) ? (
        <p className="mb-4 rounded-lg border border-brand/20 bg-red-50 px-3 py-2 text-sm text-brand">
          {t(lang, state.error)}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass()} w-full sm:w-auto`}>
      {pending ? "…" : label}
    </button>
  );
}
