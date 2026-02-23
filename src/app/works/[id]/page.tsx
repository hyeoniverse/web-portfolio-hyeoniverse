import { notFound } from "next/navigation";
import { getWorks } from "@/lib/getWorks";
import WorkDetailClient from "./WorkDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { id } = await params;
  const projects = await getWorks();

  const projectIndex = projects.findIndex((p) => p.id === id);

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
