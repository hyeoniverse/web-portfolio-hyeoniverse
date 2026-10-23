import { cache } from "react";
import { getWorks } from "@/lib/getWorks";
import type { Project } from "@/data/projects";

/**
 * 작업물 목록·상세가 쓰는 목록 — DB 의 작업물이 전부다.
 *
 * 예전에는 GitHub 저장소를 작업물로 들여오는 길이 있었지만 작업물이 랜딩으로 바뀌며 없앴다.
 * 아무것도 없으면 비어 있는 그대로 둔다 — 목록 화면이 은하수 배경의 빈 화면을 그린다.
 */
async function fetchWorksProjects(): Promise<Project[]> {
  return getWorks();
}

/** 요청당 1회 조회 */
export const getWorksProjects = cache(fetchWorksProjects);
