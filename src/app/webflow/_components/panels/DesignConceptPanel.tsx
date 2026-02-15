"use client";

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import { Code, Palette, LayoutGrid, Zap, Globe, Mail } from "lucide-react";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem } from "@/data/webflow";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import styles from "../WebFlowSection.module.css";

export type DcTransitionMode = "strip" | "stack";

interface DesignConceptPanelProps {
  language: Language;
  concepts: DesignConceptItem[];
  mode?: DcTransitionMode;
  scrollBy?: (deltaX: number) => void;
}

/* ── 타이포그래피 데모 ── */
const fonts = [
  { label: "Inter", family: "var(--font-inter)" },
  { label: "Instrument", family: "var(--font-instrument)" },
  { label: "JetBrains", family: "var(--font-jetbrains)" },
  { label: "Grotesk", family: "var(--font-space-grotesk)" },
];

function TypographyDemo() {
  const [activeFont, setActiveFont] = useState(0);

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcFontTabs}>
        {fonts.map((f, i) => (
          <button
            key={f.label}
            className={`${styles.dcToggleBtn} ${i === activeFont ? styles.dcToggleBtnActive : ""}`}
            onClick={() => setActiveFont(i)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div
        className={styles.dcSpecimen}
        style={{ fontFamily: fonts[activeFont].family }}
      >
        Aa Bb Cc 123
      </div>
    </div>
  );
}

/* ── 컬러 시스템 데모 ── */
const palettes = {
  dark: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#0A0A0A" },
    { label: "text", hex: "#F5F5F5" },
    { label: "border", hex: "#2A2A2A" },
    { label: "muted", hex: "#6B7280" },
  ],
  light: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#FFFFFF" },
    { label: "text", hex: "#111111" },
    { label: "border", hex: "#E5E5E5" },
    { label: "muted", hex: "#9CA3AF" },
  ],
};

function hexLuminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function ColorSystemDemo() {
  const [demoTheme, setDemoTheme] = useState<"dark" | "light">("dark");
  const swatches = palettes[demoTheme];

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcThemeToggle}>
        <button
          className={`${styles.dcToggleBtn} ${demoTheme === "light" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("light")}
        >
          Light
        </button>
        <button
          className={`${styles.dcToggleBtn} ${demoTheme === "dark" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("dark")}
        >
          Dark
        </button>
      </div>
      <div className={styles.dcSwatchRow}>
        {swatches.map((s) => (
          <div
            key={s.label}
            className={styles.dcSwatch}
            style={{
              backgroundColor: s.hex,
              color:
                hexLuminance(s.hex) > 0.5 ? "#111" : "rgba(255,255,255,0.8)",
            }}
            title={`${s.label}: ${s.hex}`}
          >
            {s.label.slice(0, 2)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 모션 & 스크롤 데모 ── */
function MotionScrollDemo() {
  const { lenis } = useLenis();
  const ballRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lenis || !ballRef.current || !trackRef.current) return;

    const MAX_VELOCITY = 8;
    let rafId: number;

    const update = () => {
      const ball = ballRef.current;
      const track = trackRef.current;
      if (!ball || !track) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const velocity = (lenis as any).velocity as number;
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

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [lenis]);

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

/* ── 레이아웃 & 간격 데모 ── */
const spacingTokens = [
  { token: "2xs", px: 4 },
  { token: "xs", px: 8 },
  { token: "sm", px: 12 },
  { token: "md", px: 16 },
  { token: "lg", px: 24 },
  { token: "xl", px: 32 },
  { token: "2xl", px: 48 },
];

function LayoutSpacingDemo() {
  const maxPx = spacingTokens[spacingTokens.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcSpacingList}>
        {spacingTokens.map((t) => (
          <div key={t.token} className={styles.dcSpacingRow}>
            <span className={styles.dcSpacingLabel}>{t.token}</span>
            <div
              className={styles.dcSpacingBar}
              style={{ width: `${(t.px / maxPx) * 100}%` }}
            />
            <span className={styles.dcSpacingPx}>{t.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 그리드 시스템 데모 (브레이크포인트 바) ── */
const breakpoints = [
  { name: "XS", px: 320 },
  { name: "SM", px: 480 },
  { name: "MD", px: 768 },
  { name: "LG", px: 1024 },
  { name: "XL", px: 1280 },
  { name: "2XL", px: 1440 },
  { name: "4K", px: 1920 },
];

function GridSystemDemo() {
  const maxPx = breakpoints[breakpoints.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcBreakpoints}>
        {breakpoints.map((bp) => (
          <div
            key={bp.name}
            className={styles.dcBpBar}
            style={{ height: `${(bp.px / maxPx) * 100}%` }}
          >
            <span className={styles.dcBpName}>{bp.name}</span>
            <span className={styles.dcBpLabel}>{bp.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 아이콘 데모 (아이콘 그리드 + 토글) ── */
const lucideIcons = [
  { icon: Code, label: "Code" },
  { icon: Palette, label: "Palette" },
  { icon: LayoutGrid, label: "Layout" },
  { icon: Zap, label: "Zap" },
  { icon: Globe, label: "Globe" },
  { icon: Mail, label: "Mail" },
];

function IconographyDemo() {
  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcIconGrid}>
        {lucideIcons.map((item) => (
          <div key={item.label} className={styles.dcIconCell}>
            <item.icon size={20} />
            <span className={styles.dcIconCellLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 데모 맵 ── */
const demoMap: Record<string, React.FC> = {
  typography: TypographyDemo,
  color: ColorSystemDemo,
  motion: MotionScrollDemo,
  layout: LayoutSpacingDemo,
  grid: GridSystemDemo,
  icons: IconographyDemo,
};

export default function DesignConceptPanel({
  language,
  concepts,
  mode = "strip",
  scrollBy,
}: DesignConceptPanelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const isMobile = checkMobileLayout();
  const isStrip = mode === "strip";

  // 데스크톱: 인덱스 변경 시 모드별 전환
  const onIndexChange = useCallback(
    (index: number) => {
      if (isStrip && stripRef.current) {
        stripRef.current.style.transform = `translateX(-${index * 100}%)`;
      } else if (stackRef.current) {
        const grid = stackRef.current;
        const overlays = grid.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`);
        const backgrounds = grid.querySelectorAll<HTMLElement>(`.${styles.dcCardBg}`);
        const cards = grid.querySelectorAll<HTMLElement>(`.${styles.dcCard}`);

        overlays.forEach((overlay, i) => {
          (overlay as HTMLElement).style.opacity = i === index ? "1" : "0";
        });
        backgrounds.forEach((bg, i) => {
          (bg as HTMLElement).style.transform = i < index ? "translateX(-100%)" : "";
        });
        cards.forEach((card, i) => {
          (card as HTMLElement).style.pointerEvents = i === index ? "auto" : "none";
        });
      }
    },
    [isStrip],
  );

  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    concepts.length,
    onIndexChange,
    scrollBy,
  );

  /* ═══ 스택 모드: 초기 시각 상태 설정 (깜박임 방지) ═══ */
  useLayoutEffect(() => {
    if (isStrip) return;
    const grid = stackRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.dcCard}`),
    );
    const total = cards.length;

    cards.forEach((card, i) => {
      gsap.set(card, { zIndex: total - i, opacity: 1 });
      if (i > 0) {
        gsap.set(card, { borderColor: "transparent" });
        const overlay = card.querySelector(`.${styles.dcCardOverlay}`);
        if (overlay) gsap.set(overlay, { opacity: 0 });
      }
    });
  }, [isStrip]);

  /* ═══ 모바일: 초기 카드 상태 설정 ═══ */
  useLayoutEffect(() => {
    if (!isMobile) return;
    const stack = stackRef.current;
    if (!stack) return;

    const cards = Array.from(
      stack.querySelectorAll<HTMLElement>(`.${styles.dcCard}`),
    );
    const overlays = Array.from(
      stack.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`),
    );
    const total = cards.length;

    cards.forEach((card, i) => {
      gsap.set(card, { zIndex: total - i, opacity: 1 });
      if (i > 0) {
        gsap.set(card, { borderColor: "transparent" });
        if (overlays[i]) gsap.set(overlays[i], { opacity: 0 });
      }
    });
  }, [isMobile]);

  /* ═══ 모바일: 인덱스 변경 시 카드 크로스페이드 ═══ */
  const handleMobileIndexChange = useCallback((newIndex: number) => {
    const stack = stackRef.current;
    if (!stack) return;

    const overlays = stack.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`);
    const backgrounds = stack.querySelectorAll<HTMLElement>(`.${styles.dcCardBg}`);
    const cards = stack.querySelectorAll<HTMLElement>(`.${styles.dcCard}`);

    overlays.forEach((overlay, i) => {
      overlay.style.opacity = i === newIndex ? "1" : "0";
    });
    backgrounds.forEach((bg, i) => {
      bg.style.transform = i < newIndex ? "translateY(-100%)" : "";
    });
    cards.forEach((card, i) => {
      card.style.pointerEvents = i === newIndex ? "auto" : "none";
    });
  }, []);

  /* ═══ 모바일: GSAP ScrollTrigger 고정 스크롤 ═══ */
  useMobilePinScroll(contentRef, concepts.length, 400, handleMobileIndexChange);

  /* ═══ 카드 목록 (두 모드 공유) ═══ */
  const cardElements = concepts.map((concept) => {
    const Demo = demoMap[concept.id];
    return (
      <div key={concept.id} className={styles.dcCard}>
        <div className={styles.dcCardBg}>
          <Image
            src={concept.image}
            alt={concept.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className={styles.dcCardOverlay}>
          <span className={styles.dcCardTitle}>{concept.title}</span>
          <h4 className={styles.dcCardSubtitle}>
            {concept.subtitle[language]}
          </h4>
          <p className={styles.dcCardDesc}>
            {concept.description[language]}
          </p>
          {Demo && <Demo />}
        </div>
      </div>
    );
  });

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.dcViewport}`}>
        <PinnedTitleRow
          number="04"
          title="Design Concept."
          dotNav={{
            count: concepts.length,
            activeIndex,
            onDotClick: scrollToItem,
            labels: concepts.map((c) => c.title),
            className: styles.dotNavMobile,
          }}
        />

        <div
          ref={stackRef}
          className={`${styles.dcCardStack} ${isStrip ? styles.dcModeStrip : styles.dcModeStack}`}
        >
          {isStrip ? (
            <div ref={stripRef} className={styles.dcCardStrip}>
              {cardElements}
            </div>
          ) : (
            cardElements
          )}
        </div>

        {/* 모바일: 단순 세로 카드 목록 (애니메이션 없음) */}
        <div className={styles.dcMobileList}>
          {concepts.map((concept) => {
            const Demo = demoMap[concept.id];
            return (
              <div key={concept.id} className={styles.dcMobileCard}>
                <div className={styles.dcMobileCardBg}>
                  <Image
                    src={concept.image}
                    alt={concept.title}
                    fill
                    sizes="100vw"
                  />
                </div>
                <div className={styles.dcMobileCardContent}>
                  <span className={styles.dcCardTitle}>{concept.title}</span>
                  <h4 className={styles.dcCardSubtitle}>
                    {concept.subtitle[language]}
                  </h4>
                  <p className={styles.dcCardDesc}>
                    {concept.description[language]}
                  </p>
                  {Demo && <Demo />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
