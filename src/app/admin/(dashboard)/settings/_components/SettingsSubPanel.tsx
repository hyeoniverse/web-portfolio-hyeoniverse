"use client";

/* 기능 블록 안의 접히는 하위 칸 — "AI 자동 요약 › 요약 옵션", "TTS › 읽기 사전"처럼 어느 기능에 딸린 설정인지
   위치로 드러나게 한다. 접혀 있어도 머리 옆에 지금 값 한 줄(summary)이 보인다.
   id 를 주면 주소의 #id 로 왔을 때 펼친 채로 열고 그 자리로 옮긴다(편집기 창의 "설정에서 관리" 등) */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./SettingsSubPanel.module.css";

export default function SettingsSubPanel({ id, title, summary, children }: {
  /** 주소 #id 로 열고 옮길 때 쓰는 이름 */
  id?: string;
  title: ReactNode;
  /** 접힌 머리 옆 한 줄 — 지금 값 */
  summary?: ReactNode;
  children: ReactNode;
}) {
  /* 주소 #id 로 왔으면 펼친 채로 시작한다 — 이 칸은 설정을 불러온 뒤 브라우저에서만 그려져 서버 렌더와 어긋나지 않는다 */
  const [open, setOpen] = useState(() => !!id && typeof window !== "undefined" && window.location.hash === `#${id}`);
  const reduceMotion = useReducedMotion();
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useLenis();

  /* #id 로 왔으면 그 자리로 — 탭 내용이 늦게 그려지고 페이지 스크롤은 Lenis 가 맡아 브라우저가 스스로 못 찾아간다.
     위쪽 칸들이 자리를 잡은 뒤 옮기려고 한 번만, 조금 늦게 */
  const scrollRef = useRef(scrollTo);
  useEffect(() => { scrollRef.current = scrollTo; }, [scrollTo]);
  useEffect(() => {
    if (!id || window.location.hash !== `#${id}`) return;
    const move = window.setTimeout(() => { if (ref.current) scrollRef.current(ref.current, { offset: -120 }); }, 700);
    return () => window.clearTimeout(move);
  }, [id]);

  return (
    <section ref={ref} id={id} className={styles.panel} data-open={open ? "" : undefined}>
      <Pressable className={styles.head} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={bodyId} noTapScale soundDisabled>
        <ChevronRight size={14} strokeWidth={2} className={styles.chevron} aria-hidden />
        <span className={styles.title}>{title}</span>
        {summary && <span className={styles.summary}>{summary}</span>}
      </Pressable>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            id={bodyId}
            className={styles.collapse}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className={styles.body}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
