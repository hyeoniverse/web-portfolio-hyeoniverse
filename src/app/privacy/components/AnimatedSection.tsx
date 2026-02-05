"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "../Privacy.module.css";

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
}

export default function AnimatedSection({
  children,
  delay = 0,
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.section
      ref={ref}
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.section>
  );
}
