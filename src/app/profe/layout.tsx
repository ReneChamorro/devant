import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profesores",
  robots: { index: false, follow: false },
};

export default function TeacherLayout({ children }: LayoutProps<"/profe">) {
  return children;
}
