"use client";

import { useState } from "react";
import {
  motion,
  AnimatePresence,
  type Variants,
  type Transition,
} from "framer-motion";
import styles from "@/app/SkillsSection/SkillsSection.module.css";
import CountUpNumber from "@/app/SkillsSection/_components/CountUpNumber";
import SkillDescription from "@/app/SkillsSection/_components/SkillsDescription";
import { Domain, Skill } from "@/types";

// === Variants ===
const cardVariants: Variants = {
  collapsed: { opacity: 1 },
  expanded: { opacity: 1 },
  hidden: { opacity: 0.3, filter: "blur(2px)", zIndex: 10 },
};

const skillVariants: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -15 },
  visible: { opacity: 1, y: 0, rotateX: 0 },
};

const skillTransition: Transition = {
  ease: "easeOut",
  duration: 1.2,
};

// === Helpers ===
const getEditorialNumber = (index: number) =>
  String(index + 1).padStart(2, "0");

// === Components ===
const SkillTagsPreview = ({ skills }: { skills: Skill[] }) => (
  <div className={styles.skillTags}>
    {skills.slice(0, 4).map((skill, idx) => (
      <div key={idx} className={styles.tooltipWrapper}>
        <motion.span
          className={styles.skillTag}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          #{skill.title}
        </motion.span>
        <span className={styles.tooltipLabel}>{skill.level}</span>
      </div>
    ))}
  </div>
);

const SkillMasonryGrid = ({ skills }: { skills: Skill[] }) => (
  <div className={styles.skillsMasonryGrid}>
    {skills.map((skill, idx) => (
      <motion.div
        key={idx}
        className={`${styles.skillCard} ${
          idx % 3 === 0
            ? styles.skillCardTall
            : idx % 3 === 1
              ? styles.skillCardWide
              : styles.skillCardRegular
        }`}
        variants={skillVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: idx * 0.1 }}
        whileHover={{
          scale: 1.05,
          rotateY: 5,
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        layout
      >
        <div className={styles.skillHeader}>
          <span className={styles.skillIcon}>{skill.icon}</span>
          <div className={styles.tooltipWrapper}>
            <span className={styles.skillLevel}>{skill.level}</span>
            <span className={styles.tooltipLabel}>
              {skill.level === "Familiar" &&
                "기본 개념을 이해하고 간단히 활용 가능"}
              {skill.level === "Experienced" &&
                "실제 프로젝트에서 사용했고 익숙하게 활용 가능"}
              {skill.level === "Learning" &&
                "학습 중이거나 프로젝트에 제한적으로 적용해본 상태"}
            </span>
          </div>
          <h4 className={styles.skillTitle}>{skill.title}</h4>
        </div>

        <SkillDescription
          className={styles.skillDescription}
          description={skill.description || ""}
          keywords={skill.keywords || []}
        />

        <motion.div
          className={styles.skillProgress}
          initial={{ width: 0 }}
          animate={{ width: `${skill.numericLevel}%` }}
          transition={{ ...skillTransition, delay: idx * 0.1 }}
        />
      </motion.div>
    ))}
  </div>
);

// === Main Component ===
interface EditorialSkillCardProps {
  domain: Domain;
  skills: Skill[];
  selectedDomain: string | null;
  setSelectedDomain: (id: string | null) => void;
  domainIndex: number;
}

export default function EditorialSkillCard({
  domain,
  skills,
  selectedDomain,
  setSelectedDomain,
  domainIndex,
}: EditorialSkillCardProps) {
  const isSelected = selectedDomain === domain.id;
  const isAnotherSelected = selectedDomain && !isSelected;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      data-more={!isSelected ? "true" : undefined}
      data-clickable={!isSelected ? "true" : undefined}
      className={`${styles.editorialCard} ${
        isSelected ? styles.expandedCard : ""
      }`}
      variants={cardVariants}
      animate={
        isSelected ? "expanded" : isAnotherSelected ? "hidden" : "collapsed"
      }
      onClick={() => !isSelected && setSelectedDomain(domain.id)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        rotateZ: isSelected ? 0 : [-1, 1, -0.5, 0.5, 0][domainIndex % 5],
        y: isSelected ? 0 : -8,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      layout
    >
      {/* Header */}
      <div className={styles.editorialHeader}>
        <motion.div
          className={styles.editorialNumber}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: domainIndex * 0.1 }}
        >
          {getEditorialNumber(domainIndex)}
        </motion.div>
        <motion.div
          className={styles.skillCount}
          layout="position"
          transition={{ layout: { duration: 0.4, ease: "easeInOut" } }}
        >
          <CountUpNumber end={skills.length} />
          <span className={styles.countLabel}>SKILLS</span>
        </motion.div>
        <motion.span
          className={`${styles.categoryLabel} ${
            isSelected ? styles.expandedCategoryLabel : ""
          }`}
          whileHover={{ letterSpacing: "0.03em" }}
          layout="position"
          transition={{ layout: { duration: 0.4, ease: "easeInOut" } }}
        >
          {domain.title}
        </motion.span>

        <motion.div
          className={styles.geometricAccent}
          animate={{ rotateZ: isHovered ? 180 : 0, scale: isHovered ? 1.2 : 1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </div>

      {/* Body */}
      <AnimatePresence>
        {(isSelected || !selectedDomain) && (
          <motion.div
            className={`${styles.editorialBody} ${
              isSelected ? styles.expandedBody : ""
            }`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            layout
          >
            <p>{domain.description}</p>

            {!isSelected ? (
              <SkillTagsPreview skills={skills} />
            ) : (
              <SkillMasonryGrid skills={skills} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
