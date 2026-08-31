"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import type { TocHeading } from "@/types";
import dynamic from "next/dynamic";
import Link from "next/link";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { EmojiIcon } from "@/components/ui/EmojiPicker";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/components/icons";
import { useLenis } from "@/providers/LenisProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import TOC from "@/components/ui/TOC/TOC";
import { useLanguage } from "@/providers/LanguageProvider";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
import HeartIcon from "@/components/ui/HeartIcon";
import DetailActionButton from "@/components/ui/DetailActionButton";
import ShareButton from "@/components/ui/ShareButton";
import T from "@/components/ui/T";
import { formatCount } from "@/utils/format";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./DetailLayout.module.css";
import Pressable from "@/components/ui/Pressable";

const CommentSection = dynamic(() => import("@/components/comments/CommentSection"), { ssr: false });
const Giscus = dynamic(() => import("@/components/comments/Giscus"), { ssr: false });

export type { TocHeading };

interface LikeConfig {
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

  return (
    <motion.div
      className={styles.likeWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <DetailActionButton
        active={config.liked}
        onClick={config.onToggle}
        title={t("common.like")}
      >
        <HeartIcon liked={config.liked} busy={config.busy} size={20} />
        <span className={styles.likeCount}>{formatCount(config.count)}</span>
      </DetailActionButton>
    </motion.div>
  );
}

interface DetailLayoutProps {
  backHref?: string;
  backLabel: string;
  onBack?: () => void;
  heroImage?: string;
  heroAlt?: string;
  /** 커버 세로 위치 % (object-position, 0~100). 기본 50 — 편집기 CoverBanner 와 동일 */
  heroPosition?: number;
  /** 커버 확대 배율 (scale, 1~2.5). 기본 1 */
  heroZoom?: number;
  onHeroError?: () => void;
  heroFallback?: ReactNode;
  /** 페이지 이모지(아이콘) — 커버에 겹쳐 표시 (native / img:url / icon:id). 편집기 CoverBanner 와 동일 포맷 */
  heroIcon?: string | null;
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
  /** 좋아요 버튼 바로 아래 슬롯 (예: 작성자 상세) */
  afterLike?: ReactNode;
  /** 관련 글/작품/시리즈 등 — page 가 직접 ReactNode 로 (다양한 source). header 다음, 본문(content) 전 위쪽에 표시 */
  relatedContent?: ReactNode;
  /** 추천 글(함께 읽어보면 좋은) — 이전/다음(AdjacentNav) 바로 위에 표시 */
  recommendedContent?: ReactNode;
  /** 이전/다음 — 본문 하단 */
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
  heroPosition = 50,
  heroZoom = 1,
  onHeroError,
  heroFallback,
  heroIcon,
  headings = [],
  contentClassName,
  header,
  children,
  afterContent,
  likeConfig,
  afterLike,
  relatedContent,
  recommendedContent,
  adjacentConfig,
  commentsConfig,
  backLink,
}: DetailLayoutProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { endTransition, isTransitioning } = usePageTransition();
  const { comments } = useSiteConfig();
  const pageRef = useRef<HTMLDivElement>(null);

  // 댓글 시스템 provider — giscus 선택 + repo 설정 시 giscus 위젯, 아니면 내장 커스텀 댓글
  const useGiscus = comments?.provider === "giscus" && !!comments?.giscus?.repo?.trim();
  // giscus 게시물 반응이 켜져 있으면 중복이므로 사이트 자체 좋아요는 숨긴다(share 는 유지).
  const hidePostLike = useGiscus && comments?.giscus?.reactionsEnabled !== false;

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
          <Pressable
            onClick={onBack}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <ArrowLeft size={24} />
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </Pressable>
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
            style={{
              objectPosition: `50% ${heroPosition}%`,
              ...(heroZoom !== 1 ? { transform: `scale(${heroZoom})`, transformOrigin: "center" } : {}),
            }}
            onError={onHeroError}
          />
          <div className={styles.heroOverlay} />
        </motion.div>
      ) : heroFallback ? (
        heroFallback
      ) : (
        <div className={styles.heroSpacer} />
      )}

      {/* 페이지 이모지 — 커버에 겹쳐(Notion 식). 편집기 CoverBanner 와 동일 위치감 */}
      {heroIcon && (
        <div className={`${styles.heroIconRow}${heroImage ? "" : ` ${styles.heroIconNoHero}`}`}>
          <span className={styles.heroIcon}><EmojiIcon value={heroIcon} size={64} /></span>
        </div>
      )}

      {/* Header — full width */}
      {header && (
        <div className={`${styles.headerSection} ${!heroImage ? styles.contentNoHero : ""}`}>
          {header}
        </div>
      )}

      {/* 관련 프로젝트/게시물 — 본문 전(위) 영역에 표시 */}
      {relatedContent && (
        <div className={styles.afterContent}>{relatedContent}</div>
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
      {(likeConfig || afterLike || adjacentConfig || commentsConfig || backLink) && (
        <div className={styles.afterContent}>
          {likeConfig && (
            <div className={styles.likeShareRow}>
              {!hidePostLike && <LikeButton config={likeConfig} />}
              <ShareButton variant="action" />
            </div>
          )}

          {afterLike}

          {recommendedContent}

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
              {useGiscus ? (
                <Giscus />
              ) : (
                <CommentSection
                  commentType={commentsConfig.commentType}
                  targetId={commentsConfig.targetId}
                  translationEnabled={commentsConfig.translationEnabled !== false}
                />
              )}
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
