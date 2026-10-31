import { Suspense } from "react";
import Link from "next/link";
import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

const FALLBACK_LINKS = [
  { href: "/clases", label: "Clases" },
  { href: "/calendario", label: "Calendario" },
  { href: "/inscripciones", label: "Inscripciones" },
];

/** Same links without the active-page highlight, shown while the pathname streams in. */
function NavFallback() {
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {FALLBACK_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-muted">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <Suspense fallback={<NavFallback />}>
            <NavLinks />
          </Suspense>
          <Link href="/profe" className="btn btn-ghost hidden !min-h-10 !px-4 md:inline-flex">
            Profesores
          </Link>
        </div>
      </div>
    </header>
  );
}
