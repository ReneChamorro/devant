import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { buildReport, type ReportFilter } from "@/lib/attendance";
import { todayCaracas } from "@/lib/schedule";
import { loadAttendance, loadProductions } from "@/lib/store";

export const metadata = { title: "Reportes" };

const field = "min-h-12 rounded-xl border border-line bg-bg px-4 text-ink";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function ReportesPage({ searchParams }: PageProps<"/profe/reportes">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Reportes</h1>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <ReportesBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReportesBody({ searchParams }: { searchParams: PageProps<"/profe/reportes">["searchParams"] }) {
  await connection();
  const teacher = await requireTeacher();
  const sp = await searchParams;

  const hasQuery = Object.keys(sp).length > 0;
  const month = hasQuery ? (first(sp.mes) ?? "") : todayCaracas().slice(0, 7);
  const typeRaw = first(sp.tipo);
  const type: ReportFilter["type"] = typeRaw === "class" || typeRaw === "rehearsal" ? typeRaw : "all";
  const danceId = first(sp.baile) ?? "";

  const [{ taken, records }, productions] = await Promise.all([loadAttendance(), loadProductions()]);
  const rows = buildReport(taken, records, { month: /^\d{4}-\d{2}$/.test(month) ? month : "", type, danceId });

  const qs = new URLSearchParams({ mes: month, tipo: type, baile: danceId }).toString();

  return (
    <>
      <TeacherNav current="reportes" name={teacher.name} />
      <p className="mb-6 max-w-[60ch] text-sm text-muted">
        Cuenta las listas guardadas. Presente y tarde cuentan como asistencia; ausente y justificada cuentan como falta.
      </p>

      <form method="get" className="card mb-8 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-2">
          <label htmlFor="mes" className="block text-sm font-medium">Mes</label>
          <input id="mes" name="mes" type="month" defaultValue={month} className={field} />
        </div>
        <div className="space-y-2">
          <label htmlFor="tipo" className="block text-sm font-medium">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={type} className={field}>
            <option value="all">Clases y ensayos</option>
            <option value="class">Solo clases</option>
            <option value="rehearsal">Solo ensayos</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="baile" className="block text-sm font-medium">Baile</label>
          <select id="baile" name="baile" defaultValue={danceId} className={field}>
            <option value="">Todos</option>
            {productions.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.dances.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-gold">Ver</button>
        <Link href={`/profe/reportes/export?${qs}`} className="btn btn-ghost" prefetch={false}>
          <DownloadSimple size={18} aria-hidden="true" /> Descargar para Excel
        </Link>
      </form>

      {rows.length === 0 ? (
        <p className="card px-5 py-8 text-center text-muted">
          No hay listas guardadas con esos filtros. Guarda una lista en la vista del día para ver datos aquí.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Alumna</th>
                <th scope="col" className="tabular px-2 py-3 text-right font-medium">Sesiones</th>
                <th scope="col" className="tabular px-2 py-3 text-right font-medium">Presente</th>
                <th scope="col" className="tabular px-2 py-3 text-right font-medium">Tarde</th>
                <th scope="col" className="tabular px-2 py-3 text-right font-medium">Ausente</th>
                <th scope="col" className="tabular px-2 py-3 text-right font-medium">Justificada</th>
                <th scope="col" className="tabular px-4 py-3 text-right font-medium">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link href={`/profe/alumnas/${r.id}`} className="hover:underline">{r.name}</Link>
                  </th>
                  <td className="tabular px-2 py-3 text-right">{r.expected}</td>
                  <td className="tabular px-2 py-3 text-right text-ok">{r.present}</td>
                  <td className="tabular px-2 py-3 text-right text-warn">{r.late}</td>
                  <td className="tabular px-2 py-3 text-right text-bad">{r.absent}</td>
                  <td className="tabular px-2 py-3 text-right text-gold-text">{r.excused}</td>
                  <td className="tabular px-4 py-3 text-right font-semibold">{r.rate === null ? "-" : `${r.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
