import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorksProjects } from "@/lib/getWorksProjects";
import WorkDetailClient from "./WorkDetailClient";
import { findProjectIndex } from "./findProjectIndex";
import { pageMetadata } from "@/lib/seo";

/* 미리 그려 캐시한다(#909). 예전에는 generateStaticParams 가 없어 요청마다 서버에서 그렸다(작업물 조회와 Shiki 코드 칠하기가
   매번 돌았다). 저장하면 작업물 API 가 revalidatePublicWorks 로 바로 새로 그리게 하고, 시간 기준 갱신은 안전망이다 */
export const revalidate = 300;

export async function generateStaticParams() {
  const projects = await getWorksProjects();
  return projects.map((p) => ({ slug: p.slug || p.id }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getWorksProjects();
  const idx = findProjectIndex(projects, slug);
  const project = idx >= 0 ? projects[idx] : undefined;
  if (!project) return { title: "Work" };
  return pageMetadata({
    title: project.title.ko || project.title.en || "Work",
    description: project.description.ko || project.description.en || project.subtitle.ko || project.subtitle.en || undefined,
    path: `/works/${encodeURIComponent(project.slug || project.id)}`,
    image: project.image,
  });
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  /* getSiteConfig + getSecret 제거 — root layout 의 SiteConfigProvider 에 이미 있음. */
  const projects = await getWorksProjects();

  const projectIndex = findProjectIndex(projects, slug);
  // 없는 주소와 옛 id·번호 주소는 레이아웃이 먼저 걸러(404·307) 여기에 오지 않는다. 타입을 좁히려고 둔다
  if (projectIndex < 0) notFound();

  const project = projects[projectIndex];

  const nextProject =
    projectIndex < projects.length - 1 ? projects[projectIndex + 1] : null;
  /* 랜딩 페이지의 '다음 작업물'은 끝에서 처음으로 돈다(참고 사이트처럼 늘 다음이 있다) */
  const firstProject = projectIndex > 0 ? projects[0] : null;

  return (
    <WorkDetailClient
      project={project}
      nextProject={nextProject}
      firstProject={firstProject}
    />
  );
}
