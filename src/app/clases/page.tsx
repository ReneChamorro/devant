import type { Metadata } from "next";
import Link from "next/link";
import { KIND_INFO, type ClassKind } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Clases y niveles",
  description: "Infantil, básico, intermedio, avanzado, puntas, pas de deux y variaciones en la Academia Devant.",
};

const GROUPS: { title: string; intro: string; kinds: ClassKind[] }[] = [
  { title: "Primeros pasos", intro: "Para quien empieza.", kinds: ["infantil", "basico"] },
  { title: "Técnica en crecimiento", intro: "Más control y preparación para el escenario.", kinds: ["intermedio", "avanzado"] },
  { title: "Escena", intro: "Zapatillas de punta, pareja y repertorio.", kinds: ["puntas", "pas-de-deux", "variaciones"] },
];

export default function ClasesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-12 max-w-2xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Clases y niveles</h1>
        <p className="text-muted">
          Clases a partir de los 3 años. Si no sabes en qué nivel inscribir a tu hija, la profesora la evalúa en una clase de prueba.
        </p>
      </header>

      <div className="space-y-14">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={g.title} className="grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <h2 id={g.title} className="text-2xl">{g.title}</h2>
              <p className="mt-1 text-muted">{g.intro}</p>
            </div>
            <ul className="space-y-3">
              {g.kinds.map((k) => (
                <li key={k} className="card p-5">
                  <h3 className="!font-sans text-xl font-semibold !text-ink">{KIND_INFO[k].label}</h3>
                  <p className="mt-1 text-muted">{KIND_INFO[k].blurb}</p>
                  {KIND_INFO[k].requirement && (
                    <p className="chip mt-3">Requisito: {KIND_INFO[k].requirement}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-3">
        <Link href="/inscripciones" className="btn btn-gold">Inscripciones abiertas</Link>
        <Link href="/calendario" className="btn btn-ghost">Ver horarios en el calendario</Link>
      </div>
    </div>
  );
}
