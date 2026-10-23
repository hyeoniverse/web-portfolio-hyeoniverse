"use client";

import { blogHref } from "@/lib/siteHosts";
import SiteText from "@/components/ui/SiteText";
import { useState, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import type { Post } from "@/types/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import T from "@/components/ui/T";
import { Pin, Eye, Heart } from "@/components/icons";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
import { usePostCard } from "./usePostCard";
import PostCardAuthor from "./PostCardAuthor";
import PostCardLink from "./PostCardLink";
import { HotBadge } from "./PostCardChips";
import Badge from "@/components/ui/Badge";
import styles from "./PostCard.module.css";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import Pressable from "@/components/ui/Pressable";

export interface PostCardVariantProps {
  post: Post;
  variant?: "featured" | "standard";
  /** 시리즈 필터링 등 — 카드 높이를 축소 (이미지 16:9 + body 슬림) */
  compact?: boolean;
  /** 목록 레이아웃 (설정) — compact 는 전용 렌더, 나머지는 표준 카드 + CSS */
  layout?: "magazine" | "grid" | "list" | "compact" | "blog" | "journal" | "masonry" | "timeline" | "featured" | "series";
  /** bento — 2-col span + ultra-wide(21:9) 이미지 */
  banner?: boolean;
  /** bento — 정사각 이미지(1:1) */
  square?: boolean;
  /** bento — 세로 이미지(4:5) */
  portrait?: boolean;
  isHot?: boolean;
  onImgError?: (id: string) => void;
  imgError?: boolean;
}

export default function PostCardStandard({
  post,
  variant = "standard",
  compact,
  layout,
  banner,
  square,
  portrait,
  isHot,
  onImgError,
  imgError,
}: PostCardVariantProps) {
  const {
    t, cardRef, date, readTime, showImage, coverSrc, category, author, langBadge,
    displayTitle, displayExcerpt, icon, cardLink, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });
  const isFeatured = variant === "featured";
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [tagsOverflow, setTagsOverflow] = useState(false);
  const tagsRef = useRef<HTMLDivElement>(null);
  // meta 줄바꿈 감지 — wrap 시 그룹 사이 separator(+gap) 숨김
  const metaRef = useRef<HTMLDivElement>(null);
  const [metaWrapped, setMetaWrapped] = useState(false);

  useLayoutEffect(() => {
    const el = tagsRef.current;
    if (!el || tagsExpanded) return;
    const check = () => {
      // 자연 height 가 max-height (1줄) 보다 크면 overflow
      setTagsOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [post.tags, tagsExpanded]);

  useLayoutEffect(() => {
    const el = metaRef.current;
    if (!el) return;
    const check = () => {
      const groups = el.querySelectorAll<HTMLElement>(`.${styles.metaGroup}`);
      if (groups.length < 2) { setMetaWrapped(false); return; }
      const firstTop = groups[0].offsetTop;
      let wrapped = false;
      for (let i = 1; i < groups.length; i++) {
        if (groups[i].offsetTop !== firstTop) { wrapped = true; break; }
      }
      setMetaWrapped(wrapped);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 로그 스킨 — 커버에서 빼꼼 나오는 몽이. 처음 자리는 slug 로 정하고(서버 · 브라우저 같은 값),
     카드에서 포인터가 나갈 때마다 다음에 나올 자리 · 방향 · 표정 · 기울기를 새로 뽑는다 */
  const peekRef = useRef<HTMLDivElement>(null);
  const peekStyle = peekVars(seedOf(post.slug || post.id));
  const rerollPeek = () => {
    const el = peekRef.current;
    if (!el) return;
    for (const [k, v] of Object.entries(peekVars(Math.random()))) el.style.setProperty(k, v);
  };

  const cardClass = [
    styles.card,
    !showImage && styles.placeholderCard,
    isFeatured && styles.featured,
    compact && styles.compact,
    banner && styles.banner,
    square && styles.square,
    portrait && styles.portrait,
    layout === "grid" && styles.layoutGrid,
    layout === "list" && styles.layoutList,
    layout === "series" && styles.series,
    layout === "featured" && isFeatured && styles.featuredHero,
  ].filter(Boolean).join(" ");

  /* ── Standard / Featured ── */
  return (
    <div
      ref={cardRef}
      className={cardClass}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onMouseLeave={rerollPeek}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      <div ref={peekRef} className={styles.imageWrap} style={peekStyle}>
        {showImage ? (
          <ProgressiveImage
            src={coverSrc}
            alt={post.title}
            fill
            sizes={isFeatured ? "(max-width: 768px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className={styles.image}
            loading={isFeatured ? "eager" : "lazy"}
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.placeholder}>
            {/* 배경 레이어 — hover 시 이 레이어만 scale, 텍스트는 정적 */}
            <div
              className={styles.placeholderBg}
              style={{ background: getFallbackCoverGradient(post.slug || post.id) }}
            />
            {/* placeholderInner = 상단 badges + 하단 텍스트 그룹 (space-between) */}
            <div className={styles.placeholderInner}>
              {/* 페이지 이모지만 여기. hot · pinned 는 커버 카드와 같은 좌상단 자리(imageBadgesLeft)에 — 따로 두면 우상단 언어 칩과 높이가 어긋났다 */}
              {icon && (
                <div className={`${styles.placeholderBadges} ${isHot || post.is_pinned ? styles.placeholderBadgesBelow : ""}`}>
                  <span className={styles.placeholderIcon}><EmojiIcon value={icon} size={24} /></span>
                </div>
              )}
              <div className={styles.placeholderText}>
                {/* 카테고리는 placeholder 썸네일에 넣지 않음 — 아래 body 의 날짜 줄(dateLine)에 항상 표시 */}
                <h2 className={styles.placeholderTitle}><HighlightedText text={displayTitle} /></h2>
                {displayExcerpt && (
                  <p className={styles.placeholderExcerpt}><HighlightedText text={displayExcerpt} /></p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* hot·pinned — 커버 · 그러데이션 판 무관 좌상단에 나란히(가로) 고정. 우상단 언어 칩과 같은 모서리 여백 · 같은 줄 */}
        {(isHot || post.is_pinned) && (
          <div className={styles.imageBadgesLeft}>
            {isHot && (
              <HotBadge />
            )}
            {post.is_pinned && (
              <Badge variant="overlay" uppercase icon={<Pin size={10} />} className={styles.pinnedOverlay}>Pinned</Badge>
            )}
          </div>
        )}
        {/* lang — 커버/placeholder 무관 imageWrap 우상단 고정 (hot·pinned 유무 상관없이) */}
        {langBadge && (
          <Badge variant="overlay" uppercase className={styles.langOverlay}><T k={`postDetail.${langBadge}`} /></Badge>
        )}
        {/* 페이지 이모지 — 커버 좌하단에 겹쳐(Notion·디테일 페이지와 동일 감성) */}
        {showImage && icon && (
          <span className={styles.cardIcon}><EmojiIcon value={icon} size={30} /></span>
        )}
      </div>

      <div className={styles.body}>
        {/* 날짜 줄 — 블로그처럼 언제 쓴 글인지를 제목보다 먼저. 카테고리는 같은 줄 오른쪽(cover/placeholder 무관) */}
        <div className={styles.dateLine}>
          <time dateTime={post.created_at} className={styles.dateLineDate}>{date}</time>
          <span aria-hidden>&middot;</span>
          <span>{readTime} {t("postDetail.minRead")}</span>
          {category && <span className={styles.dateLineCat}><CategoryLabel category={category} /></span>}
        </div>

        {/* 제목 — 커버 카드는 항상 body. list · series 레이아웃 placeholder 도 body 로(작은 썸네일에 제목/칩 겹침 방지) */}
        {(showImage || layout === "list" || layout === "series") && (
          <h2 className={styles.title}><HighlightedText text={displayTitle} /></h2>
        )}

        {/* excerpt — 항상 렌더. placeholder 카드는 기본적으로 CSS 가 숨기지만 작은 화면에선 여기로 노출 */}
        <p className={styles.excerpt}><HighlightedText text={displayExcerpt} /></p>

        {post.tags && post.tags.length > 0 && (
          <div ref={tagsRef} className={`${styles.tagsRow} ${tagsExpanded ? styles.tagsRowExpanded : ""}`}>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={blogHref(`/posts/tags/${encodeURIComponent(tag)}`)}
                className={styles.tagPill}
                onClick={(e) => e.stopPropagation()}
              >
                #<SiteText text={tag} />
              </Link>
            ))}
            {(tagsOverflow || tagsExpanded) && (
              <Pressable
                className={styles.tagsToggle}
                onClick={(e) => { e.stopPropagation(); setTagsExpanded((v) => !v); }}
                aria-label={tagsExpanded ? t("postsPage.tagsCollapse") : t("postsPage.tagsExpand")}
              >
                {tagsExpanded ? "<" : ">"}
              </Pressable>
            )}
          </div>
        )}

        <div ref={metaRef} className={styles.meta} data-meta-wrapped={metaWrapped || undefined}>
          {author && <span className={styles.metaGroup}><PostCardAuthor author={author} /></span>}
          <span className={styles.metaGroup}>
            <span className={styles.metaItem}>
              <Eye size={11} strokeWidth={1.75} />
              {post.view_count ?? 0} {t("postDetail.views")}
            </span>
            <span className={styles.dot}>&middot;</span>
            <span className={styles.metaItem}>
              <Heart size={11} strokeWidth={1.75} />
              {post.like_count ?? 0} {t("postDetail.likes")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const PEEK_POSES = ["happy-front", "normal-front", "surprised-front", "heart-front", "wave-front", "sleep-front"];

/** 0 … 1 사이 씨앗 — 같은 글이면 서버 · 브라우저가 같은 값 */
function seedOf(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/** 빼꼼 몽이의 자리 — 위 · 아래 가장자리, 가로 위치, 표정, 기울기를 CSS 변수로 */
function peekVars(seed: number): Record<string, string> {
  const pick = (n: number, k: number) => Math.floor(((seed * 9301 * (k + 1) + 49297 * k) % 1) * n);
  const fromTop = pick(3, 1) === 0; // 셋 중 하나는 위에서 거꾸로
  return {
    "--peek-x": `${8 + pick(70, 2)}%`,
    "--peek-img": `url("/images/mascot/bunny-${PEEK_POSES[pick(PEEK_POSES.length, 3)]}.png")`,
    "--peek-tilt": `${pick(25, 4) - 12}deg`,
    "--peek-flip": fromTop ? "180deg" : "0deg",
    "--peek-top": fromTop ? "0%" : "auto",
    "--peek-bottom": fromTop ? "auto" : "0%",
  };
}
