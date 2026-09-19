"use client";

import { motion, AnimatePresence } from "framer-motion";
import { textUnits } from "../_utils";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import styles from "./WorksActiveInfo.module.css";

/* 지금 보고 있는 작품 — 갤러리 하단 고정. 수평 엔진이 매 프레임 계산한 activeIndex 를 받는다.
   인트로가 화면에 있는 동안은 숨긴다(트랙 시작부에서 타이틀이 겹치지 않게). */
export default function WorksActiveInfo({
  projects,
  activeIndex,
  hidden,
}: {
  projects: Project[];
  activeIndex: number;
  hidden: boolean;
}) {
  const active = projects[activeIndex];
  /* 제목이 길수록 글자를 줄인다 — 두 언어 중 긴 쪽을 기준으로 잡아 언어를 바꿀 때 크기가
     뛰지 않게 한다(#1062) */
  const titleUnits = String(
    Math.max(8, textUnits(active?.title.ko ?? ""), textUnits(active?.title.en ?? "")),
  );
  return (
    <div
      className={styles.activeInfo}
      style={{ opacity: hidden ? 0 : 1, transition: "opacity 0.4s ease" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={styles.activeInfoInner}
          /* 글자 크기는 떠나는 제목이 아니라 제목 자신에게 매인다. 바깥 상자에 두면 다음 작품으로
             넘어가는 순간 아직 화면에 남은 제목까지 새 크기로 바뀌어, 한 제목이 큰 채로 떴다가
             작아지는 것처럼 보인다 */
          style={{ ["--title-units" as string]: titleUnits }}
        >
          <span className={styles.activeNumber}>{active?.number}</span>
          <h2 className={styles.activeTitle}>
            <T ko={active?.title.ko ?? ""} en={active?.title.en ?? ""} />
          </h2>
          <p className={styles.activeSubtitle}>
            <T ko={active?.subtitle.ko} en={active?.subtitle.en} />
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
