"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import Button from "@/components/ui/Button";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
import CommentSection from "@/components/comments/CommentSection";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import AISummary from "@/components/ui/AISummary";
import ShareButton from "@/components/ui/ShareButton";
import styles from "./WorkDetail.module.css";

interface WorkDetailClientProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

/** Extract h2 headings from content for TOC */
function extractHeadings(content: string, isRichtext: boolean): TocHeading[] {
  const headings: TocHeading[] = [];

  if (isRichtext) {
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, "");
      const id = slugify(text);
      headings.push({ id, text, level: 2 });
    }
  } else {
    const regex = /^##\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].trim();
      const id = slugify(text);
      headings.push({ id, text, level: 2 });
    }
  }

  return headings;
}

/**
 * Bento grid class assignment — irregular 3-col layout
 * 12-item cycle for maximum variety:
 *
 *  Row 1-2: [hero 2×2] [tall 1×2]
 *  Row 3:   [  normal ] [  wide 2×1  ]
 *  Row 4:   [  wide 2×1  ] [ normal ]
 *  Row 5-6: [tall 1×2] [   hero 2×2  ]
 *  Row 7:   [ normal ] [ normal ] [ normal ]
 */
function getBentoClass(
  i: number,
  count: number,
  s: Record<string, string>,
): string {
  if (count === 1) return s.bentoFull;
  if (count === 2) return s.bentoWide;
  if (count === 3) {
    if (i === 0) return s.bentoHero;
    return "";
  }
  if (count === 4) {
    if (i === 0) return s.bentoHero;
    if (i === 1) return s.bentoTall;
    return "";
  }

  const pos = i % 12;
  switch (pos) {
    case 0: return s.bentoHero;   // 2×2
    case 1: return s.bentoTall;   // 1×2
    case 3: return s.bentoWide;   // 2×1
    case 4: return s.bentoWide;   // 2×1
    case 6: return s.bentoTall;   // 1×2
    case 7: return s.bentoHero;   // 2×2
    default: return "";           // 1×1
  }
}

export default function WorkDetailClient({
  project,
  prevProject,
  nextProject,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const isRichtext = project.contentType === "richtext";
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();

  useEffect(() => {
    fetch(`/api/works/${project.id}/like`)
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      })
      .catch(() => {});
  }, [project.id]);

  const handleLikeToggle = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    const res = await fetch(`/api/works/${project.id}/like`, {
      method: "POST",
    });
    const data = await res.json();
    setLikeCount(data.count);
    setLiked(data.liked);
  }, [project.id, liked]);

  const content = project.content[language] || project.content.ko;
  const needsTranslation = language === "en" && !project.content[language];

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
      afterContent={
        <>
          {/* Gallery */}
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

          <motion.div
            className={styles.likeWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5 }}
          >
            <button
              type="button"
              className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""}`}
              onClick={handleLikeToggle}
              title={t("common.like")}
              data-clickable="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{likeCount}</span>
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
              <Button variant="outline" size="lg" href={project.githubUrl} external>
                <T ko="GitHub" en="GitHub" tooltip={t("tooltip.github")} />
              </Button>
            )}
          </motion.div>

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
            <CommentSection commentType="work" targetId={project.id} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link href="/works" className={styles.footerLink}>
              <span className={styles.footerArrow}>&larr;</span> <T k="workDetail.viewAll" />
            </Link>
          </div>
        </>
      }
    >
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
        </div>
        <ShareButton />
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

      {needsTranslation && (
        <div className={styles.translateBanner}>
          <p className={styles.translateMessage}>
            This work is not yet available in English.
          </p>
        </div>
      )}

      <AISummary
        summaryKo={project.summary?.ko ?? ""}
        summaryEn={project.summary?.en ?? ""}
        lang={language}
      />

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
              <div className={styles.sectionProse} dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <MarkdownRenderer content={content} className={styles.sectionProse} />
            )}
          </div>
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
