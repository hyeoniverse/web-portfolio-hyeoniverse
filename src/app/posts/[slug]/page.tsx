"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post } from "@/types/post";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import { highlightCodeBlocks } from "@/components/posts/highlightCodeBlocks";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import CommentSection from "./_components/CommentSection";
import layoutStyles from "@/components/layout/DetailLayout/DetailLayout.module.css";
import styles from "./PostDetail.module.css";

function extractHeadings(content: string, isMarkdown: boolean): TocHeading[] {
  if (isMarkdown) {
    const lines = content.split("\n");
    const headings: TocHeading[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          id: slugify(match[2].trim()),
        });
      }
    }
    return headings;
  }

  const headings: TocHeading[] = [];
  const regex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const plainText = m[2].replace(/<[^>]*>/g, "");
    headings.push({
      level: parseInt(m[1]),
      text: plainText,
      id: slugify(plainText),
    });
  }
  return headings;
}

function addIdsToHtml(html: string): string {
  return html.replace(/<h([1-3])([^>]*)>(.*?)<\/h\1>/gi, (_, level, attrs, text) => {
    const plainText = text.replace(/<[^>]*>/g, "");
    const id = slugify(plainText);
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });
}

export default function PostDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language } = useLanguage();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);
  const [viewLang, setViewLang] = useState<"ko" | "en">(language === "en" ? "en" : "ko");
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const richtextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/posts?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.posts ?? [])[0] ?? null;
        setPost(found);
        setLoading(false);

        if (found) {
          fetch(`/api/posts/${found.id}/view`, { method: "POST" });

          fetch(`/api/posts/${found.id}/like`)
            .then((r) => r.json())
            .then((d) => {
              setLikeCount(d.count ?? 0);
              setLiked(d.liked ?? false);
            });
        }
      });
  }, [slug]);

  const handleLikeToggle = useCallback(async () => {
    if (!post) return;

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);

    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    setLikeCount(data.count);
    setLiked(data.liked);
  }, [post, liked]);

  const hasEnContent = !!(post?.title_en || post?.content_en);
  const displayTitle = viewLang === "en" && post?.title_en ? post.title_en : post?.title ?? "";
  const displayContent = viewLang === "en" && post?.content_en ? post.content_en : post?.content ?? "";
  const displayExcerpt = viewLang === "en" && post?.excerpt_en ? post.excerpt_en : post?.excerpt ?? "";

  const headings = useMemo(() => {
    if (!displayContent) return [];
    return extractHeadings(displayContent, post?.content_type === "markdown");
  }, [displayContent, post?.content_type]);

  const processedRichtextHtml = useMemo(() => {
    if (!post || post.content_type === "markdown") return "";
    return addIdsToHtml(displayContent);
  }, [post, displayContent]);

  useEffect(() => {
    if (richtextRef.current) highlightCodeBlocks(richtextRef.current);
  }, [processedRichtextHtml]);

  if (loading) return <PostDetailSkeleton />;

  if (!post) {
    return (
      <div className={styles.loadingState}>
        Post not found.{" "}
        <Link href="/posts" style={{ color: "var(--color-accent)" }}>
          Back to posts
        </Link>
      </div>
    );
  }

  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const readTime = Math.max(1, Math.ceil(displayContent.length / 1000));

  const showHero = post.cover_image && !heroImgError;
  const heroErrorFallback = post.cover_image && heroImgError ? (
    <div className={styles.heroPlaceholder}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  ) : undefined;

  return (
    <DetailLayout
      backHref="/posts"
      backLabel="Posts"
      heroImage={showHero ? post.cover_image : undefined}
      heroAlt={displayTitle}
      onHeroError={() => setHeroImgError(true)}
      heroFallback={heroErrorFallback}
      headings={headings}
      likeConfig={{ count: likeCount, liked, onToggle: handleLikeToggle }}
      afterContent={
        <>
          <motion.div
            className={styles.commentSection}
            id="comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <CommentSection postId={post.id} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link href="/posts" className={styles.footerLink}>
              &larr; Back to all posts
            </Link>
          </div>
        </>
      }
    >
      <motion.div
        className={styles.articleHeader}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.metaRow}>
          <div className={styles.meta}>
            <span>{date}</span>
            <span className={styles.dot}>&middot;</span>
            <span>{readTime} min read</span>
            <span className={styles.dot}>&middot;</span>
            <span>{post.view_count} views</span>
          </div>

          {hasEnContent && (
            <LanguageToggle lang={viewLang} onLangChange={setViewLang} />
          )}
        </div>

        <h1 className={styles.articleTitle}>{displayTitle}</h1>

        {displayExcerpt && <p className={styles.excerpt}>{displayExcerpt}</p>}

        {post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className={styles.headerDivider} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {post.content_type === "markdown" ? (
          <MarkdownRenderer content={displayContent} className={styles.prose} />
        ) : (
          <div
            ref={richtextRef}
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: processedRichtextHtml }}
          />
        )}
      </motion.div>
    </DetailLayout>
  );
}

/* ── Skeleton ── */
function PostDetailSkeleton() {
  return (
    <div className={layoutStyles.page}>
      <div className={layoutStyles.heroSpacer} />
      <div className={layoutStyles.content}>
        {/* Meta row */}
        <div className={styles.articleHeader}>
          <div className={styles.metaRow}>
            <div className={styles.meta}>
              <SkeletonLine width={80} height={12} />
              <SkeletonLine width={60} height={12} />
              <SkeletonLine width={50} height={12} />
            </div>
          </div>
          {/* Title */}
          <SkeletonLine width="80%" height={40} />
          <div style={{ height: "var(--spacing-md)" }} />
          {/* Excerpt */}
          <SkeletonLine width="100%" height={18} />
          <div style={{ height: "var(--spacing-xs)" }} />
          <SkeletonLine width="60%" height={18} />
          <div style={{ height: "var(--spacing-md)" }} />
          {/* Tags */}
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <Skeleton width={60} height={24} borderRadius="var(--radius-capsule)" />
            <Skeleton width={80} height={24} borderRadius="var(--radius-capsule)" />
            <Skeleton width={50} height={24} borderRadius="var(--radius-capsule)" />
          </div>
          <div style={{ height: "var(--spacing-lg)" }} />
          <Skeleton height={1} />
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <SkeletonLine width="100%" height={14} />
          <SkeletonLine width="95%" height={14} />
          <SkeletonLine width="88%" height={14} />
          <SkeletonLine width="100%" height={14} />
          <SkeletonLine width="70%" height={14} />
          <div style={{ height: "var(--spacing-lg)" }} />
          <SkeletonLine width="40%" height={24} />
          <SkeletonLine width="100%" height={14} />
          <SkeletonLine width="92%" height={14} />
          <SkeletonLine width="85%" height={14} />
          <SkeletonLine width="100%" height={14} />
          <SkeletonLine width="60%" height={14} />
        </div>
      </div>
    </div>
  );
}
