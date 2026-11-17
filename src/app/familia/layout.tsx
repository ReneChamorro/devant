import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FAMILIES_ENABLED } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mi semana",
  robots: { index: false, follow: false },
};

export default function FamilyLayout({ children }: LayoutProps<"/familia">) {
  if (!FAMILIES_ENABLED) notFound();
  return children;
}
