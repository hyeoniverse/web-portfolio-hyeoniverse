import type { Metadata } from "next";
import { Suspense } from "react";
import { getWorks } from "@/lib/getWorks";
import WorksSection from "./_components/WorksSection";

export const revalidate = 60;
export const metadata: Metadata = { title: "Works" };

export default async function WorksPage() {
  const projects = await getWorks();

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />}>
      <WorksSection projects={projects} />
    </Suspense>
  );
}
