"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { skillsData } from "@/data";
import styles from "./SkillsSection.module.css";
import { Pointer } from "lucide-react";
import SkillsHeader from "./SkillsHeader";
import SkillsFooter from "./SkillsFooter";
import SkillsCard from "@/app/SkillsSection/_components/SkillsCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  containerVariants,
  backButtonVariants,
  accentCtaVariants,
  infiniteRotateSlow,
} from "@/animations";

interface BackButtonProps {
  onClick: () => void;
}
const BackButton = ({ onClick }: BackButtonProps) => (
  <motion.button
    className={styles.backBtn}
    onClick={onClick}
    variants={backButtonVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    ← BACK
  </motion.button>
);

const AccentCTA = () => {
  const { isMobile } = useIsMobile();

  return (
    <motion.div
      className={`${styles.editorialAccent} ${isMobile ? styles.mobile : ""}`}
      variants={accentCtaVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={styles.accentContent}
        variants={infiniteRotateSlow}
        animate="animate"
      >
        <Pointer className={`${styles.accentIcon} bounce-y`} />
        <span className={styles.accentText}>CLICK</span>
        <span className={styles.accentSubtext}>
          any card <strong>to explore</strong>
        </span>
      </motion.div>
    </motion.div>
  );
};

export default function SkillsSection() {
  const sectionRef = useRef(null);
  const expandedCardRef = useRef<HTMLDivElement>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const isInView = useInView(sectionRef, { amount: 0.05 });

  useEffect(() => {
    if (selectedDomain && expandedCardRef.current) {
      // Small delay to allow layout animation to start
      const timer = setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedDomain]);

  return (
    <motion.article
      ref={sectionRef}
      className="container"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      <div className={styles.editorialContainer}>
        <SkillsHeader />

        {/* Back Button (Top) */}
        <AnimatePresence>
          {selectedDomain && (
            <BackButton onClick={() => setSelectedDomain(null)} />
          )}
        </AnimatePresence>

        {/* Cards */}
        <motion.div
          ref={expandedCardRef}
          className={
            selectedDomain ? styles.expandedLayout : styles.masonryGrid
          }
          variants={containerVariants}
        >
          {skillsData.map((domainData, domainIndex) => (
            <SkillsCard
              key={domainData.domain.id}
              domain={domainData.domain}
              skills={domainData.skills}
              selectedDomain={selectedDomain}
              setSelectedDomain={setSelectedDomain}
              domainIndex={domainIndex}
            />
          ))}

          {!selectedDomain && <AccentCTA />}
        </motion.div>

        {/* Back Button (Bottom) */}
        <AnimatePresence>
          {selectedDomain && (
            <BackButton onClick={() => setSelectedDomain(null)} />
          )}
        </AnimatePresence>

        <SkillsFooter />
      </div>
    </motion.article>
  );
}
