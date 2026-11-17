"use server";

import { redirect } from "next/navigation";
import { requestLoginCode, verifyLoginCode } from "@/lib/family-auth";
import { FAMILIES_ENABLED } from "@/lib/site";

export type RequestState =
  | { step: "email" }
  | { step: "email"; error: string }
  | { step: "code"; email: string; devCode?: string };

export async function requestCodeAction(_prev: RequestState, fd: FormData): Promise<RequestState> {
  if (!FAMILIES_ENABLED) return { step: "email", error: "Esta función todavía no está disponible." };
  const email = String(fd.get("correo") ?? "");
  const res = await requestLoginCode(email);
  if (!res.ok) return { step: "email", error: res.error };
  return { step: "code", email: email.trim().toLowerCase(), devCode: res.devCode };
}

export type VerifyState = { error?: string } | null;

export async function verifyCodeAction(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  if (!FAMILIES_ENABLED) return { error: "Esta función todavía no está disponible." };
  const res = await verifyLoginCode(String(fd.get("correo") ?? ""), String(fd.get("codigo") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/familia");
}
