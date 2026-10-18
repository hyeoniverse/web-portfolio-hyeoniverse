"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import { PinIcon } from "@/components/icons";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
import type { Post } from "@/types/post";
import { usePostCard } from "./usePostCard";
import { HotBadge, LangChip, StatItem } from "./PostCardChips";
// .card 는 변형들이 공유하는 카드 base(글 링크 덮개 기준) — PostCard.module.css 에 있다.
import base from "./PostCard.module.css";
import styles from "./PostCardJournal.module.css";
import PostCardLink from "./PostCardLink";

/* Journal 레이아웃: 개발 블로그식 카드 — 고른 크기의 낮은(2:1) 커버 아래에 [날짜 · 읽기 시간] 을 먼저 크게 두고,
   제목 · 요약 3줄 · 태그 · 숫자 순. 커버가 없으면 slug 로 정한 그라디언트 면에 이모지/카테고리를 얹는다. */
export default function PostCardJournal({
  post,
  isHot,
  onImgError,
  imgError,
}: {
  post: Post;
  isHot?: boolean;
  onImgError?: (id: string) => void;
  imgError?: boolean;
}) {
  const {
    t, cardRef, date, readTime, showImage, category, langBadge,
    displayTitle, displayExcerpt, icon, cardLink, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });

  return (
    <article
      ref={cardRef}
      className={`${base.card} ${styles.journalCard}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      <div className={styles.cover}>
        {showImage ? (
          <ProgressiveImage
            src={post.cover_image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className={styles.coverImg}
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.coverFallback} style={{ background: getFallbackCoverGradient(post.slug || post.id) }}>
            {icon ? <EmojiIcon value={icon} size={32} /> : category && <CategoryLabel category={category} />}
          </div>
        )}
        <span className={styles.badges}>
          {post.is_pinned && <span className={styles.pin} aria-label="Pinned"><PinIcon height={13} /></span>}
          {isHot && <HotBadge size={11} />}
          {langBadge && <span className={styles.chipBg}><LangChip badge={langBadge} /></span>}
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.dateLine}>
          <time dateTime={post.created_at} className={styles.date}>{date}</time>
          <span aria-hidden>·</span>
          <span>{readTime} {t("postDetail.minRead")}</span>
          {category && <span className={styles.cat}><CategoryLabel category={category} /></span>}
        </div>
        <h2 className={styles.title}>
          {showImage && icon && <span className={styles.icon}><EmojiIcon value={icon} size={20} /></span>}
          <HighlightedText text={displayTitle} />
        </h2>
        {displayExcerpt && <p className={styles.excerpt}><HighlightedText text={displayExcerpt} /></p>}
        <div className={styles.foot}>
          {post.tags.length > 0 && (
            <span className={styles.tags}>
              {post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
            </span>
          )}
          <span className={styles.stats}>
            <StatItem kind="views" value={post.view_count ?? 0} />
            <StatItem kind="likes" value={post.like_count ?? 0} />
          </span>
        </div>
      </div>
    </article>
  );
}
