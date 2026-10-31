"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkCredentials,
  endTeacherSession,
  requireTeacher,
  startTeacherSession,
} from "@/lib/auth";
import {
  addDance,
  addProduction,
  addStudent,
  deleteDance,
  deleteProduction,
  deleteStudent,
  deleteTemplate,
  loadProductions,
  renameDance,
  saveCast,
  saveTemplate,
  setActiveProduction,
  setDateCancelled,
  setPaused,
  setResponse,
  updateStudent,
} from "@/lib/store";
import { isAttendance, isClassKind, isValidISODate, KIND_INFO, LEVEL_KINDS, type Template } from "@/lib/schedule";

export type FormState = { errors?: Record<string, string>; message?: string } | null;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function str(fd: FormData, key: string, max: number) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function refresh() {
  for (const p of ["/", "/calendario", "/profe/dia", "/profe/horario", "/profe/obras", "/profe/alumnas"]) revalidatePath(p);
  revalidatePath("/profe/obras/[id]", "page");
  revalidatePath("/f/[token]", "page");
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "correo", 200);
  const password = String(fd.get("clave") ?? "").slice(0, 200);
  const result = checkCredentials(email, password);
  if (result === "locked") return { message: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." };
  if (result === "bad") return { message: "Correo o contraseña incorrectos." };
  await startTeacherSession();
  redirect("/profe/dia");
}

export async function logoutAction() {
  await endTeacherSession();
  redirect("/profe");
}

export async function saveTemplateAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const errors: Record<string, string> = {};

  const kindRaw = String(fd.get("kind") ?? "");
  if (!isClassKind(kindRaw)) errors.kind = "Elige el tipo de actividad.";
  const kind = isClassKind(kindRaw) ? kindRaw : "basico";

  const start = str(fd, "start", 5);
  const end = str(fd, "end", 5);
  if (!TIME.test(start)) errors.start = "Hora de inicio no válida.";
  if (!TIME.test(end)) errors.end = "Hora de fin no válida.";
  if (!errors.start && !errors.end && end <= start) errors.end = "La hora de fin debe ser después del inicio.";

  const repeat = String(fd.get("repeat") ?? "weekly");
  let days: number[] = [];
  let date: string | undefined;
  if (repeat === "once") {
    const d = str(fd, "date", 10);
    if (!isValidISODate(d)) errors.date = "Elige la fecha.";
    else date = d;
  } else {
    days = fd
      .getAll("days")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    days = [...new Set(days)];
    if (days.length === 0) errors.days = "Marca al menos un día.";
  }

  if (Object.keys(errors).length) return { errors };

  // Rehearsals can point at a production and the dances being rehearsed.
  let productionId: string | undefined;
  let productionName: string | undefined;
  let danceIds: string[] | undefined;
  let danceNames: string[] = [];
  if (kind === "ensayo") {
    const prods = await loadProductions();
    const prod = prods.find((p) => p.id === str(fd, "productionId", 80));
    if (prod) {
      productionId = prod.id;
      productionName = prod.name;
      const picked = new Set(fd.getAll("danceIds").map(String));
      const chosen = prod.dances.filter((d) => picked.has(d.id));
      danceIds = chosen.length ? chosen.map((d) => d.id) : undefined;
      danceNames = chosen.map((d) => d.name);
    } else {
      productionName = str(fd, "production", 60) || undefined;
    }
  }
  const typedTitle = str(fd, "title", 60);
  const autoTitle =
    kind === "ensayo" && danceNames.length ? `Ensayo: ${danceNames.join(", ")}`.slice(0, 60) : KIND_INFO[kind].label;

  const template: Omit<Template, "id"> & { id?: string } = {
    id: str(fd, "id", 80) || undefined,
    kind,
    title: typedTitle || autoTitle,
    teacher: str(fd, "teacher", 60),
    room: str(fd, "room", 40),
    days,
    date,
    start,
    end,
    production: productionName,
    productionId,
    danceIds,
    note: str(fd, "note", 200) || undefined,
  };

  await saveTemplate(template);
  refresh();
  redirect("/profe/horario");
}

export async function deleteTemplateAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteTemplate(id);
  refresh();
}

export async function togglePauseAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setPaused(id, fd.get("paused") === "1");
  refresh();
}

export async function cancelDateAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  const date = str(fd, "date", 10);
  if (id && isValidISODate(date)) await setDateCancelled(id, date, fd.get("cancelled") === "1");
  refresh();
}


/* ---------- students ---------- */

function levelOf(fd: FormData) {
  const v = String(fd.get("level") ?? "");
  return isClassKind(v) && LEVEL_KINDS.includes(v) ? v : null;
}

export async function addStudentAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const level = levelOf(fd);
  if (name && level) await addStudent(name, level);
  refresh();
}

export async function updateStudentAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  const name = str(fd, "name", 80);
  const level = levelOf(fd);
  if (id && name && level) await updateStudent(id, name, level);
  refresh();
}

export async function deleteStudentAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteStudent(id);
  refresh();
}

/* ---------- productions, dances and casting ---------- */

export async function addProductionAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  if (name) await addProduction(name);
  refresh();
}

export async function setActiveProductionAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setActiveProduction(id);
  refresh();
}

export async function deleteProductionAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteProduction(id);
  refresh();
  redirect("/profe/obras");
}

export async function addDanceAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const productionId = str(fd, "productionId", 80);
  if (name && productionId) await addDance(productionId, name);
  refresh();
}

export async function renameDanceAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  if (name && productionId && danceId) await renameDance(productionId, danceId, name);
  refresh();
}

export async function deleteDanceAction(fd: FormData) {
  await requireTeacher();
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  if (productionId && danceId) await deleteDance(productionId, danceId);
  refresh();
}

export async function saveCastAction(fd: FormData) {
  await requireTeacher();
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  const ids = fd.getAll("studentIds").map(String);
  if (productionId && danceId) await saveCast(productionId, danceId, ids);
  refresh();
}

/** Teacher marks who actually came. An empty mark clears it. */
export async function setAttendanceAction(sessionId: string, studentId: string, mark: string): Promise<{ ok: boolean }> {
  await requireTeacher();
  const sid = String(sessionId).slice(0, 120);
  const stid = String(studentId).slice(0, 80);
  if (!sid.includes("@") || !stid) return { ok: false };
  if (mark !== "" && !isAttendance(mark)) return { ok: false };
  await setResponse(sid, stid, "attendance", mark === "" ? null : (mark as "present" | "late" | "absent"));
  return { ok: true };
}
