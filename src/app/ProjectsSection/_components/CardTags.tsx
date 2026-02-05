"use client";

import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./CardTags.module.css";

interface CardTagsProps {
  technologies: string[];
  projectId: string;
  expandedTags: Record<string, boolean>;
  toggleTags: (projectId: string) => void;
}

export default function CardTags({
  technologies,
  projectId,
  expandedTags,
  toggleTags,
}: CardTagsProps) {
  const maxVisibleTags = 3;
  const isExpanded = expandedTags[projectId] || false;
  const hasMoreTags = technologies.length > maxVisibleTags;
  const visibleTags = isExpanded
    ? technologies
    : technologies.slice(0, maxVisibleTags);
  const hiddenCount = technologies.length - maxVisibleTags;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTags(projectId);
  };

  return (
    <div className={styles.tagsContainer}>
      <AnimatePresence mode="wait">
        {visibleTags.map((tech, index) => (
          <motion.span
            key={`${projectId}-${tech}-${index}`}
            className={styles.tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            {tech}
          </motion.span>
        ))}
      </AnimatePresence>

      {hasMoreTags && (
        <motion.button
          className={styles.expandButton}
          onClick={handleToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {isExpanded ? "접기" : `+ ${hiddenCount}`}
        </motion.button>
      )}
    </div>
  );
}
