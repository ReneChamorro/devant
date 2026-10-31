"use client";

import { useState } from "react";
import { saveCastAction } from "@/app/profe/actions";
import { KIND_INFO, LEVEL_KINDS, type Student } from "@/lib/schedule";

/** Pick who dances in one dance: search, tick, save. Level groups keep a long roster orderly. */
export function CastPicker({
  productionId,
  danceId,
  students,
  initial,
}: {
  productionId: string;
  danceId: string;
  students: Student[];
  initial: string[];
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
    <form action={saveCastAction} className="space-y-4">
      <input type="hidden" name="productionId" value={productionId} />
      <input type="hidden" name="danceId" value={danceId} />

      <div className="space-y-2">
        <label htmlFor={`q-${danceId}`} className="block text-sm font-medium">Buscar alumna</label>
        <input
          id={`q-${danceId}`}
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
        <button type="submit" className="btn btn-gold">Guardar elenco</button>
        <p className="tabular text-sm text-muted" role="status" aria-live="polite">
          {selected.size} {selected.size === 1 ? "alumna seleccionada" : "alumnas seleccionadas"}
        </p>
      </div>
    </form>
  );
}
