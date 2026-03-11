"use client";

import { Fragment, useRef, useCallback, useState, useEffect } from "react";

import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

import T from "@/components/ui/T";
import { ImageViewer } from "@/components/ui/ImageViewer";
import styles from "./ProfileMeSection.module.css";


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

interface TextBlock {
  key: string;
  x: number;
  y: number;
  w: number;
  aspect?: string;
  lines: { label: string; value: string }[];
}

const getTextPositions = (siteConfig: ReturnType<typeof useSiteConfig>): TextBlock[] => [
  /* ── Window-aligned blocks ── */
  {
    key: "a",
    x: 4,
    y: 6,
    w: 28,
    aspect: "4/3",
    lines: [
      { label: "Name", value: siteConfig.personal.name },
      { label: "Role", value: siteConfig.personal.role },
      { label: "Location", value: siteConfig.personal.location },
      { label: "Email", value: siteConfig.contact.email },
      { label: "Status", value: siteConfig.personal.status },
    ],
  },
  {
    key: "c",
    x: 12,
    y: 52,
    w: 20,
    aspect: "1/1",
    lines: [
      { label: "School", value: "Seoul Women's University" },
      { label: "GPA", value: "3.9 / 4.5" },
      { label: "MBTI", value: "ISTP" },
      { label: "Likes", value: "Coffee, Clean Code, Music" },
      { label: "Dislikes", value: "Bugs, Slow Internet" },
      { label: "Hobby", value: "Coding, Gaming, Film" },
      { label: "Specialty", value: "Frontend, UI/UX" },
    ],
  },
  /* ── Easter eggs ── */
  {
    key: "e1",
    x: 62,
    y: 6,
    w: 24,
    lines: [
      { label: ">_", value: "console.log('Hello World')" },
      { label: "Mood", value: "if (coffee) code() : sleep()" },
      { label: "Bug", value: "99 little bugs in the code..." },
    ],
  },
  {
    key: "e2",
    x: 56,
    y: 50,
    w: 26,
    lines: [
      { label: "Stack", value: "React + Next.js + TypeScript" },
      { label: "Editor", value: "VS Code + Vim Motions" },
      { label: "OS", value: "macOS" },
      { label: "Font", value: "JetBrains Mono" },
    ],
  },
  {
    key: "e3",
    x: 36,
    y: 72,
    w: 22,
    lines: [
      { label: "Coffee", value: "2,847 cups and counting" },
      { label: "Commits", value: "git push --force (just kidding)" },
    ],
  },
  {
    key: "e4",
    x: 70,
    y: 78,
    w: 22,
    lines: [
      { label: "Secret", value: "You found me!" },
      { label: "Motto", value: "Ship it, then fix it" },
    ],
  },
];


const TITLE_BAR_HEIGHT = 34;

interface Props {
  className?: string;
  isMobile?: boolean;
}

export default function ProfileWindows({ className, isMobile }: Props) {
  const siteConfig = useSiteConfig();
  const TEXT_POSITIONS = getTextPositions(siteConfig);

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
      const clip = `inset(${bodyTop}px ${right}px ${bottom}px ${bodyLeft}px)`;

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
            onKeyDown={(e) => { if (e.key === "Enter") setProfileViewerOpen(true); }}
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
