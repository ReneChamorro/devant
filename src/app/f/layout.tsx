import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi semana",
  robots: { index: false, follow: false },
};

export default function FamilyLayout({ children }: LayoutProps<"/f">) {
  return children;
}
