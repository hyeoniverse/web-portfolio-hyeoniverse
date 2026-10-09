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
import type { RelatedPostItem, RelatedSeriesItem } from "@/components/works/workArticleTypes";
import TranslateBanner from "@/components/ui/TranslateBanner";
import ContentLangMenu from "@/components/ui/ContentLangMenu";
import ContentTranslateBanner from "@/components/ui/ContentTranslateBanner";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import { useWorkTranslation } from "./_hooks/useWorkTranslation";
import { initialContentLang, pickContent } from "@/lib/contentLang";
import styles from "./WorkDetail.module.css";

interface WorkDetailClientProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function WorkDetailClient({
  project: savedProject,
  prevProject,
  nextProject,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const siteConfig = useSiteConfig();
  /* translation 활성 여부는 client context 에서 — server 의 getSecret 제거됨. */
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  const isRichtext = savedProject.contentType === "richtext";
  /* 처음 언어 — 한쪽에만 글이 있으면 그쪽(README 를 두 칸에 똑같이 복사한 것도 한쪽으로 친다) */
  const [viewLang, setViewLang] = useState<"ko" | "en">(() => initialContentLang(savedProject.content, language));
  /* 보는 언어의 본문이 없으면 있는 언어 쪽을 보여 주고 번역 단추를 낸다. 번역하면 그 결과를 덧씌운 작업물이 project 다 */
  const { shown: koEnProject, needsTranslation, translating, error: translateError, translate } = useWorkTranslation(savedProject, viewLang);
  /* 다른 언어로 읽기(ko · en 밖) — 번역이 오면 제목·부제목·설명·본문을 두 언어 칸 모두 그 번역으로 덮는다.
     그러면 T · pickContent 가 어느 언어를 고르든 번역이 보인다. 나머지(갤러리·팀·정보 칸)는 viewLang 그대로.
     GitHub 저장소로 만든 항목(external)은 DB 행이 없어 번역할 수 없다 */
  const contentTr = useContentTranslation({ type: "work", id: savedProject.id, enabled: translationEnabled && !savedProject.external });
  const tr = contentTr.fields;
  const project = useMemo<typeof koEnProject>(() => {
    if (!tr) return koEnProject;
    const both = (v: string | undefined, fallback: { ko?: string; en?: string }) =>
      (v ? { ...fallback, ko: v, en: v } : fallback);
    return {
      ...koEnProject,
      title: both(tr.title, koEnProject.title),
      subtitle: both(tr.subtitle, koEnProject.subtitle),
      description: both(tr.description, koEnProject.description),
      content: both(tr.content, koEnProject.content),
    } as typeof koEnProject;
  }, [koEnProject, tr]);
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

  // 조회수 기록 (posts 미러) — admin/bot 은 서버에서 skip, IP+KST 하루 1회 dedup. fire-and-forget.
  useEffect(() => {
    fetch(`/api/works/${project.id}/view`, { method: "POST" }).catch(() => {});
  }, [project.id]);

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
    <>
    <DetailLayout
      backHref="/works"
      backLabel={t("workDetail.back")}
      /* 커버는 레이아웃이 셸에서 그린다(#946) — 여기서는 alt 를 넘기고 아이콘·헤더 자리만 맞춘다 */
      heroImage={project.image}
      heroInShell
      heroAlt={pickLocalized(project.title, language)}
      heroIcon={project.icon}
      headings={headings}
      header={
        <WorkArticleHeader
          project={project}
          viewLang={viewLang}
          onLangChange={handleViewLang}
          isAdmin={isAdmin}
          langMenu={translationEnabled && !savedProject.external
            ? <ContentLangMenu value={contentTr.targetLang} onChange={contentTr.selectLang} />
            : undefined}
          onImportEdit={external ? handleImportEdit : undefined}
          relatedPosts={relatedPosts}
          relatedSeries={relatedSeries}
        />
      }
      afterContent={
        <>
          {/* 갤러리는 글 칼럼보다 넓은 이 자리에 — 슬라이드가 작게 보이면 읽을 수가 없다 */}
          <WorkArticleGallery project={project} viewLang={viewLang} />
          <WorkArticleTeam project={project} viewLang={viewLang} />
        </>
      }
      likeConfig={external ? undefined : { count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
      adjacentConfig={{
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
      commentsConfig={external ? undefined : { commentType: "work", targetId: project.id, translationEnabled }}
      backLink={{ href: "/works", labelKey: "workDetail.viewAll" }}
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
      <WorkArticleBody project={project} viewLang={viewLang} contentLang={tr ? contentTr.targetLang ?? undefined : undefined} />
    </DetailLayout>
    </>
  );
}
