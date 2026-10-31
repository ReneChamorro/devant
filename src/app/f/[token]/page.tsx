import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { FamilyWeek } from "@/components/family-week";
import { ListSkeleton } from "@/components/list-skeleton";
import { DEMO_FAMILIES } from "@/lib/schedule";

export default function FamilyPage({ params }: PageProps<"/f/[token]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Mi semana</h1>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <FamilyBody params={params} />
      </Suspense>
    </div>
  );
}

async function FamilyBody({ params }: { params: PageProps<"/f/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const family = DEMO_FAMILIES[token];
  if (!family) notFound();

  // The schedule and the children's names are only sent after the PIN is checked on the server.
  return (
    <>
      <DemoBanner>Enlace de demostración. PIN de ejemplo: {family.pin}.</DemoBanner>
      <FamilyWeek token={token} />
    </>
  );
}
