import type { Project } from "@/data/projects";

export interface WorksLayoutProps {
  projects: Project[];
  onProjectClick: (id: string, rect: DOMRect, image: string) => void;
}
