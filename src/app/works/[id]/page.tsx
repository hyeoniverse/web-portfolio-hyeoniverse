"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { projects } from "@/data/projects";
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
          className={styles.techStack}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          {project.tech.map((tech) => (
            <span key={tech} className={styles.techTag}>
              {tech}
            </span>
          ))}
        </motion.div>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Link href="/works" className={styles.viewAllButton}>
            {t("workDetail.viewAll")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
