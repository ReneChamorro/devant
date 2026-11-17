/**
 * Internal use by default: search engines are told to stay away.
 * Set SITE_INDEXABLE=true only when the academy decides to open the public pages.
 */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";

/**
 * The family area (email login, weekly view, read-only choreographies) is built but hidden
 * until it is discussed with the client. Set FAMILIES_ENABLED=true to turn it back on.
 */
export const FAMILIES_ENABLED = process.env.FAMILIES_ENABLED === "true";

/** Main menu of the public site. Built on the server so the client menu never reads env vars. */
export const PUBLIC_LINKS: { href: string; label: string }[] = [
  { href: "/clases", label: "Clases" },
  { href: "/calendario", label: "Calendario" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/inscripciones", label: "Inscripciones" },
  ...(FAMILIES_ENABLED ? [{ href: "/familia", label: "Familias" }] : []),
];
