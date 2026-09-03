"use client";

import { useState, useMemo } from "react";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Post } from "@/types/post";
import DetailLayout from "@/components/layout/DetailLayout";
import { PostArticleHeader, PostArticleBody, PostArticleAuthors } from "@/components/posts/PostArticleView";
import { extractHeadings } from "@/utils/headingUtils";
import "katex/dist/katex.min.css";
import AISummary from "@/components/ui/AISummary";
import RecommendedToast from "./_components/RecommendedToast";
import RecommendedSection from "./_components/RecommendedSection";
import RelatedWorksCarousel from "./_components/RelatedWorksCarousel";
import SeriesPanel from "./_components/SeriesPanel/SeriesPanel";
import SeriesPreviewTooltip from "./_components/SeriesPanel/SeriesPreviewTooltip";
import { useSeriesPanel } from "./_components/SeriesPanel/useSeriesPanel";
import TranslateBanner from "./_components/TranslateBanner";
import { usePostTranslation } from "./_hooks/usePostTranslation";
import { usePostDetailFetches } from "./_hooks/usePostDetailFetches";
import { useRecommendedToast } from "./_hooks/useRecommendedToast";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLikeToggle } from "@/hooks/useLikeToggle";
import { ImageIcon } from "@/components/icons";
import styles from "./PostDetail.module.css";
import header from "@/components/posts/PostArticleHeader.module.css";
import { resolvePostAuthors } from "@/utils/resolvePostAuthors";

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

  // 번역 — 보기 언어 · display* 파생 · 자동 번역(post 의 번역 필드를 갱신하므로 post state 도 이 훅이 든다)
  const {
    post, viewLang, setViewLang, needsTranslation, displayTitle, displayContent, displayExcerpt,
    autoTranslating, translateError, handleAutoTranslate,
  } = usePostTranslation(initialPost, language);

  // author_ids → Author[] 해석 (site config authors). 미할당(빈 배열)이면 소유자로 돌아간다.
  const postAuthors = useMemo(
    () => resolvePostAuthors(siteConfig?.authors, post.author_ids),
    [siteConfig, post.author_ids],
  );

  const [heroImgError, setHeroImgError] = useState(false);
  const { count: likeCount, liked, busy: likeBusy, toggle: handleLikeToggle } = useLikeToggle({
    endpoint: `/api/posts/${post.id}/like`,
  });
  // 시리즈 패널 — fetch · 펼침 · hover 미리보기 좌표 · 이전/다음. 미리보기 툴팁은 fixed 라 레이아웃 밖에서 렌더
  const series = useSeriesPanel({ postId: post.id, seriesId: post.series_id });
  const { containerRef: proseViewerRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const isAdmin = useIsAuthenticated();
  // 부가 데이터 — 조회수 기록 · 이전/다음 · 추천 · 관련 작업. 추천 토스트는 40% 스크롤에 한 번
  const { adjacentPosts, recommendedPosts, relatedWorks } = usePostDetailFetches({ postId: post.id, isAdmin });
  const toast = useRecommendedToast(post.id);
  const headings = useMemo(() => {
    if (!displayContent) return [];
    return extractHeadings(displayContent, post.content_type === "markdown");
  }, [displayContent, post.content_type]);

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
        <TranslateBanner viewLang={viewLang} translating={autoTranslating} error={translateError} onTranslate={handleAutoTranslate} />
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
      {toast.visible && recommendedPosts.length > 0 && (
        <RecommendedToast
          post={recommendedPosts[0]}
          viewLang={viewLang}
          onDismiss={toast.dismiss}
        />
      )}
    </AnimatePresence>

    <SeriesPreviewTooltip preview={series.preview} viewLang={viewLang} />
    </>
  );
}
