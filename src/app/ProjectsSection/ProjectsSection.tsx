"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import styles from "./ProjectsSection.module.css";

// Animation easing
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const projects = [
  {
    id: "1",
    number: "01",
    title: "Sakharov Space",
    category: "Branding / Web Design",
    year: "2024",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=800&fit=crop",
    description: "Complete brand identity and website design for an innovative space technology company.",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=800&fit=crop",
    description: "Mobile app design for a fitness tracking platform with gamification elements.",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce / Development",
    year: "2023",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
    description: "Digital transformation project for a global brand, including platform redesign.",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard / Development",
    year: "2024",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop",
    description: "Fintech dashboard with real-time data visualization and intuitive user experience.",
  },
];

export default function PortfolioSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <section className={styles.section} ref={ref}>
      {/* Section Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <span className={styles.label}>Selected Works</span>
        <h2 className={styles.title}>Our Portfolio</h2>
      </motion.div>

      {/* Projects List */}
      <div className={styles.projectsList}>
        {projects.map((project, index) => (
          <motion.article
            key={project.id}
            className={styles.projectItem}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: EASE_OUT }}
            onMouseEnter={() => setHoveredProject(project.id)}
            onMouseLeave={() => setHoveredProject(null)}
          >
            {/* Project Image - Shows on Hover */}
            <AnimatePresence>
              {hoveredProject === project.id && (
                <motion.div
                  className={styles.projectImage}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                >
                  <img src={project.image} alt={project.title} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project Info */}
            <div className={styles.projectInfo}>
              <span className={styles.projectNumber}>{project.number}</span>
              <div className={styles.projectDetails}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectDescription}>{project.description}</p>
              </div>
              <span className={styles.projectCategory}>{project.category}</span>
              <span className={styles.projectYear}>{project.year}</span>
              <div className={styles.projectArrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 17L17 7M17 7H7M17 7V17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Hover Line */}
            <motion.div
              className={styles.hoverLine}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: hoveredProject === project.id ? 1 : 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            />
          </motion.article>
        ))}
      </div>

      {/* View All Button */}
      <motion.div
        className={styles.viewAll}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, delay: 0.6, ease: EASE_OUT }}
      >
        <button className={styles.viewAllButton}>
          <span>View All Projects</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 17L17 7M17 7H7M17 7V17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </motion.div>
    </section>
  );
}
