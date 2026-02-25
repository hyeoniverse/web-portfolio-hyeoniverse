import { projects } from "./projects";

export interface WorkItem {
  id: string;        // 그리드 내 고유 식별자 (인터랙션용)
  projectId: string; // 실제 프로젝트 ID (라우팅용)
  main: string;
  hover: string;
}

// projects 데이터에서 이미지를 가져와 11개 슬롯을 채움 (순환)
export const worksData: WorkItem[] = Array.from({ length: 11 }, (_, i) => {
  const project = projects[i % projects.length];
  return {
    id: `work-${i}`,
    projectId: project.id,
    main: project.image,
    hover: project.gallery[0] ?? project.image,
  };
});
