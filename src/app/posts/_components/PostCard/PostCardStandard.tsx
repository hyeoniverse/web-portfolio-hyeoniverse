"use client";

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
import styles from "./PostCard.module.css";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import Pressable from "@/components/ui/Pressable";

export interface PostCardVariantProps {
  post: Post;
  variant?: "featured" | "standard";
  /** 시리즈 필터링 등 — 카드 높이를 축소 (이미지 16:9 + body 슬림) */
  compact?: boolean;
  /** 목록 레이아웃 (설정) — compact 는 전용 렌더, 나머지는 표준 카드 + CSS */
  layout?: "magazine" | "grid" | "list" | "compact" | "masonry" | "timeline" | "featured";
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
    t, cardRef, date, readTime, showImage, category, author, langBadge,
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

  const cardClass = [
    styles.card,
    !showImage && styles.placeholderCard,
    isFeatured && styles.featured,
    compact && styles.compact,
    banner && styles.banner,
    square && styles.square,
    portrait && styles.portrait,
  ].filter(Boolean).join(" ");

  /* ── Standard / Featured ── */
  return (
    <div
      ref={cardRef}
      className={cardClass}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      <div className={styles.imageWrap}>
        {showImage ? (
          <ProgressiveImage
            src={post.cover_image}
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
              {/* hot·pinned·icon 좌상단 (lang 은 아래에서 imageWrap 우상단 절대배치로 별도 처리) */}
              {(isHot || post.is_pinned || icon) && (
                <div className={styles.placeholderBadges}>
                  {icon && (
                    <span className={styles.placeholderIcon}><EmojiIcon value={icon} size={24} /></span>
                  )}
                  {isHot && (
                    <HotBadge />
                  )}
                  {post.is_pinned && (
                    <span className={styles.pinnedOverlay}>
                      <Pin size={10} />
                      Pinned
                    </span>
                  )}
                </div>
              )}
              <div className={styles.placeholderText}>
                {/* 카테고리는 placeholder 썸네일에 넣지 않음 — 아래 body 의 badgeRow 에 항상 표시 */}
                <h2 className={styles.placeholderTitle}><HighlightedText text={displayTitle} /></h2>
                {displayExcerpt && (
                  <p className={styles.placeholderExcerpt}><HighlightedText text={displayExcerpt} /></p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* hot·pinned — 좌상단에 나란히(가로) 고정 */}
        {showImage && (isHot || post.is_pinned) && (
          <div className={styles.imageBadgesLeft}>
            {isHot && (
              <HotBadge />
            )}
            {post.is_pinned && (
              <span className={styles.pinnedOverlay}>
                <Pin size={10} />
                Pinned
              </span>
            )}
          </div>
        )}
        {/* lang — 커버/placeholder 무관 imageWrap 우상단 고정 (hot·pinned 유무 상관없이) */}
        {langBadge && (
          <span className={styles.langOverlay}><T k={`postDetail.${langBadge}`} /></span>
        )}
        {/* 페이지 이모지 — 커버 좌하단에 겹쳐(Notion·디테일 페이지와 동일 감성) */}
        {showImage && icon && (
          <span className={styles.cardIcon}><EmojiIcon value={icon} size={30} /></span>
        )}
      </div>

      <div className={styles.body}>
        {/* category — cover/placeholder 무관 항상 body 에 표시. lang 은 이미지 위로 이동 */}
        {category && (
          <div className={styles.badgeRow}>
            <span className={styles.categoryBadge}><CategoryLabel category={category} /></span>
          </div>
        )}

        {/* 제목 — 커버 카드는 항상 body. list 레이아웃 placeholder 도 body 로(작은 썸네일에 제목/칩 겹침 방지) */}
        {(showImage || layout === "list") && (
          <h2 className={styles.title}><HighlightedText text={displayTitle} /></h2>
        )}

        {/* excerpt — 항상 렌더. placeholder 카드는 기본적으로 CSS 가 숨기지만 작은 화면에선 여기로 노출 */}
        <p className={styles.excerpt}><HighlightedText text={displayExcerpt} /></p>

        {post.tags && post.tags.length > 0 && (
          <div ref={tagsRef} className={`${styles.tagsRow} ${tagsExpanded ? styles.tagsRowExpanded : ""}`}>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/posts/tags/${encodeURIComponent(tag)}`}
                className={styles.tagPill}
                onClick={(e) => e.stopPropagation()}
              >
                #{tag}
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
            <span>{date}</span>
            <span className={styles.dot}>&middot;</span>
            <span>{readTime} {t("postDetail.minRead")}</span>
          </span>
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
