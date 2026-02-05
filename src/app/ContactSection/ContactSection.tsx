"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./ContactSection.module.css";

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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT,
    },
  },
};

export default function ContactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setFormData({ name: "", email: "", message: "" });
    alert("Message sent successfully!");
  };

  return (
    <section className={styles.section} ref={ref}>
      <motion.div
        className={styles.container}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {/* Left Column - Contact Info */}
        <motion.div className={styles.infoColumn} variants={itemVariants}>
          <span className={styles.label}>Get in Touch</span>
          <h2 className={styles.title}>
            Let&apos;s create
            <br />
            <span className={styles.titleAccent}>something great</span>
            <br />
            together
          </h2>
          <p className={styles.description}>
            Have a project in mind? We&apos;d love to hear about it.
            Send us a message and we&apos;ll get back to you as soon as possible.
          </p>

          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Email</span>
              <a href="mailto:hello@hyeoniverse.com" className={styles.contactValue}>
                hello@hyeoniverse.com
              </a>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Careers</span>
              <a href="mailto:careers@hyeoniverse.com" className={styles.contactValue}>
                careers@hyeoniverse.com
              </a>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Location</span>
              <span className={styles.contactValue}>Seoul, South Korea</span>
            </div>
          </div>

          <div className={styles.socialLinks}>
            <a href="https://behance.net" target="_blank" rel="noopener noreferrer">
              Behance
            </a>
            <a href="https://dribbble.com" target="_blank" rel="noopener noreferrer">
              Dribbble
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </div>
        </motion.div>

        {/* Right Column - Contact Form */}
        <motion.div className={styles.formColumn} variants={itemVariants}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                className={styles.formInput}
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Message</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Tell us about your project..."
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
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
          </form>
        </motion.div>
      </motion.div>
    </section>
  );
}
