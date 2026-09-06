"use client";

import { createContext, useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { staggerContainer } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";

/** 시연 묶음 하나가 공통으로 쓰는 값 — 언어, 등장 애니메이션 설정, 지연 시간 계산. */
export interface DemoProps {
  language: string;
  vpGroup: (delay: number) => Record<string, unknown>;
  scrollChildX: (i: number, total: number) => Record<string, unknown>;
  nd: () => number;
}

const DemoCtx = createContext<DemoProps | null>(null);

export function DemoProvider({ value, children }: { value: DemoProps; children: ReactNode }) {
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo(): DemoProps {
  const v = useContext(DemoCtx);
  if (!v) throw new Error("DemoProvider 안에서만 쓸 수 있습니다.");
  return v;
}

/** 설명 문자열 안의 인라인 마크다운을 렌더 — **굵게** → <strong>, `코드` → <code>. */
export function md(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * 시연 한 묶음 — 이름, 설명(한국어·영어), 그리고 실제로 눌러 볼 것들.
 *
 * 이 껍데기가 열아홉 곳에 똑같이 반복되고 있었다. 등장 애니메이션 설정과 언어 고르기는
 * 매번 같은 모양이라 여기로 옮기고, 부르는 쪽은 이름과 설명, 내용만 적는다.
 */
export function DemoGroup({ title, ko, en, children }: {
  title: ReactNode;
  /** 설명 — 한국어와 영어를 함께 넘긴다. 없으면 이름 아래 바로 내용이 온다. */
  ko?: string;
  en?: string;
  children: ReactNode;
}) {
  const { language, vpGroup, nd } = useDemo();
  return (
    <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
      <div className={styles.componentGroupTitle}>{title}</div>
      {ko && <p className={styles.componentDesc}>{md(language === "ko" ? ko : (en ?? ko))}</p>}
      {children}
    </motion.div>
  );
}
