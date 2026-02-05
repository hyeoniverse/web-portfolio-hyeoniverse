import { motion } from "framer-motion";
import styles from "./ActionButtons.module.css";

interface Props {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export default function ActionButton({
  onClick,
  title,
  children,
  isActive = false,
}: Props) {
  return (
    <motion.button
      className={`${styles.actionButton} glass ${isActive ? styles.active : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={title}
    >
      {children}
    </motion.button>
  );
}
