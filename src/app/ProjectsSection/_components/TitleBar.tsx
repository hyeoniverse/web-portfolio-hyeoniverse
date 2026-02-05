import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Github, Minus, MoveDiagonal2, X } from "lucide-react";

import styles from "./TitleBar.module.css";
import { itemVariants, tooltipVariants } from "@/animations";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useModalStore } from "@/stores/modalStore";
import { useProjectStore } from "@/stores/projectStore";
import { FaBlog } from "react-icons/fa";

export default function TitleBar() {
  const { selectedProject: project } = useProjectStore();
  const { playSound } = useSoundManager();
  const { closeModal } = useModalStore();
  const [showBlogTooltip, setShowBlogTooltip] = useState(false);
  if (!project) return;

  const blogLinks = project.blogUrls ?? [];

  const handleClose = () => {
    playSound("click");
    closeModal();
  };

  const handleClicked = () => {
    playSound("click");
  };

  return (
    <motion.div className={styles.titleBar} variants={itemVariants}>
      <div className={styles.windowControls}>
        <motion.button
          className={`${styles.windowButton} ${styles.closeButton}`}
          onClick={handleClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", damping: 15, stiffness: 400 }}
        >
          <X size={12} />
        </motion.button>
        <motion.div
          className={`${styles.windowButton} ${styles.minimizeButton}`}
          onClick={handleClicked}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", damping: 15, stiffness: 400 }}
        >
          <Minus size={12} />
        </motion.div>
        <motion.div
          className={`${styles.windowButton} ${styles.maximizeButton}`}
          onClick={handleClicked}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", damping: 15, stiffness: 400 }}
        >
          <MoveDiagonal2 size={12} />
        </motion.div>
      </div>

      <motion.div
        className={`${styles.titleText} glass`}
        initial={{
          opacity: 0,
          rotateX: -90,
          transformOrigin: "bottom",
        }}
        animate={{ opacity: 1, rotateX: 0 }}
        transition={{
          delay: 0.3,
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
      >
        {project.title}
      </motion.div>

      <motion.div
        className={styles.titleBarActions}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: 0.4,
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
      >
        {blogLinks.length > 0 && (
          <div
            className={styles.blogButtonContainer}
            onMouseEnter={() => setShowBlogTooltip(true)}
            onMouseLeave={() => setShowBlogTooltip(false)}
          >
            <motion.button
              className={styles.titleBarButton}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", damping: 15, stiffness: 400 }}
            >
              <FaBlog size={16} />
            </motion.button>

            <AnimatePresence>
              {showBlogTooltip && (
                <motion.div
                  className={styles.blogTooltip}
                  variants={tooltipVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className={styles.tooltipArrow} />
                  {blogLinks.map((blog, index) => (
                    <motion.a
                      key={index}
                      href={blog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.blogLink}
                      onClick={() => playSound("click")}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        damping: 20,
                        stiffness: 400,
                      }}
                      whileHover={{
                        x: 5,
                        backgroundColor: "rgba(0, 123, 255, 0.1)",
                      }}
                    >
                      {blog.title}
                    </motion.a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {project.githubUrl && (
          <motion.a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleBarButton}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", damping: 15, stiffness: 400 }}
          >
            <Github size={16} />
          </motion.a>
        )}
        {project.liveUrl && (
          <motion.a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleBarButton}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", damping: 15, stiffness: 400 }}
          >
            <ExternalLink size={16} />
          </motion.a>
        )}
      </motion.div>
    </motion.div>
  );
}
