"use server";

import { revalidatePath } from "next/cache";
import { checkFamilyPin } from "@/lib/auth";
import { buildFamilyData, isExpectedAt, type FamilyData } from "@/lib/family";
import { DEMO_FAMILIES, isAvailability } from "@/lib/schedule";
import { setResponse } from "@/lib/store";

export type UnlockResult = { ok: true; data: FamilyData } | { ok: false; reason: "bad" | "locked" };

/** Checks the PIN on the server and only then returns the family's data. */
export async function unlockFamilyAction(token: string, pin: string): Promise<UnlockResult> {
  const family = DEMO_FAMILIES[String(token)];
  if (!family) return { ok: false, reason: "bad" };
  const check = checkFamilyPin(token, family.pin, String(pin).slice(0, 8));
  if (check !== "ok") return { ok: false, reason: check };
  const data = await buildFamilyData(token);
  return data ? { ok: true, data } : { ok: false, reason: "bad" };
}

/** Saves (or clears, with null) a family's answer for one student and session. */
export async function setAvailabilityAction(
  token: string,
  pin: string,
  sessionId: string,
  studentId: string,
  status: string | null,
): Promise<{ ok: boolean }> {
  const family = DEMO_FAMILIES[String(token)];
  if (!family || checkFamilyPin(token, family.pin, String(pin).slice(0, 8)) !== "ok") return { ok: false };
  if (!family.studentIds.includes(studentId)) return { ok: false };
  if (status !== null && !isAvailability(status)) return { ok: false };
  if (!(await isExpectedAt(String(sessionId), studentId))) return { ok: false };

  await setResponse(sessionId, studentId, "availability", status);
  revalidatePath("/profe/dia");
  return { ok: true };
}
