"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { Label, TextInput } from "./ui";

export type PartChoice = {
  id: string;
  code: string;
  name: string;
  model: string;
  product: string;
  retailPrice: number;
};

export function PartSelect({
  parts,
  searchLabel,
  partLabel,
  retailLabel,
}: {
  parts: PartChoice[];
  searchLabel: string;
  partLabel: string;
  retailLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [id, setId] = useState(parts[0]?.id ?? "");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((part) =>
      `${part.code} ${part.name} ${part.model} ${part.product}`.toLowerCase().includes(q),
    );
  }, [parts, query]);
  const selected = parts.find((part) => part.id === id) ?? filtered[0];
  const shown =
    selected && !filtered.some((part) => part.id === selected.id) ? [selected, ...filtered] : filtered;

  return (
    <div className="grid gap-4">
      <label>
        <Label>{searchLabel}</Label>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label>
        <Label>{partLabel}</Label>
        <select
          name="partId"
          value={selected?.id ?? ""}
          onChange={(event) => setId(event.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
        >
          {shown.map((part) => (
            <option key={part.id} value={part.id}>
              {part.code} — {part.name}
              {part.model ? ` — ${part.model}` : ""} — {part.product}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="num text-sm text-muted">
          {retailLabel}: {money(selected.retailPrice)}
        </p>
      ) : null}
    </div>
  );
}
