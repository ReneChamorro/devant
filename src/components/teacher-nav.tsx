import Link from "next/link";
import { logoutAction } from "@/app/profe/actions";

const LINKS = [
  { id: "dia", href: "/profe/dia", label: "Vista del día" },
  { id: "horario", href: "/profe/horario", label: "Horario" },
  { id: "obras", href: "/profe/obras", label: "Obras y bailes" },
  { id: "alumnas", href: "/profe/alumnas", label: "Alumnas" },
] as const;

export function TeacherNav({ current, name }: { current: (typeof LINKS)[number]["id"]; name: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <nav aria-label="Zona de profesores" className="flex flex-wrap gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            aria-current={current === l.id ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors duration-150 ${
              current === l.id ? "bg-gold/15 text-gold-text" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <form action={logoutAction} className="flex items-center gap-3 text-sm text-muted">
        <span>{name}</span>
        <button type="submit" className="btn btn-ghost !min-h-10 !px-4">Cerrar sesión</button>
      </form>
    </div>
  );
}
