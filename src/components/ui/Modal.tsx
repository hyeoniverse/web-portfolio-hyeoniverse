"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import styles from "./Modal.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useSoundManager } from "@/hooks/useSoundManager";

export default function Modal() {
  const { playSound } = useSoundManager();
  const { modals, closeModal } = useModalStore();
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    if (modals.length > 0) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modals]);

  // ESC 키 이벤트
  useEffect(() => {
    if (modals.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 항상 마지막(최상위) 모달만 닫기
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

  if (!mounted || modals.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {modals.map(({ id, header, content, style, closeButton }) => (
        <motion.div key={id} id="modal-root" onClick={() => handleClose(id)}>
          <motion.div
            id="modal"
            data-rounded={id === "project-detail" ? "true" : undefined}
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

            {/* 닫기 버튼 */}
            {closeButton && (
              <motion.button
                className={styles.closeButton}
                onClick={() => handleClose(id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="닫기"
              >
                <X size={18} />
              </motion.button>
            )}
            {content}
          </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body
  );
}
