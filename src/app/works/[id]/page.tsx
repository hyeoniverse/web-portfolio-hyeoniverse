import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorks } from "@/lib/getWorks";
import WorkDetailClient from "./WorkDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** id(UUID) 또는 정적 number("01"…) 매칭 */
function findProjectIndex(projects: { id: string; number: string }[], id: string) {
  const idx = projects.findIndex((p) => p.id === id);
  if (idx >= 0) return idx;
  const padded = id.padStart(2, "0");
  return projects.findIndex((p) => p.number === padded);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const projects = await getWorks();
  const idx = findProjectIndex(projects, id);
  const project = idx >= 0 ? projects[idx] : undefined;
  return { title: project?.title ?? "Work" };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { id } = await params;
  /* getSiteConfig + getSecret 제거 — root layout 의 SiteConfigProvider 에 이미 있음. */
  const projects = await getWorks();

  const projectIndex = findProjectIndex(projects, id);

  if (projectIndex < 0) {
    notFound();
  }

  const project = projects[projectIndex];
  const prevProject = projectIndex > 0 ? projects[projectIndex - 1] : null;
  const nextProject =
    projectIndex < projects.length - 1 ? projects[projectIndex + 1] : null;

  return (
    <WorkDetailClient
      project={project}
      prevProject={prevProject}
      nextProject={nextProject}
    />
  );
}
