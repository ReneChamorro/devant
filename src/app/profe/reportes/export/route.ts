import { getTeacher } from "@/lib/auth";
import { buildReport, toCsv, type ReportFilter } from "@/lib/attendance";
import { loadAttendance } from "@/lib/store";

/** CSV of the attendance report. Teachers only. */
export async function GET(request: Request) {
  if (!(await getTeacher())) return new Response("No autorizado", { status: 401 });

  const sp = new URL(request.url).searchParams;
  const mes = sp.get("mes") ?? "";
  const tipoRaw = sp.get("tipo");
  const type: ReportFilter["type"] = tipoRaw === "class" || tipoRaw === "rehearsal" ? tipoRaw : "all";

  const { taken, records } = await loadAttendance();
  const rows = buildReport(taken, records, {
    month: /^\d{4}-\d{2}$/.test(mes) ? mes : "",
    type,
    danceId: sp.get("baile") ?? "",
  });

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asistencia${mes ? `-${mes}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
