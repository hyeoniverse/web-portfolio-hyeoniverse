"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import { PinIcon } from "@/components/icons";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import type { Post } from "@/types/post";
import { usePostCard } from "./usePostCard";
import PostCardAuthor from "./PostCardAuthor";
import { HotBadge, LangChip, StatItem } from "./PostCardChips";
// .card 는 네 변형이 공유하는 카드 base — PostCard.module.css 에 있다.
import base from "./PostCard.module.css";
import styles from "./PostCardCompact.module.css";
import PostCardLink from "./PostCardLink";

/* Compact 레이아웃: 이미지 없이 텍스트 행 (초고밀도 목록) */
export default function PostCardCompact({
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
    t, cardRef, date, readTime, showImage, category, author, langBadge,
    displayTitle, icon, cardLink, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });
  const chipClass = styles.compactChip;
  const hotClass = `${styles.compactChip} ${styles.compactHotBadge}`;

  return (
    <div
      ref={cardRef}
      className={`${base.card} ${styles.compactCard}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      {/* 데스크톱: lead(pin·카테고리·썸네일·제목·hot·lang) 한 줄 + meta. 모바일선 media query 로
          2줄 분해 (1줄: 썸네일·제목·meta / 2줄: 카테고리·hot·lang). DOM 은 desktop 기준 유지. */}
      <div className={styles.compactLead}>
        <span className={styles.compactPin} aria-label={post.is_pinned ? "Pinned" : undefined}>
          {post.is_pinned && (
            /* lucide Pin 기반 + 바늘(line) 더 길게 (viewBox 세로 확장으로 안 잘리게) */
            <PinIcon height={15} />
          )}
        </span>
        {category && <span className={styles.compactCat}><CategoryLabel category={category} /></span>}
        <span className={styles.compactThumb}>
          {icon ? <EmojiIcon value={icon} size={18} /> : showImage ? (
            <ProgressiveImage src={post.cover_image} alt="" fill sizes="24px" className={styles.compactThumbImg} onError={() => onImgError?.(post.id)} />
          ) : null}
        </span>
        <h2 className={styles.compactTitle}><HighlightedText text={displayTitle} /></h2>
        <span className={styles.compactHotSlot}>
          {isHot && <HotBadge size={15} className={hotClass} />}
        </span>
        <span className={styles.compactLangSlot}>
          {langBadge && <LangChip badge={langBadge} className={chipClass} />}
        </span>
      </div>
      <div className={styles.compactMeta}>
        <PostCardAuthor author={author} />
        <span className={styles.compactDate}>{date}</span>
        <span className={styles.compactRead}>{readTime} {t("postDetail.minRead")}</span>
        <StatItem kind="views" value={post.view_count ?? 0} className={styles.compactMetaStat} />
        <StatItem kind="likes" value={post.like_count ?? 0} className={styles.compactMetaStat} />
      </div>
      {/* 모바일 전용 2번째 줄 — grid 2×2 (col1: 카테고리·hot·lang / col2: 조회·좋아요, 1줄 날짜와 같은 열).
          데스크톱은 둘 다 display:none. */}
      <div className={styles.compactChipsMobile}>
        {category && <span className={styles.compactCat}><CategoryLabel category={category} /></span>}
        {isHot && <HotBadge size={15} className={hotClass} />}
        {langBadge && <LangChip badge={langBadge} className={chipClass} />}
      </div>
      <div className={styles.compactStatsMobile}>
        <StatItem kind="views" value={post.view_count ?? 0} />
        <StatItem kind="likes" value={post.like_count ?? 0} />
      </div>
    </div>
  );
}
