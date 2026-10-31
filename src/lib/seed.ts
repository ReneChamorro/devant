import type { Production, Student, Template } from "./schedule";

const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * Current routine, Monday to Friday:
 *  3 to 4 PM  Básico (salón grande) and Baby ballet (salón chiquito)
 *  4 to 5 PM  Intermedio / Avanzado
 *  after 5 PM Pas de deux or rehearsal. Right now only rehearsals run, so pas de deux is paused.
 * Teacher names are left empty on purpose: teachers fill them in.
 * TODO: confirm rehearsal end time (19:00 is a placeholder) and the Intermedio room.
 */
export const SEED_TEMPLATES: Template[] = [
  { id: "t-basico", kind: "basico", title: "Básico", teacher: "", room: "Salón grande", days: WEEKDAYS, start: "15:00", end: "16:00" },
  { id: "t-baby", kind: "baby-ballet", title: "Baby ballet", teacher: "", room: "Salón chiquito", days: WEEKDAYS, start: "15:00", end: "16:00" },
  { id: "t-inter-avanz", kind: "intermedio-avanzado", title: "Intermedio / Avanzado", teacher: "", room: "", days: WEEKDAYS, start: "16:00", end: "17:00" },
  {
    id: "t-pas-de-deux",
    kind: "pas-de-deux",
    title: "Pas de deux",
    teacher: "",
    room: "",
    days: WEEKDAYS,
    start: "17:00",
    end: "18:00",
    paused: true,
    note: "En pausa mientras haya ensayos.",
  },
  {
    id: "t-ensayo",
    kind: "ensayo",
    title: "Ensayo",
    teacher: "",
    room: "",
    days: WEEKDAYS,
    start: "17:00",
    end: "19:00",
    production: "El Cascanueces",
    productionId: "p-cascanueces",
  },
];

/**
 * Example students so the app can be tried. Teachers can delete or replace them in /profe/alumnas.
 */
export const SEED_STUDENTS: Student[] = [
  { id: "s1", name: "Valentina Rojas", level: "intermedio" },
  { id: "s2", name: "Camila Ochoa", level: "basico" },
  { id: "s3", name: "Sofía Brito", level: "avanzado" },
  { id: "s4", name: "Isabella Pino", level: "puntas" },
  { id: "s5", name: "Mariana Linares", level: "baby-ballet" },
  { id: "s6", name: "Gabriela Mendoza", level: "intermedio" },
  { id: "s7", name: "Luciana Paredes", level: "puntas" },
  { id: "s8", name: "Daniela Sucre", level: "basico" },
];

/** Dances of El Cascanueces to start from. Teachers add, rename or remove them in /profe/obras. */
export const SEED_PRODUCTIONS: Production[] = [
  {
    id: "p-cascanueces",
    name: "El Cascanueces",
    active: true,
    dances: [
      "Fiesta",
      "Copos de nieve",
      "Españoles",
      "Árabes",
      "Chinos",
      "Rusos",
      "Mirlitones",
      "Vals de las flores",
      "Pas de deux del Hada de Azúcar",
    ].map((name, i) => ({ id: `d-casc-${i + 1}`, name, studentIds: [] })),
  },
];
