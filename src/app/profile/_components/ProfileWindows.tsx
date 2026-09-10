"use client";

import { Fragment, useRef, useCallback, useState, useEffect } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";

import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

import T from "@/components/ui/T";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { WINS, getTextPositions } from "./profileWindowConfig";
import type { ProfileInfoBlock } from "@/types/profile";
import styles from "./ProfileMeSection.module.css";


const TITLE_BAR_HEIGHT = 34;

interface Props {
  className?: string;
  isMobile?: boolean;
  /** 창에 들어갈 내용 — 설정에서 편집한다. 자리는 profileWindowConfig 가 정한다. */
  infoBlocks?: ProfileInfoBlock[];
}

export default function ProfileWindows({ className, isMobile, infoBlocks }: Props) {
  const siteConfig = useSiteConfig();
  const TEXT_POSITIONS = getTextPositions(siteConfig, infoBlocks);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const winRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const peekRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textPeekRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [profileViewerOpen, setProfileViewerOpen] = useState(false);

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
      if (!win || containerSize.w === 0) return;

      const bodyTop = win.offsetTop + TITLE_BAR_HEIGHT;
      const bodyLeft = win.offsetLeft;
      const bodyWidth = win.offsetWidth;
      const bodyHeight = win.offsetHeight - TITLE_BAR_HEIGHT;

      const right = containerSize.w - bodyLeft - bodyWidth;
      const bottom = containerSize.h - bodyTop - bodyHeight;

      /* 창은 모서리가 둥근데 이 clip 은 직사각형이라, 아래 두 모서리에서 사진이 창 밖으로
         비어져 나온다. 창의 실제 radius 를 읽어서 같이 깎는다 — 상수로 적으면 펼친 창
         (radius 0)·모바일에서 어긋난다. 위 두 모서리는 타이틀바와 맞닿아 각져 있다. */
      const r = getComputedStyle(win).borderBottomLeftRadius;
      const clip = `inset(${bodyTop}px ${right}px ${bottom}px ${bodyLeft}px round 0 0 ${r} ${r})`;

      const peek = peekRefs.current[id];
      if (peek) peek.style.clipPath = clip;

      const textPeek = textPeekRefs.current[id];
      if (textPeek) textPeek.style.clipPath = clip;
    },
    [containerSize],
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
  useSyncRef(syncPeekRef, syncPeek);

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
    [bringToFront, isMobile],
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

  const onDoubleClick = useCallback(
    (id: string) => {
      if (isMobile) return;
      setExpandedId((prev) => (prev === id ? null : id));
      bringToFront(id);
    },
    [bringToFront, isMobile],
  );

  /* Re-sync all peeks after expand/collapse transition */
  useEffect(() => {
    if (isMobile) return;
    const id = expandedId;
    const el = id ? winRefs.current[id] : null;
    const syncAll = () => WINS.forEach((win) => syncPeek(win.id));

    // Immediate sync for non-expanded windows
    syncAll();

    if (!el) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "width") syncAll();
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [expandedId, syncPeek, isMobile]);

  /* ── Mobile: magazine-style layout ── */
  if (isMobile) {
    const personalInfo = TEXT_POSITIONS.find((tp) => tp.key === "a");
    const aboutInfo = TEXT_POSITIONS.find((tp) => tp.key === "c");
    const heroLines = personalInfo?.lines.slice(0, 2) ?? [];
    const detailLines = personalInfo?.lines.slice(2) ?? [];
    const aboutLines = aboutInfo?.lines ?? [];
    const easterEggLines = TEXT_POSITIONS.filter((tp) =>
      tp.key.startsWith("e"),
    ).flatMap((tp) => tp.lines);
    const pullQuote =
      TEXT_POSITIONS.find((tp) => tp.key === "e4")?.lines.find(
        (l) => l.label === "Motto",
      )?.value ?? "";

    return (
      <div className={`${styles.mobileProfile} ${className ?? ""}`}>
        {/* Feature: portrait image + name & basic info */}
        <div className={styles.magFeature}>
          <div
            className={styles.magFeatureImage}
            onClick={() => setProfileViewerOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="프로필 사진 크게 보기"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setProfileViewerOpen(true);
              }
            }}
            style={{ cursor: "zoom-in" }}
          >
            <Image
              src="/images/profile_pic.webp"
              alt=""
              fill
              sizes="50vw"
              priority
              className={styles.profileImage}
            />
          </div>
          <div className={styles.magFeatureInfo}>
            <h3 className={styles.magName}>{heroLines[0]?.value}</h3>
            {detailLines.map((row) => (
              <div key={row.label} className={styles.magInfoRow}>
                <span className={styles.magInfoLabel}>{row.label}</span>
                <span className={styles.magInfoValue}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pull quote */}
        <blockquote className={styles.magQuote}>
          &ldquo;{pullQuote}&rdquo;
        </blockquote>

        {/* About + Dev Notes */}
        <div className={styles.magDetails}>
          <div className={styles.magAbout}>
            {aboutLines.map((row) => (
              <div key={row.label} className={styles.magInfoRow}>
                <span className={styles.magInfoLabel}>{row.label}</span>
                <span className={styles.magInfoValue}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.magNotes}>
            <span className={styles.magNotesTag}><T k="profilePage.devNotes" /></span>
            {easterEggLines.map((row) => (
              <div key={row.label} className={styles.magInfoRow}>
                <span className={styles.magInfoLabel}>{row.label}</span>
                <span className={styles.magInfoValue}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <ImageViewer
          images={["/images/profile_pic.webp"]}
          index={0}
          open={profileViewerOpen}
          onClose={() => setProfileViewerOpen(false)}
        />
      </div>
    );
  }

  /* ── Desktop: OS windows + peek layers ── */
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
              className={`${styles.osWindow} ${expandedId === win.id ? styles.osWindowExpanded : ""}`}
              style={
                expandedId === win.id
                  ? {
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 100,
                    }
                  : {
                      left: `${win.x}%`,
                      top: `${win.y}%`,
                      width: `${win.w}%`,
                      aspectRatio: win.aspect,
                      zIndex: zi * 2,
                    }
              }
              onMouseDown={() => bringToFront(win.id)}
              onDoubleClick={() => onDoubleClick(win.id)}
            >
              <div
                className={styles.osWindowBar}
                data-draggable
                onPointerDown={(e) => onPointerDown(e, win.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <span className={styles.osWindowTitle}>{win.title}</span>
                <span className={styles.osWindowClose}>&#xd7;</span>
              </div>
              <div className={styles.osWindowBody} />
            </div>
            <div
              ref={(el) => {
                peekRefs.current[win.id] = el;
              }}
              className={styles.windowPeek}
              style={{ zIndex: expandedId === win.id ? 99 : zi * 2 - 1 }}
            />
            <div
              ref={(el) => {
                textPeekRefs.current[win.id] = el;
              }}
              className={styles.textPeek}
              style={{ zIndex: expandedId === win.id ? 99 : zi * 2 - 1 }}
              aria-hidden
            >
              {TEXT_POSITIONS.map((tp) => (
                <div
                  key={tp.key}
                  className={styles.bgInfo}
                  style={{
                    left: `${tp.x}%`,
                    top: `${tp.y}%`,
                    width: `${tp.w}%`,
                    ...(tp.aspect
                      ? {
                          aspectRatio: tp.aspect,
                          paddingTop: TITLE_BAR_HEIGHT,
                        }
                      : {}),
                  }}
                >
                  {tp.lines.map((row) => (
                    <div key={row.label} className={styles.bgInfoRow}>
                      <span className={styles.bgInfoLabel}>{row.label}</span>
                      <span className={styles.bgInfoValue}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
