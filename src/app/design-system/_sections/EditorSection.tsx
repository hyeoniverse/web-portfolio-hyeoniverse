"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { PREVIEW_KEY } from "@/constants";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ExternalLink } from "@/components/icons";
import Button from "@/components/ui/Button";
import { staggerContainer, staggerItem, viewportOpts } from "../_data/animations";
import { SAMPLE_HTML } from "../_data/editorSampleHtml";
import styles from "../DesignSystem.module.css";

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
  const [value, setValue] = useState(SAMPLE_HTML);
  const plateRef = useRef<import("@/components/posts/PlateEditor").PlateEditorHandle>(null);
  const [editorImages, setEditorImages] = useState<import("@/components/posts/PlateEditor").EditorImageInfo[]>([]);

  const mockImageUpload = useCallback(async (file: File): Promise<string> => {
    return URL.createObjectURL(file);
  }, []);

  const mockVideoUpload = useCallback(async (file: File): Promise<string> => {
    const url = URL.createObjectURL(file);
    const ext = file.name.split(".").pop() || "mp4";
    return `${url}#.${ext}`;
  }, []);

  // 에디터 mount 후 이미지 목록 초기 동기화
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const imgs = plateRef.current?.getImages();
      if (!cancelled && imgs !== undefined) {
        setEditorImages(imgs);
        if (imgs.length > 0 || attempts > 20) clearInterval(poll);
      }
      if (attempts > 20) clearInterval(poll);
    }, 200);
    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  const handleEditorChange = useCallback((v: string) => {
    setValue(v);
    requestAnimationFrame(() => {
      const imgs = plateRef.current?.getImages();
      if (imgs) setEditorImages(imgs);
    });
  }, []);

  const handlePreview = useCallback(() => {
    const form = {
      title: "Design System Editor Preview",
      slug: "design-system-preview",
      content: value,
      content_type: "richtext",
      excerpt: "",
      cover_image: "",
      tags: ["design-system"],
      category: "Design",
      is_pinned: false,
      published: false,
      language: "ko",
      title_en: "Design System Editor Preview",
      content_en: "",
      excerpt_en: "",
      series_id: null,
      series_order: 0,
      github_url: "",
    };
    sessionStorage.setItem(PREVIEW_KEY.post, JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [value]);

  return (
    <section id="editor" ref={setSectionRef("editor")} className={styles.section}>
      <div className={styles.sectionTitleRow}>
        <h2 className={styles.sectionTitle}>Editor</h2>
        <Button
          variant="link"
          onClick={handlePreview}
          icon={<ExternalLink size={12} />}
          iconPosition="right"
          soundDisabled
        >
          {language === "ko" ? "디테일 페이지 미리보기" : "Detail Page Preview"}
        </Button>
      </div>
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

        {/* 새 툴바 기능 소개 — 아래 실제 에디터에서 바로 시험해 볼 수 있다 */}
        <motion.div
          variants={staggerItem}
          style={{
            marginBottom: 24,
            padding: "var(--spacing-md) var(--spacing-lg)",
            border: "var(--border-light)",
            borderRadius: "var(--radius-2xl)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-xs)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            {language === "ko" ? "이번에 추가된 툴바 기능" : "New toolbar features"}
          </span>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1em",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-2xs)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <li>
              {language === "ko"
                ? "색상 칩 삽입 (팔레트 아이콘) — 고른 #hex 를 인라인 code 로 넣으면 리더에서 앞에 색 스와치가 붙습니다."
                : "Color chip (palette icon) — insert a picked #hex as inline code; the reader prepends a color swatch to it."}
            </li>
            <li>
              {language === "ko"
                ? "폰트 크기·줄간격 직접 입력 — 프리셋 셀렉트를 더블클릭하면 입력칸으로 바뀌어 프리셋 밖 값도 타이핑할 수 있습니다 (자간은 프리셋 선택)."
                : "Direct font-size / line-height entry — double-click the preset select to type a value outside the presets (letter spacing stays preset-based)."}
            </li>
            <li>
              {language === "ko"
                ? "툴바 그룹 재배치 — 서식·색, 폰트, 정렬·들여쓰기, 제목, 리스트·블록, 삽입을 구분선으로 묶었습니다."
                : "Regrouped toolbar — formatting/color, font, alignment/indent, headings, lists/blocks, and insert are separated by dividers."}
            </li>
          </ul>
        </motion.div>

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
            onRemoveDetached={(url) => {
              plateRef.current?.removeDetached(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onReinsert={(url, mediaType) => {
              if (mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) {
                plateRef.current?.insertMediaByUrl(url);
              } else {
                plateRef.current?.insertImageByUrl(url);
              }
            }}
            onImageUpload={async (file) => {
              const url = await mockImageUpload(file);
              plateRef.current?.insertImageByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onVideoUpload={async (file) => {
              const url = await mockVideoUpload(file);
              plateRef.current?.insertMediaByUrl(url);
              return url;
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default memo(EditorSection);
