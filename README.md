# Devant

Web de la Academia de Ballet Clásico Devant: sitio informativo + calendario de clases y ensayos + asistencia.

- **Público:** `/`, `/clases`, `/calendario`, `/inscripciones`
- **Familias (sin cuenta, enlace + PIN):** `/f/demo` (PIN de ejemplo en la propia página)
- **Profesores (con cuenta):** `/profe`, `/profe/dia`
- `/f` y `/profe` llevan `noindex` y están bloqueados en `robots.txt`.

## Estado

Datos de ejemplo en `src/lib/schedule.ts` (horarios, profesores y alumnas inventados). Las respuestas "voy / no voy" y el pase de lista aún no se guardan; el siguiente paso es Supabase (Postgres + Auth + RLS) con las mismas formas de datos.

## Diseño

Azul marino y dorado de la academia. Tokens en `src/app/globals.css`. La temporada (`src/lib/season.ts`: `cascanueces`, `corsario`, `default`) cambia solo el ornamento y el tinte, no la identidad.

## Desarrollo

```bash
npm run dev
```
