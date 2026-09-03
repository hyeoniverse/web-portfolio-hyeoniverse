"use client";

import { motion, AnimatePresence } from "framer-motion";
import MediaThumb from "@/components/ui/MediaThumb";
import type { TransitionData } from "../_hooks/useWorkTransition";
import styles from "./WorkTransitionOverlay.module.css";

/* 카드에서 상세로 넘어갈 때 — 눌린 카드의 rect 에서 시작해 전체 화면으로 펼쳐지는 이미지.
   flow 는 이 확대 연출을 쓰고, 대체 레이아웃 5종은 카드 지오메트리가 제각각이라
   같은 자리에서 단색 페이드(plain)만 깔아 라우팅 사이 깜빡임을 막는다. */
export default function WorkTransitionOverlay({
  data,
  plain = false,
}: {
  data: TransitionData | null;
  plain?: boolean;
}) {
  if (plain) {
    return (
      <AnimatePresence>
        {data && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: "var(--z-top)",
              background: "var(--bg-primary)",
              pointerEvents: "none",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          className={styles.transition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={styles.transitionImage}
            initial={{
              top: data.rect.top,
              left: data.rect.left,
              width: data.rect.width,
              height: data.rect.height,
              borderRadius: 8,
            }}
            animate={{
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              borderRadius: 0,
            }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <MediaThumb
              src={data.image}
              alt="Transition"
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
