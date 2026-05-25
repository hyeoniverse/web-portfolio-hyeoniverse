"use client";

import { useState, useEffect, useMemo, useRef, useId, type ReactNode, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLenis } from "@/providers/LenisProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import TOC from "@/components/ui/TOC/TOC";
import { useLanguage } from "@/providers/LanguageProvider";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
import T from "@/components/ui/T";
import styles from "./DetailLayout.module.css";

const CommentSection = dynamic(() => import("@/components/comments/CommentSection"), { ssr: false });

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface LikeConfig {
  count: number;
  liked: boolean;
  busy?: boolean;
  onToggle: () => void;
}

/**
 * Like button — heart icon + wave fill animation. config 만 props 로.
 * DetailLayout 외부에서 직접 사용 가능 — DetailLayout 에 likeConfig 안 넘기면 자동 render 안 됨.
 */
export function LikeButton({ config }: { config: LikeConfig }) {
  const { t } = useLanguage();
  const heartClipId = useId();
  const [animBusy, setAnimBusy] = useState(false);
  const busyStartRef = useRef<number | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const prevAnimBusyRef = useRef(false);

  useEffect(() => {
    if (config.busy) {
      busyStartRef.current = Date.now();
      setAnimBusy(true);
      return;
    }
    if (busyStartRef.current === null) return;
    const elapsed = Date.now() - busyStartRef.current;
    const minDuration = 2000;
    const remaining = Math.max(0, minDuration - elapsed);
    const id = setTimeout(() => {
      setAnimBusy(false);
      busyStartRef.current = null;
    }, remaining);
    return () => clearTimeout(id);
  }, [config.busy]);

  // 채우기 완료 직후 (animBusy false 로 전환 + liked 상태일 때) → burst 1회 트리거
  useEffect(() => {
    if (prevAnimBusyRef.current && !animBusy && config.liked) {
      setBurstKey((k) => k + 1);
    }
    prevAnimBusyRef.current = animBusy;
  }, [animBusy, config.liked]);

  // burst 마다 새 random 파티클 — 위쪽으로 방울 떠오르는 느낌 (수직 dominant + 약간 좌우 흔들림)
  const burstParticles = useMemo(() => {
    if (burstKey === 0) return [];
    return Array.from({ length: 10 }, () => ({
      driftX: (Math.random() - 0.5) * 90,    // -45 ~ +45px (좌우 흔들림)
      rise: 45 + Math.random() * 55,         // 45–100px 상승 (높이 편차 큼)
      scale: 0.7 + Math.random() * 0.6,      // 0.7–1.3
      opacityPeak: 0.5 + Math.random() * 0.5, // 0.5–1.0 peak
      delay: Math.random() * 280,            // 0–280ms 스태거
      duration: 1100 + Math.random() * 600,  // 1100–1700ms (느긋)
      size: 6 + Math.random() * 7,           // 6–13px
    }));
  }, [burstKey]);

  return (
    <motion.div
      className={styles.likeWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <button
        type="button"
        className={`${styles.likeBtn} ${config.liked ? styles.likeBtnActive : ""} ${animBusy ? styles.likeBtnBusy : ""}`}
        onClick={config.onToggle}
        title={t("common.like")}
        data-clickable="true"
      >
        <span className={styles.heartHolder}>
          <svg
            className={styles.heartIcon}
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={heartClipId}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </clipPath>
            </defs>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${heartClipId})`}>
              <path className={styles.heartWaveBack} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
              <path className={styles.heartWaveMid} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
              <path className={styles.heartWaveFront} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
            </g>
          </svg>
          {burstKey > 0 && (
            <span key={burstKey} className={styles.burst} aria-hidden>
              {burstParticles.map((p, i) => (
                <span
                  key={i}
                  className={styles.burstParticle}
                  style={{
                    "--drift-x": `${p.driftX}px`,
                    "--rise": `${p.rise}px`,
                    "--scale": p.scale,
                    "--opacity-peak": p.opacityPeak,
                    "--delay": `${p.delay}ms`,
                    "--duration": `${p.duration}ms`,
                    "--size": `${p.size}px`,
                  } as CSSProperties}
                />
              ))}
            </span>
          )}
        </span>
        <span className={styles.likeCount}>{formatCount(config.count)}</span>
      </button>
    </motion.div>
  );
}

interface DetailLayoutProps {
  backHref?: string;
  backLabel: string;
  onBack?: () => void;
  heroImage?: string;
  heroAlt?: string;
  onHeroError?: () => void;
  heroFallback?: ReactNode;
  headings?: TocHeading[];
  contentClassName?: string;
  /** Full-width header slot (title, meta) rendered above content+TOC row */
  header?: ReactNode;
  children: ReactNode;
  /** Page-specific extra content (e.g., work actions, team carousel). children 다음, like 전 */
  afterContent?: ReactNode;

  // ── 공통 detail page 요소들 — config 만 넘기면 DetailLayout 이 자동 render ──
  /** 좋아요 — afterContent 다음 */
  likeConfig?: LikeConfig;
  /** 관련 글/작품/시리즈 등 — page 가 직접 ReactNode 로 (다양한 source). 좋아요 다음 */
  relatedContent?: ReactNode;
  /** 이전/다음 — relatedContent 다음 */
  adjacentConfig?: {
    prev?: { href: string; title: string; image?: string } | null;
    next?: { href: string; title: string; image?: string } | null;
    prevLabelKey?: string;
    nextLabelKey?: string;
    className?: string;
  };
  /** 댓글 — adjacentNav 다음. type / id 만 넘기면 동작 */
  commentsConfig?: {
    commentType: "post" | "work";
    targetId: string;
    translationEnabled?: boolean;
  };
  /** 하단 back-to-list 링크 — comments 다음 */
  backLink?: { href: string; labelKey: string };
}

export default function DetailLayout({
  backHref,
  backLabel,
  onBack,
  heroImage,
  heroAlt = "",
  onHeroError,
  heroFallback,
  headings = [],
  contentClassName,
  header,
  children,
  afterContent,
  likeConfig,
  relatedContent,
  adjacentConfig,
  commentsConfig,
  backLink,
}: DetailLayoutProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { endTransition, isTransitioning } = usePageTransition();
  const pageRef = useRef<HTMLDivElement>(null);

  // (animBusy / busyStartRef / heartClipId — LikeButton 컴포넌트 안으로 이동)

  // 새 페이지가 마운트되면 오버레이 morph 블록을 fade out.
  // 80ms 대기 — real hero/heroSpacer 가 페인트된 다음 morph 블록이 사라지게 (paint 직전에 닫으면 깜빡임).
  useEffect(() => {
    if (!isTransitioning) return;
    const t = setTimeout(() => endTransition(), 80);
    return () => clearTimeout(t);
  }, [isTransitioning, endTransition]);

  // Lenis setup
  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);

  // Back button hide on scroll down
  const [backHidden, setBackHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        setBackHidden(y > 100 && y > lastY);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);


  return (
    <div ref={pageRef} className={styles.page}>
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <ArrowLeft size={24} />
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </button>
        ) : (
          <a
            href={backHref}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <ArrowLeft size={24} />
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </a>
        )}
      </motion.div>

      {/* Hero */}
      {heroImage ? (
        <motion.div
          className={styles.hero}
          initial={{ opacity: isTransitioning ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <ProgressiveImage
            src={heroImage}
            alt={heroAlt}
            fill
            sizes="100vw"
            priority
            className={styles.heroCover}
            onError={onHeroError}
          />
          <div className={styles.heroOverlay} />
        </motion.div>
      ) : heroFallback ? (
        heroFallback
      ) : (
        <div className={styles.heroSpacer} />
      )}

      {/* Header — full width */}
      {header && (
        <div className={`${styles.headerSection} ${!heroImage ? styles.contentNoHero : ""}`}>
          {header}
        </div>
      )}

      {/* Content + TOC row */}
      <div className={`${styles.contentRow} ${!heroImage && !header ? styles.contentNoHero : ""}`}>
        <div className={`${styles.content}${contentClassName ? ` ${contentClassName}` : ""}`}>
          {children}
        </div>

        {/* TOC — sticky sidebar */}
        {headings.length > 0 && (
          <aside className={styles.tocSidebar}>
            <TOC items={headings} title="Contents" position="right" />
          </aside>
        )}
      </div>

      {/* After content (page-specific: work actions / team, post extras 등) */}
      {afterContent && (
        <div className={styles.afterContent}>{afterContent}</div>
      )}

      {/* ── 공통 detail 요소들 ─ afterContent 다음 자동 render ── */}
      {(likeConfig || relatedContent || adjacentConfig || commentsConfig || backLink) && (
        <div className={styles.afterContent}>
          {likeConfig && <LikeButton config={likeConfig} />}

          {relatedContent}

          {adjacentConfig && (
            <AdjacentNav
              prev={adjacentConfig.prev ?? null}
              next={adjacentConfig.next ?? null}
              prevLabelKey={adjacentConfig.prevLabelKey}
              nextLabelKey={adjacentConfig.nextLabelKey}
              className={adjacentConfig.className}
            />
          )}

          {commentsConfig && (
            <motion.div
              className={styles.commentWrap}
              id="comments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <CommentSection
                commentType={commentsConfig.commentType}
                targetId={commentsConfig.targetId}
                translationEnabled={commentsConfig.translationEnabled !== false}
              />
            </motion.div>
          )}

          {backLink && (
            <div className={styles.footerNav}>
              <Link href={backLink.href} className={styles.footerLink}>
                <ArrowLeft size={16} className={styles.footerArrow} /> <T k={backLink.labelKey} />
              </Link>
            </div>
          )}
        </div>
      )}

      <ScrollButtons />
    </div>
  );
}
