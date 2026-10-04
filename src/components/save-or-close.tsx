"use client";

import { buttonClass } from "./ui";
import { SubmitButton } from "./form";

export function SaveOrClose({ saveLabel, closeLabel }: { saveLabel: string; closeLabel: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="intent" value="save" />
      <SubmitButton label={saveLabel} />
      <button
        type="submit"
        className={buttonClass("ghost")}
        onClick={(event) => {
          const intent = event.currentTarget.form?.elements.namedItem("intent");
          if (intent instanceof HTMLInputElement) intent.value = "close";
        }}
      >
        {closeLabel}
      </button>
    </div>
  );
}
