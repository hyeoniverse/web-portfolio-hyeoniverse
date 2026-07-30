"use client";

/* ERD 줌 컨트롤 — 공개 About 패널의 디자인을 공용화한 것.
 *
 * admin 은 React Flow 기본 Controls 를, 공개는 자체 마크업을 쓰고 있어
 * 같은 기능인데 모양이 서로 달랐다. 여기로 모아 한 벌만 유지한다.
 * useReactFlow / useStore 는 ReactFlow 자식에서만 쓸 수 있어 별도 컴포넌트다. */

import { useCallback, useEffect, useState } from "react";
import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { Plus, Minus, Frame, Fullscreen, Minimize2 } from "@/components/icons";
import css from "./ErdControls.module.css";

export default function ErdControls({ lang }: { lang: "ko" | "en" }) {
  const rf = useReactFlow();
  const zoom = useStore((st) => st.transform[2]);
  const [full, setFull] = useState(false);

  /* Esc 나 브라우저 UI 로 빠져나가도 상태가 어긋나지 않게 실제 값을 따라간다 */
  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFull = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    /* 다이어그램 컨테이너(.react-flow)를 통째로 — 버튼만 키우면 의미가 없다 */
    const target = e.currentTarget.closest<HTMLElement>(".react-flow");
    void target?.requestFullscreen?.().then(
      () => rf.fitView({ padding: 0.1, duration: 300 }),
      () => {},
    );
  }, [rf]);

  return (
    <Panel position="bottom-right" className={css.controls}>
      <button type="button" data-clickable="true" className={css.btn}
        aria-label={lang === "ko" ? "확대" : "Zoom in"}
        onClick={() => rf.zoomIn({ duration: 200 })}><Plus size={13} /></button>
      <span className={css.level}>{Math.round(zoom * 100)}%</span>
      <button type="button" data-clickable="true" className={css.btn}
        aria-label={lang === "ko" ? "축소" : "Zoom out"}
        onClick={() => rf.zoomOut({ duration: 200 })}><Minus size={13} /></button>
      <button type="button" data-clickable="true" className={css.btn}
        aria-label={lang === "ko" ? "전체 맞춤" : "Fit view"}
        onClick={() => rf.fitView({ padding: 0.1, duration: 400 })}><Frame size={13} /></button>
      <button type="button" data-clickable="true" className={css.btn}
        aria-label={full ? (lang === "ko" ? "전체 화면 종료" : "Exit fullscreen")
                         : (lang === "ko" ? "전체 화면" : "Fullscreen")}
        onClick={toggleFull}>
        {full ? <Minimize2 size={13} /> : <Fullscreen size={13} />}
      </button>
    </Panel>
  );
}
