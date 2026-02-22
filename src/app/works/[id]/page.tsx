"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { projects } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import Button from "@/components/ui/Button";
import styles from "./WorkDetail.module.css";

export default function WorkDetailPage() {
  const params = useParams();
  const { t, language } = useLanguage();
  const project = projects.find((p) => p.id === params.id);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!project) return;

    fetch(`/api/works/${project.id}/like`)
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      });
  }, [project]);

  const handleLikeToggle = useCallback(async () => {
    if (!project) return;

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);

    const res = await fetch(`/api/works/${project.id}/like`, { method: "POST" });
    const data = await res.json();
    setLikeCount(data.count);
    setLiked(data.liked);
  }, [project, liked]);

  if (!project) {
    return (
      <div className={styles.notFound}>
        <h1>{t("workDetail.notFound")}</h1>
        <Link href="/">{t("workDetail.notFoundLink")}</Link>
      </div>
    );
  }

  const headings: TocHeading[] = [
    { id: "overview", text: t("workDetail.overview"), level: 2 },
    { id: "challenge", text: t("workDetail.challenge"), level: 2 },
    { id: "solution", text: t("workDetail.solution"), level: 2 },
    ...(project.gallery.length > 0
      ? [{ id: "gallery", text: "Gallery", level: 2 }]
      : []),
  ];

  return (
    <DetailLayout
      backHref="/works"
      backLabel={t("workDetail.back")}
      heroImage={project.image}
      heroAlt={project.title}
      headings={headings}
      likeConfig={{ count: likeCount, liked, onToggle: handleLikeToggle }}
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
          <span className={styles.infoLabel}>{t("workDetail.role")}</span>
          <span className={styles.infoValue}>{project.role[language]}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}>{t("workDetail.tech")}</span>
          <div className={styles.techStack}>
            {project.tech.map((tech) => (
              <span key={tech} className={styles.techTag}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Overview */}
      <motion.div
        id="overview"
        className={styles.section}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>{t("workDetail.overview")}</h2>
        <p className={styles.sectionText}>{project.overview[language]}</p>
      </motion.div>

      {/* Challenge */}
      <motion.div
        id="challenge"
        className={styles.section}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>{t("workDetail.challenge")}</h2>
        <p className={styles.sectionText}>{project.challenge[language]}</p>
      </motion.div>

      {/* Solution */}
      <motion.div
        id="solution"
        className={styles.section}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>{t("workDetail.solution")}</h2>
        <p className={styles.sectionText}>{project.solution[language]}</p>
      </motion.div>

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
            {t("workDetail.visitSite")}
          </Button>
        )}
        {project.githubUrl && (
          <Button variant="outline" size="lg" href={project.githubUrl} external>
            GitHub
          </Button>
        )}
        <Button variant="outline" size="lg" href="/works">
          {t("workDetail.viewAll")}
        </Button>
      </motion.div>
    </DetailLayout>
  );
}
