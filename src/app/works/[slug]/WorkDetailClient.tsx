"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { sendAction } from "@/lib/sendAction";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Project } from "@/data/projects";
import { pickLocalized } from "@/types/common";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { extractHeadings } from "../_utils";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLikeToggle } from "@/hooks/useLikeToggle";
import { WorkArticleHeader } from "@/components/works/WorkArticleHeader";
import { WorkArticleBody } from "@/components/works/WorkArticleBody";
import { WorkArticleGallery } from "@/components/works/WorkArticleGallery";
import { WorkArticleTeam } from "@/components/works/WorkArticleTeam";
import { LandingPage } from "@/components/works/landing/LandingPage";
import { hasLandingPage } from "@/components/works/landing/registry";
import type { RelatedPostItem, RelatedSeriesItem } from "@/components/works/workArticleTypes";
import TranslateBanner from "@/components/ui/TranslateBanner";
import ContentLangMenu from "@/components/ui/ContentLangMenu";
import ContentTranslateBanner, { TranslatingRegion } from "@/components/ui/ContentTranslateBanner";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import { BodyLabelsProvider } from "@/components/posts/BodyLabelsContext";
import { useWorkTranslation } from "./_hooks/useWorkTranslation";
import { initialContentLang, pickContent } from "@/lib/contentLang";
import { translatedProject } from "@/lib/contentTranslateView";
import styles from "./WorkDetail.module.css";

interface WorkDetailClientProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
  /** 목록의 첫 작업물(지금이 첫 작업물이면 null) — 랜딩의 '다음 작업물'이 끝에서 처음으로 돈다 */
  firstProject?: Project | null;
}

export default function WorkDetailClient({
  project: savedProject,
  prevProject,
  nextProject,
  firstProject = null,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const siteConfig = useSiteConfig();
  /* translation 활성 여부는 client context 에서 — server 의 getSecret 제거됨. */
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  /* 상세 형태 — 설정(works.detailStyle)이 landing 이고 전용 랜딩 페이지가 있는 작업물이면 랜딩으로(없으면 게시물 형태).
     커버는 레이아웃도 같은 값을 보고 그리지 않는다 */
  const landingSlug = siteConfig?.works?.detailStyle === "landing" && hasLandingPage(savedProject.slug) ? savedProject.slug : null;
  const landingMode = landingSlug !== null;
  const landingNext = nextProject ?? firstProject;
  const isRichtext = savedProject.contentType === "richtext";
  /* 처음 언어 — 한쪽에만 글이 있으면 그쪽(README 를 두 칸에 똑같이 복사한 것도 한쪽으로 친다) */
  const [viewLang, setViewLang] = useState<"ko" | "en">(() => initialContentLang(savedProject.content, language));
  /* 보는 언어의 본문이 없으면 있는 언어 쪽을 보여 주고 번역 단추를 낸다. 번역하면 그 결과를 덧씌운 작업물이 project 다 */
  const { shown: koEnProject, needsTranslation, translating, error: translateError, translate } = useWorkTranslation(savedProject, viewLang);
  /* 다른 언어로 읽기(ko · en 밖) — 번역이 오면 제목·부제목·설명·본문과 정보 칸(카테고리·성격·역할·기여·기술 설명·
     팀원·AI 요약·갤러리 자막)을 두 언어 칸 모두 그 번역으로 덮는다(translatedProject). 그러면 T · pickContent 가
     어느 언어를 고르든 번역이 보인다. 번역하지 않는 칸(기술 이름·연도·주소·팀원 이름)은 viewLang 그대로.
     GitHub 저장소로 만든 항목(external)은 DB 행이 없어 번역할 수 없다 */
  const contentTr = useContentTranslation({ type: "work", id: savedProject.id, enabled: translationEnabled && !savedProject.external });
  const tr = contentTr.fields;
  const project = useMemo<typeof koEnProject>(() => (tr ? translatedProject(koEnProject, tr) : koEnProject), [koEnProject, tr]);
  /* 번역된 칸의 lang 속성 — 번역이 왔을 때만 */
  const trLang = tr ? contentTr.targetLang ?? undefined : undefined;
  /* KO/EN 토글을 누르면 번역을 끄고 그 언어 원문으로 */
  const handleViewLang = (l: "ko" | "en") => {
    if (contentTr.targetLang) contentTr.selectLang(null);
    setViewLang(l);
  };
  const isAdmin = useIsAuthenticated();
  /* GitHub 저장소 README 로 만든 항목 — 좋아요·댓글을 받을 행이 없고 편집 화면도 없다(#1062).
     endpoint 를 null 로 두면 마운트 때 아무것도 묻지 않는다 */
  const external = project.external === true;
  /* 저장소로 만들어진 화면 — 편집할 행이 없으니 눌렀을 때 작업물로 들이고 편집 화면으로 보낸다.
     새 탭으로 열면 기다린 뒤라 브라우저가 막는 경우가 있어 같은 탭에서 옮긴다. */
  const handleImportEdit = async () => {
    const res = await sendAction("/api/works/showcase/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: project.slug }),
    }, t, t("workDetail.editRepoFailed"));
    if (!res) return;
    const data = await res.json();
    if (data?.id) router.push(`/admin/works/${data.id}/edit`);
  };
  const { count: likeCount, liked, busy: likeBusy, toggle: handleLikeToggle } = useLikeToggle({
    endpoint: external ? null : `/api/works/${project.id}/like`,
  });
  const [relatedPosts, setRelatedPosts] = useState<RelatedPostItem[]>([]);
  const [relatedSeries, setRelatedSeries] = useState<RelatedSeriesItem[]>([]);

  // 조회수는 따로 보내지 않는다 — 페이지 조회 기록(VisitTracker → /api/page-views)이 /works/{slug} 조회로 view_count 를 올린다

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/works/${project.id}/related-posts`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedPosts(d.items); })
      .catch(() => {});
    fetch(`/api/works/${project.id}/related-series`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedSeries(d.items); })
      .catch(() => {});
    return () => ac.abort();
  }, [project.id]);

  // TOC headings — 표시 중인 언어의 content 기준 (body 와 동일한 fallback — 비어 있으면 반대 언어)
  const content = pickContent(project.content, viewLang);
  const headings: TocHeading[] = useMemo(() => {
    const contentHeadings = extractHeadings(content, isRichtext);
    if (project.gallery.length > 0) {
      contentHeadings.push({ id: "gallery", text: "Gallery", level: 2 });
    }
    return contentHeadings;
  }, [content, isRichtext, project.gallery.length]);

  return (
    /* 상세 화면 라벨(정보 칸 · 본문 안 단추 — lib/bodyLabels)도 번역 라벨로 — 없으면 화면 언어 */
    <BodyLabelsProvider override={contentTr.bodyLabels} foreign={!!contentTr.fields}>
    <DetailLayout
      backHref="/works"
      scrollButtons={false}
      backLabel={t("workDetail.back")}
      /* 커버는 레이아웃이 셸에서 그린다(#946) — 여기서는 alt 를 넘기고 아이콘·헤더 자리만 맞춘다 */
      heroImage={project.image}
      heroInShell
      heroAlt={pickLocalized(project.title, language)}
      heroIcon={project.icon}
      headings={landingMode ? [] : headings}
      header={
        <WorkArticleHeader
          project={project}
          viewLang={viewLang}
          contentLang={trLang}
          translating={contentTr.translating}
          onLangChange={handleViewLang}
          isAdmin={isAdmin}
          langMenu={translationEnabled && !savedProject.external
            ? <ContentLangMenu value={contentTr.targetLang} onChange={contentTr.selectLang} busy={contentTr.translating} />
            : undefined}
          onImportEdit={external ? handleImportEdit : undefined}
          relatedPosts={relatedPosts}
          relatedSeries={relatedSeries}
        />
      }
      /* 랜딩 페이지는 화면 · 팀을 제 안에서 그린다 */
      afterContent={landingMode ? undefined : (
        <>
          {/* 갤러리는 글 칼럼보다 넓은 이 자리에 — 슬라이드가 작게 보이면 읽을 수가 없다 */}
          <TranslatingRegion active={contentTr.translating}>
            <WorkArticleGallery project={project} viewLang={viewLang} contentLang={trLang} />
          </TranslatingRegion>
          <WorkArticleTeam project={project} viewLang={viewLang} />
        </>
      )}
      /* 랜딩 페이지는 참고 사이트처럼 끝을 '다음 작업물'로 맺는다 — 좋아요 · 댓글 · 목록으로 줄은 게시물 형태에서만 */
      likeConfig={external || landingMode ? undefined : { count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
      /* 랜딩 페이지는 끝에 '다음 작업물'을 크게 둔다 — 이전/다음 줄은 게시물 형태에서만 */
      adjacentConfig={landingMode ? undefined : {
        prev: prevProject ? {
          href: `/works/${prevProject.slug || prevProject.id}`,
          title: pickLocalized(prevProject.title, language),
          image: prevProject.image,
        } : null,
        next: nextProject ? {
          href: `/works/${nextProject.slug || nextProject.id}`,
          title: pickLocalized(nextProject.title, language),
          image: nextProject.image,
        } : null,
        prevLabelKey: "workDetail.previous",
        nextLabelKey: "workDetail.next",
        className: styles.adjacentNavTopBorder,
      }}
      commentsConfig={external || landingMode ? undefined : { commentType: "work", targetId: project.id, translationEnabled }}
      backLink={landingMode ? undefined : { href: "/works", labelKey: "workDetail.viewAll" }}
      landing={landingMode ? (
        <TranslatingRegion active={contentTr.translating}>
          <LandingPage
            slug={landingSlug!}
            project={project}
            viewLang={viewLang}
            next={landingNext ? { href: `/works/${landingNext.slug || landingNext.id}`, title: pickLocalized(landingNext.title, language) } : null}
          />
        </TranslatingRegion>
      ) : undefined}
    >
      {contentTr.targetLang ? (
        <ContentTranslateBanner
          lang={contentTr.targetLang}
          translating={contentTr.translating}
          error={contentTr.error}
          onShowOriginal={() => contentTr.selectLang(null)}
          onRetry={contentTr.retry}
        />
      ) : needsTranslation && translationEnabled && (
        <TranslateBanner subject="work" viewLang={viewLang} translating={translating} error={translateError} onTranslate={translate} />
      )}
      <TranslatingRegion active={contentTr.translating}>
        <WorkArticleBody project={project} viewLang={viewLang} contentLang={trLang} />
      </TranslatingRegion>
    </DetailLayout>
    </BodyLabelsProvider>
  );
}
