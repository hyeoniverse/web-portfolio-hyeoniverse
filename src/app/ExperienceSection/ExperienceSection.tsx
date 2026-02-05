"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { siteConfig } from "@/config/site.config";
import styles from "./ExperienceSection.module.css";

// Animation easing
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT,
    },
  },
};

const team = [
  {
    id: "1",
    name: "Pavel Dergachev",
    role: "Founder & Creative Director",
    bio: "15+ years of design experience. Previously led design at major tech companies. Passionate about pushing creative boundaries and mentoring the next generation of designers.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    social: {
      linkedin: "https://linkedin.com",
      dribbble: "https://dribbble.com",
      twitter: "https://twitter.com",
    },
  },
  {
    id: "2",
    name: "Sarah Chen",
    role: "Head of Design",
    bio: "Award-winning designer with expertise in brand identity and digital product design. Believes in the power of simplicity and user-centered approach.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    social: {
      linkedin: "https://linkedin.com",
      dribbble: "https://dribbble.com",
    },
  },
  {
    id: "3",
    name: "Marcus Kim",
    role: "Technical Director",
    bio: "Full-stack developer with a passion for building scalable systems. Webflow certified expert with deep knowledge of modern frameworks.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop",
    social: {
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
  },
];

export default function TeamSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });

  return (
    <section className={styles.section} ref={ref}>
      {/* Section Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <span className={styles.label}>Our Team</span>
        <h2 className={styles.title}>
          Meet the people behind
          <br />
          <span className={styles.titleAccent}>{siteConfig.brand.name}</span>
        </h2>
        <p className={styles.description}>
          A diverse team of designers, developers, and strategists
          <br />
          united by a passion for creating exceptional digital experiences.
        </p>
      </motion.div>

      {/* Team Grid */}
      <motion.div
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {team.map((member) => (
          <motion.div
            key={member.id}
            className={styles.card}
            variants={itemVariants}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.cardImage}>
              <img src={member.image} alt={member.name} />
              <div className={styles.cardOverlay}>
                <div className={styles.socialLinks}>
                  {member.social.linkedin && (
                    <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  )}
                  {member.social.dribbble && (
                    <a href={member.social.dribbble} target="_blank" rel="noopener noreferrer">
                      Dribbble
                    </a>
                  )}
                  {member.social.twitter && (
                    <a href={member.social.twitter} target="_blank" rel="noopener noreferrer">
                      Twitter
                    </a>
                  )}
                  {member.social.github && (
                    <a href={member.social.github} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardName}>{member.name}</h3>
              <span className={styles.cardRole}>{member.role}</span>
              <p className={styles.cardBio}>{member.bio}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Join Us CTA */}
      <motion.div
        className={styles.cta}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, delay: 0.6, ease: EASE_OUT }}
      >
        <div className={styles.ctaContent}>
          <h3 className={styles.ctaTitle}>Join Our Team</h3>
          <p className={styles.ctaDescription}>
            We&apos;re always looking for talented individuals to join our growing team.
          </p>
          <a href={`mailto:${siteConfig.contact.email}`} className={styles.ctaButton}>
            <span>View Open Positions</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
