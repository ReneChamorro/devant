# Devant

Web interna de la Academia de Ballet Clásico Devant: calendario de clases y ensayos, asistencia que registra la profesora, familias con acceso por correo y coreogramas visuales por baile.

## Quién ve qué

- **Público (sin cuenta):** `/`, `/clases`, `/calendario`, `/catalogo`, `/inscripciones`.
- **Familias (con correo), ESCONDIDO hasta hablarlo con el cliente:** con `FAMILIES_ENABLED` sin definir, `/entrar`, `/familia` y `/profe/familias` dan 404 y no aparecen en los menús. Para reactivarlo: `FAMILIES_ENABLED=true`. Lo que sigue describe cómo funciona cuando está activo: `/entrar` pide el correo del adulto y le envía un código de 6 números; entra a `/familia` (su semana y sus bailes) y a `/familia/baile/[id]` (el coreograma de los bailes donde baila su hija). Las familias solo ven; no escriben nada.
- **Profesoras (con cuenta):** `/profe` (login), `/profe/dia` (lista de asistencia por excepciones), `/profe/horario`, `/profe/obras` (obras, bailes, elenco y coreograma), `/profe/alumnas`, `/profe/familias`, `/profe/reportes`.

Uso interno por defecto: con `SITE_INDEXABLE` sin definir, todas las páginas llevan `noindex` y `robots.txt` bloquea todo.

## Usuario profesor de prueba

Mientras no haya Supabase, el login usa un usuario de prueba definido en `src/lib/auth.ts` (se cambia con `TEACHER_EMAIL`, `TEACHER_PASSWORD` y `SESSION_SECRET`, ver `.env.example`). En desarrollo `/profe` muestra las credenciales. Antes de publicar hay que cambiarlas o usar Supabase Auth.

## Horario

La rutina inicial está en `src/lib/seed.ts` (lunes a viernes: 3 a 4 PM Básico y Baby ballet; 4 a 5 PM Intermedio / Avanzado; después, ensayo, con Pas de deux en pausa). Los cambios de las profes en `/profe/horario` se guardan en `.data/schedule.json`. Borra ese archivo para volver a la rutina inicial.

## Obras, bailes y elenco

`/profe/obras`: la obra en montaje (por defecto El Cascanueces), sus bailes y el elenco de cada uno, elegido de la lista de `/profe/alumnas`. Al crear un ensayo se marcan los bailes que se ensayan y la vista del día solo lista a las alumnas de esos bailes.

## Asistencia (solo la registra la profesora)

En `/profe/dia` todas las alumnas aparecen presentes. La profesora marca tarde, ausente o justificada (con motivo obligatorio) y guarda la lista. Las listas guardadas guardan una copia fija de la clase y de quién se esperaba. Editar una lista de un día anterior exige un motivo y queda en un registro de cambios. Cada ensayo avisa de quién lleva 2 o más faltas seguidas. En `/profe/reportes` hay totales por alumna, baile y mes, y descarga para Excel. La ficha de cada alumna (`/profe/alumnas/[id]`) muestra su historial.

## Familias por correo (escondido: `FAMILIES_ENABLED=true` para activarlo)

La profesora registra la familia en `/profe/familias`: adultos con su correo y alumnas vinculadas. El adulto pide un código en `/entrar` (válido 10 minutos, de un solo uso, máximo 5 intentos y 3 pedidos cada 15 minutos) y queda con una sesión de 180 días en ese dispositivo. La respuesta es la misma exista o no el correo. Quitarle el acceso a un adulto cierra sus sesiones al instante.

El envío usa la API de Resend si defines `RESEND_API_KEY` y `MAIL_FROM` (ver `.env.example`). Sin eso, en desarrollo, el código aparece en pantalla y en la consola del servidor; en producción no se envía nada. Supabase Auth (código por correo) reemplaza esto cuando se migre la base de datos.

## Coreogramas

En `/profe/obras/[obra]/[baile]` cada baile tiene un escenario visto desde arriba con un punto por bailarina del elenco. Se arrastran los puntos (o se mueven con las flechas), se agregan formaciones con nombre, tiempos y nota, y se reproduce la animación entre formaciones. Hay "Cuadrícula", "Fila" y "Círculo" para ordenar a todas, deshacer y rehacer, y control de versión para no pisar cambios de otra profesora. Las familias ven el mismo escenario en solo lectura, con su bailarina resaltada y las demás solo con iniciales.

## Catálogo

`/catalogo` muestra los implementos de ballet que vende una persona de la academia: foto, nombre y precio, sin carrito. Los productos están en `src/lib/catalog.ts` y por ahora son de ejemplo (nombres y precios de relleno). Para poner una foto real, copia el archivo a `public/catalogo/` y escribe su ruta en `image` (por ejemplo `"/catalogo/mallas.jpg"`). Sin foto se ve un recuadro de relleno. Editar productos desde la web queda para más adelante.

## Datos y estado

Todo se guarda en archivos dentro de `.data/` (ignorado por git), un archivo por colección. Solo funciona donde se puede escribir en disco (local o un servidor propio, no hosting serverless). El siguiente paso es Supabase (Postgres + Auth + RLS), obligatorio antes de cargar niñas reales o publicar: `src/lib/store.ts` está hecho para que solo cambien sus cuerpos. Las alumnas iniciales (`src/lib/seed.ts`) son de ejemplo.

## Diseño

Azul marino y dorado de la academia. Tokens en `src/app/globals.css`. La temporada (`src/lib/season.ts`) cambia solo el ornamento y el tinte.

## Desarrollo

```bash
npm run dev
```
