"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import { PinIcon } from "@/components/icons";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import type { Post } from "@/types/post";
import { usePostCard } from "./usePostCard";
import { HotBadge, LangChip, StatItem } from "./PostCardChips";
// .card 는 변형들이 공유하는 카드 base(글 링크 덮개 기준) — PostCard.module.css 에 있다.
import base from "./PostCard.module.css";
import styles from "./PostCardBlog.module.css";
import PostCardLink from "./PostCardLink";

/* Blog 레이아웃: 개발 블로그식 글 행 — [카테고리·날짜 / 제목 / 요약 2줄 / 태그] 텍스트가 주인공이고,
   커버는 오른쪽 작은 썸네일로만 곁들인다(없으면 텍스트만). */
export default function PostCardBlog({
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
    t, cardRef, date, readTime, showImage, coverSrc, category, langBadge,
    displayTitle, displayExcerpt, icon, cardLink, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });

  return (
    <article
      ref={cardRef}
      className={`${base.card} ${styles.blogCard} ${showImage ? "" : styles.blogNoThumb}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      <div className={styles.blogBody}>
        <div className={styles.blogMeta}>
          {post.is_pinned && (
            <span className={styles.blogPin} aria-label="Pinned"><PinIcon height={13} /></span>
          )}
          {category && <span className={styles.blogCat}><CategoryLabel category={category} /></span>}
          <time dateTime={post.created_at}>{date}</time>
          <span className={styles.blogRead}><span aria-hidden>·</span> {readTime} {t("postDetail.minRead")}</span>
          {isHot && <HotBadge size={11} />}
          {langBadge && <LangChip badge={langBadge} />}
        </div>
        <h2 className={styles.blogTitle}>
          {icon && <span className={styles.blogIcon}><EmojiIcon value={icon} size={20} /></span>}
          <HighlightedText text={displayTitle} />
        </h2>
        {displayExcerpt && (
          <p className={styles.blogExcerpt}><HighlightedText text={displayExcerpt} /></p>
        )}
        <div className={styles.blogFoot}>
          {post.tags.length > 0 && (
            <span className={styles.blogTags}>
              {post.tags.slice(0, 4).map((tag) => (
                <span key={tag} className={styles.blogTag}>#{tag}</span>
              ))}
            </span>
          )}
          <span className={styles.blogStats}>
            <StatItem kind="views" value={post.view_count ?? 0} />
            <StatItem kind="likes" value={post.like_count ?? 0} />
          </span>
        </div>
      </div>
      {showImage && (
        <div className={styles.blogThumb}>
          <ProgressiveImage
            src={coverSrc}
            alt=""
            fill
            sizes="(max-width: 480px) 96px, 160px"
            className={styles.blogThumbImg}
            onError={() => onImgError?.(post.id)}
          />
        </div>
      )}
    </article>
  );
}
