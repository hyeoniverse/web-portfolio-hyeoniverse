import type { Metadata } from "next";
import { Suspense } from "react";
import { getWorksProjects } from "@/lib/getWorksProjects";
import WorksSection from "./_components/WorksSection";
import WorksEmptyState from "./_components/WorksEmptyState/WorksEmptyState";

export const revalidate = 60;
export const metadata: Metadata = { title: "Works" };

export default async function WorksPage() {
  /* 발행한 작업물이 없으면 GitHub 저장소가 그 자리에 온다 — 배치(flow·cylinder 등)는 같은 것을
     쓰므로 여기서 갈라지지 않는다. 저장소까지 없을 때만 빈 화면을 그린다(#1062) */
  const projects = await getWorksProjects();
  if (projects.length === 0) return <WorksEmptyState />;

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />}>
      <WorksSection projects={projects} />
    </Suspense>
  );
}
