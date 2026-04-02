"use client";

import { memo, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, viewportOpts } from "../_data/animations";
import { SAMPLE_HTML } from "../_data/editorSampleHtml";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { useLanguage } from "@/providers/LanguageProvider";
import "katex/dist/katex.min.css";
import styles from "../DesignSystem.module.css";
import proseStyles from "@/app/posts/[slug]/PostDetail.module.css";

const PlateEditor = dynamic(
  () => import("@/components/posts/PlateEditor"),
  { ssr: false, loading: () => <div className={styles.editorPlaceholder} /> }
);

const ImagePanel = dynamic(
  () => import("@/components/posts/PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

interface EditorSectionProps {
  language: string;
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
}


function EditorSection({ language, setSectionRef }: EditorSectionProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState(SAMPLE_HTML);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<import("@/components/posts/PlateEditor").PlateEditorHandle>(null);
  const [editorImages, setEditorImages] = useState<import("@/components/posts/PlateEditor").EditorImageInfo[]>([]);

  const mockImageUpload = useCallback(async (file: File): Promise<string> => {
    return URL.createObjectURL(file);
  }, []);

  // 이미지 목록 동기화
  const handleEditorChange = useCallback((v: string) => {
    setValue(v);
    requestAnimationFrame(() => {
      const imgs = plateRef.current?.getImages();
      if (imgs) setEditorImages(imgs);
    });
  }, []);

  // 미리보기용 HTML: hljs 하이라이팅 + 수식 + 버튼 라벨 적용
  const previewHtml = useMemo(() => {
    if (!showPreview) return "";
    let html = value;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { hljs } = require("@/components/posts/highlightCodeBlocks") as typeof import("@/components/posts/highlightCodeBlocks");
      const scrollLabel = `↔ ${t("common.codeScroll")}`;
      const wrapLabel = `↩ ${t("common.codeWrap")}`;
      html = html.replace(
        /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
        (_m, cls, code) => {
          const langMatch = (cls || "").match(/language-(\S+)/);
          const lang = langMatch?.[1];
          const validLang = lang && hljs.getLanguage(lang) ? lang : null;
          const decoded = code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
          let highlighted: string;
          try {
            highlighted = validLang ? hljs.highlight(decoded, { language: validLang }).value : hljs.highlightAuto(decoded).value;
          } catch { highlighted = code; }
          return `<pre><code class="hljs${validLang ? ` language-${validLang}` : ""}">${highlighted}</code></pre>`;
        }
      );
      // code-block-wrap 안에 wrap 토글 버튼 삽입
      html = html.replace(
        /<\/pre><\/div>/g,
        `</pre><button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${scrollLabel}</span><span class="code-wrap-label-hover">${wrapLabel}</span></button></div>`
      );
    } catch { /* ignore */ }
    return html;
  }, [showPreview, value, t]);

  // 미리보기 수식 렌더링 + 코드 토글 이벤트 위임
  useRichtextEnhance(previewRef, showPreview ? previewHtml : null);

  return (
    <section id="editor" ref={setSectionRef("editor")} className={styles.section}>
      <h2 className={styles.sectionTitle}>Editor</h2>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOpts}
        variants={staggerContainer}
      >
        <motion.p
          className={styles.sectionSub}
          variants={staggerItem}
          style={{ marginTop: 0, marginBottom: 24, textTransform: "none" }}
        >
          {language === "ko"
            ? "게시물 작성에 사용되는 에디터 (이미지 업로드는 로컬 미리보기 전용)"
            : "Editor used for posts (image uploads are local preview only)"}
        </motion.p>

        {/* Editor */}
        <motion.div variants={staggerItem} className={styles.editorDemo}>
          <PlateEditor
            value={value}
            onChange={handleEditorChange}
            onImageUpload={mockImageUpload}
            editorRef={plateRef}
          />
        </motion.div>

        {/* Image Panel */}
        <motion.div variants={staggerItem} style={{ marginTop: 16 }}>
          <ImagePanel
            images={editorImages}
            onSelect={(path) => plateRef.current?.selectImageAt(path)}
            onReorder={(from, to) => plateRef.current?.reorderImage(from, to)}
            onRemove={(path) => plateRef.current?.removeImage(path)}
            onRemoveDetached={(url) => plateRef.current?.removeDetached(url)}
          />
        </motion.div>

        {/* Preview toggle */}
        <motion.div variants={staggerItem} style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={styles.previewToggle}
          >
            {showPreview
              ? (language === "ko" ? "미리보기 닫기" : "Close Preview")
              : (language === "ko" ? "디테일 페이지 미리보기" : "Detail Page Preview")}
          </button>
        </motion.div>

        {/* Preview panel */}
        {showPreview && (
          <motion.div
            variants={staggerItem}
            className={styles.previewPanel}
          >
            <div className={styles.previewHeader}>
              {language === "ko" ? "게시물 디테일 페이지 미리보기" : "Post Detail Page Preview"}
            </div>
            <div
              ref={previewRef}
              className={proseStyles.prose}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

export default memo(EditorSection);
