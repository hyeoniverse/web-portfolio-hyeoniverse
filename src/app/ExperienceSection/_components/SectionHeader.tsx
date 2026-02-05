"use client";

import { motion, type Variants } from "framer-motion";
import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  number: string;
  title?: string;
  count: number;
  variants: Variants;
}

export function SectionHeader({
  number,
  title,
  count,
  variants,
}: SectionHeaderProps) {
  return (
    <motion.div className={styles.sectionHeader} variants={variants}>
      <div className={styles.headerDecoration}>
        <div className={styles.decorationLine} />
        <div className={styles.decorationDot} />
      </div>
      <div className={styles.sectionInfo}>
        <span className={styles.sectionNumber}>{number}</span>
        {title && <h2 className={styles.sectionTitle}>{title}</h2>}
        <span className={styles.sectionCount}>
          {count.toString().padStart(2, "0")}
        </span>
      </div>
    </motion.div>
  );
}
