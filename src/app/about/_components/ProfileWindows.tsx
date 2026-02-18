"use client";

import { Fragment, useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";

import styles from "./AboutMeSection.module.css";

interface WindowDef {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  aspect: string;
}

const WINS: WindowDef[] = [
  { id: "a", title: "kim_jeonghyeon.webp", x: 4, y: 6, w: 28, aspect: "4/3" },
  { id: "b", title: "kim_jeonghyeon.webp", x: 34, y: 4, w: 18, aspect: "3/4" },
  { id: "c", title: "kim_jeonghyeon.webp", x: 12, y: 52, w: 20, aspect: "1/1" },
];

const TITLE_BAR_HEIGHT = 34;

interface Props {
  className?: string;
  isMobile?: boolean;
}

export default function ProfileWindows({ className, isMobile }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const winRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const peekRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragInfo = useRef<{
    id: string;
    pointerId: number;
    bar: HTMLElement;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
  } | null>(null);

  const [stack, setStack] = useState(() => WINS.map((w) => w.id));
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const syncPeek = useCallback(
    (id: string) => {
      const win = winRefs.current[id];
      const peek = peekRefs.current[id];
      if (!win || !peek || containerSize.w === 0) return;

      const bodyTop = win.offsetTop + TITLE_BAR_HEIGHT;
      const bodyLeft = win.offsetLeft;
      const bodyWidth = win.offsetWidth;
      const bodyHeight = win.offsetHeight - TITLE_BAR_HEIGHT;

      const right = containerSize.w - bodyLeft - bodyWidth;
      const bottom = containerSize.h - bodyTop - bodyHeight;

      peek.style.clipPath = `inset(${bodyTop}px ${right}px ${bottom}px ${bodyLeft}px)`;
    },
    [containerSize]
  );

  useEffect(() => {
    if (isMobile) return;
    WINS.forEach((win) => syncPeek(win.id));
  }, [containerSize, syncPeek, isMobile]);

  const bringToFront = useCallback((id: string) => {
    setStack((prev) => {
      if (prev[prev.length - 1] === id) return prev;
      return [...prev.filter((wid) => wid !== id), id];
    });
  }, []);

  /* ── Document-level drag: works even when pointer crosses nav ── */
  const syncPeekRef = useRef(syncPeek);
  syncPeekRef.current = syncPeek;

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (isMobile) return;
      e.preventDefault();
      const el = winRefs.current[id];
      const bar = e.currentTarget as HTMLElement;
      if (!el) return;

      // Capture pointer so nav can't intercept events
      bar.setPointerCapture(e.pointerId);

      bringToFront(id);

      dragInfo.current = {
        id,
        pointerId: e.pointerId,
        bar,
        startX: e.clientX,
        startY: e.clientY,
        elX: el.offsetLeft,
        elY: el.offsetTop,
      };
    },
    [bringToFront, isMobile]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragInfo.current) return;
    const { id, startX, startY, elX, elY } = dragInfo.current;
    const el = winRefs.current[id];
    if (!el) return;
    const newLeft = elX + (e.clientX - startX);
    const newTop = elY + (e.clientY - startY);
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
    syncPeekRef.current(id);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragInfo.current) return;
    dragInfo.current.bar.releasePointerCapture(e.pointerId);
    dragInfo.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.windowsContainer} ${className ?? ""}`}
    >
      {/* Afterimage — grayscale, offset behind */}
      <div className={`${styles.baseImageWrap} ${styles.baseImageGhost}`}>
        <Image
          src="/images/profile_mask.webp"
          alt=""
          fill
          sizes="30vw"
          className={styles.baseImage}
        />
      </div>

      {/* Base image — color, main */}
      <div className={styles.baseImageWrap}>
        <Image
          src="/images/profile_mask.webp"
          alt=""
          fill
          sizes="30vw"
          className={styles.baseImage}
        />
      </div>

      {/* OS windows + peek layers */}
      {WINS.map((win) => {
        const zi = stack.indexOf(win.id) + 1;
        return (
          <Fragment key={win.id}>
            <div
              ref={(el) => {
                winRefs.current[win.id] = el;
              }}
              className={styles.osWindow}
              style={
                isMobile
                  ? undefined
                  : {
                      left: `${win.x}%`,
                      top: `${win.y}%`,
                      width: `${win.w}%`,
                      aspectRatio: win.aspect,
                      zIndex: zi * 2,
                    }
              }
              onMouseDown={() => bringToFront(win.id)}
            >
              <div
                className={styles.osWindowBar}
                onPointerDown={(e) => onPointerDown(e, win.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <span className={styles.osWindowTitle}>{win.title}</span>
                <span className={styles.osWindowClose}>&#xd7;</span>
              </div>
              <div className={styles.osWindowBody}>
                {isMobile && (
                  <Image
                    src="/images/profile_pic.webp"
                    alt=""
                    fill
                    sizes="90vw"
                    className={styles.profileImage}
                  />
                )}
              </div>
            </div>
            {!isMobile && (
              <div
                ref={(el) => {
                  peekRefs.current[win.id] = el;
                }}
                className={styles.windowPeek}
                style={{ zIndex: zi * 2 - 1 }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
