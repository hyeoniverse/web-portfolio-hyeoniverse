"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Pressable from "@/components/ui/Pressable";
import { X } from "@/components/icons";
import { CONSTELLATIONS, litCount } from "./constellations";
import { useDialogRef } from "@/hooks/useTopLayer";
import styles from "./TilSpace.module.css";

/** 3D 플라네타리움 — three 묶음이 커서 브라우저에서만 따로 싣는다 */
const TilSpace3D = dynamic(() => import("./TilSpace3D"), { ssr: false });

/** CSS 색(oklch 등)을 three 가 읽는 #rrggbb 로 — 1px 캔버스에 칠해 읽는다 */
function cssColorToHex(value: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return "#ff4f9a";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/* TIL 플라네타리움 — 망원경 단추로 여는 전체 화면 돔 하늘. 다른 요소는 모두 덮고, 위 · 아래에 해 · 완성 수와
   닫기 단추만 남긴다. 별자리를 누르면 닫히며 피드가 그달로 좁혀진다. Esc 로도 닫는다(<dialog> top layer) */
export default function TilSpace({
  year,
  byDay,
  monthName,
  lang,
  doneLabel,
  dragHint,
  closeLabel,
  onMonth,
  onClose,
}: {
  year: number;
  byDay: Map<string, unknown[]>;
  monthName: (m: number) => string;
  lang: "ko" | "en";
  doneLabel: string;
  dragHint: string;
  closeLabel: string;
  onMonth: (m: number) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDialogElement>(null);
  // 사이트 공용 top layer 도우미로 띄운다 — 커스텀 커서 등 늘 위에 있어야 할 것이 다시 이 창 위로 올라온다
  const dialogRef = useDialogRef(rootRef);
  const [accent, setAccent] = useState("#ff4f9a");
  // 닫을 때 3D(이름표 DOM 포함)를 먼저 내리고 다음 틀에 창을 닫는다 — 창이 먼저 사라지면 이름표 정리가 엇갈린다
  const [leaving, setLeaving] = useState(false);
  const leave = (then: () => void) => {
    setLeaving(true);
    requestAnimationFrame(() => then());
  };

  const lits = CONSTELLATIONS.map((_, m) => litCount(byDay, year, m));
  const doneCount = CONSTELLATIONS.filter((c, m) => lits[m] >= c.stars.length).length;
  const labelEls = useRef<(HTMLElement | null)[]>([]);
  const labels = CONSTELLATIONS.map((c, m) => ({
    name: `${monthName(m)} · ${lang === "en" ? c.en : c.ko}`,
    count: `${lits[m] >= c.stars.length ? "✦ " : ""}${lits[m]}/${c.stars.length}`,
  }));

  // 강조색 — 토큰 값은 light-dark(var(..)) 식이라 그대로는 못 읽는다. 그 색을 입힌 요소의 계산된 색을 읽는다
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const probe = document.createElement("span");
    probe.style.color = "var(--text-accent)";
    el.appendChild(probe);
    setAccent(cssColorToHex(getComputedStyle(probe).color));
    probe.remove();
  }, []);

  // 열려 있는 동안 뒤 페이지 스크롤을 막는다(창은 useDialogRef 가 top layer 에 띄운다 — 3.10-1)
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.root}
      aria-label={`${year} TIL`}
      data-lenis-prevent
      // Esc — 브라우저가 닫기 전에 가로채 상태로 닫는다
      onCancel={(e) => { e.preventDefault(); leave(onClose); }}
    >
      <div className={styles.canvas}>
        {!leaving && <TilSpace3D lits={lits} accent={accent} labels={labelEls} onPick={(m) => leave(() => onMonth(m))} />}
      </div>
      {/* 별자리 이름표 — 3D 가 매 틀 자리를 옮긴다 */}
      <div className={styles.labels} aria-hidden>
        {labels.map((l, m) => (
          <span
            key={m}
            ref={(el) => { labelEls.current[m] = el; }}
            className={`${styles.label} ${lits[m] >= CONSTELLATIONS[m].stars.length ? styles.labelDone : ""}`}
          >
            <b>{l.name}</b>
            <i>{l.count}</i>
          </span>
        ))}
      </div>
      <p className={styles.top}>
        {year} · ✦ {doneLabel.replace("{{n}}", String(doneCount))}
      </p>
      <Pressable noTapScale className={styles.close} aria-label={closeLabel} title={closeLabel} onClick={() => leave(onClose)}>
        <X size={20} strokeWidth={1.8} aria-hidden />
      </Pressable>
      <p className={styles.hint}>{dragHint}</p>
    </dialog>
  );
}
