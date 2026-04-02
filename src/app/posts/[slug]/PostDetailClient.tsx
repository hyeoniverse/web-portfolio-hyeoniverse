"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post, Series } from "@/types/post";
import DetailLayout from "@/components/layout/DetailLayout";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { extractHeadings, addIdsToHtml } from "@/utils/headingUtils";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import "katex/dist/katex.min.css";
import LanguageToggle from "@/components/ui/LanguageToggle";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import AISummary from "@/components/ui/AISummary";
import CategoryLabel from "@/components/ui/CategoryLabel";
import dynamic from "next/dynamic";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
const CommentSection = dynamic(() => import("@/components/comments/CommentSection"), { ssr: false });
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import ShareButton from "@/components/ui/ShareButton";
import { createClient } from "@/lib/supabase/client";
import styles from "./PostDetail.module.css";

interface AdjacentPost {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  title_en: string;
}

/* ── Recommended toast (scroll-triggered) ── */
type RecommendedPost = { id: string; title: string; slug: string; cover_image: string; title_en: string; category: string };

function RecommendedToast({ post, viewLang, onDismiss }: { post: RecommendedPost; viewLang: string; onDismiss: () => void }) {
  const title = viewLang === "en" && post.title_en ? post.title_en : post.title;
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className={`${styles.toast} ${footerVisible ? styles.toastHidden : ""}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: footerVisible ? 0 : 1, y: footerVisible ? 40 : 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={styles.toastHeader}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span className={styles.toastLabel}><T k="postDetail.recommended" /></span>
        <button type="button" className={styles.toastClose} onClick={onDismiss} data-clickable="true" aria-label="Close">
          <span className={styles.toastCloseIcon}>
            <span className={styles.toastCloseLine} />
            <span className={styles.toastCloseLine} />
          </span>
        </button>
      </div>
      <Link href={`/posts/${post.slug}`} className={styles.toastItem} data-clickable="true">
        <div className={styles.toastThumb}>
          {post.cover_image ? (
            <Image src={post.cover_image} alt="" fill sizes="48px" className={styles.toastThumbImg} />
          ) : (
            <svg className={styles.toastThumbPlaceholder} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <span className={styles.toastTitle}>{title}</span>
      </Link>
    </motion.div>
  );
}

/* ── Recommended posts (collapsed by default) ── */

function RecommendedSection({ posts, viewLang }: { posts: RecommendedPost[]; viewLang: string }) {
  const [expanded, setExpanded] = useState(false);
  const first = posts[0];
  const rest = posts.slice(1);

  const itemVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
  };

  const renderItem = (rp: RecommendedPost) => (
    <Link key={rp.id} href={`/posts/${rp.slug}`} className={styles.recommendedItem}>
      <div className={styles.recommendedItemThumb}>
        {rp.cover_image ? (
          <Image src={rp.cover_image} alt="" fill sizes="64px" className={styles.recommendedItemImg} />
        ) : (
          <svg className={styles.recommendedItemPlaceholder} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <div className={styles.recommendedItemBody}>
        <span className={styles.recommendedItemTitle}>
          {viewLang === "en" && rp.title_en ? rp.title_en : rp.title}
        </span>
        {rp.category && <span className={styles.recommendedItemCategory}><CategoryLabel category={rp.category} /></span>}
      </div>
    </Link>
  );

  return (
    <section className={styles.recommendedSection}>
      <div className={styles.recommendedHeader}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span className={styles.recommendedLabel}><T k="postDetail.recommended" /></span>
        {rest.length > 0 && (
          <button
            className={styles.recommendedMoreBtn}
            onClick={() => setExpanded(!expanded)}
            data-clickable="true"
          >
            {expanded ? <T k="common.close" /> : <>+{rest.length} <T k="postDetail.more" /></>}
            <svg
              className={`${styles.recommendedMoreChevron} ${expanded ? styles.recommendedMoreChevronOpen : ""}`}
              width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.recommendedList}>
        {renderItem(first)}
        <AnimatePresence initial={false}>
          {expanded && rest.map((rp, i) => (
            <motion.div
              key={rp.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ overflow: "hidden" }}
            >
              {renderItem(rp)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

interface PostDetailClientProps {
  post: Post;
  translationEnabled?: boolean;
}

export default function PostDetailClient({ post: initialPost, translationEnabled = true }: PostDetailClientProps) {
  const { t, language } = useLanguage();

  const [post, setPost] = useState<Post>(initialPost);
  const [heroImgError, setHeroImgError] = useState(false);
  const [viewLang, setViewLang] = useState<"ko" | "en">(
    !initialPost.content_en ? "ko" : !initialPost.content ? "en" : language === "en" ? "en" : "ko"
  );
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [seriesData, setSeriesData] = useState<(Series & { posts: Pick<Post, "id" | "title" | "slug" | "series_order" | "title_en" | "cover_image" | "created_at" | "excerpt" | "excerpt_en" | "tags" | "category">[] }) | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesPreview, setSeriesPreview] = useState<{ post: Pick<Post, "id" | "title" | "slug" | "series_order" | "title_en" | "cover_image" | "created_at" | "excerpt" | "excerpt_en" | "tags">; top: number; left: number } | null>(null);
  const [adjacentPosts, setAdjacentPosts] = useState<{ prev: AdjacentPost | null; next: AdjacentPost | null }>({ prev: null, next: null });
  const [recommendedPosts, setRecommendedPosts] = useState<{ id: string; title: string; slug: string; cover_image: string; title_en: string; excerpt: string; excerpt_en: string; category: string; tags: string[] }[]>([]);
  const richtextRef = useRef<HTMLDivElement>(null);
  const { containerRef: proseViewerRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setIsAdmin(!!data.session?.user));
  }, []);

  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" });

    fetch(`/api/posts/${post.id}/like`)
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      });

    fetch(`/api/posts/${post.id}/adjacent`)
      .then((r) => r.json())
      .then((d) => setAdjacentPosts(d));

    fetch(`/api/posts/${post.id}/related`)
      .then((r) => r.json())
      .then((d) => setRecommendedPosts(d))
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

    if (post.series_id) {
      fetch(`/api/series/${post.series_id}`)
        .then((r) => r.json())
        .then((d) => setSeriesData(d));
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [post.id, post.series_id]);

  const handleLikeToggle = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);

    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    setLikeCount(data.count);
    setLiked(data.liked);
  }, [post.id, liked]);

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

  const processedRichtextHtml = useMemo(() => {
    if (post.content_type === "markdown") return "";
    let html = addIdsToHtml(displayContent);
    // 코드블록: hljs 하이라이트 + 버튼 라벨을 HTML 문자열 단계에서 적용
    // (DOM 조작은 리렌더 시 사라지므로 문자열 처리)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { hljs } = require("@/components/posts/highlightCodeBlocks") as typeof import("@/components/posts/highlightCodeBlocks");
      const wrapLabel = `↔ ${t("common.codeScroll")}`;
      const hoverLabel = `↩ ${t("common.codeWrap")}`;
      html = html.replace(
        /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
        (_match, cls, code) => {
          const langMatch = (cls || "").match(/language-(\S+)/);
          const lang = langMatch?.[1];
          const validLang = lang && hljs.getLanguage(lang) ? lang : null;
          let highlighted: string;
          try {
            highlighted = validLang
              ? hljs.highlight(code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'), { language: validLang }).value
              : hljs.highlightAuto(code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')).value;
          } catch {
            highlighted = code;
          }
          return `<pre><code class="hljs${validLang ? ` language-${validLang}` : ""}">${highlighted}</code></pre>`;
        }
      );
      // 빈 버튼에 라벨 span 삽입
      html = html.replace(
        /<button[^>]*data-wrap-btn[^>]*><\/button>/g,
        `<button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${wrapLabel}</span><span class="code-wrap-label-hover">${hoverLabel}</span></button>`
      );
    } catch { /* hljs 로드 실패 시 무시 */ }
    return html;
  }, [post.content_type, displayContent, t]);

  // markdown: proseViewerRef로 처리 (MarkdownRenderer가 이미 하이라이트, 이벤트만 위임)
  useRichtextEnhance(post.content_type === "markdown" ? proseViewerRef : { current: null }, displayContent);

  // richtext 전용: 이벤트 위임만 (하이라이트/라벨은 useMemo에서 HTML에 포함)
  useEffect(() => {
    if (post.content_type === "markdown") return;
    const el = richtextRef.current;
    if (!el) return;
    import("@/components/posts/highlightCodeBlocks").then(({ attachCodeWrapToggle }) => {
      attachCodeWrapToggle(el, {
        wrap: t("common.codeWrap"),
        scroll: t("common.codeScroll"),
        wrapTitle: t("common.codeWrapTitle"),
        scrollTitle: t("common.codeScrollTitle"),
      });
    });
  }, [post.content_type, displayContent, t]);

  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const readTime = Math.max(1, Math.ceil(displayContent.length / 1000));

  const seriesPosts = seriesData?.posts ?? [];
  const currentSeriesIdx = seriesPosts.findIndex((p) => p.id === post.id);
  const prevSeriesPost = currentSeriesIdx > 0 ? seriesPosts[currentSeriesIdx - 1] : null;
  const nextSeriesPost = currentSeriesIdx < seriesPosts.length - 1 ? seriesPosts[currentSeriesIdx + 1] : null;
  const relatedSeriesPosts = seriesPosts.filter((p) => p.id !== post.id);

  const handleSeriesHover = useCallback((sp: typeof seriesPosts[number], e: React.MouseEvent) => {
    if (sp.id === post.id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipW = 240;
    const tooltipH = 200;
    const gap = 8;
    // 가로: 항목 중앙 기준, 뷰포트 안에 clamp
    const rawLeft = rect.left + rect.width / 2 - tooltipW / 2;
    const left = Math.max(gap, Math.min(rawLeft, window.innerWidth - tooltipW - gap));
    // 세로: 위에 공간 있으면 위, 없으면 아래
    const top = rect.top > tooltipH + gap
      ? rect.top - tooltipH - gap
      : rect.bottom + gap;
    setSeriesPreview({ post: sp, top, left });
  }, [post.id]);

  const handleSeriesLeave = useCallback(() => {
    setSeriesPreview(null);
  }, []);

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
    <>
    <DetailLayout
      backHref="/posts"
      backLabel={t("nav.posts")}
      heroImage={showHero ? post.cover_image : undefined}
      heroAlt={displayTitle}
      onHeroError={() => setHeroImgError(true)}
      heroFallback={heroErrorFallback}
      headings={headings}
      likeConfig={{ count: likeCount, liked, onToggle: handleLikeToggle }}
      afterContent={
        <>
          {recommendedPosts.length > 0 && (
            <RecommendedSection posts={recommendedPosts} viewLang={viewLang} />
          )}

          <AdjacentNav
            prev={adjacentPosts.prev ? {
              href: `/posts/${adjacentPosts.prev.slug}`,
              title: viewLang === "en" && adjacentPosts.prev.title_en ? adjacentPosts.prev.title_en : adjacentPosts.prev.title,
              image: adjacentPosts.prev.cover_image,
            } : null}
            next={adjacentPosts.next ? {
              href: `/posts/${adjacentPosts.next.slug}`,
              title: viewLang === "en" && adjacentPosts.next.title_en ? adjacentPosts.next.title_en : adjacentPosts.next.title,
              image: adjacentPosts.next.cover_image,
            } : null}
            prevLabelKey="postDetail.previous"
            nextLabelKey="postDetail.next"
          />

          {relatedSeriesPosts.length > 0 && seriesData && (
            <section className={styles.relatedSection}>
              <div className={styles.relatedHeader}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
                <span className={styles.relatedLabel}><T k="postDetail.series" /></span>
                <span className={styles.relatedSeriesName}>
                  &mdash; {viewLang === "en" && seriesData.title_en ? seriesData.title_en : seriesData.title}
                </span>
              </div>
              <div className={styles.relatedGrid}>
                {relatedSeriesPosts.map((sp, idx) => (
                  <Link key={sp.id} href={`/posts/${sp.slug}`} className={styles.relatedCard}>
                    <div className={styles.relatedCardImage}>
                      {sp.cover_image ? (
                        <Image
                          src={sp.cover_image}
                          alt={viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 220px"
                          className={styles.relatedCardImg}
                        />
                      ) : (
                        <svg className={styles.relatedCardPlaceholder} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      )}
                    </div>
                    <div className={styles.relatedCardBody}>
                      <div className={styles.relatedCardMeta}>
                        <span className={styles.relatedCardOrder}>#{(sp.series_order ?? idx) + 1}</span>
                        {sp.category && <span className={styles.relatedCardCategory}>{sp.category}</span>}
                      </div>
                      <span className={styles.relatedCardTitle}>
                        {viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                      </span>
                      {(viewLang === "en" ? sp.excerpt_en || sp.excerpt : sp.excerpt) && (
                        <span className={styles.relatedCardExcerpt}>
                          {viewLang === "en" ? sp.excerpt_en || sp.excerpt : sp.excerpt}
                        </span>
                      )}
                      <span className={styles.relatedCardDate}>
                        {new Date(sp.created_at).toLocaleDateString(viewLang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <motion.div
            className={styles.commentSection}
            id="comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <CommentSection commentType="post" targetId={post.id} translationEnabled={translationEnabled} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link href="/posts" className={styles.footerLink}>
              <span className={styles.footerArrow}>&larr;</span> <T k="postDetail.backToList" />
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
            <span>{readTime} <T k="postDetail.minRead" /></span>
            <span className={styles.dot}>&middot;</span>
            <span>{post.view_count} <T k="postDetail.views" /></span>
            {isAdmin && (
              <Tooltip content={t("postDetail.editPost")} placement="top" delay={200}>
                <a
                  href={`/admin/posts/${post.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </a>
              </Tooltip>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShareButton />
            <LanguageToggle lang={viewLang} onLangChange={setViewLang} />
          </div>
        </div>

        <h1 className={styles.articleTitle}>{displayTitle}</h1>

        {displayExcerpt && <p className={styles.excerpt}>{displayExcerpt}</p>}

        <div className={styles.tagsShareRow}>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.headerDivider} />
      </motion.div>

      {seriesData && seriesPosts.length > 0 && (
        <motion.div
          className={styles.seriesBox}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <button
            type="button"
            className={styles.seriesHeader}
            onClick={() => setSeriesOpen((v) => !v)}
          >
            <span className={styles.seriesLabel}><T k="postDetail.series" /></span>
            <span className={styles.seriesTitle}>
              {viewLang === "en" && seriesData.title_en
                ? seriesData.title_en
                : seriesData.title}
            </span>
            <span className={styles.seriesCount}>
              {currentSeriesIdx + 1} / {seriesPosts.length}
            </span>
            <span className={`${styles.seriesChevron} ${seriesOpen ? styles.seriesChevronOpen : ""}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>

          <div className={`${styles.seriesListWrap} ${seriesOpen ? styles.seriesListWrapOpen : ""}`}>
            <div className={styles.seriesListInner}>
              <ol className={styles.seriesList}>
                {seriesPosts.map((sp, idx) => (
                  <li
                    key={sp.id}
                    className={`${styles.seriesItem} ${sp.id === post.id ? styles.seriesItemCurrent : ""}`}
                    onMouseEnter={(e) => handleSeriesHover(sp, e)}
                    onMouseLeave={handleSeriesLeave}
                  >
                    <span className={`${styles.seriesIndicator} ${sp.id === post.id ? styles.seriesIndicatorActive : ""}`}><svg width="16" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></span>
                    <span className={styles.seriesNum}>#{(sp.series_order ?? idx) + 1}</span>
                    {sp.id === post.id ? (
                      <span>{viewLang === "en" && sp.title_en ? sp.title_en : sp.title}</span>
                    ) : (
                      <Link href={`/posts/${sp.slug}`}>
                        {viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className={styles.seriesNav}>
            {prevSeriesPost ? (
              <Link href={`/posts/${prevSeriesPost.slug}`} className={styles.seriesNavLink}>
                <span className={styles.seriesNavBadge}><svg className={styles.seriesNavArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg> <T k="postDetail.previous" /></span>
                <span className={styles.seriesNavSep}>|</span>
                <span className={styles.seriesNavTitle}>{viewLang === "en" && prevSeriesPost.title_en ? prevSeriesPost.title_en : prevSeriesPost.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {prevSeriesPost && nextSeriesPost && <span className={styles.seriesNavDivider} />}
            {nextSeriesPost ? (
              <Link href={`/posts/${nextSeriesPost.slug}`} className={`${styles.seriesNavLink} ${styles.seriesNavRight}`}>
                <span className={styles.seriesNavTitle}>{viewLang === "en" && nextSeriesPost.title_en ? nextSeriesPost.title_en : nextSeriesPost.title}</span>
                <span className={styles.seriesNavSep}>|</span>
                <span className={styles.seriesNavBadge}><T k="postDetail.next" /> <svg className={styles.seriesNavArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg></span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </motion.div>
      )}

      {needsTranslation && translationEnabled && (
        <div className={styles.translateBanner}>
          <svg className={styles.translateIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 8 6 6" />
            <path d="m4 14 6-6 2-3" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 18h6" />
          </svg>
          <p className={styles.translateMessage}>
            <T k={viewLang === "en" ? "postDetail.noTranslationEn" : "postDetail.noTranslationKo"} />
          </p>
          {translateError ? (
            <p className={styles.translateErrorMsg}>
              <T k="postDetail.translateFailed" />
            </p>
          ) : (
            <button
              type="button"
              className={styles.translateBtn}
              onClick={handleAutoTranslate}
              disabled={autoTranslating}
            >
              {autoTranslating
                ? <T k="postDetail.translating" />
                : <T k="postDetail.autoTranslate" />}
            </button>
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
        <div ref={proseViewerRef}>
          {post.content_type === "markdown" ? (
            <MarkdownRenderer content={displayContent} className={styles.prose} />
          ) : (
            <div
              ref={richtextRef}
              className={styles.prose}
              dangerouslySetInnerHTML={{ __html: processedRichtextHtml }}
            />
          )}
        </div>
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

    {seriesPreview && (
      <div
        className={styles.seriesPreview}
        style={{ top: seriesPreview.top, left: seriesPreview.left }}
      >
        <div className={styles.seriesPreviewImg}>
          {seriesPreview.post.cover_image ? (
            <Image
              src={seriesPreview.post.cover_image}
              alt={seriesPreview.post.title}
              width={240}
              height={135}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          ) : (
            <div className={styles.seriesPreviewPlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>
        <div className={styles.seriesPreviewBody}>
          <span className={styles.seriesPreviewTitle}>
            {viewLang === "en" && seriesPreview.post.title_en ? seriesPreview.post.title_en : seriesPreview.post.title}
          </span>
          {(() => {
            const excerpt = viewLang === "en" && seriesPreview.post.excerpt_en ? seriesPreview.post.excerpt_en : seriesPreview.post.excerpt;
            return excerpt ? <p className={styles.seriesPreviewExcerpt}>{excerpt}</p> : null;
          })()}
          {seriesPreview.post.tags && seriesPreview.post.tags.length > 0 && (
            <div className={styles.seriesPreviewTags}>
              {seriesPreview.post.tags.slice(0, 4).map((tag) => (
                <span key={tag} className={styles.seriesPreviewTag}>{tag}</span>
              ))}
            </div>
          )}
          <span className={styles.seriesPreviewDate}>
            {new Date(seriesPreview.post.created_at).toLocaleDateString(viewLang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    )}
    </>
  );
}
