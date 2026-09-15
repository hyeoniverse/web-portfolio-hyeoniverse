"use client";

import { useState, useEffect, useMemo } from "react";
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
import { WorkArticleTeam } from "@/components/works/WorkArticleTeam";
import type { RelatedPostItem, RelatedSeriesItem } from "@/components/works/workArticleTypes";
import styles from "./WorkDetail.module.css";

interface WorkDetailClientProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function WorkDetailClient({
  project,
  prevProject,
  nextProject,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const siteConfig = useSiteConfig();
  /* translation 활성 여부는 client context 에서 — server 의 getSecret 제거됨. */
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  const isRichtext = project.contentType === "richtext";
  const [viewLang, setViewLang] = useState<"ko" | "en">(
    !project.content.en ? "ko" : !project.content.ko ? "en" : language === "en" ? "en" : "ko"
  );
  const isAdmin = useIsAuthenticated();
  const { count: likeCount, liked, busy: likeBusy, toggle: handleLikeToggle } = useLikeToggle({
    endpoint: `/api/works/${project.id}/like`,
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

  // TOC headings — 표시 중인 언어의 content 기준 (body 와 동일한 fallback)
  const content = project.content[viewLang] || project.content.ko;
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
          onLangChange={setViewLang}
          isAdmin={isAdmin}
          relatedPosts={relatedPosts}
          relatedSeries={relatedSeries}
        />
      }
      afterContent={<WorkArticleTeam project={project} viewLang={viewLang} />}
      likeConfig={{ count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
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
      commentsConfig={{ commentType: "work", targetId: project.id, translationEnabled }}
      backLink={{ href: "/works", labelKey: "workDetail.viewAll" }}
    >
      <WorkArticleBody project={project} viewLang={viewLang} />
    </DetailLayout>
    </>
  );
}
