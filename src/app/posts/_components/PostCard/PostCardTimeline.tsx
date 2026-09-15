"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import CategoryLabel from "@/components/ui/CategoryLabel";
import HighlightedText from "@/components/ui/HighlightedText";
import { PinIcon } from "@/components/icons";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import type { Post } from "@/types/post";
import { siteDateParts, MONTHS_SHORT_EN } from "@/utils/siteDate";
import { usePostCard } from "./usePostCard";
import PostCardAuthor from "./PostCardAuthor";
import PostCardLink from "./PostCardLink";
import { HotBadge, LangChip, StatItem } from "./PostCardChips";
// .card 는 네 변형이 공유하는 카드 base — PostCard.module.css 에 있다(hero·standard 가 분리되면 그 파일이 base 만 남는다).
import base from "./PostCard.module.css";
import styles from "./PostCardTimeline.module.css";

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
    t, language, cardRef, readTime, showImage, category, author, langBadge,
    displayTitle, displayExcerpt, icon, cardLink, handleClick, handlePrefetch,
  } = usePostCard({ post, imgError });
  // 한국 시간 기준 — 서버가 미리 그린 날짜와 같아야 한다(siteDate).
  // KO 는 한자(2026年 09月 09日), EN 은 영어(SEP 09, 2026) — 사이드바(TimelineIndex)와 언어별로 통일.
  const d = siteDateParts(post.created_at);
  const dd = d ? String(d.day).padStart(2, "0") : "";
  const mm = d ? String(d.month + 1).padStart(2, "0") : "";

  return (
    <div
      ref={cardRef}
      className={`${base.card} ${styles.timelineCard}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      data-more="true"
      data-clickable="true"
    >
      <PostCardLink {...cardLink} />
      {/* eyebrow — 날짜(accent) · 카테고리 · pinned · hot */}
      <div className={styles.timelineEyebrow}>
        <time className={styles.timelineDate} dateTime={post.created_at}>
          {d && (language === "ko" ? (
            <>
              {d.year}<span className={styles.timelineDateUnit}>年</span>{" "}
              {mm}<span className={styles.timelineDateUnit}>月</span>{" "}
              {dd}<span className={styles.timelineDateUnit}>日</span>
            </>
          ) : (
            `${MONTHS_SHORT_EN[d.month]} ${dd}, ${d.year}`
          ))}
        </time>
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
          <span className={styles.timelinePinInline} role="img" aria-label={t("postsPage.pinnedPost")}>
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
