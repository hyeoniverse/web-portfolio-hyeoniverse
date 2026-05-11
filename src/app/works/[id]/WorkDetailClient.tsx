"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import "katex/dist/katex.min.css";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import Image from "next/image";
import Link from "next/link";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion } from "framer-motion";
import { Heart, FileText, ImageIcon, Pencil } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { extractHeadings, getBentoClass } from "../_utils";
import Button from "@/components/ui/Button";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
import dynamic from "next/dynamic";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
const CommentSection = dynamic(() => import("@/components/comments/CommentSection"), { ssr: false });
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import AISummary from "@/components/ui/AISummary";
import ShareButton from "@/components/ui/ShareButton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Tooltip from "@/components/ui/Tooltip";
import { createClient } from "@/lib/supabase/client";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
  const [relatedPosts, setRelatedPosts] = useState<{ id: string; title: string; title_en?: string; slug: string; cover_image: string; excerpt: string; category: string; created_at: string }[]>([]);
  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const richtextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setIsAdmin(!!data.session?.user));
  }, []);

  useEffect(() => {
    fetch(`/api/works/${project.id}/like`)
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      })
      .catch(() => {});

    fetch(`/api/works/${project.id}/related-posts`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedPosts(d.items); })
      .catch(() => {});
  }, [project.id]);

  const likeRef = useRef(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const handleLikeToggle = useCallback(async () => {
    if (likeRef.current) return;
    likeRef.current = true;
    setLikeBusy(true);
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    try {
      const res = await fetch(`/api/works/${project.id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      setLikeCount(data.count);
      setLiked(data.liked);
    } finally {
      likeRef.current = false;
      setLikeBusy(false);
    }
  }, [project.id, liked]);

  const contentRaw = project.content[viewLang] || project.content.ko;
  // richtext img에 data-cursor="zoom" 주입 (CursorTrail 이미지 뷰어 힌트)
  const content = isRichtext
    ? contentRaw.replace(/<img\s/g, '<img data-cursor="zoom" ')
    : contentRaw;
  const needsTranslation = viewLang === "en" && !project.content[viewLang];

  useRichtextEnhance(richtextRef, content);

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
        <>
          {/* ── Meta header ── */}
          <motion.div
            className={styles.meta}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className={styles.metaLeft}>
              <span className={styles.projectNumber}>#{project.number}</span>
              <span className={styles.category}><T ko={project.category.ko} en={project.category.en} /></span>
              {isAdmin && (
                <Tooltip content={t("workDetail.editWork")} placement="top" delay={200}>
                  <a
                    href={`/admin/works/${project.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                  >
                    <Pencil size={13} />
                  </a>
                </Tooltip>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {project.githubUrl && (
                <Button variant="outline" size="xs" href={project.githubUrl} external>
                  <GithubIcon size={14} />
                  GitHub
                </Button>
              )}
              <ShareButton />
              <LanguageToggle lang={viewLang} onLangChange={setViewLang} />
            </div>
          </motion.div>

          {/* ── Title ── */}
          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {project.title}
          </motion.h1>

          {/* ── Description ── */}
          <motion.p
            className={styles.description}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <T ko={project.description.ko} en={project.description.en} />
          </motion.p>

          {/* ── Info grid ── */}
          <motion.div
            className={styles.infoGrid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Year</span>
              <span className={styles.infoValue}>{project.year}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}><T k="workDetail.role" /></span>
              <span className={styles.infoValue}><T ko={project.role.ko} en={project.role.en} /></span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
              <span className={styles.infoValue}>{project.tech.join(", ")}</span>
            </div>
            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}><T k="workDetail.team" /></span>
                <div className={styles.teamList}>
                  {project.teamMembers.map((member, i) => (
                    <span key={i} className={styles.teamMember}>
                      {member.url ? (
                        <a href={member.url} target="_blank" rel="noopener noreferrer" className={styles.teamLink}>
                          {member.name}
                        </a>
                      ) : (
                        member.name
                      )}
                      <span className={styles.teamRole}> — <T ko={member.role.ko} en={member.role.en} /></span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {needsTranslation && translationEnabled && (
            <div className={styles.translateBanner}>
              <p className={styles.translateMessage}>
                <T k="workDetail.noTranslationEn" />
              </p>
            </div>
          )}

          <AISummary
            summaryKo={project.summary?.ko ?? ""}
            summaryEn={project.summary?.en ?? ""}
            lang={viewLang}
          />
        </>
      }
      afterContent={
        <>
          <motion.div
            className={styles.likeWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5 }}
          >
            <button
              type="button"
              className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""} ${likeBusy ? styles.likeBtnBusy : ""}`}
              onClick={handleLikeToggle}
              disabled={likeBusy}
              title={t("common.like")}
              data-clickable="true"
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
              <span className={styles.likeCount}>{formatCount(likeCount)}</span>
            </button>
          </motion.div>

          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {project.liveUrl && (
              <Button variant="outline" size="lg" href={project.liveUrl} external>
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

          {/* 관련 글 */}
          {relatedPosts.length > 0 && (
            <section className={styles.relatedSection}>
              <div className={styles.relatedHeader}>
                <FileText size={16} />
                <span className={styles.relatedLabel}>{viewLang === "en" ? "Related Posts" : "관련 글"}</span>
              </div>
              <div className={styles.relatedGrid}>
                {relatedPosts.map((p) => {
                  const title = viewLang === "en" && p.title_en ? p.title_en : p.title;
                  return (
                    <div
                      key={p.id}
                      onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${p.slug}`, p.cover_image || "", rect); }}
                      style={{ cursor: "pointer" }}
                      className={styles.relatedCard}
                    >
                      <div className={styles.relatedCardImage}>
                        {p.cover_image ? (
                          <Image
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
                          {p.category && <span className={styles.relatedCardCategory}>{p.category}</span>}
                        </div>
                        <span className={styles.relatedCardTitle}>{title}</span>
                        {p.excerpt && <span className={styles.relatedCardExcerpt}>{p.excerpt}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 이전/다음 프로젝트 */}
          <AdjacentNav
            prev={prevProject ? {
              href: `/works/${prevProject.id}`,
              title: prevProject.title,
              image: prevProject.image,
            } : null}
            next={nextProject ? {
              href: `/works/${nextProject.id}`,
              title: nextProject.title,
              image: nextProject.image,
            } : null}
            prevLabelKey="workDetail.previous"
            nextLabelKey="workDetail.next"
          />

          {/* Comments */}
          <motion.div
            className={styles.commentWrap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <CommentSection commentType="work" targetId={project.id} translationEnabled={translationEnabled} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link href="/works" className={styles.footerLink}>
              <span className={styles.footerArrow}>&larr;</span> <T k="workDetail.viewAll" />
            </Link>
          </div>
        </>
      }
    >
      {/* Content */}
      {content && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div ref={proseRef}>
            {isRichtext ? (
              <div ref={richtextRef} className={styles.sectionProse} dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <MarkdownRenderer content={content} className={styles.sectionProse} />
            )}
          </div>
        </motion.div>
      )}

      {/* Gallery — TOC anchor 와 동일한 본문 영역 안 */}
      {project.gallery.length > 0 && (
        <motion.div
          id="gallery"
          className={styles.gallery}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          {project.gallery.map((src, i) => {
            const count = project.gallery.length;
            const bentoClass = getBentoClass(i, count, styles);
            return (
              <div
                key={i}
                className={`${styles.galleryItem} ${bentoClass ?? ""}`}
                onClick={() => setGalleryViewer({ open: true, index: i })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setGalleryViewer({ open: true, index: i }); }}
                data-cursor="zoom"
              >
                <ProgressiveImage
                  src={src}
                  alt={`${project.title} ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={styles.galleryImage}
                />
              </div>
            );
          })}
        </motion.div>
      )}

    </DetailLayout>

    {/* Gallery ImageViewer */}
    <ImageViewer
      images={project.gallery}
      index={galleryViewer.index}
      open={galleryViewer.open}
      onClose={() => setGalleryViewer({ open: false, index: 0 })}
      title={project.title}
    />

    {/* Prose ImageViewer */}
    <ImageViewer
      images={proseViewer.images}
      index={proseViewer.index}
      open={proseViewer.open}
      onClose={closeProseViewer}
      title={project.title}
    />
    </>
  );
}
