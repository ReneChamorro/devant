import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FAMILIES_ENABLED } from "@/lib/site";
import type { Metadata } from "next";
import { EntrarForm } from "@/components/entrar-form";
import { getFamilyViewer } from "@/lib/family-auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  if (!FAMILIES_ENABLED) notFound();
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-4xl">Familias</h1>
      <p className="mb-6 text-muted">Entra con tu correo para ver la semana y los bailes de tus bailarinas.</p>
      <Suspense fallback={<div className="card h-56 animate-pulse bg-surface-2/60" role="status" aria-label="Cargando" />}>
        <EntrarBody />
      </Suspense>
    </div>
  );
}

async function EntrarBody() {
  await connection();
  if (await getFamilyViewer()) redirect("/familia");
  return <EntrarForm />;
}
