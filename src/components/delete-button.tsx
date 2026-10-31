"use client";

import { Trash } from "@phosphor-icons/react";

/** Submit button that asks for confirmation first. Lives inside a <form action={...}>. */
export function DeleteButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="btn btn-ghost !min-h-10 !px-3 text-sm text-bad"
      aria-label={label}
      onClick={(e) => {
        if (!window.confirm(`${label}? No se puede deshacer.`)) e.preventDefault();
      }}
    >
      <Trash size={18} aria-hidden="true" /> Eliminar
    </button>
  );
}
