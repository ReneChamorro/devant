import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";

export default function ProfePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-6 text-4xl">Profesores</h1>
      <DemoBanner>
        El inicio de sesión real (correo y contraseña) se conecta en la siguiente fase. Por ahora puedes ver cómo funciona la vista del día.
      </DemoBanner>
      <form className="card space-y-4 p-6" action="/profe/dia">
        <div className="space-y-2">
          <label htmlFor="correo" className="block text-sm font-medium">Correo</label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            disabled
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink disabled:opacity-60"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="clave" className="block text-sm font-medium">Contraseña</label>
          <input
            id="clave"
            type="password"
            autoComplete="current-password"
            disabled
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink disabled:opacity-60"
          />
        </div>
        <Link href="/profe/dia" className="btn btn-gold w-full">Entrar en modo demostración</Link>
      </form>
    </div>
  );
}
