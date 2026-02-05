"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";

import styles from "./SectionTitle.module.css";
import { staggerContainer, fadeInLeft } from "@/animations";
import TypeWriter from "@/components/effects/TypeWriter";

interface Props {
  inView: boolean;
  title: string;
  subTitle?: string;
}

const SectionTitle = forwardRef<HTMLDivElement, Props>(
  ({ inView, title, subTitle }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={styles.header}
        variants={staggerContainer}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        exit="hidden"
      >
        <motion.div
          variants={fadeInLeft}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <TypeWriter text={title} />
        </motion.div>

        {subTitle && (
          <motion.p
            className={styles.subtitle}
            variants={fadeInLeft}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            transition={{ duration: 1 }}
          >
            {subTitle}
          </motion.p>
        )}
      </motion.div>
    );
  }
);

SectionTitle.displayName = "SectionTitle";

export default SectionTitle;
