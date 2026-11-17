/**
 * Catalog of ballet gear sold through the academy.
 * Placeholder data for now: the names and prices are examples, not real stock.
 * To add a real photo, put the file in public/catalogo/ and set `image` to "/catalogo/<file>".
 */
export type Product = {
  id: string;
  name: string;
  /** Price in US dollars. */
  price: number;
  image?: string;
};

export const PRODUCTS: Product[] = [
  { id: "mallas", name: "Mallas de ballet", price: 18 },
  { id: "media-punta", name: "Zapatillas de media punta", price: 22 },
  { id: "puntas", name: "Zapatillas de punta", price: 45 },
  { id: "falda", name: "Falda de ballet", price: 12 },
  { id: "calentadores", name: "Calentadores", price: 15 },
  { id: "cintas", name: "Cintas y elásticos", price: 5 },
  { id: "mono", name: "Redecilla y moños", price: 4 },
  { id: "bolso", name: "Bolso de ballet", price: 20 },
];

export function formatPrice(n: number): string {
  return `$${n.toFixed(2).replace(".", ",")}`;
}
