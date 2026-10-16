"use client";

import { useEffect, useRef, useState } from "react";
import Pressable from "@/components/ui/Pressable";
import MongSticker, { type MongPose } from "./MongSticker";
import WavyGrid from "./WavyGrid";
import styles from "./MastheadMong.module.css";

/* 머리말 오른쪽 — 출렁이는 격자 위의 몽이. 포인터를 따라 격자는 반대로 살짝 밀리고 몽이는 그쪽으로 기운다.
   올리면 웃고, 누르면 폴짝 뛰며 다음 표정으로 바뀐다. 장식이라 읽지 않는다(버튼이지만 tabIndex -1) */
const POSES: MongPose[] = ["star-front", "happy-front", "heart-front", "surprised-front", "wave-front"];

export default function MastheadMong({ className, gridClassName, mongClassName }: { className?: string; gridClassName?: string; mongClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState(false);
  const [hop, setHop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        el.style.setProperty("--mx", dx.toFixed(3));
        el.style.setProperty("--my", dy.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const pose = hover && idx === 0 ? "happy-front" : POSES[idx];
  return (
    <div ref={ref} className={`${styles.wrap} ${className ?? ""}`} aria-hidden>
      <WavyGrid className={`${styles.grid} ${gridClassName ?? ""}`} />
      <Pressable
        tabIndex={-1}
        noTapScale
        className={`${styles.mong} ${mongClassName ?? ""}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={() => {
          setIdx((i) => (i + 1) % POSES.length);
          setHop((h) => h + 1);
        }}
      >
        <span key={hop} className={hop ? styles.hop : undefined}>
          <MongSticker pose={pose} float />
        </span>
      </Pressable>
    </div>
  );
}
