import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { FormationPlayer } from "@/components/choreo/formation-player";
import { ListSkeleton } from "@/components/list-skeleton";
import { initialsOf } from "@/lib/choreo";
import { requireFamilyViewer } from "@/lib/family-auth";
import { getChoreography, loadProductions, loadStudents } from "@/lib/store";

export const metadata = { title: "Baile" };

export default function BailePage({ params }: PageProps<"/familia/baile/[danceId]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <BaileBody params={params} />
      </Suspense>
    </div>
  );
}

async function BaileBody({ params }: { params: PageProps<"/familia/baile/[danceId]">["params"] }) {
  await connection();
  const viewer = await requireFamilyViewer();
  const { danceId } = await params;

  const [productions, students] = await Promise.all([loadProductions(), loadStudents()]);
  const found = productions.flatMap((p) => p.dances.map((d) => ({ p, d }))).find((x) => x.d.id === danceId);

  // A family only sees dances where one of its own students dances.
  const mine = found?.d.studentIds.filter((id) => viewer.family.studentIds.includes(id)) ?? [];
  if (!found || mine.length === 0) notFound();

  // Other families' children appear with initials only.
  const dancers = found.d.studentIds
    .map((sid) => students.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ id: s.id, name: mine.includes(s.id) ? s.name : initialsOf(s.name) }));

  const choreo = await getChoreography(found.d.id);

  return (
    <>
      <h1 className="mb-2 text-4xl">{found.d.name}</h1>
      <p className="mb-6 text-muted">{found.p.name}</p>

      <Link href="/familia" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <CaretLeft size={16} aria-hidden="true" /> Mi semana
      </Link>

      {!choreo || choreo.formations.length === 0 ? (
        <p className="card px-5 py-8 text-center text-muted">
          La profesora aún no ha preparado el coreograma de este baile. Cuando esté listo aparecerá aquí.
        </p>
      ) : (
        <div className="space-y-6">
          <FormationPlayer
            stage={choreo.stage}
            formations={choreo.formations}
            dancers={dancers}
            highlightIds={mine}
            label={`Coreograma de ${found.d.name}, visto desde arriba`}
          />
          {choreo.music?.url && (
            <p className="flex items-center gap-2 text-sm">
              <MusicNotes size={18} aria-hidden="true" />
              <a href={choreo.music.url} target="_blank" rel="noopener noreferrer" className="text-gold-text underline">
                {choreo.music.title || "Música del baile"}
              </a>
            </p>
          )}
        </div>
      )}
    </>
  );
}
