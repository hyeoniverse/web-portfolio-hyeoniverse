"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./Modal.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";


export default function Modal() {
  const { playSound } = useSoundManager();
  const { modals, closeModal } = useModalStore();
  const { stop, start } = useLenis();
  const [mounted, setMounted] = useState(false);
  const overflowRef = useRef<string>("");

  const handleClose = useCallback(
    (id?: string) => {
      playSound("click");
      closeModal(id);
    },
    [playSound, closeModal]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 열릴 때 overflow + Lenis 잠금
  useEffect(() => {
    if (modals.length > 0) {
      overflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      stop();
    }
  }, [modals, stop]);

  // exit 애니메이션 완료 후 overflow + Lenis 복원
  const handleExitComplete = useCallback(() => {
    if (modals.length === 0) {
      document.body.style.overflow = overflowRef.current;
      start();
    }
  }, [modals, start]);

  // ESC 키 이벤트
  useEffect(() => {
    if (modals.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const topModal = modals[modals.length - 1];
        if (topModal) {
          handleClose(topModal.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modals, handleClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {modals.map(({ id, header, content, style, closeButton }) => (
        <motion.div
          key={id}
          id="modal-root"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }}
          transition={{ duration: 0.35 }}
          onClick={() => handleClose(id)}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            id="modal"
            data-rounded={id === "project-detail" ? "true" : undefined}
            initial={{ opacity: 0, y: "40px" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "40px", transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={style}
          >
            {header && (
              <div className={styles.modalHeader}>
                <div className={styles.headerContent}>
                  {header.icon && (
                    <div className={styles.headerIcon}>{header.icon}</div>
                  )}
                  {header.title && (
                    <h2 className={styles.modalTitle}>{header.title}</h2>
                  )}
                </div>
              </div>
            )}

            {closeButton && (
              <button
                className={styles.closeButton}
                onClick={() => handleClose(id)}
                aria-label="닫기"
              >
                <span className={styles.closeIconWrapper}>
                  <span className={styles.closeLine} />
                  <span className={styles.closeLine} />
                </span>
              </button>
            )}
            <div className={styles.modalScroll}>
              {content}
            </div>
          </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body
  );
}
