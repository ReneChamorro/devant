"use client";

import { saveCastAction } from "@/app/profe/actions";
import type { Student } from "@/lib/schedule";
import { StudentPicker } from "./student-picker";

/** Cast of one dance. */
export function CastPicker({
  productionId,
  danceId,
  students,
  initial,
}: {
  productionId: string;
  danceId: string;
  students: Student[];
  initial: string[];
}) {
  return (
    <StudentPicker
      students={students}
      initial={initial}
      action={saveCastAction}
      hidden={{ productionId, danceId }}
      idPrefix={danceId}
      submitLabel="Guardar elenco"
    />
  );
}
