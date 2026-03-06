"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import Button from "@/components/ui/Button";
import CommentSection from "@/components/comments/CommentSection";
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

export default function WorkDetailClient({
  project,
  prevProject,
  nextProject,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const isRichtext = project.contentType === "richtext";
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

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
    <DetailLayout
      backHref="/works"
      backLabel={t("workDetail.back")}
      heroImage={project.image}
      heroAlt={project.title}
      headings={headings}
      likeConfig={{ count: likeCount, liked, onToggle: handleLikeToggle }}
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
              {project.gallery.map((src, i) => (
                <div key={i} className={styles.galleryItem}>
                  <Image
                    src={src}
                    alt={`${project.title} ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className={styles.galleryImage}
                  />
                </div>
              ))}
            </motion.div>
          )}

          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {project.liveUrl && (
              <Button variant="outline" size="lg" href={project.liveUrl} external>
                <T k="workDetail.visitSite" />
              </Button>
            )}
            {project.githubUrl && (
              <Button variant="outline" size="lg" href={project.githubUrl} external>
                GitHub
              </Button>
            )}
            <Button variant="outline" size="lg" href="/works">
              <T k="workDetail.viewAll" />
            </Button>
          </motion.div>

          {/* Comments */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <CommentSection commentType="work" targetId={project.id} />
          </motion.div>

          {/* 이전/다음 프로젝트 */}
          {(prevProject || nextProject) && (
            <nav className={styles.adjacentNav}>
              {prevProject ? (
                <Link
                  href={`/works/${prevProject.id}`}
                  className={styles.adjacentCard}
                >
                  <div className={styles.adjacentThumb}>
                    <Image
                      src={prevProject.image}
                      alt={prevProject.title}
                      fill
                      sizes="64px"
                      className={styles.adjacentThumbImg}
                    />
                  </div>
                  <div className={styles.adjacentBody}>
                    <span className={styles.adjacentLabel}>
                      <span className={styles.adjacentArrow}>&larr;</span>
                      Previous
                    </span>
                    <span className={styles.adjacentWorkTitle}>
                      {prevProject.title}
                    </span>
                  </div>
                </Link>
              ) : (
                <span />
              )}
              {nextProject ? (
                <Link
                  href={`/works/${nextProject.id}`}
                  className={`${styles.adjacentCard} ${styles.adjacentCardNext}`}
                >
                  <div className={styles.adjacentThumb}>
                    <Image
                      src={nextProject.image}
                      alt={nextProject.title}
                      fill
                      sizes="64px"
                      className={styles.adjacentThumbImg}
                    />
                  </div>
                  <div className={styles.adjacentBody}>
                    <span className={styles.adjacentLabel}>
                      Next
                      <span className={styles.adjacentArrow}>&rarr;</span>
                    </span>
                    <span className={styles.adjacentWorkTitle}>
                      {nextProject.title}
                    </span>
                  </div>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      }
    >
      <motion.div
        className={styles.meta}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <span className={styles.category}>{project.category.en}</span>
        <span className={styles.year}>{project.year}</span>
      </motion.div>

      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {project.title}
      </motion.h1>

      <motion.p
        className={styles.description}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {project.description[language]}
      </motion.p>

      <motion.div
        className={styles.infoRow}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
      >
        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}><T k="workDetail.role" /></span>
          <span className={styles.infoValue}>{project.role[language]}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
          <div className={styles.techStack}>
            {project.tech.map((tech) => (
              <span key={tech} className={styles.techTag}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team Members */}
      {project.teamMembers && project.teamMembers.length > 0 && (
        <motion.div
          className={styles.infoRow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.6 }}
        >
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}><T k="workDetail.team" /></span>
            <div className={styles.teamList}>
              {project.teamMembers.map((member, i) => (
                <div key={i} className={styles.teamMember}>
                  <span className={styles.teamName}>
                    {member.url ? (
                      <a href={member.url} target="_blank" rel="noopener noreferrer">
                        {member.name}
                      </a>
                    ) : (
                      member.name
                    )}
                  </span>
                  <span className={styles.teamRole}>{member.role[language]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {needsTranslation && (
        <div className={styles.translateBanner}>
          <p className={styles.translateMessage}>
            This work is not yet available in English.
          </p>
        </div>
      )}

      {/* Content */}
      {content && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {isRichtext ? (
            <div className={styles.sectionProse} dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <MarkdownRenderer content={content} className={styles.sectionProse} />
          )}
        </motion.div>
      )}

    </DetailLayout>
  );
}
