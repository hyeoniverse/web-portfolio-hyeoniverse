"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Post } from "@/types/post";
import DetailLayout from "@/components/layout/DetailLayout";
import { PostArticleHeader, PostArticleBody, PostArticleAuthors } from "@/components/posts/PostArticleView";
import { extractHeadings } from "@/utils/headingUtils";
import "katex/dist/katex.min.css";
import T from "@/components/ui/T";
import AISummary from "@/components/ui/AISummary";
import RecommendedToast from "./_components/RecommendedToast";
import RecommendedSection from "./_components/RecommendedSection";
import type { RecommendedPost } from "./_components/types";
import RelatedWorksCarousel from "./_components/RelatedWorksCarousel";
import SeriesPanel from "./_components/SeriesPanel/SeriesPanel";
import SeriesPreviewTooltip from "./_components/SeriesPanel/SeriesPreviewTooltip";
import { useSeriesPanel } from "./_components/SeriesPanel/useSeriesPanel";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLikeToggle } from "@/hooks/useLikeToggle";
import { ImageIcon, Languages } from "@/components/icons";
import styles from "./PostDetail.module.css";
import header from "@/components/posts/PostArticleHeader.module.css";
import { resolvePostAuthors } from "@/utils/resolvePostAuthors";
import Button from "@/components/ui/Button";

interface AdjacentPost {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  title_en: string;
}

interface PostDetailClientProps {
  post: Post;
}

export default function PostDetailClient({ post: initialPost }: PostDetailClientProps) {
  const { t, language } = useLanguage();
  const { navigateWithTransition, isTransitioning } = usePageTransition();
  const siteConfig = useSiteConfig();
  /* translation 활성 여부는 client context 에서 — server 의 getSecret 호출 제거됨.
   * 키 부재 시엔 client 가 호출한 API 가 error 응답 → UI 에서 "번역 실패" 표시. */
  const translationEnabled = siteConfig?.translation?.enabled !== false;

  const [post, setPost] = useState<Post>(initialPost);

  // author_ids → Author[] 해석 (site config authors). 미할당(빈 배열)이면 소유자로 돌아간다.
  const postAuthors = useMemo(
    () => resolvePostAuthors(siteConfig?.authors, post.author_ids),
    [siteConfig, post.author_ids],
  );

  const [heroImgError, setHeroImgError] = useState(false);
  const [viewLang, setViewLang] = useState<"ko" | "en">(
    !initialPost.content_en ? "ko" : !initialPost.content ? "en" : language === "en" ? "en" : "ko"
  );
  const { count: likeCount, liked, busy: likeBusy, toggle: handleLikeToggle } = useLikeToggle({
    endpoint: `/api/posts/${post.id}/like`,
  });
  // 시리즈 패널 — fetch · 펼침 · hover 미리보기 좌표 · 이전/다음. 미리보기 툴팁은 fixed 라 레이아웃 밖에서 렌더
  const series = useSeriesPanel({ postId: post.id, seriesId: post.series_id });
  const [adjacentPosts, setAdjacentPosts] = useState<{ prev: AdjacentPost | null; next: AdjacentPost | null }>({ prev: null, next: null });
  const [recommendedPosts, setRecommendedPosts] = useState<RecommendedPost[]>([]);
  const [relatedWorks, setRelatedWorks] = useState<{ id: string; slug?: string; title: string; title_en: string; subtitle_ko: string; subtitle_en: string; image: string; year: string; categories_ko?: string[]; categories_en?: string[] }[]>([]);
  const { containerRef: proseViewerRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const isAdmin = useIsAuthenticated();
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    // admin 본인 조회는 skip — 자기 글 inflate 방지 (서버측에서도 한 번 더 거름)
    if (!isAdmin) {
      fetch(`/api/posts/${post.id}/view`, { method: "POST", signal }).catch(() => {});
    }

    fetch(`/api/posts/${post.id}/adjacent`, { signal })
      .then((r) => r.json())
      .then((d) => setAdjacentPosts(d))
      .catch(() => {});

    fetch(`/api/posts/${post.id}/related`, { signal })
      .then((r) => r.json())
      .then((d) => setRecommendedPosts(d))
      .catch(() => {});

    fetch(`/api/posts/${post.id}/related-works`, { signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedWorks(d.items); })
      .catch(() => {});

    // Scroll progress → toast trigger
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollH = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollH > 0 && window.scrollY / scrollH > 0.4) {
          setShowToast(true);
          window.removeEventListener("scroll", handleScroll);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      ac.abort();
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [post.id, isAdmin]);

  const needsTranslation =
    (viewLang === "en" && !post?.content_en) ||
    (viewLang === "ko" && !post?.content);
  const displayTitle = viewLang === "en"
    ? (post?.title_en || post?.title || "")
    : (post?.title || post?.title_en || "");
  const displayContent = viewLang === "en"
    ? (post?.content_en || post?.content || "")
    : (post?.content || post?.content_en || "");
  const displayExcerpt = viewLang === "en"
    ? (post?.excerpt_en || post?.excerpt || "")
    : (post?.excerpt || post?.excerpt_en || "");

  const handleAutoTranslate = useCallback(async () => {
    if (autoTranslating) return;
    setAutoTranslating(true);
    setTranslateError(false);
    const direction = viewLang === "en" ? "ko-en" : "en-ko";
    try {
      const res = await fetch(`/api/posts/${post.id}/auto-translate?direction=${direction}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (direction === "ko-en") {
          setPost((prev) => ({ ...prev, title_en: data.title_en, content_en: data.content_en, excerpt_en: data.excerpt_en }));
        } else {
          setPost((prev) => ({ ...prev, title: data.title, content: data.content, excerpt: data.excerpt }));
        }
      } else {
        setTranslateError(true);
      }
    } catch {
      setTranslateError(true);
    } finally {
      setAutoTranslating(false);
    }
  }, [post.id, autoTranslating, viewLang]);

  const headings = useMemo(() => {
    if (!displayContent) return [];
    return extractHeadings(displayContent, post?.content_type === "markdown");
  }, [displayContent, post?.content_type]);

  const showHero = post.cover_image && !heroImgError;
  const heroErrorFallback = post.cover_image && heroImgError ? (
    <div className={styles.heroPlaceholder}>
      <ImageIcon size={48} strokeWidth={1} />
    </div>
  ) : undefined;

  return (
    <>
    <DetailLayout
      backHref="/posts"
      backLabel={t("nav.posts")}
      heroImage={showHero ? post.cover_image : undefined}
      heroAlt={displayTitle}
      heroIcon={post.icon}
      heroPosition={post.cover_position}
      heroZoom={post.cover_zoom}
      onHeroError={() => setHeroImgError(true)}
      heroFallback={heroErrorFallback}
      headings={[...headings, { id: "comments", text: t("comments.heading"), level: 1 }]}
      header={
        <motion.div
          className={header.articleHeader}
          /* 페이지 트랜지션으로 진입 시엔 morph 가 hero 만 덮고 fade out 되므로
             articleHeader 가 mount 직후 opacity 0 면 morph 사라진 자리에 빈 영역 노출 →
             skeleton 처럼 보임. 트랜지션 중이면 즉시 visible. 직접 진입은 기존 fade-in 유지. */
          initial={isTransitioning ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <PostArticleHeader
            data={{
              displayTitle,
              displayContent,
              displayExcerpt,
              contentType: post.content_type,
              tags: post.tags,
              viewCount: post.view_count,
              createdAt: post.created_at,
              githubUrl: post.github_url || undefined,
              editHref: `/admin/posts/${post.id}/edit`,
              authors: postAuthors,
            }}
            viewLang={viewLang}
            onLangChange={setViewLang}
            isAdmin={isAdmin}
          />
        </motion.div>
      }
      likeConfig={{ count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
      afterLike={<PostArticleAuthors authors={postAuthors} />}
      adjacentConfig={{
        prev: adjacentPosts.prev ? {
          href: `/posts/${adjacentPosts.prev.slug}`,
          title: viewLang === "en" && adjacentPosts.prev.title_en ? adjacentPosts.prev.title_en : adjacentPosts.prev.title,
          image: adjacentPosts.prev.cover_image,
        } : null,
        next: adjacentPosts.next ? {
          href: `/posts/${adjacentPosts.next.slug}`,
          title: viewLang === "en" && adjacentPosts.next.title_en ? adjacentPosts.next.title_en : adjacentPosts.next.title,
          image: adjacentPosts.next.cover_image,
        } : null,
        prevLabelKey: "postDetail.previous",
        nextLabelKey: "postDetail.next",
      }}
      commentsConfig={{ commentType: "post", targetId: post.id, translationEnabled }}
      backLink={{ href: "/posts", labelKey: "postDetail.backToList" }}
      recommendedContent={
        recommendedPosts.length > 0 ? (
          <RecommendedSection posts={recommendedPosts} viewLang={viewLang} />
        ) : null
      }
      relatedContent={
        <>
          <RelatedWorksCarousel works={relatedWorks} viewLang={viewLang} onNavigate={navigateWithTransition} />
        </>
      }
    >
      <SeriesPanel panel={series} postId={post.id} viewLang={viewLang} onNavigate={navigateWithTransition} />

      {needsTranslation && translationEnabled && (
        <div className={styles.translateBanner}>
          <Languages className={styles.translateIcon} size={16} />
          <p className={styles.translateMessage}>
            <T k={viewLang === "en" ? "postDetail.noTranslationEn" : "postDetail.noTranslationKo"} />
          </p>
          {translateError ? (
            <p className={styles.translateErrorMsg}>
              <T k="postDetail.translateFailed" />
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="2xs"
              onClick={handleAutoTranslate}
              disabled={autoTranslating}
            >
              {autoTranslating
                ? <T k="postDetail.translating" />
                : <T k="postDetail.autoTranslate" />}
            </Button>
          )}
        </div>
      )}

      <AISummary
        summaryKo={post.summary_ko ?? ""}
        summaryEn={post.summary_en ?? ""}
        lang={viewLang}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <PostArticleBody
          data={{
            displayTitle,
            displayContent,
            displayExcerpt,
            contentType: post.content_type,
            tags: post.tags,
            viewCount: post.view_count,
            createdAt: post.created_at,
          }}
          proseViewerRef={proseViewerRef}
        />
      </motion.div>
    </DetailLayout>

    <ImageViewer
      images={proseViewer.images}
      index={proseViewer.index}
      open={proseViewer.open}
      onClose={closeProseViewer}
      title={displayTitle}
    />

    <AnimatePresence>
      {showToast && !toastDismissed && recommendedPosts.length > 0 && (
        <RecommendedToast
          post={recommendedPosts[0]}
          viewLang={viewLang}
          onDismiss={() => setToastDismissed(true)}
        />
      )}
    </AnimatePresence>

    <SeriesPreviewTooltip preview={series.preview} viewLang={viewLang} />
    </>
  );
}
