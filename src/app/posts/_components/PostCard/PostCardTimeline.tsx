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
// .card 는 네 변형이 공유하는 카드 base — PostCard.module.css 에 있다(hero·standard 가 분리되면 그 파일이 base 만 남는다).
import base from "./PostCard.module.css";
import styles from "./PostCardTimeline.module.css";

const TL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/* Timeline 레이아웃: 블로그식 히스토리 — 축 점 왼쪽에 날짜, 오른쪽에 제목·발췌·메타 */
export default function PostCardTimeline({
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
    t, cardRef, readTime, showImage, category, author, langBadge,
    displayTitle, displayExcerpt, icon, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });
  const d = new Date(post.created_at);
  const eyebrowDate = `${TL_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;

  return (
    <div
      ref={cardRef}
      className={`${base.card} ${styles.timelineCard}`}
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
            <LangChip badge={langBadge} />
          </>
        )}
        {isHot && <HotBadge size={11} className={styles.timelineHotBadge} />}
      </div>
      <h2 className={styles.timelineTitle}>
        {post.is_pinned && (
          <span className={styles.timelinePinInline} role="img" aria-label="고정된 글">
            {/* lucide Pin 기반 — 바늘 길게, CSS 로 기울임. 제목 텍스트에 인라인(글자처럼) */}
            <PinIcon />
          </span>
        )}
        <HighlightedText text={displayTitle} />
      </h2>
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
        <PostCardAuthor author={author} />
        {author && <span className={styles.timelineSep} aria-hidden>·</span>}
        <span>{readTime} {t("postDetail.minRead")}</span>
        <span className={styles.timelineSep} aria-hidden>·</span>
        <StatItem kind="views" value={post.view_count ?? 0} className={styles.timelineStat} />
        <StatItem kind="likes" value={post.like_count ?? 0} className={styles.timelineStat} />
      </div>
    </div>
  );
}
