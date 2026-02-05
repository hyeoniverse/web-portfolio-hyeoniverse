import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  imageViewerVariants,
  imageViewerBackdrop,
  imageViewerCloseButton,
  imageViewerNavButton,
  imageViewerImage,
  imageViewerCounter,
} from "@/animations";

import styles from "./ImageViewer.module.css";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useProjectStore } from "@/stores/projectStore";

interface Props {
  images: Array<string>;
  onClose: () => void;
}

export default function ImageViewer({ images, onClose }: Props) {
  const { selectedProject: project } = useProjectStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { playSound } = useSoundManager();
  if (!project) return;

  const handleClose = () => {
    playSound("click");
    onClose();
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
    playSound("hover");
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
    playSound("hover");
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.imageViewerBackdrop}
        variants={imageViewerBackdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => handleClose()}
      >
        <motion.button
          className={styles.imageViewerClose}
          onClick={() => handleClose()}
          whileHover={imageViewerCloseButton.whileHover}
          whileTap={imageViewerCloseButton.whileTap}
          transition={imageViewerCloseButton.transition}
        >
          <X size={24} />
        </motion.button>

        <motion.div
          className={styles.imageViewer}
          variants={imageViewerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.imageViewerContent}>
            <motion.button
              className={`${styles.imageNavButton} ${styles.prevButton}`}
              onClick={prevImage}
              disabled={images.length <= 1}
              whileHover={{ ...imageViewerNavButton.whileHover, x: -5 }}
              whileTap={imageViewerNavButton.whileTap}
              transition={imageViewerNavButton.transition}
            >
              <ChevronLeft size={24} />
            </motion.button>

            <motion.div
              className={styles.imageContainer}
              key={selectedImageIndex}
              variants={imageViewerImage}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Image
                src={
                  images[selectedImageIndex] ||
                  "/placeholder.svg?height=800&width=1200"
                }
                alt={`${project.title} ${selectedImageIndex + 1}`}
                width={1200}
                height={800}
                className={styles.viewerImage}
              />
            </motion.div>

            <motion.button
              className={`${styles.imageNavButton} ${styles.nextButton}`}
              onClick={nextImage}
              disabled={images.length <= 1}
              whileHover={{ ...imageViewerNavButton.whileHover, x: 5 }}
              whileTap={imageViewerNavButton.whileTap}
              transition={imageViewerNavButton.transition}
            >
              <ChevronRight size={24} />
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className={styles.imageCounter}
          variants={imageViewerCounter}
          initial="hidden"
          animate="visible"
        >
          {selectedImageIndex + 1} / {images.length}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
