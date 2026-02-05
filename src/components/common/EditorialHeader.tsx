import { motion } from "framer-motion";
import { editorialHeaderVariants } from "@/animations";
import styles from "./Editorial.module.css";

interface EditorialHeaderProps {
  inView?: boolean;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
}

export function EditorialHeader({
  inView = true,
  leftContent,
  centerContent,
  rightContent,
  className,
}: EditorialHeaderProps) {
  return (
    <motion.div
      className={`${styles.editorialHeader} ${className || ""}`}
      variants={editorialHeaderVariants}
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
