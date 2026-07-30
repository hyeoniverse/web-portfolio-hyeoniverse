"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, AlertTriangle, Info } from "@/components/icons";
import { useToastStore, type ToastVariant } from "@/stores/toastStore";
import styles from "./Toast.module.css";

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
  // 하나에 hover 해도 스택 전체를 멈춤 — 다른 토스트가 사라지며 재배치돼 커서가 벗어나는 문제 방지
  const pause = useToastStore((s) => s.pauseAllToasts);
  const resume = useToastStore((s) => s.resumeAllToasts);

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <motion.div
              key={t.id}
              className={styles.toast}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => dismiss(t.id)}
              onMouseEnter={pause}
              onMouseLeave={resume}
              onFocus={pause}
              onBlur={resume}
              role="status"
            >
              <span className={`${styles.iconWrap} ${styles[t.variant]}`}>
                <Icon size={14} strokeWidth={2.4} />
              </span>
              <span className={styles.message}>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
