"use client";

import { motion, type Variants } from "framer-motion";
import type { Experience } from "@/types";
import styles from "./ExperienceCard.module.css";

interface ExperienceCardProps {
  experience: Experience;
  index: number;
  cardVariants?: Variants;
  totalOffset?: number;
}

export function ExperienceCard({
  experience,
  index,
  cardVariants,
  totalOffset = 0,
}: ExperienceCardProps) {
  const isWork = experience.type === "activity";

  return (
    <motion.article
      className={`${styles.card} ${isWork ? styles.workCard : styles.educationCard} glass`}
      variants={cardVariants}
      custom={totalOffset + index}
      whileHover={{
        scale: isWork ? 1.02 : 1.03,
        rotateY: isWork ? 5 : 0,
        rotateZ: isWork ? 0 : index % 2 === 0 ? 2 : -2,
        z: 50,
        transition: { duration: 0.3 },
      }}
    >
      {!isWork && <div className={styles.cardBackground} />}

      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <span className={styles.cardNumber}>
            {(index + 1).toString().padStart(2, "0")}
          </span>
          <time
            className={`${styles.period} ${isWork ? "highlight-text" : ""}`}
          >
            {experience.startDate}-{experience.endDate}
          </time>
        </div>
      </div>

      <div className={styles.cardContent}>
        <span className={styles.title}>{experience.title}</span>
        <h4 className={styles.institution}>{experience.organization}</h4>

        <div className={styles.description}>
          {experience.description
            .slice(0, isWork ? 2 : 1)
            .map((desc, descIndex) => (
              <p key={descIndex} className={styles.descriptionItem}>
                {desc}
              </p>
            ))}
        </div>

        <div className={styles.techStack}>
          <div className={styles.techGrid}>
            {experience.technologies
              ?.slice(0, isWork ? 4 : 3)
              .map((tech, techIndex) => (
                <span key={techIndex} className={styles.techItem}>
                  {tech}
                </span>
              ))}
            {experience.technologies &&
              experience.technologies.length > (isWork ? 4 : 3) && (
                <span className={styles.techMore}>
                  +{experience.technologies.length - (isWork ? 4 : 3)}
                </span>
              )}
          </div>
        </div>
      </div>

      {isWork && <div className={styles.cardAccent} />}
    </motion.article>
  );
}
