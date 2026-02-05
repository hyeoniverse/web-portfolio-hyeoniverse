import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./SkillsFooter.module.css";

export default function SkillsFooter() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.01, once: true });

  return (
    <motion.footer
      ref={ref}
      className={styles.editorialFooter}
      initial={{ opacity: 0, y: 100 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <motion.div
        className={styles.footerContent}
        transition={{ duration: 0.5 }}
      >
        <motion.div className={styles.footerText}>
          <motion.p
            className={styles.footerTitle}
            whileHover={{
              letterSpacing: "12px",
              transition: { duration: 0.3 },
            }}
          >
            CONTINUOUS LEARNING
          </motion.p>
          <motion.p
            className={styles.footerDescription}
            transition={{ duration: 0.3 }}
          >
            빠르게 변화하는 기술 트렌드에 발맞춰 지속적으로 학습하고 성장하며,
            새로운 도전을 통해 더 나은 개발자가 되기 위해 노력하고 있습니다.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.footerPattern}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          whileHover={{
            scale: 1.1,
            rotateZ: 5,
            transition: { duration: 0.3 },
          }}
        />
      </motion.div>
    </motion.footer>
  );
}
