"use server";

import { redirect } from "next/navigation";
import { endFamilySession } from "@/lib/family-auth";

export async function logoutFamilyAction() {
  await endFamilySession();
  redirect("/entrar");
}
