import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { ChoreoEditor } from "@/components/choreo/choreo-editor";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { emptyChoreography } from "@/lib/choreo";
import { getChoreography, loadProductions, loadStudents } from "@/lib/store";

export const metadata = { title: "Coreograma" };

export default function CoreografiaPage({ params }: PageProps<"/profe/obras/[id]/[danceId]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <CoreografiaBody params={params} />
      </Suspense>
    </div>
  );
}

async function CoreografiaBody({ params }: { params: PageProps<"/profe/obras/[id]/[danceId]">["params"] }) {
  await connection();
  const teacher = await requireTeacher();
  const { id, danceId } = await params;

  const [productions, students] = await Promise.all([loadProductions(), loadStudents()]);
  const prod = productions.find((p) => p.id === id);
  const dance = prod?.dances.find((d) => d.id === danceId);
  if (!prod || !dance) notFound();

  const dancers = dance.studentIds
    .map((sid) => students.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ id: s.id, name: s.name }));

  const saved = await getChoreography(dance.id);
  const initial = saved ?? emptyChoreography(dance.id, dancers.map((d) => d.id));

  return (
    <>
      <h1 className="mb-2 text-4xl">{dance.name}</h1>
      <p className="mb-6 text-muted">{prod.name}</p>
      <TeacherNav current="obras" name={teacher.name} />

      <Link href={`/profe/obras/${prod.id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <CaretLeft size={16} aria-hidden="true" /> Bailes de {prod.name}
      </Link>

      <ChoreoEditor
        key={saved?.version ?? 0}
        danceId={dance.id}
        danceName={dance.name}
        dancers={dancers}
        initial={{ stage: initial.stage, music: initial.music, formations: initial.formations }}
        initialVersion={saved?.version ?? 0}
      />
    </>
  );
}
