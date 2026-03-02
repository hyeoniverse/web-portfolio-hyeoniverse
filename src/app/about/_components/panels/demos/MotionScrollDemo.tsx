"use client";

import { useRef, useEffect } from "react";
import shared from "../../AboutSection.module.css";
import local from "../DesignConceptPanel.module.css";
const styles = { ...shared, ...local };

export default function MotionScrollDemo() {
  const ballRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ball = ballRef.current;
    const track = trackRef.current;
    if (!ball || !track) return;

    const MAX_VELOCITY = 10;
    const DECAY = 0.9;
    let velocity = 0;
    let lastTouchY = 0;
    let rafId: number;

    const onWheel = (e: WheelEvent) => {
      velocity += e.deltaY * 0.12;
    };

    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      velocity += (lastTouchY - y) * 0.5;
      lastTouchY = y;
    };

    const update = () => {
      velocity *= DECAY;

      const normalized = Math.max(-1, Math.min(1, velocity / MAX_VELOCITY));
      const trackWidth = track.clientWidth;
      const ballWidth = ball.clientWidth;
      const maxLeft = trackWidth - ballWidth - 4;
      const left = 4 + ((normalized + 1) / 2) * maxLeft;

      ball.style.left = `${left}px`;
      const abs = Math.abs(normalized);
      const stretch = 1 + abs * 0.35;
      const squash = 1 / stretch;
      ball.style.transform = `scaleX(${stretch.toFixed(3)}) scaleY(${squash.toFixed(3)})`;

      rafId = requestAnimationFrame(update);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div className={styles.dcDemo}>
      <div ref={trackRef} className={styles.dcSpringTrack}>
        <div ref={ballRef} className={styles.dcSpringBall} />
      </div>
      <div className={styles.dcMotionLabels}>
        <span>Lenis</span>
        <span>&middot;</span>
        <span>GSAP</span>
        <span>&middot;</span>
        <span>Framer Motion</span>
      </div>
    </div>
  );
}
