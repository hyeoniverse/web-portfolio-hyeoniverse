"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import MediaThumb from "@/components/ui/MediaThumb";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
import { LangChip } from "../../_components/PostCard/PostCardChips";
import { usePostCard } from "../../_components/PostCard/usePostCard";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillCount } from "@/utils/format";
import type { Post } from "@/types/post";
import type { SeriesPageData } from "@/lib/posts";
import styles from "./SeriesDetail.module.css";

/* 시리즈 상세의 한 편(에피소드) 행 — 순번 · 썸네일 · 카테고리 · 제목 · 발췌 · 날짜/읽는 시간.
   포맷(날짜·읽는 시간·표시 언어·발췌)은 카드 공통 훅을 재사용한다. */
function SeriesEpisodeRow({ post, index }: { post: Post; index: number }) {
  const { t, date, readTime, showImage, category, langBadge, displayTitle, displayExcerpt, icon, handlePrefetch } =
    usePostCard({ post });
  return (
    <li className={styles.episode}>
      <span className={styles.epNum} aria-hidden>{String(index).padStart(2, "0")}</span>
      <Link
        href={`/posts/${post.slug}`}
        className={styles.epLink}
        data-clickable="true"
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
      >
        <span className={styles.epThumb}>
          {showImage ? (
            <MediaThumb src={post.cover_image} fill sizes="(max-width: 640px) 96px, 160px" className={styles.epThumbImg} />
          ) : (
            <span className={styles.epThumbFallback} style={{ background: getFallbackCoverGradient(post.slug || post.id) }}>
              {icon && <EmojiIcon value={icon} size={26} />}
            </span>
          )}
        </span>
        <span className={styles.epBody}>
          {category && <span className={styles.epCat}><CategoryLabel category={category} /></span>}
          <span className={styles.epTitle}>{displayTitle}</span>
          {displayExcerpt && <span className={styles.epExcerpt}>{displayExcerpt}</span>}
          <span className={styles.epMeta}>
            <span>{date}</span>
            <span className={styles.epSep} aria-hidden>·</span>
            <span>{readTime} {t("postDetail.minRead")}</span>
            {langBadge && <LangChip badge={langBadge} className={styles.epLang} />}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* /posts/series/[slug] — 시리즈 전용 상세. 표지·설명·개수를 헤더로 두고 소속 글을 연재 순서(series_order)대로
   보여준다. (목록 필터 /posts?series= 와 달리 순서가 유지된다) */
export default function SeriesDetailClient({ data }: { data: SeriesPageData }) {
  const { series, posts } = data;
  const { language, t } = useLanguage();
  const { setInfinite } = useLenis();

  // 이 페이지는 자연스러운 끝(목록)이 있어 무한스크롤 끔 (태그 상세와 동일)
  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  if (!series) return null;

  const title = language === "en" ? (series.title_en || series.title) : series.title;
  const description = language === "en" ? (series.description_en || series.description) : series.description;
  const cover = series.cover_image || series.auto_cover_url || "";

  return (
    <div className={styles.container}>
      <Link href="/posts/series" className={styles.back} data-clickable="true">
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden />
        <span>{language === "ko" ? "시리즈 목록" : "Series"}</span>
      </Link>

      <header className={styles.hero}>
        {cover && (
          <div className={styles.heroCover}>
            <MediaThumb src={cover} fill sizes="(max-width: 768px) 100vw, 480px" className={styles.heroCoverImg} />
          </div>
        )}
        <div className={styles.heroText}>
          {series.category && <span className={styles.eyebrow}>{series.category}</span>}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
          <p className={styles.meta}>{fillCount(t, "postsPage.countPosts", posts.length)}</p>
        </div>
      </header>

      {posts.length > 0 ? (
        <ol className={styles.postList}>
          {posts.map((p, i) => (
            <SeriesEpisodeRow key={p.id} post={p} index={i + 1} />
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>{language === "ko" ? "아직 이 시리즈에 글이 없습니다." : "No posts in this series yet."}</p>
      )}
    </div>
  );
}
