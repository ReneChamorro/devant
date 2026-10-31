# Devant

Web de la Academia de Ballet Clásico Devant: sitio informativo + calendario de clases y ensayos + asistencia.

- **Público:** `/`, `/clases`, `/calendario`, `/inscripciones`
- **Familias (sin cuenta, enlace + PIN):** `/f/demo` (PIN de ejemplo en la propia página)
- **Profesores (con cuenta):** `/profe` (login), `/profe/dia` (vista del día), `/profe/horario` (crear, editar, pausar y eliminar clases y ensayos), `/profe/obras` (obras, bailes y elenco), `/profe/alumnas` (lista de alumnas)
- `/f` y `/profe` llevan `noindex` y están bloqueados en `robots.txt`.

## Usuario profesor de prueba

Mientras no haya Supabase, el login usa un usuario de prueba definido en `src/lib/auth.ts` (se puede cambiar con `TEACHER_EMAIL`, `TEACHER_PASSWORD` y `SESSION_SECRET`, ver `.env.example`). En desarrollo, la pantalla `/profe` muestra las credenciales. Antes de publicar el sitio hay que cambiarlas o reemplazar este login por Supabase Auth.

## Horario

La rutina inicial está en `src/lib/seed.ts` (lunes a viernes: 3 a 4 PM Básico y Baby ballet; 4 a 5 PM Intermedio / Avanzado; después, ensayo, con Pas de deux en pausa). Los cambios que hacen las profes en `/profe/horario` se guardan en `.data/schedule.json` (ignorado por git). Borra ese archivo para volver a la rutina inicial. Este guardado en archivo solo funciona donde se puede escribir en disco (local o un servidor propio, no hosting serverless); Supabase lo reemplaza.

## Obras, bailes y elenco

En `/profe/obras` se elige la obra que se monta ahora (por defecto El Cascanueces, con sus bailes: Fiesta, Copos de nieve, Españoles, Árabes, Chinos, Rusos, Mirlitones, Vals de las flores y Pas de deux). Cada baile tiene su elenco, que se elige marcando alumnas de la lista de `/profe/alumnas`. Al crear o editar un ensayo en el horario se marcan los bailes que se ensayan y la vista del día solo lista a las alumnas de esos bailes. Datos en `.data/productions.json` y `.data/students.json`.

## Estado

Las alumnas iniciales (`src/lib/seed.ts`) y la familia `/f/demo` son de ejemplo. Los nombres de profesores los escriben las profes. Las respuestas "voy / no voy" y el pase de lista aún no se guardan; el siguiente paso es Supabase (Postgres + Auth + RLS) con las mismas formas de datos.

## Diseño

Azul marino y dorado de la academia. Tokens en `src/app/globals.css`. La temporada (`src/lib/season.ts`: `cascanueces`, `corsario`, `default`) cambia solo el ornamento y el tinte, no la identidad.

## Desarrollo

```bash
npm run dev
```
