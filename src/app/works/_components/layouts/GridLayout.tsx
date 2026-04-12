"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import T from "@/components/ui/T";
import type { WorksLayoutProps } from "./shared";
import styles from "./GridLayout.module.css";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function GridLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleClick = useCallback(
    (i: number, id: string, image: string) => {
      const el = cardRefs.current[i];
      if (el) onProjectClick(id, el.getBoundingClientRect(), image);
    },
    [onProjectClick],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Selected Works</h1>
        <p className={styles.headerSub}>
          {String(projects.length).padStart(2, "0")} Projects
        </p>
      </div>

      <motion.div
        className={styles.grid}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className={styles.item}
            variants={fadeUp}
            onClick={() => handleClick(i, p.id, p.image)}
          >
            <div className={styles.itemImage}>
              <Image
                src={p.image}
                alt={p.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                loading={i < 3 ? "eager" : "lazy"}
              />
            </div>
            <div className={styles.itemOverlay} />
            <span className={styles.itemYear}>{p.year}</span>
            <div className={styles.itemMeta}>
              <div className={styles.itemNumber}>PROJECT {p.number}</div>
              <h3 className={styles.itemTitle}>{p.title}</h3>
              <p className={styles.itemSub}>
                <T ko={p.subtitle.ko} en={p.subtitle.en} />
              </p>
              <div className={styles.itemTech}>
                {p.tech.slice(0, 3).map((tech: string, j: number) => (
                  <span key={j}>{tech}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
