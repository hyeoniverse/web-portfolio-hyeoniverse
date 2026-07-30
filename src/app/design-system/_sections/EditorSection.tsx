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
