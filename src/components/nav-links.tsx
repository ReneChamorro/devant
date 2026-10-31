"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";

const LINKS = [
  { href: "/clases", label: "Clases" },
  { href: "/calendario", label: "Calendario" },
  { href: "/inscripciones", label: "Inscripciones" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors duration-150 ${
      pathname.startsWith(href) ? "text-gold-text" : "text-muted hover:text-ink"
    }`;

  return (
    <>
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={pathname.startsWith(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="btn btn-ghost !px-0 w-11 md:hidden"
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} weight="regular" /> : <List size={22} weight="regular" />}
      </button>

      {open && (
        <div
          id="menu-movil"
          className="absolute inset-x-0 top-full border-b border-line bg-bg-2 px-4 pb-4 md:hidden"
        >
          <nav aria-label="Principal móvil" className="mx-auto flex max-w-6xl flex-col">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`${linkClass(l.href)} min-h-12 content-center`}>
                {l.label}
              </Link>
            ))}
            <Link href="/profe" onClick={() => setOpen(false)} className={`${linkClass("/profe")} min-h-12 content-center`}>
              Profesores
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
