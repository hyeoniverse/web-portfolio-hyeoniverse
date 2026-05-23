import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWorks } from "@/lib/getWorks";
import WorkDetailClient from "./WorkDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** slug, id(UUID), 정적 number("01"…) 순으로 매칭. slug 우선. */
function findProjectIndex(projects: { id: string; slug?: string; number: string }[], param: string) {
  const bySlug = projects.findIndex((p) => p.slug && p.slug === param);
  if (bySlug >= 0) return bySlug;
  const byId = projects.findIndex((p) => p.id === param);
  if (byId >= 0) return byId;
  const padded = param.padStart(2, "0");
  return projects.findIndex((p) => p.number === padded);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getWorks();
  const idx = findProjectIndex(projects, slug);
  const project = idx >= 0 ? projects[idx] : undefined;
  return { title: project?.title ?? "Work" };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  /* getSiteConfig + getSecret 제거 — root layout 의 SiteConfigProvider 에 이미 있음. */
  const projects = await getWorks();

  const projectIndex = findProjectIndex(projects, slug);

  if (projectIndex < 0) {
    notFound();
  }

  const project = projects[projectIndex];

  // legacy id/number URL 로 들어왔는데 project 가 slug 갖고 있으면 → slug URL 로 301 redirect
  if (project.slug && project.slug !== slug) {
    redirect(`/works/${project.slug}`);
  }

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
