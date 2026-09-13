import type { Project } from "@/data/projects";

/** 작업물 상세 주소 — slug 가 있으면 slug(옛 id 주소는 proxy 가 slug 로 돌려보낸다, #909) */
export const workHref = (project: Pick<Project, "id" | "slug">) => `/works/${project.slug || project.id}`;

export interface WorksLayoutProps {
  projects: Project[];
  /** 그냥 누른 작업물 — 배치가 잰 영역에서 전환한다 */
  onProjectClick: (project: Project, rect: DOMRect) => void;
}

