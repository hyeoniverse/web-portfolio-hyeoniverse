"use client";

import { motion } from "framer-motion";
import styles from "./HeroContent.module.css";
import { useSoundManager } from "@/hooks/useSoundManager";

// Animation constants
const EASE_ENTRANCE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.8,
    },
  },
};

const titleVariants = {
  hidden: {
    opacity: 0,
    y: 100,
    rotateX: -15,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 1,
      ease: EASE_ENTRANCE,
    },
  },
};

const lineVariants = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_ENTRANCE,
    },
  },
};

const serviceVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: EASE_ENTRANCE,
    },
  },
};

interface ServiceTagProps {
  label: string;
  onHover: () => void;
}

function ServiceTag({ label, onHover }: ServiceTagProps) {
  return (
    <motion.span
      className={styles.serviceTag}
      onMouseEnter={onHover}
      variants={serviceVariants}
      whileHover={{ color: "#D01046" }}
    >
      {label}
    </motion.span>
  );
}

export function HeroContent() {
  const { playSound } = useSoundManager();

  const services = [
    "Branding",
    "Marketing Design",
    "UX/UI",
    "Webflow",
    "Development",
    "Motion",
  ];

  return (
    <motion.div
      className={styles.content}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Agency Name */}
      <motion.div className={styles.agencyName} variants={lineVariants}>
        <span className={styles.label}>Creative Digital Agency</span>
      </motion.div>

      {/* Main Title */}
      <motion.h1 className={styles.mainTitle} variants={titleVariants}>
        <span className={styles.titleLine}>HYEONI</span>
        <span className={styles.titleLine}>VERSE</span>
      </motion.h1>

      {/* Tagline */}
      <motion.p className={styles.tagline} variants={lineVariants}>
        We create bold digital experiences
        <br />
        that connect brands with people.
      </motion.p>

      {/* Services */}
      <motion.div
        className={styles.services}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.span className={styles.servicesLabel} variants={lineVariants}>
          What we do
        </motion.span>
        <div className={styles.servicesList}>
          {services.map((service) => (
            <ServiceTag
              key={service}
              label={service}
              onHover={() => playSound("hover")}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
