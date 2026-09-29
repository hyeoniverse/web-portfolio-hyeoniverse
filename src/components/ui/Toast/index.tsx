"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, AlertTriangle, Info, MoreHorizontal } from "@/components/icons";
import { useToastStore, type ToastVariant } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import { ModalAlert } from "@/components/ui/ModalTemplates";
import Pressable from "@/components/ui/Pressable";
import styles from "./Toast.module.css";

/** 문구 — 2줄까지만 보이고, 넘치면 끝에 "…" 단추. 누르면 토스트를 닫고 모달에 전체를 보인다 */
function ToastMessage({ message, onOpenFull }: { message: string; onOpenFull: () => void }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* 줄 수는 폭에 따라 바뀐다 — 크기가 바뀔 때마다 잘렸는지 다시 본다 */
    const ro = new ResizeObserver(() => setOverflow(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [message]);
  return (
    <>
      <span ref={ref} className={styles.message}>{message}</span>
      {overflow && (
        <Pressable
          className={styles.more}
          aria-label={t("common.toastShowAll")}
          title={t("common.toastShowAll")}
          onClick={(e) => { e.stopPropagation(); onOpenFull(); }}
          soundDisabled
        >
          <MoreHorizontal size={14} strokeWidth={2} aria-hidden />
        </Pressable>
      )}
    </>
  );
}

/** variant 별 아이콘 — 색상은 className 으로 분기 */
const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

/**
 * 글로벌 Toast 컨테이너 — root layout 의 ClientOverlays 에 한 번만 mount.
 * useToastStore 의 toasts 를 구독해 자동 stack 렌더 + auto dismiss.
 *
 * 사용처: `import { showToast } from "@/stores/toastStore"; showToast("Copied!", "success");`
 */
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismissToast);
  const { t } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const openFull = (id: string, message: string) => {
    dismiss(id);
    openModal(<ModalAlert desc={message} confirmText={t("common.toastConfirm")} />, { header: { title: t("common.toastFullTitle") }, width: "440px" });
  };
  // 하나에 hover 해도 스택 전체를 멈춤 — 다른 토스트가 사라지며 재배치돼 커서가 벗어나는 문제 방지
  const pause = useToastStore((s) => s.pauseAllToasts);
  const resume = useToastStore((s) => s.resumeAllToasts);

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant];
          return (
            <motion.div
              key={toast.id}
              className={styles.toast}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => dismiss(toast.id)}
              onMouseEnter={pause}
              onMouseLeave={resume}
              onFocus={pause}
              onBlur={resume}
              role="status"
            >
              <span className={`${styles.iconWrap} ${styles[toast.variant]}`}>
                <Icon size={14} strokeWidth={2.4} />
              </span>
              <ToastMessage message={toast.message} onOpenFull={() => openFull(toast.id, toast.message)} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
