"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./Modal.module.css";
import CloseIcon from "./CloseIcon";
import { AnimatePresence, motion } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useIsMobile } from "@/hooks/useIsMobile";

const SWIPE_THRESHOLD = 30;
const DISMISS_THRESHOLD = 100;

export default function Modal() {
  const { isMobile } = useIsMobile();
  const { playSound } = useSoundManager();
  const { modals, closeModal } = useModalStore();
  const { stop, start } = useLenis();
  const [mounted, setMounted] = useState(false);
  const overflowRef = useRef<string>("");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const draggingRef = useRef(false);
  const dismissingRef = useRef(false); // 아래로 드래그 중 (dismiss 모드)
  const modalElRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef(false);
  const baseHeightRef = useRef(0); // 드래그 시작 시 실제 모달 높이

  const handleClose = useCallback(
    (id?: string) => {
      playSound("click");
      closeModal(id);
    },
    [playSound, closeModal]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (modals.length > 0) {
      overflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      stop();
    }
  }, [modals, stop]);

  const handleExitComplete = useCallback(() => {
    if (modals.length === 0) {
      document.body.style.overflow = overflowRef.current;
      start();
    }
    setSheetExpanded(false);
  }, [modals, start]);

  useEffect(() => {
    if (modals.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const top = modals[modals.length - 1];
        if (top) handleClose(top.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modals, handleClose]);

  // expandedRef를 state와 동기화 (드래그 콜백에서 최신 값 참조)
  useEffect(() => { expandedRef.current = sheetExpanded; }, [sheetExpanded]);

  // ── Sheet 드래그: 위로 = 확장(height), 아래로 = dismiss(CSS translate) ──
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    draggingRef.current = true;
    dismissingRef.current = false;
    const el = modalElRef.current;
    if (el) {
      baseHeightRef.current = el.getBoundingClientRect().height;
      el.style.setProperty('transition', 'none', 'important');
    }
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const el = modalElRef.current;
    if (!el) return;

    const deltaY = e.clientY - startYRef.current; // 양수 = 아래로

    if (deltaY > 0 && !expandedRef.current) {
      // 비확장 상태에서 아래로 → dismiss 모드 (CSS translate, framer-motion과 독립)
      dismissingRef.current = true;
      el.style.setProperty('--sheet-y', `${deltaY}px`);
    } else {
      // 위로 드래그 (확장) 또는 확장 상태에서 아래로 (축소)
      dismissingRef.current = false;
      el.style.setProperty('--sheet-y', '0px');

      const dragUp = -deltaY; // 양수 = 위로
      const vh = window.innerHeight;
      const h = Math.min(vh, Math.max(vh * 0.3, baseHeightRef.current + dragUp));
      const progress = Math.max(0, Math.min(1, (h - vh * 0.85) / (vh * 0.15)));

      el.style.minHeight = `${h}px`;
      el.style.maxHeight = `${h}px`;
      el.style.borderRadius = `${(1 - progress) * 24}px ${(1 - progress) * 24}px 0 0`;
      el.style.borderTopColor = progress > 0.8 ? 'transparent' : '';
    }
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const el = modalElRef.current;
    if (!el) return;

    const deltaY = e.clientY - startYRef.current;
    const vh = window.innerHeight;
    const wasDismissing = dismissingRef.current;
    dismissingRef.current = false;

    // CSS transition 복원 → snap 애니메이션
    el.style.removeProperty('transition');

    if (wasDismissing) {
      if (deltaY > DISMISS_THRESHOLD) {
        // threshold 초과 → 화면 밖으로 밀어내고 닫기
        swipingRef.current = true;
        el.style.setProperty('--sheet-y', `${vh}px`);
        const topModal = modals[modals.length - 1];
        setTimeout(() => {
          if (topModal) handleClose(topModal.id);
          swipingRef.current = false;
          // --sheet-y 제거하지 않음 — 화면 밖 유지한 채 framer-motion exit 후 DOM 언마운트로 자동 정리
        }, 350);
      } else {
        // threshold 미달 → 원위치 복귀
        el.style.setProperty('--sheet-y', '0px');
        setTimeout(() => { if (el) el.style.removeProperty('--sheet-y'); }, 350);
      }
      return;
    }

    // 확장/축소 모드
    const dragUp = -deltaY;
    const willExpand = dragUp > SWIPE_THRESHOLD;
    const willCollapse = dragUp < -SWIPE_THRESHOLD;

    if (willExpand) {
      el.style.minHeight = `${vh}px`;
      el.style.maxHeight = `${vh}px`;
      el.style.borderRadius = '0px';
      el.style.borderTopColor = 'transparent';
      swipingRef.current = true;
      setSheetExpanded(true);
      setTimeout(() => { swipingRef.current = false; }, 400);
    } else if (willCollapse) {
      el.style.minHeight = '0px';
      el.style.maxHeight = `${vh * 0.85}px`;
      el.style.borderRadius = '';
      el.style.borderTopColor = '';
      swipingRef.current = true;
      setSheetExpanded(false);
      setTimeout(() => { swipingRef.current = false; }, 400);
    } else {
      if (expandedRef.current) {
        el.style.minHeight = `${vh}px`;
        el.style.maxHeight = `${vh}px`;
        el.style.borderRadius = '0px';
        el.style.borderTopColor = 'transparent';
      } else {
        el.style.minHeight = '0px';
        el.style.maxHeight = `${vh * 0.85}px`;
        el.style.borderRadius = '';
        el.style.borderTopColor = '';
      }
    }

    // CSS transition 완료 후 인라인 스타일 제거 → CSS 인계
    setTimeout(() => {
      if (!el) return;
      el.style.minHeight = '';
      el.style.maxHeight = '';
      el.style.borderRadius = '';
      el.style.borderTopColor = '';
    }, 400);
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
          onClick={() => { if (!swipingRef.current) handleClose(id); }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={modalElRef}
            id="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={header?.title ? `modal-title-${id}` : undefined}
            data-rounded={id === "project-detail" ? "true" : undefined}
            data-sheet-expanded={sheetExpanded ? "true" : undefined}
            initial={{ opacity: 0, y: isMobile ? "100%" : "40px" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? "100%" : "40px", transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.4, delay: isMobile ? 0.1 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={style}
          >
            <div
              className={styles.sheetHandle}
              aria-hidden="true"
              data-draggable
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            >
              <span className={styles.sheetHandleBar} />
            </div>

            {header && (
              <div className={styles.modalHeader}>
                <div className={styles.headerContent}>
                  {header.icon && (
                    <div className={styles.headerIcon}>{header.icon}</div>
                  )}
                  {header.title && (
                    <h2 id={`modal-title-${id}`} className={styles.modalTitle}>{header.title}</h2>
                  )}
                </div>
              </div>
            )}

            {closeButton && (
              <button
                className={styles.closeButton}
                onClick={() => handleClose(id)}
                aria-label="닫기"
                data-close-trigger
              >
                <CloseIcon />
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
