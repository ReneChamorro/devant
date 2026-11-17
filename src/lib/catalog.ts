/*
  Catalog of ballet gear sold through the academy. Teachers edit it in /profe/catalogo.
  Pure helpers and types only (no Node APIs), so server and client can share them.
*/
export type Product = {
  id: string;
  name: string;
  /** Price in US dollars. */
  price: number;
  /** File name of the uploaded photo, served from /catalogo/imagen/<image>. */
  image?: string;
};

/** Shown until the first product is saved. Names and prices are examples, not real stock. */
export const SEED_PRODUCTS: Product[] = [
  { id: "mallas", name: "Mallas de ballet", price: 18 },
  { id: "media-punta", name: "Zapatillas de media punta", price: 22 },
  { id: "puntas", name: "Zapatillas de punta", price: 45 },
  { id: "falda", name: "Falda de ballet", price: 12 },
  { id: "calentadores", name: "Calentadores", price: 15 },
  { id: "cintas", name: "Cintas y elásticos", price: 5 },
  { id: "mono", name: "Redecilla y moños", price: 4 },
  { id: "bolso", name: "Bolso de ballet", price: 20 },
];

export const MAX_PRODUCTS = 200;
export const MAX_PRICE = 100000;
/** The browser shrinks photos before sending; this is the hard cap on the server. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function formatPrice(n: number): string {
  return `$${n.toFixed(2).replace(".", ",")}`;
}

/** Accepts "12", "12.5" and "12,50". Returns null when it is not a sensible price. */
export function parsePrice(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) return null;
  return Math.round(n * 100) / 100;
}

export const imageUrl = (file: string) => `/catalogo/imagen/${file}`;

/** Names the server hands out: a uuid plus a known extension. Nothing else is ever read from disk. */
export const IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
