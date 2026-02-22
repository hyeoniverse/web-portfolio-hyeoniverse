"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { slugify } from "@/components/posts/MarkdownRenderer";
import { highlightCodeBlocks } from "@/components/posts/highlightCodeBlocks";
import type { PostFormData } from "@/types/post";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

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

export default function PostPreviewPage() {
  const { setInfinite, lenis } = useLenis();
  const [form, setForm] = useState<PostFormData | null>(null);
  const richtextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInfinite(false);
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });

    return () => {
      setInfinite(true);
    };
  }, [setInfinite, lenis]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("post-preview");
      if (raw) setForm(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const content = form?.content ?? "";
  const isMarkdown = form?.content_type === "markdown";

  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content, isMarkdown);
  }, [content, isMarkdown]);

  const processedHtml = useMemo(() => {
    if (isMarkdown || !content) return "";
    return addIdsToHtml(content);
  }, [content, isMarkdown]);

  useEffect(() => {
    if (richtextRef.current) highlightCodeBlocks(richtextRef.current);
  }, [processedHtml]);

  if (!form) {
    return (
      <div className={styles.loadingState}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  const readTime = Math.max(1, Math.ceil(content.length / 1000));

  return (
    <div className={styles.page}>
      <button
        className={styles.backBtn}
        onClick={() => window.close()}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Close Preview</span>
      </button>

      {/* ── Hero ── */}
      {form.cover_image ? (
        <div className={styles.hero}>
          <Image
            src={form.cover_image}
            alt={form.title}
            fill
            sizes="100vw"
            className={styles.heroCover}
          />
          <div className={styles.heroOverlay} />
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
                  className={`${styles.tocLink} ${styles[`tocLevel${level}`] ?? ""}`}
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
        <div className={styles.articleHeader}>
          <div className={styles.meta}>
            <span>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className={styles.dot}>&middot;</span>
            <span>{readTime} min read</span>
          </div>

          <h1 className={styles.articleTitle}>{form.title}</h1>

          {form.excerpt && <p className={styles.excerpt}>{form.excerpt}</p>}

          {form.tags.length > 0 && (
            <div className={styles.tags}>
              {form.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          <div className={styles.headerDivider} />
        </div>

        {isMarkdown ? (
          <MarkdownRenderer content={content} className={styles.prose} />
        ) : (
          <div
            ref={richtextRef}
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        )}
      </div>
    </div>
  );
}
