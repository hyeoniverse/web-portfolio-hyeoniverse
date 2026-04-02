"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import MarkdownRenderer, { slugify } from "@/components/posts/MarkdownRenderer";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import type { WorkFormData } from "@/types/work";
import T from "@/components/ui/T";
import styles from "@/app/works/[id]/WorkDetail.module.css";

function extractHeadings(content: string, isRichtext: boolean): TocHeading[] {
  const headings: TocHeading[] = [];

  if (isRichtext) {
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, "");
      const id = slugify(text);
      headings.push({ id, text, level: 2 });
    }
  } else {
    const regex = /^##\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].trim();
      const id = slugify(text);
      headings.push({ id, text, level: 2 });
    }
  }

  return headings;
}

export default function WorkPreviewPage() {
  const { language } = useLanguage();
  const [form, setForm] = useState<WorkFormData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("work-preview");
      if (raw) setForm(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const suf = language === "ko" ? "_ko" : "_en";
  const content = form ? form[`content${suf}`] : "";
  const isRichtext = form?.content_type === "richtext";

  const headings = useMemo(() => {
    if (!content) return [];
    const h = extractHeadings(content, isRichtext);
    if (form && form.gallery.length > 0) {
      h.push({ id: "gallery", text: "Gallery", level: 2 });
    }
    return h;
  }, [content, isRichtext, form]);

  if (!form) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "var(--font-space-grotesk)",
        color: "var(--text-tertiary)",
      }}>
        미리보기 데이터가 없습니다. 에디터에서 Preview 버튼을 눌러주세요.
      </div>
    );
  }

  const description = form[`description${suf}`];
  const role = form[`role${suf}`];
  const category = form[`category${suf}`];

  return (
    <DetailLayout
      onBack={() => window.close()}
      backLabel="Close Preview"
      heroImage={form.image || undefined}
      heroAlt={form.title}
      headings={headings}
    >
      <div className={styles.meta}>
        {category && <span className={styles.category}>{category}</span>}
        <span className={styles.year}>{form.year}</span>
      </div>

      <h1 className={styles.title}>{form.title}</h1>

      {description && (
        <p className={styles.description}>{description}</p>
      )}

      <div className={styles.infoRow}>
        {role && (
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}><T k="workDetail.role" /></span>
            <span className={styles.infoValue}>{role}</span>
          </div>
        )}
        {form.tech.length > 0 && (
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
            <div className={styles.techStack}>
              {form.tech.map((tech) => (
                <span key={tech} className={styles.techTag}>{tech}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {content && (
        <div className={styles.section}>
          {isRichtext ? (
            <div
              className={styles.sectionProse}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <MarkdownRenderer content={content} className={styles.sectionProse} />
          )}
        </div>
      )}

      {form.gallery.length > 0 && (
        <div id="gallery" className={styles.gallery}>
          {form.gallery.map((src, i) => (
            <div key={i} className={styles.galleryItem}>
              <Image
                src={src}
                alt={`${form.title} ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className={styles.galleryImage}
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </DetailLayout>
  );
}
