"use client";

import { useState, useEffect, useMemo } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Globe } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { extractHeadings } from "../_utils";
import Button from "@/components/ui/Button";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLikeToggle } from "@/hooks/useLikeToggle";
import { WorkArticleHeader, WorkArticleBody, WorkArticleTeam } from "@/components/works/WorkArticleView";
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
  const { navigateWithTransition } = usePageTransition();
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
  const [relatedPosts, setRelatedPosts] = useState<{ id: string; title: string; title_en?: string; slug: string; cover_image: string; excerpt: string; category: string; created_at: string }[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/works/${project.id}/related-posts`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedPosts(d.items); })
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
      heroImage={project.image}
      heroAlt={project.title}
      headings={headings}
      header={
        <WorkArticleHeader
          project={project}
          viewLang={viewLang}
          onLangChange={setViewLang}
          isAdmin={isAdmin}
        />
      }
      afterContent={<WorkArticleTeam project={project} viewLang={viewLang} />}
      likeConfig={{ count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
      relatedContent={
        <>
          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {project.liveUrl && (
              <Button variant="outline" size="lg" href={project.liveUrl} external>
                <Globe size={16} />
                <T k="workDetail.visitSite" tooltip={t("tooltip.visitSite")} />
              </Button>
            )}
            {project.githubUrl && (
              <Button variant="outline" size="sm" href={project.githubUrl} external>
                <GithubIcon size={14} />
                <T ko="GitHub" en="GitHub" tooltip={t("tooltip.github")} />
              </Button>
            )}
          </motion.div>
          {relatedPosts.length > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.relatedHeader}>
              <FileText size={16} />
              <span className={styles.relatedLabel}>{viewLang === "en" ? "Related Posts" : "관련 글"}</span>
            </div>
            <HorizontalCarousel className={styles.relatedGrid}>
              {relatedPosts.map((p, idx) => {
                const title = viewLang === "en" && p.title_en ? p.title_en : p.title;
                return (
                  <div
                    key={p.id}
                    onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${p.slug}`, p.cover_image || "", rect); }}
                    className={styles.relatedCard}
                  >
                    <div className={styles.relatedCardImage}>
                      {p.cover_image ? (
                        <MediaThumb
                          src={p.cover_image}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 50vw, 220px"
                          className={styles.relatedCardImg}
                        />
                      ) : (
                        <ImageIcon className={styles.relatedCardPlaceholder} size={32} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className={styles.relatedCardBody}>
                      <div className={styles.relatedCardMeta}>
                        <span className={styles.relatedCardOrder}>#{idx + 1}</span>
                        {p.category && <span className={styles.relatedCardCategory}>{p.category}</span>}
                      </div>
                      <span className={styles.relatedCardTitle}>{title}</span>
                      {p.excerpt && <span className={styles.relatedCardExcerpt}>{p.excerpt}</span>}
                      {p.created_at && (
                        <span className={styles.relatedCardDate}>
                          {new Date(p.created_at).toLocaleDateString(viewLang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </HorizontalCarousel>
          </section>
          )}
        </>
      }
      adjacentConfig={{
        prev: prevProject ? {
          href: `/works/${prevProject.slug || prevProject.id}`,
          title: prevProject.title,
          image: prevProject.image,
        } : null,
        next: nextProject ? {
          href: `/works/${nextProject.slug || nextProject.id}`,
          title: nextProject.title,
          image: nextProject.image,
        } : null,
        prevLabelKey: "workDetail.previous",
        nextLabelKey: "workDetail.next",
        className: relatedPosts.length === 0 ? styles.adjacentNavTopBorder : undefined,
      }}
      commentsConfig={{ commentType: "work", targetId: project.id, translationEnabled }}
      backLink={{ href: "/works", labelKey: "workDetail.viewAll" }}
    >
      <WorkArticleBody project={project} viewLang={viewLang} />
    </DetailLayout>
    </>
  );
}
