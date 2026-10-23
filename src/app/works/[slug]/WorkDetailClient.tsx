"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import DetailLayout from "@/components/layout/DetailLayout";
import { LandingRenderer } from "@/components/works/landing/LandingRenderer";
import { landingOf } from "@/components/works/landing/landingData";

interface WorkDetailClientProps {
  project: Project;
  nextProject: Project | null;
  /** 목록의 첫 작업물(지금이 첫 작업물이면 null) — 랜딩의 '다음 작업물'이 끝에서 처음으로 돈다 */
  firstProject?: Project | null;
}

/**
 * 작업물 상세 — 모든 작업물을 랜딩으로 그린다(데이터: works.landing › 저장소 기본 데이터 › 카드 정보로 만든 기본 랜딩).
 * 끝은 참고 사이트처럼 '다음 작업물'로 맺는다 — 좋아요 · 댓글 · 이전/다음 줄 · 목록으로 링크는 두지 않는다.
 * 랜딩 글은 보는 언어 칸이 비면 다른 언어로 채워 그리므로 화면 언어로 본다.
 */
export default function WorkDetailClient({ project, nextProject, firstProject = null }: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const viewLang = language === "en" ? "en" : "ko";
  const next = nextProject ?? firstProject;

  return (
    <DetailLayout
      backHref="/works"
      scrollButtons={false}
      backLabel={t("workDetail.back")}
      heroAlt={pickLocalized(project.title, language)}
      headings={[]}
      header={null}
      landing={
        <LandingRenderer
          data={landingOf(project)}
          project={project}
          viewLang={viewLang}
          next={next ? { href: `/works/${next.slug || next.id}`, title: pickLocalized(next.title, language) } : null}
        />
      }
    >
      {null}
    </DetailLayout>
  );
}
