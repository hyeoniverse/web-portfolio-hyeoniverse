"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLoadingProgress } from "@/hooks/useLoadingProgress";
import { imageFade } from "@/animations";
import styles from "./OptimizedImage.module.css";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  draggable?: boolean;
  className?: string;
  priority?: boolean;
  placeholder?: string;
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
  placeholder = "/images/placeholder.svg",
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageId] = useState(
    () => `image-${Math.random().toString(36).substr(2, 9)}`
  );
  const { registerLoadingItem, markAsLoaded } = useLoadingProgress();

  useEffect(() => {
    // 이미지 로딩 아이템 등록
    registerLoadingItem(imageId, "image", priority ? 2 : 1);
  }, [imageId, priority, registerLoadingItem]);

  const handleLoad = () => {
    setIsLoaded(true);
    markAsLoaded(imageId);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    markAsLoaded(imageId); // 에러도 로딩 완료로 처리
    onError?.();
  };

  return (
    <div className={`${styles.imageContainer} ${className}`}>
      {!isLoaded && !hasError && (
        <div className={styles.placeholder}>
          {placeholder ? (
            <Image
              width={width}
              height={height}
              draggable={false}
              src={src}
              alt=""
              className={styles.placeholderImage}
            />
          ) : (
            <div className={styles.skeleton} />
          )}
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
          <span className={styles.errorText}>이미지를 불러올 수 없습니다</span>
        </div>
      )}
    </div>
  );
}
