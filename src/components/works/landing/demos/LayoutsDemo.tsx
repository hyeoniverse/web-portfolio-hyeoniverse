"use client";

/* 작업물 목록 레이아웃 여섯 가지를 작은 움직이는 도식으로 — 레이아웃마다 실제로 어떻게 움직이는지(가로로 흐름, 벤토 칸,
   도는 원통, 겹쳐 바뀌는 배경과 HUD, 층마다 다른 속도, 멈춘 왼쪽과 흐르는 오른쪽)를 CSS 로만 그린다.
   화면에 보일 때만 움직이고, 멈추기 단추로 세울 수 있다. 움직임 줄이기면 처음부터 서 있다 */
import { useState, type CSSProperties } from "react";
import Pressable from "@/components/ui/Pressable";
import { Pause, Play } from "@/components/icons";
import { layouts, layoutsCopy as copy, type LayoutKind } from "./data";
import { useInView, useT } from "./hooks";
import styles from "./Demos.module.css";

/** 도식마다 그리는 조각 수 (카드, 층, 배경 등) */
const PARTS: Record<LayoutKind, number> = { flow: 10, grid: 6, cylinder: 8, fullscreen: 3, cinematic: 3, split: 8 };
const HUD = ["LOC", "TIME", "FPS", "WORKS"];

export default function LayoutsDemo() {
  const { t } = useT();
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const [paused, setPaused] = useState(false);
  const playing = inView && !paused;

  return (
    <div ref={ref} className={`${styles.demo} ${styles.layoutsDemo}`} data-play={playing || undefined}>
      <ul className={styles.layouts} aria-label={t(copy.label)}>
        {layouts.map((item) => (
          <li key={item.kind}>
            <div className={styles.lay} data-kind={item.kind} aria-hidden="true">
              {item.kind === "split" && <b />}
              <span className={styles.layStage}>
                {Array.from({ length: PARTS[item.kind] }, (_, i) => (
                  <i key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
              {item.kind === "fullscreen" &&
                HUD.map((corner) => (
                  <em key={corner} data-corner={corner}>
                    {corner}
                  </em>
                ))}
            </div>
            <strong>{item.label}</strong>
            <span>{t(item.note)}</span>
          </li>
        ))}
      </ul>
      <Pressable className={styles.ghost} aria-pressed={paused} onClick={() => setPaused((now) => !now)}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        {t(paused ? copy.play : copy.pause)}
      </Pressable>
    </div>
  );
}
