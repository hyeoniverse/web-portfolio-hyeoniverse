"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { slugify } from "@/components/posts/MarkdownRenderer";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import type { PostFormData } from "@/types/post";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

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
  const [form, setForm] = useState<PostFormData | null>(null);
  const richtextRef = useRef<HTMLDivElement>(null);

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

  useRichtextEnhance(richtextRef, processedHtml);

  if (!form) {
    return (
      <div className={styles.loadingState}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  const readTime = Math.max(1, Math.ceil(content.length / 1000));

  return (
    <DetailLayout
      backHref="/admin/posts"
      backLabel="Close Preview"
      heroImage={form.cover_image || undefined}
      heroAlt={form.title}
      headings={headings}
    >
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
    </DetailLayout>
  );
}
