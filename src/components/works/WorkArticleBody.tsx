"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { useLanguage } from "@/providers/LanguageProvider";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import DateMentionPeek from "@/components/posts/DateMentionPeek";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import { pickLocalized } from "@/types/common";
import { getBentoClass } from "@/app/works/_utils";
import styles from "./WorkArticleBody.module.css";
import type { WorkArticleViewProps } from "./workArticleTypes";

/* ────────────────────────────────────────────────────────────
 * WorkArticleBody — DetailLayout 의 children slot.
 * 본문(richtext/markdown) · 갤러리 + ImageViewer.
 * richtext enhance / gallery viewer 등 인터랙션은 모두 내부 보유.
 * 팀 멤버 carousel 은 full-width afterContent slot 으로 분리됨 → WorkArticleTeam.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleBody({ project, viewLang }: WorkArticleViewProps) {
  const { t, language } = useLanguage();
  const isRichtext = project.contentType === "richtext";

  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const richtextRef = useRef<HTMLDivElement>(null);

  const contentRaw = project.content[viewLang] || project.content.ko;
  // richtext img에 data-cursor="zoom" 주입 (CursorTrail 이미지 뷰어 힌트)
  const content = isRichtext
    ? contentRaw.replace(/<img\s/g, '<img data-cursor="zoom" ')
    : contentRaw;

  useRichtextEnhance(richtextRef, content);

  // mermaid 다이어그램 + in-content TOC 렌더 (richtext 만)
  useEffect(() => {
    if (!isRichtext) return;
    const el = richtextRef.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    import("@/components/posts/enhanceReaderExtras").then(({ enhanceReaderExtras }) => {
      cleanup = enhanceReaderExtras(el, {
        viewCode: t("common.mermaidViewCode"),
        hideCode: t("common.mermaidHideCode"),
        copyCode: t("common.codeCopy"),
        copied: t("common.codeCopied"),
        diagram: t("common.mermaidDiagram"),
        code: t("common.mermaidCode"),
        split: t("common.mermaidSplit"),
      });
    });
    return () => cleanup?.();
  }, [isRichtext, content, t]);

  return (
    <>
      {/* Content */}
      {content && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div ref={proseRef}>
            {isRichtext ? (
              <div ref={richtextRef} className={`${styles.sectionProse} prose-content`} dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <MarkdownRenderer content={content} className={`${styles.sectionProse} prose-content`} />
            )}
          </div>
          {isRichtext && <DateMentionPeek containerRef={richtextRef} language={language} />}
        </motion.div>
      )}

      {/* Gallery — TOC anchor 와 동일한 본문 영역 안 */}
      {project.gallery.length > 0 && (
        <motion.div
          id="gallery"
          className={styles.gallery}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          {project.gallery.map((src, i) => {
            const count = project.gallery.length;
            const bentoClass = getBentoClass(i, count, styles);
            return (
              <div
                key={i}
                className={`${styles.galleryItem} ${bentoClass ?? ""}`}
                onClick={() => setGalleryViewer({ open: true, index: i })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setGalleryViewer({ open: true, index: i }); }}
                data-cursor="zoom"
              >
                <ProgressiveImage
                  src={src}
                  alt={`${pickLocalized(project.title, viewLang)} ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={styles.galleryImage}
                />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Gallery ImageViewer */}
      <ImageViewer
        images={project.gallery}
        index={galleryViewer.index}
        open={galleryViewer.open}
        onClose={() => setGalleryViewer({ open: false, index: 0 })}
        title={pickLocalized(project.title, viewLang)}
      />

      {/* Prose ImageViewer */}
      <ImageViewer
        images={proseViewer.images}
        index={proseViewer.index}
        open={proseViewer.open}
        onClose={closeProseViewer}
        title={pickLocalized(project.title, viewLang)}
      />
    </>
  );
}
