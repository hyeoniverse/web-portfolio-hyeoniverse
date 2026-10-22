"use client";

import { blogHref } from "@/lib/siteHosts";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { resolvePostAuthors } from "@/utils/resolvePostAuthors";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import { SITE_TIME_ZONE } from "@/constants";
import type { Post } from "@/types/post";
import { useListTranslation } from "@/hooks/useListTranslation";
import { postListCoverOf } from "@/lib/postCover";

/* 카드 변형 넷이 공통으로 쓰는 값과 동작 — 표시 언어 판정 · 제목/발췌 · 날짜 · 읽기 시간 · 카테고리 · 작성자,
   그리고 카드 클릭(페이지 트랜지션)과 hover prefetch. 변형 컴포넌트가 각자 부른다. */
export function usePostCard({ post, imgError }: { post: Post; imgError?: boolean }) {
  const { language, t, foreignLang, dateLocale } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const router = useRouter();
  const siteConf = useSiteConfig();
  const cardRef = useRef<HTMLDivElement>(null);

  // 한국 시간 기준 — 실행 환경의 시간대를 따르면 서버(UTC)가 미리 그린 날짜와 브라우저의 날짜가 갈린다
  const date = new Date(post.created_at).toLocaleDateString(
    dateLocale,
    { year: "numeric", month: "short", day: "numeric", timeZone: SITE_TIME_ZONE },
  );
  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));
  /* 커버 없는 글을 무엇으로 채울지는 설정(posts.coverFallback) — 기본은 그러데이션 판(showImage 가 거짓), og 면 제목 카드 */
  const coverSrc = postListCoverOf(post, siteConf?.posts?.coverFallback);
  const showImage = !!coverSrc && !imgError;
  const category = post.category || null;
  // 작성자 — author_ids 를 site.config authors 로 해석. 미할당이면 소유자로 돌아간다.
  const author = resolvePostAuthors(siteConf?.authors, post.author_ids)[0] ?? null;

  // 언어 단독 여부 판단 — 없는 언어는 있는 쪽으로 강제
  const hasKo = !!post.content;
  const hasEn = !!post.content_en;
  const displayLang: "ko" | "en" =
    !hasEn ? "ko" : !hasKo ? "en" : language;
  const langBadge: "koOnly" | "enOnly" | null =
    !hasEn ? "koOnly" : !hasKo ? "enOnly" : null;

  const prefetchedRef = useRef(false);
  /* hover 시 다음 페이지 chunk 를 미리 로딩 — 클릭 후 navigate 가 즉시 mount 되도록.
   * dev 모드에선 prefetch 가 compile 미완료된 route 를 건드려 "Failed to fetch RSC payload"
   * 후 hard reload fallback 을 유발하는 케이스가 있어 production 에서만 작동. */
  const handlePrefetch = () => {
    if (prefetchedRef.current) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current = true;
    router.prefetch(blogHref(`/posts/${post.slug}`));
  };

  const href = blogHref(`/posts/${post.slug}`);
  const coverImage = coverSrc;
  /* 사이트가 다른 언어(ko · en 밖)로 걸려 있으면 제목 · 요약을 그 번역으로 — 같은 화면의 카드들은 한 요청으로 모인다.
     시리즈 접두("시리즈 #n - ")의 시리즈 이름은 원문 그대로 */
  const tr = useListTranslation("post", post.id);
  const displayTitle = formatPostTitle(tr?.title ? { ...post, title: tr.title, title_en: tr.title } : post, displayLang);
  /* 카드의 클릭 처리 — 글 링크가 덮지 않는 부분(카드 밖으로 나온 타임라인 미리보기)용 */
  const handleClick = () => {
    const el = cardRef.current;
    if (!el) return;
    navigateWithTransition(href, coverImage, el.getBoundingClientRect());
  };
  /** 카드를 덮는 글 링크(PostCardLink)에 넘길 값 — 연출은 링크가 아니라 카드 영역에서 커진다 */
  const cardLink = {
    href,
    title: displayTitle,
    image: coverImage,
    getRect: (link: HTMLAnchorElement) => (cardRef.current ?? link).getBoundingClientRect(),
  };

  return {
    coverSrc,
    foreignLang,
    dateLocale,
    t,
    language,
    cardRef,
    date,
    readTime,
    showImage,
    category,
    author,
    langBadge,
    displayTitle,
    displayExcerpt: tr?.excerpt || getPostExcerpt(post, displayLang),
    icon: post.icon,
    cardLink,
    handleClick,
    handlePrefetch,
  };
}
