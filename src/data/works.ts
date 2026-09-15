import { projects } from "./projects";
import type { LocalizedText, Project } from "./projects";

export interface WorkItem {
  id: string;        // 그리드 내 고유 식별자 (인터랙션용)
  projectId: string; // 실제 프로젝트 ID (admin/내부 참조용)
  projectSlug?: string; // 공개 URL 라우팅용 slug (없으면 projectId fallback)
  title: LocalizedText;
  category: LocalizedText;
  main: string;
  hover: string;
}

/** 프로젝트 목록 → 홈 그리드용 11개 슬롯 (순환으로 그리드를 항상 채움).
 *  홈 Selected Works 는 이 함수로 정적(projects)·동적(랭킹된 works) 소스를 같은 shape 로 만든다. */
export function toWorkItems(source: Project[]): WorkItem[] {
  if (source.length === 0) return [];
  return Array.from({ length: 11 }, (_, i) => {
    const project = source[i % source.length];
    return {
      id: `work-${i}`,
      projectId: project.id,
      projectSlug: project.slug,
      title: project.title,
      category: project.category,
      main: project.image,
      hover: project.gallery[0] ?? project.image,
    };
  });
}

// 정적 fallback — projects.ts 순서 (DB 미접근 시)
export const worksData: WorkItem[] = toWorkItems(projects);
