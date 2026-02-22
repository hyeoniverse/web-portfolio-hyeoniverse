"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { projects } from "@/data/projects";
import Button from "@/components/ui/Button";
import styles from "./WorkDetail.module.css";

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    return (
      <div className={styles.notFound}>
        <h1>{t("workDetail.notFound")}</h1>
        <Link href="/">{t("workDetail.notFoundLink")}</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Image */}
      <motion.div
        className={styles.heroImage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="100vw"
          priority
          className={styles.heroImageInner}
        />
        <div className={styles.heroOverlay} />
      </motion.div>

      {/* Back Button */}
      <motion.button
        className={styles.backButton}
        onClick={() => router.back()}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{t("workDetail.back")}</span>
      </motion.button>

      {/* Content */}
      <div className={styles.content}>
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

      </div>
    </div>
  );
}
