"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post } from "@/types/post";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import { highlightCodeBlocks } from "@/components/posts/highlightCodeBlocks";
import LanguageToggle from "@/components/ui/LanguageToggle";
import CommentSection from "./_components/CommentSection";
import styles from "./PostDetail.module.css";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

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

  // richtext: parse headings from HTML
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
  const { setInfinite, lenis, stop, start } = useLenis();
  const { language } = useLanguage();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [viewLang, setViewLang] = useState<"ko" | "en">(language === "en" ? "en" : "ko");
  const richtextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);

  useEffect(() => {
    fetch(`/api/posts?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.posts ?? [])[0] ?? null;
        setPost(found);
        setLoading(false);

        if (found) {
          fetch(`/api/posts/${found.id}/view`, { method: "POST" });
        }
      });
  }, [slug]);

  // Check if EN content exists
  const hasEnContent = !!(post?.title_en || post?.content_en);

  // Resolve displayed content based on viewLang
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

  // Scroll spy for TOC — scroll position based
  useEffect(() => {
    if (headings.length === 0) return;

    let rafId: number;
    const OFFSET = 120;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let current = "";
        for (const { id } of headings) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= OFFSET) {
            current = id;
          }
        }
        if (current) setActiveHeadingId(current);
      });
    };

    const timer = setTimeout(() => {
      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 500);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  if (loading) {
    return <div className={styles.loadingState}>Loading...</div>;
  }

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

  return (
    <div className={styles.page}>
      <Link href="/posts" className={styles.backBtn}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Posts</span>
      </Link>

      {/* ── Hero ── */}
      {post.cover_image && !heroImgError ? (
        <motion.div
          className={styles.hero}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={post.cover_image}
            alt={displayTitle}
            className={styles.heroCover}
            onError={() => setHeroImgError(true)}
          />
          <div className={styles.heroOverlay} />
        </motion.div>
      ) : post.cover_image && heroImgError ? (
        <div className={styles.heroPlaceholder}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      ) : (
        <div className={styles.heroSpacer} />
      )}

      {/* ── TOC ── */}
      {headings.length > 0 && (
        <nav className={styles.toc}>
          <p className={styles.tocTitle}>Contents</p>
          <ul className={styles.tocList}>
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`${styles.tocLink} ${styles[`tocLevel${level}`] ?? ""} ${activeHeadingId === id ? styles.tocActive : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(id);
                    if (el) {
                      if (lenis) {
                        lenis.scrollTo(el, { offset: -100 });
                      } else {
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ── Article ── */}
      <div className={styles.article}>
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

            {/* Language toggle */}
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
      </div>

      {/* ── Comments ── */}
      <motion.div
        className={styles.commentSection}
        id="comments"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <CommentSection postId={post.id} />
      </motion.div>

      {/* ── Footer nav ── */}
      <div className={styles.footerNav}>
        <Link href="/posts" className={styles.footerLink}>
          &larr; Back to all posts
        </Link>
      </div>
    </div>
  );
}
