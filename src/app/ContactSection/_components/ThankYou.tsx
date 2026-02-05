"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/animations";
import styles from "./ThankYou.module.css";

export default function ThankYou() {
  return (
    <motion.div
      className={styles.thankYou}
      variants={fadeIn}
      initial="hidden"
      animate="visible" // ContactSection에서 애니메이션 제어
    >
      <div className={styles.content}>
        <h3 className={styles.title}>Thank You</h3>
        <p className={styles.message}>
          <span>
            I appreciate your interest in connecting with me.
            <br />
            Feel free to reach out through any of the channels below.
          </span>
          <span>
            저에게 관심을 가져주셔서 감사합니다.
            <br />
            아래 연락처 중 편한 방법으로 언제든지 연락 주세요.
          </span>
        </p>
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Response Time</span>
            <span className={styles.value}>Within 24 hours</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Availability</span>
            <span className={styles.value}>Open to opportunities</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
