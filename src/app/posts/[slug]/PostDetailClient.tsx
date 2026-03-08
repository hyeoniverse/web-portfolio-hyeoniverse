"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post, Series } from "@/types/post";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import { highlightCodeBlocks } from "@/components/posts/highlightCodeBlocks";
import LanguageToggle from "@/components/ui/LanguageToggle";
import T from "@/components/ui/T";
import CategoryLabel from "@/components/ui/CategoryLabel";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
import CommentSection from "@/components/comments/CommentSection";
import styles from "./PostDetail.module.css";

interface AdjacentPost {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  title_en: string;
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
      {rest.length > 0 && (
        <button
          className={styles.recommendedMoreBtn}
          onClick={() => setExpanded(!expanded)}
          data-clickable="true"
        >
          {expanded ? <T k="common.close" /> : <>+{rest.length} <T k="postDetail.more" /></>}
        </button>
      )}
    </section>
  );
}

interface PostDetailClientProps {
  post: Post;
}

export default function PostDetailClient({ post: initialPost }: PostDetailClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [post, setPost] = useState<Post>(initialPost);
  const [heroImgError, setHeroImgError] = useState(false);
  const [viewLang, setViewLang] = useState<"ko" | "en">(language === "en" ? "en" : "ko");
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [seriesData, setSeriesData] = useState<(Series & { posts: Pick<Post, "id" | "title" | "slug" | "series_order" | "title_en" | "cover_image" | "created_at">[] }) | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [adjacentPosts, setAdjacentPosts] = useState<{ prev: AdjacentPost | null; next: AdjacentPost | null }>({ prev: null, next: null });
  const [recommendedPosts, setRecommendedPosts] = useState<{ id: string; title: string; slug: string; cover_image: string; title_en: string; excerpt: string; excerpt_en: string; category: string; tags: string[] }[]>([]);
  const richtextRef = useRef<HTMLDivElement>(null);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

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

  const hasTranslation = !!(post?.content_en);
  const needsTranslation = viewLang === "en" && !hasTranslation;
  const displayTitle = viewLang === "en" && post?.title_en ? post.title_en : post?.title ?? "";
  const displayContent = viewLang === "en" && post?.content_en ? post.content_en : post?.content ?? "";
  const displayExcerpt = viewLang === "en" && post?.excerpt_en ? post.excerpt_en : post?.excerpt ?? "";

  const handleAutoTranslate = useCallback(async () => {
    if (autoTranslating) return;
    setAutoTranslating(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/auto-translate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) => ({ ...prev, title_en: data.title_en, content_en: data.content_en, excerpt_en: data.excerpt_en }));
      }
    } catch {
      // silent
    } finally {
      setAutoTranslating(false);
    }
  }, [post.id, autoTranslating]);

  const headings = useMemo(() => {
    if (!displayContent) return [];
    return extractHeadings(displayContent, post?.content_type === "markdown");
  }, [displayContent, post?.content_type]);

  const processedRichtextHtml = useMemo(() => {
    if (post.content_type === "markdown") return "";
    return addIdsToHtml(displayContent);
  }, [post.content_type, displayContent]);

  useEffect(() => {
    if (richtextRef.current) highlightCodeBlocks(richtextRef.current);
  }, [processedRichtextHtml]);

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
                      {sp.cover_image && (
                        <Image
                          src={sp.cover_image}
                          alt={viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 220px"
                          className={styles.relatedCardImg}
                        />
                      )}
                    </div>
                    <div className={styles.relatedCardBody}>
                      <span className={styles.relatedCardOrder}>#{sp.series_order ?? idx + 1}</span>
                      <span className={styles.relatedCardTitle}>
                        {viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {recommendedPosts.length > 0 && (
            <RecommendedSection posts={recommendedPosts} viewLang={viewLang} />
          )}

          <motion.div
            className={styles.commentSection}
            id="comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <CommentSection commentType="post" targetId={post.id} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link
              href="/posts"
              className={styles.footerLink}
              onClick={(e) => {
                const ref = document.referrer;
                try {
                  const refUrl = ref ? new URL(ref) : null;
                  if (
                    refUrl &&
                    refUrl.origin === window.location.origin &&
                    !refUrl.pathname.startsWith("/admin")
                  ) {
                    e.preventDefault();
                    router.back();
                    return;
                  }
                } catch {
                  /* fall through */
                }
              }}
            >
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
          </div>

          <LanguageToggle lang={viewLang} onLangChange={setViewLang} />
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
              &#9662;
            </span>
          </button>

          {seriesOpen && (
            <ol className={styles.seriesList}>
              {seriesPosts.map((sp, idx) => (
                <li
                  key={sp.id}
                  className={`${styles.seriesItem} ${sp.id === post.id ? styles.seriesItemCurrent : ""}`}
                >
                  {sp.id === post.id ? (
                    <span>{viewLang === "en" && sp.title_en ? sp.title_en : sp.title}</span>
                  ) : (
                    <Link href={`/posts/${sp.slug}`}>
                      {viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                    </Link>
                  )}
                  <span className={styles.seriesNum}>{idx + 1}</span>
                </li>
              ))}
            </ol>
          )}

          <div className={styles.seriesNav}>
            {prevSeriesPost ? (
              <Link href={`/posts/${prevSeriesPost.slug}`} className={styles.seriesNavLink}>
                &larr; {viewLang === "en" && prevSeriesPost.title_en ? prevSeriesPost.title_en : prevSeriesPost.title}
              </Link>
            ) : (
              <span />
            )}
            {nextSeriesPost ? (
              <Link href={`/posts/${nextSeriesPost.slug}`} className={`${styles.seriesNavLink} ${styles.seriesNavRight}`}>
                {viewLang === "en" && nextSeriesPost.title_en ? nextSeriesPost.title_en : nextSeriesPost.title} &rarr;
              </Link>
            ) : (
              <span />
            )}
          </div>
        </motion.div>
      )}

      {needsTranslation && (
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
            <T k="postDetail.noTranslation" />
          </p>
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
        </div>
      )}

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

    <AnimatePresence>
      {showToast && !toastDismissed && recommendedPosts.length > 0 && (
        <RecommendedToast
          post={recommendedPosts[0]}
          viewLang={viewLang}
          onDismiss={() => setToastDismissed(true)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
