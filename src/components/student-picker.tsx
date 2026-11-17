"use client";

import { useState } from "react";
import { KIND_INFO, LEVEL_KINDS, type Student } from "@/lib/schedule";

/**
 * Pick students from the roster: search, tick, save. Grouped by level so a long roster stays orderly.
 * Used for the cast of a dance and for linking students to a family.
 */
export function StudentPicker({
  students,
  initial,
  action,
  hidden,
  idPrefix,
  submitLabel,
}: {
  students: Student[];
  initial: string[];
  action: (formData: FormData) => void | Promise<void>;
  /** Extra fields the server action needs, e.g. the dance or family id. */
  hidden: Record<string, string>;
  idPrefix: string;
  submitLabel: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (students.length === 0) {
    return <p className="text-sm text-muted">Aún no hay alumnas. Agrégalas primero en la sección Alumnas.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="space-y-2">
        <label htmlFor={`q-${idPrefix}`} className="block text-sm font-medium">Buscar alumna</label>
        <input
          id={`q-${idPrefix}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="min-h-12 w-full max-w-sm rounded-xl border border-line bg-bg px-4 text-ink"
        />
      </div>

      <div className="space-y-5">
        {LEVEL_KINDS.map((level) => {
          const group = students.filter((s) => s.level === level);
          if (group.length === 0) return null;
          const visible = group.filter((s) => s.name.toLowerCase().includes(q));
          return (
            <fieldset key={level} className={visible.length === 0 ? "hidden" : "space-y-2"}>
              <legend className="mb-2 text-sm font-semibold text-muted">{KIND_INFO[level].label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.map((s) => {
                  const on = selected.has(s.id);
                  const shown = s.name.toLowerCase().includes(q);
                  return (
                    <label
                      key={s.id}
                      className={`btn !min-h-11 cursor-pointer text-sm ${shown ? "" : "hidden"} ${
                        on ? "border-gold bg-gold text-gold-ink" : "btn-ghost"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="studentIds"
                        value={s.id}
                        checked={on}
                        onChange={() => toggle(s.id)}
                        className="sr-only"
                      />
                      {s.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-gold">{submitLabel}</button>
        <p className="tabular text-sm text-muted" role="status" aria-live="polite">
          {selected.size} {selected.size === 1 ? "alumna seleccionada" : "alumnas seleccionadas"}
        </p>
      </div>
    </form>
  );
}
