import { motion } from "framer-motion";
import { editorialFooterVariants } from "@/animations";
import styles from "./Editorial.module.css";

interface EditorialFooterProps {
  inView?: boolean;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
}

export function EditorialFooter({
  inView = true,
  leftContent,
  centerContent,
  rightContent,
  className,
}: EditorialFooterProps) {
  return (
    <motion.div
      className={`${styles.editorialFooter} ${className || ""}`}
      variants={editorialFooterVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      <div className={styles.content}>
        <div className={styles.left}>{leftContent}</div>
        <div className={styles.center}>{centerContent}</div>
        <div className={styles.right}>{rightContent}</div>
      </div>
    </motion.div>
  );
}
