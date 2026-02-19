"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import gsap from "gsap";
import { isInitialLoadComplete } from "@/hooks/useLoadingProgress";
import styles from "./KineticHeroTitle.module.css";

interface Line {
  text: string;
  accent?: boolean;
}

interface Props {
  lines: Line[];
  className?: string;
}

/** 로딩 화면 wipe 애니메이션 완료까지의 대기 시간 (ms) */
const LOADING_EXIT_MS = 1200;

export default function KineticHeroTitle({ lines, className }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0);

  // 로딩 화면이 완전히 사라진 뒤에만 애니메이션 활성화
  useEffect(() => {
    if (isInitialLoadComplete()) {
      setReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (isInitialLoadComplete()) {
        clearInterval(interval);
        setTimeout(() => setReady(true), LOADING_EXIT_MS);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // 스크롤 기반 캐릭터 애니메이션 (GSAP 직접 조작)
  useEffect(() => {
    if (!ready || !titleRef.current) return;

    const charEls = Array.from(
      titleRef.current.querySelectorAll<HTMLElement>(`.${styles.char}`),
    );
    const count = charEls.length;
    if (count === 0) return;

    // 시작 상태: 숨김
    gsap.set(charEls, { opacity: 0, y: 30, rotateX: -60 });

    type Phase = "hidden" | "entering" | "visible" | "exiting";
    let phase: Phase = "hidden";
    let tl: gsap.core.Timeline | null = null;

    // 시간 기반 진입 애니메이션 (stagger)
    const playEntry = () => {
      phase = "entering";
      if (tl) tl.kill();
      tl = gsap.timeline({
        onComplete: () => {
          phase = "visible";
        },
      });
      charEls.forEach((el, idx) => {
        const li = Number(el.dataset.li ?? 0);
        const ci = Number(el.dataset.ci ?? idx);
        tl!.to(
          el,
          { opacity: 1, y: 0, rotateX: 0, duration: 0.6, ease: "power3.out" },
          li * 0.3 + ci * 0.025,
        );
      });
    };

    let rafId: number;
    const loop = () => {
      if (!titleRef.current) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const rect = titleRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const entryProg = gsap.utils.clamp(
        0,
        1,
        (0.8 - rect.left / vw) / 0.3,
      );
      const exitProg = gsap.utils.clamp(
        0,
        1,
        (0.5 - rect.right / vw) / 0.3,
      );

      // ── Phase transitions ──
      if (phase === "hidden" && entryProg > 0.5) {
        playEntry();
      }

      if (phase === "entering" && exitProg > 0) {
        tl?.kill();
        phase = "exiting";
      }

      if (phase === "visible" && (exitProg > 0 || entryProg < 0.9)) {
        phase = "exiting";
      }

      // ── Scroll-driven exit / re-entry ──
      if (phase === "exiting") {
        if (exitProg > 0) {
          // 정스크롤 퇴장 (패널이 왼쪽으로 나감) — 역순 스태거
          charEls.forEach((el, idx) => {
            const revIdx = count - 1 - idx;
            const s = count > 1 ? (revIdx / (count - 1)) * 0.3 : 0;
            const p = gsap.utils.clamp(0, 1, (exitProg - s) / (1 - 0.3));
            gsap.set(el, {
              opacity: 1 - p,
              y: -20 * p,
              rotateX: 60 * p,
              transformPerspective: 600,
            });
          });
        } else if (entryProg < 1) {
          // 역스크롤 퇴장 (패널이 오른쪽으로 나감) — 순방향 스태거
          charEls.forEach((el, idx) => {
            const s = count > 1 ? (idx / (count - 1)) * 0.15 : 0;
            const p = gsap.utils.clamp(
              0,
              1,
              (entryProg - s) / (1 - 0.15),
            );
            gsap.set(el, {
              opacity: p,
              y: 30 * (1 - p),
              rotateX: -60 * (1 - p),
              transformPerspective: 600,
            });
          });
        } else {
          // 뷰포트 안에 다시 완전히 들어옴
          phase = "visible";
          gsap.set(charEls, { opacity: 1, y: 0, rotateX: 0 });
        }

        // 완전히 화면 밖으로 나감 → hidden 리셋
        if (exitProg >= 1 || entryProg <= 0) {
          gsap.set(charEls, { opacity: 0, y: 30, rotateX: -60 });
          phase = "hidden";
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      tl?.kill();
      gsap.set(charEls, { clearProps: "opacity,y,rotateX,transform" });
    };
  }, [ready, totalChars]);

  const chars = useMemo(() => {
    return lines.map((line, li) =>
      line.text.split("").map((char, ci) => ({
        char: char === " " ? "\u00A0" : char,
        accent: line.accent,
        li,
        ci,
      })),
    );
  }, [lines]);

  return (
    <h2 ref={titleRef} className={`${styles.title} ${className ?? ""}`}>
      {chars.map((line, li) => (
        <span key={li} className={styles.line}>
          {line.map((c, ci) => (
            <span
              key={ci}
              className={`${styles.char} ${c.accent ? styles.accent : ""}`}
              data-li={c.li}
              data-ci={c.ci}
            >
              {c.char}
            </span>
          ))}
          {li < chars.length - 1 && <br />}
        </span>
      ))}
    </h2>
  );
}
