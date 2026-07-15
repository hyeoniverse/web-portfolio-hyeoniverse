"use client";

import { useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import type { Post } from "@/types/post";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import { formatCount } from "@/utils/format";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import T from "@/components/ui/T";
import { Flame, Pin, Eye, Heart } from "lucide-react";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  variant?: "featured" | "standard" | "hero";
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

export default function PostCard({
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
}: PostCardProps) {
  const { language, t } = useLanguage();
  const date = new Date(post.created_at).toLocaleDateString(
    language === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));
  const isFeatured = variant === "featured";
  const isHero = variant === "hero";
  const showImage = post.cover_image && !imgError;
  const { navigateWithTransition } = usePageTransition();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
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
  const category = post.category || null;
  const prefetchedRef = useRef(false);
  /* hover 시 다음 페이지 chunk 를 미리 로딩 — 클릭 후 navigate 가 즉시 mount 되도록.
   * dev 모드에선 prefetch 가 compile 미완료된 route 를 건드려 "Failed to fetch RSC payload"
   * 후 hard reload fallback 을 유발하는 케이스가 있어 production 에서만 작동. */
  const handlePrefetch = () => {
    if (prefetchedRef.current) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current = true;
    router.prefetch(`/posts/${post.slug}`);
  };

  // 언어 단독 여부 판단 — 없는 언어는 있는 쪽으로 강제
  const hasKo = !!post.content;
  const hasEn = !!post.content_en;
  const displayLang: "ko" | "en" =
    !hasEn ? "ko" : !hasKo ? "en" : language;
  const langBadge: "koOnly" | "enOnly" | null =
    !hasEn ? "koOnly" : !hasKo ? "enOnly" : null;

  const displayTitle = formatPostTitle(post, displayLang);
  const displayExcerpt = getPostExcerpt(post, displayLang);
  const icon = post.icon;

  const cardClass = [
    styles.card,
    !showImage && styles.placeholderCard,
    isFeatured && styles.featured,
    isHero && styles.hero,
    compact && styles.compact,
    banner && styles.banner,
    square && styles.square,
    portrait && styles.portrait,
  ].filter(Boolean).join(" ");

  const handleClick = () => {
    const el = cardRef.current;
    if (!el) return;
    const img = post.cover_image || "";
    const rect = el.getBoundingClientRect();
    navigateWithTransition(`/posts/${post.slug}`, img, rect);
  };

  /* ── Timeline 레이아웃: 블로그식 히스토리 — 축 점 왼쪽에 날짜, 오른쪽에 제목·발췌·메타 ── */
  if (layout === "timeline") {
    const d = new Date(post.created_at);
    const TL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const eyebrowDate = `${TL_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
    return (
      <div
        ref={cardRef}
        className={`${styles.card} ${styles.timelineCard}`}
        onClick={handleClick}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        role="link"
        data-more="true"
        data-clickable="true"
      >
        {/* eyebrow — 날짜(accent) · 카테고리 · pinned · hot */}
        <div className={styles.timelineEyebrow}>
          <time className={styles.timelineDate} dateTime={post.created_at}>{eyebrowDate}</time>
          {category && (
            <>
              <span className={styles.timelineEyebrowSep} aria-hidden />
              <span className={styles.timelineCat}><CategoryLabel category={category} /></span>
            </>
          )}
          {langBadge && (
            <>
              <span className={styles.timelineEyebrowSep} aria-hidden />
              <span className={styles.compactLang}><T k={`postDetail.${langBadge}`} /></span>
            </>
          )}
          {isHot && (
            <span className={styles.hotBadge}><Flame size={11} fill="currentColor" stroke="none" />HOT</span>
          )}
        </div>
        <h3 className={styles.timelineTitle}>
          {post.is_pinned && (
            <span className={styles.timelinePinInline} aria-label="Pinned">
              {/* lucide Pin 기반 — 바늘 길게, CSS 로 기울임. 제목 텍스트에 인라인(글자처럼) */}
              <svg viewBox="0 0 24 34" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                <line x1="12" x2="12" y1="17" y2="32" />
              </svg>
            </span>
          )}
          <HighlightedText text={displayTitle} />
        </h3>
        {/* 반대편 빈 공간 프리뷰 — 데스크톱은 hover 시 썸네일+desc, 모바일은 인라인 상시 표시 */}
        {(displayExcerpt || showImage || icon) && (
          <div className={styles.timelinePreview}>
            {(showImage || icon) && (
              <div className={`${styles.timelinePreviewThumb} ${icon ? styles.timelinePreviewThumbEmoji : ""}`}>
                {icon ? <EmojiIcon value={icon} size={34} /> : (
                  <ProgressiveImage src={post.cover_image} alt="" fill sizes="140px" className={styles.timelinePreviewThumbImg} onError={() => onImgError?.(post.id)} />
                )}
              </div>
            )}
            {displayExcerpt && <p className={styles.timelinePreviewExcerpt}><HighlightedText text={displayExcerpt} /></p>}
          </div>
        )}
        <div className={styles.timelineMeta}>
          <span>{readTime} {t("postDetail.minRead")}</span>
          <span className={styles.timelineSep} aria-hidden>·</span>
          <span className={styles.compactStat}><Eye size={11} strokeWidth={1.75} />{formatCount(post.view_count ?? 0)}</span>
          <span className={styles.compactStat}><Heart size={11} strokeWidth={1.75} />{formatCount(post.like_count ?? 0)}</span>
        </div>
      </div>
    );
  }

  /* ── Compact 레이아웃: 이미지 없이 텍스트 행 (초고밀도 목록) ── */
  if (layout === "compact") {
    return (
      <div
        ref={cardRef}
        className={`${styles.card} ${styles.compactCard}`}
        onClick={handleClick}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        role="link"
        data-more="true"
        data-clickable="true"
      >
        {/* 데스크톱: lead(pin·카테고리·썸네일·제목·hot·lang) 한 줄 + meta. 모바일선 media query 로
            2줄 분해 (1줄: 썸네일·제목·meta / 2줄: 카테고리·hot·lang). DOM 은 desktop 기준 유지. */}
        <div className={styles.compactLead}>
          <span className={styles.compactPin} aria-label={post.is_pinned ? "Pinned" : undefined}>
            {post.is_pinned && (
              /* lucide Pin 기반 + 바늘(line) 더 길게 (viewBox 세로 확장으로 안 잘리게) */
              <svg width="13" height="15" viewBox="0 0 24 28" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                <line x1="12" x2="12" y1="17" y2="26" />
              </svg>
            )}
          </span>
          {category && <span className={styles.compactCat}><CategoryLabel category={category} /></span>}
          <span className={styles.compactThumb}>
            {icon ? <EmojiIcon value={icon} size={18} /> : showImage ? (
              <ProgressiveImage src={post.cover_image} alt="" fill sizes="24px" className={styles.compactThumbImg} onError={() => onImgError?.(post.id)} />
            ) : null}
          </span>
          <h3 className={styles.compactTitle}><HighlightedText text={displayTitle} /></h3>
          <span className={styles.compactHotSlot}>
            {isHot && <span className={styles.hotBadge}><Flame size={15} fill="currentColor" stroke="none" />HOT</span>}
          </span>
          <span className={styles.compactLangSlot}>
            {langBadge && <span className={styles.compactLang}><T k={`postDetail.${langBadge}`} /></span>}
          </span>
        </div>
        <div className={styles.compactMeta}>
          <span className={styles.compactDate}>{date}</span>
          <span className={styles.compactRead}>{readTime} {t("postDetail.minRead")}</span>
          <span className={styles.compactStat}><Eye size={11} strokeWidth={1.75} />{formatCount(post.view_count ?? 0)}</span>
          <span className={styles.compactStat}><Heart size={11} strokeWidth={1.75} />{formatCount(post.like_count ?? 0)}</span>
        </div>
        {/* 모바일 전용 2번째 줄 — grid 2×2 (col1: 카테고리·hot·lang / col2: 조회·좋아요, 1줄 날짜와 같은 열).
            데스크톱은 둘 다 display:none. */}
        <div className={styles.compactChipsMobile}>
          {category && <span className={styles.compactCat}><CategoryLabel category={category} /></span>}
          {isHot && <span className={styles.hotBadge}><Flame size={15} fill="currentColor" stroke="none" />HOT</span>}
          {langBadge && <span className={styles.compactLang}><T k={`postDetail.${langBadge}`} /></span>}
        </div>
        <div className={styles.compactStatsMobile}>
          <span className={styles.compactStat}><Eye size={11} strokeWidth={1.75} />{formatCount(post.view_count ?? 0)}</span>
          <span className={styles.compactStat}><Heart size={11} strokeWidth={1.75} />{formatCount(post.like_count ?? 0)}</span>
        </div>
      </div>
    );
  }

  /* ── Hero variant: 풀 블리드 이미지 + 하단 오버레이 ── */
  if (isHero) {
    return (
      <div ref={cardRef} className={cardClass} onClick={handleClick} onMouseEnter={handlePrefetch} onFocus={handlePrefetch} role="link" data-more="true" data-clickable="true">
        {/* 풀 배경 이미지 */}
        {showImage ? (
          <ProgressiveImage
            src={post.cover_image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            className={`${styles.image} ${styles.heroBgImg}`}
            priority
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div
            className={styles.heroPlaceholder}
            style={{ background: getFallbackCoverGradient(post.slug || post.id) }}
          />
        )}

        {/* 하단 그라데이션 */}
        <div className={styles.heroOverlay} />

        {/* HOT 뱃지 */}
        {isHot && (
          <span className={styles.hotBadge}>
            <Flame size={10} fill="currentColor" stroke="none" />
            HOT
          </span>
        )}

        {/* 하단 콘텐츠 */}
        <div className={styles.heroContent}>
          {icon && (
            <span className={`${styles.cardIcon} ${styles.cardIconInline}`}><EmojiIcon value={icon} size={34} /></span>
          )}
          <div className={styles.badgeRow}>
            {category && (
              <span className={styles.heroBadge}><CategoryLabel category={category} /></span>
            )}
            {langBadge && (
              <span className={styles.heroLangHint}><T k={`postDetail.${langBadge}`} /></span>
            )}
          </div>
          <h2 className={styles.heroTitle}><HighlightedText text={displayTitle} /></h2>
          {displayExcerpt && <p className={styles.heroExcerpt}><HighlightedText text={displayExcerpt} /></p>}
          <div className={styles.heroMeta}>
            <span className={styles.metaGroup}>
              <span>{date}</span>
              <span className={styles.heroDot}>&middot;</span>
              <span>{readTime} {t("postDetail.minRead")}</span>
            </span>
            <span className={styles.metaGroup}>
              <span className={styles.metaItem}>
                <Eye size={11} strokeWidth={1.75} />
                {formatCount(post.view_count ?? 0)} {t("postDetail.views")}
              </span>
              <span className={styles.heroDot}>&middot;</span>
              <span className={styles.metaItem}>
                <Heart size={11} strokeWidth={1.75} />
                {formatCount(post.like_count ?? 0)} {t("postDetail.likes")}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Standard / Featured ── */
  return (
    <div
      ref={cardRef}
      className={cardClass}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      role="link"
      data-more="true"
      data-clickable="true"
    >
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
                    <span className={styles.hotBadge}>
                      <Flame size={10} fill="currentColor" stroke="none" />
                      HOT
                    </span>
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
              <span className={styles.hotBadge}>
                <Flame size={10} fill="currentColor" stroke="none" />
                HOT
              </span>
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
              <button
                type="button"
                className={styles.tagsToggle}
                onClick={(e) => { e.stopPropagation(); setTagsExpanded((v) => !v); }}
                aria-label={tagsExpanded ? "접기" : "더보기"}
              >
                {tagsExpanded ? "<" : ">"}
              </button>
            )}
          </div>
        )}

        <div ref={metaRef} className={styles.meta} data-meta-wrapped={metaWrapped || undefined}>
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
