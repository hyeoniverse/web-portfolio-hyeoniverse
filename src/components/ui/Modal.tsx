"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useHasMounted } from "@/hooks/useHasMounted";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./Modal.module.css";
import CloseButton from "./CloseButton";
import { PortalContainerContext } from "./portalContainer";
import { AnimatePresence, motion } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import { registerModalHost, showModal } from "@/lib/topLayer";

/** Modal footer slot — modal body 가 createPortal 로 footer 영역에 렌더하기 위한 ref.
 *  body 와 footer 가 같은 React tree 안에 있어 state 공유 가능. */
export const ModalFooterContext = createContext<HTMLDivElement | null>(null);

const SWIPE_THRESHOLD = 30;
const DISMISS_THRESHOLD = 100;

export default function Modal() {
  const { t } = useLanguage();
  const { isMobile } = useIsMobile();
  const { playSound } = useSoundManager();
  const { modals, closeModal } = useModalStore();
  const { stop, start } = useLenis();
  const mounted = useHasMounted();
  const overflowRef = useRef<string>("");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  /* 모달별 footer DOM el — body 가 ModalFooterContext 로 받아 portal 로 렌더. */
  const [footerEls, setFooterEls] = useState<Record<string, HTMLDivElement | null>>({});
  /* ref callback 은 id 별로 cached — 같은 id 면 항상 같은 함수 반환.
     매 렌더 새 arrow function 이면 React 가 cleanup(null) + mount(el) cycle 무한 반복 (Maximum update depth). */
  const footerRefSettersRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const getFooterRefSetter = useCallback((id: string) => {
    let setter = footerRefSettersRef.current.get(id);
    if (!setter) {
      setter = (el) => {
        setFooterEls((prev) => {
          if (prev[id] === el) return prev;
          if (el === null) {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return { ...prev, [id]: el };
        });
      };
      footerRefSettersRef.current.set(id, setter);
    }
    return setter;
  }, []);
  /* 모달별 portal 컨테이너 DOM el — Popover/Select/Tooltip 이 PortalContainerContext 로 받아
     body 대신 이 layer 로 portal → 모달 stacking context 안에 쌓임(전역 z 불필요). footerEls 와 동일 패턴. */
  const [containerEls, setContainerEls] = useState<Record<string, HTMLDivElement | null>>({});
  const containerRefSettersRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  /* 커서처럼 top layer 에 못 올리는 것이 맨 위 모달 안으로 들어올 수 있게 층을 알린다(lib/topLayer) */
  const unregisterHostRef = useRef<Map<string, () => void>>(new Map());
  const getContainerRefSetter = useCallback((id: string) => {
    let setter = containerRefSettersRef.current.get(id);
    if (!setter) {
      setter = (el) => {
        unregisterHostRef.current.get(id)?.();
        unregisterHostRef.current.delete(id);
        if (el) unregisterHostRef.current.set(id, registerModalHost(el));
        setContainerEls((prev) => {
          if (prev[id] === el) return prev;
          if (el === null) {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return { ...prev, [id]: el };
        });
      };
      containerRefSettersRef.current.set(id, setter);
    }
    return setter;
  }, []);
  /* 모달별 <dialog> — 붙는 순간 showModal() 로 top layer 에 올린다(3.10-1). 같은 id 면 같은 함수를 돌려줘야
     React 가 cleanup/mount 를 되풀이하지 않는다(footerEls 와 같은 이유) */
  const dialogRefSettersRef = useRef<Map<string, (el: HTMLDialogElement | null) => void>>(new Map());
  const getDialogRefSetter = useCallback((id: string) => {
    let setter = dialogRefSettersRef.current.get(id);
    if (!setter) {
      setter = (el) => { if (el) showModal(el); };
      dialogRefSettersRef.current.set(id, setter);
    }
    return setter;
  }, []);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const draggingRef = useRef(false);
  const dismissingRef = useRef(false); // 아래로 드래그 중 (dismiss 모드)
  const modalElRef = useRef<HTMLDivElement | null>(null);
  // backdrop 을 눌러서 시작한 클릭인지 — 눌린 곳과 뗀 곳이 다르면 click 은
  // 두 타깃의 공통 조상(=backdrop)에서 발생한다. 그걸 "바깥 클릭"으로 오인하면
  // 모달 안을 누르다 레이아웃이 밀리기만 해도 모달이 닫힌다.
  const backdropDownRef = useRef(false);
  const expandedRef = useRef(false);
  const baseHeightRef = useRef(0); // 드래그 시작 시 실제 모달 높이

  const handleClose = useCallback(
    (id?: string) => {
      playSound("click");
      closeModal(id);
    },
    [playSound, closeModal]
  );


  // body overflow 는 첫 modal 이 열릴 때만 (0→1+) capture / set.
  // 누적 모달은 이미 hidden 이므로 다시 capture 하면 "hidden" 을 baseline 으로 잘못 기억해 close 후 영구 lock 됨.
  const prevModalsLenRef = useRef(0);
  useEffect(() => {
    const prev = prevModalsLenRef.current;
    prevModalsLenRef.current = modals.length;
    if (prev === 0 && modals.length > 0) {
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

  /* 포커스 가둠 · 열기 전 자리로 되돌리기 · 초기 포커스 · Esc 는 <dialog>(showModal) 가 한다(3.10-1).
     Esc 는 아래 onCancel 로 받아 스토어를 닫는다 — 안쪽 컨트롤(CodeMirror · 완성 목록)이 keydown 을
     preventDefault 하면 브라우저가 닫기 요청을 내지 않아 전과 같이 그쪽이 먼저다. */

  // expandedRef를 state와 동기화 (드래그 콜백에서 최신 값 참조)
  useEffect(() => { expandedRef.current = sheetExpanded; }, [sheetExpanded]);

  // 닫힌 modal 의 cached ref setter 정리 — 메모리 누수 방지
  useEffect(() => {
    const currentIds = new Set(modals.map((m) => m.id));
    for (const id of footerRefSettersRef.current.keys()) {
      if (!currentIds.has(id)) footerRefSettersRef.current.delete(id);
    }
    for (const id of dialogRefSettersRef.current.keys()) {
      if (!currentIds.has(id)) dialogRefSettersRef.current.delete(id);
    }
  }, [modals]);

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
      {modals.map(({ id, header, content, style, closeButton, subButtons }) => (
        <dialog
          key={id}
          ref={getDialogRefSetter(id)}
          className="ui-dialog"
          aria-labelledby={header?.title ? `modal-title-${id}` : undefined}
          /* Esc — 브라우저의 닫기 요청을 막고 스토어로 닫는다(퇴장 애니메이션 · 소리 · 스크롤 복원이 거기 있다) */
          onCancel={(e) => { e.preventDefault(); handleClose(id); }}
          /* 다른 길로 닫혔다면(브라우저 · 확장) 스토어도 맞춘다 */
          onClose={() => { if (useModalStore.getState().modals.some((m) => m.id === id)) closeModal(id); }}
        >
        <motion.div
          id="modal-root"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }}
          transition={{ duration: 0.35 }}
          onMouseDown={(e) => { backdropDownRef.current = e.target === e.currentTarget; }}
          onClick={(e) => {
            if (swipingRef.current) return;
            // 눌린 곳·뗀 곳 모두 backdrop 일 때만 닫는다
            if (!backdropDownRef.current || e.target !== e.currentTarget) return;
            handleClose(id);
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={modalElRef}
            id="modal"
            /* 안에 초점 대상이 없을 때 포커스를 받는 폴백 */
            tabIndex={-1}
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

            {/* 머리줄 — 제목이 없어도 X·서브 버튼이 있으면 빈 줄로 둔다. 예전에는 제목이 없을 때
                X 를 본문 위에 얹어서(절대배치) 본문 첫 줄과 같은 선에 겹쳐 보였다.
                우측 컨트롤(subButtons + X)은 언제나 이 줄의 오른쪽 flow 에 있다 — 따로 두었을 때는
                subButtons 가 있으면 예약폭(56px)을 넘겨 액션과 겹쳤다. (모바일은 X 를 숨긴다 —
                아래로 드래그 + grabber 로 닫는다) */}
            {(header || subButtons || (closeButton && !isMobile)) && (
              <div className={`${styles.modalHeader}${header?.title || header?.icon || header?.actions ? "" : ` ${styles.modalHeaderBare}`}`}>
                <div className={styles.headerContent}>
                  {header?.icon && (
                    <div className={styles.headerIcon}>{header.icon}</div>
                  )}
                  {header?.title && (
                    <h2 id={`modal-title-${id}`} className={styles.modalTitle}>{header.title}</h2>
                  )}
                </div>
                {(header?.actions || subButtons || (closeButton && !isMobile)) && (
                  <div className={styles.headerActions}>
                    {header?.actions}
                    {(subButtons || (closeButton && !isMobile)) && (
                      <div className={styles.rightCluster}>
                        {subButtons && <div className={styles.subButtons}>{subButtons}</div>}
                        {closeButton && !isMobile && (
                          <CloseButton
                            className={styles.closeButton}
                            size="md"
                            onClick={() => handleClose(id)}
                            ariaLabel={t("common.close")}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <ModalFooterContext.Provider value={footerEls[id] ?? null}>
              <PortalContainerContext.Provider value={containerEls[id] ?? null}>
                <div className={styles.modalScroll}>
                  {content}
                </div>
                <div ref={getFooterRefSetter(id)} className={styles.modalFooter} />
              </PortalContainerContext.Provider>
            </ModalFooterContext.Provider>
          </motion.div>
          {/* 모달 stacking context 안 portal layer — Popover/Select/Tooltip 이 여기로 렌더돼 패널 위에 뜬다.
              패널(#modal)의 transform 영향을 안 받도록 형제로 배치, backdrop(#modal-root, fixed inset:0)이 containing block. */}
          <div ref={getContainerRefSetter(id)} className={styles.portalLayer} aria-hidden />
        </motion.div>
        </dialog>
      ))}
    </AnimatePresence>,
    document.body
  );
}
