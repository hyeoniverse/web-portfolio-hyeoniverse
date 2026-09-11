"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import styles from "./OptimizedImage.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

const imageFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  draggable?: boolean;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  draggable = false,
  className = "",
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const { t } = useLanguage();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`${styles.imageContainer} ${className}`}>
      {!isLoaded && !hasError && (
        <div className={styles.placeholder}>
          <div className={styles.skeleton} />
        </div>
      )}

      {!hasError && (
        <motion.img
          src={src}
          alt={alt}
          width={width}
          height={height}
          draggable={draggable}
          className={styles.image}
          onLoad={handleLoad}
          onError={handleError}
          variants={imageFade}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {hasError && (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>📷</div>
          <span className={styles.errorText}>{t("common.imageLoadFailed")}</span>
        </div>
      )}
    </div>
  );
}
