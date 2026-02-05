"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./AboutSection.module.css";

// Animation easing
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT,
    },
  },
};

const services = [
  {
    number: "01",
    title: "Branding",
    description:
      "We create memorable brand identities that resonate with your audience. From logo design to complete brand systems.",
    items: ["Brand Strategy", "Visual Identity", "Brand Guidelines", "Naming"],
  },
  {
    number: "02",
    title: "UX/UI Design",
    description:
      "User-centered design that balances aesthetics with functionality. We craft intuitive digital experiences.",
    items: ["User Research", "Wireframing", "Visual Design", "Prototyping"],
  },
  {
    number: "03",
    title: "Development",
    description:
      "We build fast, scalable, and maintainable digital products using modern technologies.",
    items: ["Webflow", "React/Next.js", "E-commerce", "CMS Integration"],
  },
  {
    number: "04",
    title: "Motion Design",
    description:
      "Engaging animations and micro-interactions that bring digital experiences to life.",
    items: ["UI Animation", "Video Production", "3D Animation", "Interaction Design"],
  },
];

export default function ServicesSection() {
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
        <span className={styles.label}>What We Do</span>
        <h2 className={styles.title}>
          We help brands stand out
          <br />
          <span className={styles.titleAccent}>in the digital age</span>
        </h2>
        <p className={styles.description}>
          15 years of design experience, concentrated in its people.
          <br />
          From strategy to execution, we deliver comprehensive digital solutions.
        </p>
      </motion.div>

      {/* Services Grid */}
      <motion.div
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {services.map((service) => (
          <motion.div
            key={service.number}
            className={styles.card}
            variants={itemVariants}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardNumber}>{service.number}</span>
              <h3 className={styles.cardTitle}>{service.title}</h3>
            </div>
            <p className={styles.cardDescription}>{service.description}</p>
            <ul className={styles.cardItems}>
              {service.items.map((item) => (
                <li key={item} className={styles.cardItem}>
                  {item}
                </li>
              ))}
            </ul>
            <div className={styles.cardArrow}>
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
          </motion.div>
        ))}
      </motion.div>

      {/* Stats Section */}
      <motion.div
        className={styles.stats}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT }}
      >
        <div className={styles.stat}>
          <span className={styles.statNumber}>15+</span>
          <span className={styles.statLabel}>Years Experience</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>200+</span>
          <span className={styles.statLabel}>Projects Delivered</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>50+</span>
          <span className={styles.statLabel}>Happy Clients</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>12</span>
          <span className={styles.statLabel}>Awards Won</span>
        </div>
      </motion.div>
    </section>
  );
}
