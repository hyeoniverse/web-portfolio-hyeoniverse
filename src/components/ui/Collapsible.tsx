"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Button from "./Button";
import styles from "./Collapsible.module.css";

/* 일정 높이를 넘는 내용을 접고 "더보기" 로 펼치는 박스.
   - 넘치지 않으면 아무것도 안 그린다 (버튼도, 페이드도). 짧은 내용엔 흔적이 없어야 한다.
   - 높이 판단은 ResizeObserver — 마크다운 이미지는 늦게 로드돼 그때 높이가 바뀐다.
     한 번만 재면 "이미지 로드 전 = 안 넘침" 으로 굳어 긴 댓글이 안 접힌다.
   - 클램프는 바깥(.clip)이 하고 측정은 안쪽(.inner)이 한다. 같은 요소가 둘 다 하면
     max-height 에 눌린 높이를 재게 되어 항상 "딱 맞음" 이 나온다. */

interface CollapsibleProps {
  /** 이 높이(px)를 넘을 때만 접는다 */
  maxHeight: number;
  expandLabel: ReactNode;
  collapseLabel: ReactNode;
  children: ReactNode;
}

export default function Collapsible({
  maxHeight,
  expandLabel,
  collapseLabel,
  children,
}: CollapsibleProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  /* 사용자가 버튼을 누르기 전까지는 애니메이션을 끈다.
     넘침 판정이 ResizeObserver 로 마운트 직후에 오기 때문에, 무조건 애니메이션을 걸면
     첫 렌더의 auto → maxHeight 변화가 "댓글이 저절로 접히는" 연출로 보인다.
     (이미지가 늦게 로드돼 뒤늦게 넘치게 되는 경우도 마찬가지) */
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => setOverflows(el.getBoundingClientRect().height > maxHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight]);

  const clipped = overflows && !expanded;

  return (
    <div className={styles.root}>
      {/* height: "auto" 는 framer-motion 이 실측해서 애니메이트한다 →
          펼친 뒤엔 실제로 auto 라, 나중에 이미지가 더 로드돼 내용이 길어져도 안 잘린다.
          initial={false} — 마운트 때 0 에서 자라 올라오는 연출 방지. */}
      <motion.div
        className={styles.clip}
        initial={false}
        animate={{ height: clipped ? maxHeight : "auto" }}
        transition={animate ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
      >
        <div ref={innerRef}>{children}</div>

        {/* 잘린 아래쪽 페이드 — "여기서 끝이 아니다" 를 알리는 유일한 시각 단서.
            버튼만 있으면 딱 잘린 글자 줄이 그냥 마지막 줄처럼 읽힌다.
            CSS ::after 가 아니라 실제 요소인 이유: 펼칠 때 같이 사라져야 하는데
            의사요소는 AnimatePresence 로 exit 를 못 준다. */}
        <AnimatePresence initial={false}>
          {clipped && (
            <motion.div
              className={styles.fade}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animate ? 0.2 : 0 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {overflows && (
        <Button
          variant="ghost"
          size="sm"
          shape="capsule"
          className={styles.toggle}
          onClick={() => {
            setAnimate(true);
            setExpanded((v) => !v);
          }}
          icon={
            <ChevronDown
              size={14}
              className={`${styles.chevron}${expanded ? ` ${styles.chevronUp}` : ""}`}
            />
          }
          iconPosition="right"
        >
          {expanded ? collapseLabel : expandLabel}
        </Button>
      )}
    </div>
  );
}
