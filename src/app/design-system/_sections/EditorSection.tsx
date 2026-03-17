"use client";

import { memo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, viewportOpts } from "../_data/animations";
import styles from "../DesignSystem.module.css";

const PlateEditor = dynamic(
  () => import("@/components/posts/PlateEditor"),
  { ssr: false, loading: () => <div className={styles.editorPlaceholder} /> }
);

interface EditorSectionProps {
  language: string;
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
}

const SAMPLE_HTML = `<h2>Plate Editor</h2><p>This is a <strong>live preview</strong> of the plate editor used across the admin panel.</p><p>Try the toolbar above to format text, insert images, add code blocks, and more.</p><blockquote><p>Images uploaded here are <em>not</em> saved to the database — they use a local blob URL for preview only.</p></blockquote><pre><code class="language-typescript">const greeting = "Hello, Design System!";\nconsole.log(greeting);</code></pre>`;

function EditorSection({ language, setSectionRef }: EditorSectionProps) {
  const [value, setValue] = useState(SAMPLE_HTML);

  const mockImageUpload = useCallback(async (file: File): Promise<string> => {
    return URL.createObjectURL(file);
  }, []);

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
        <motion.div variants={staggerItem} className={styles.editorDemo}>
          <PlateEditor
            value={value}
            onChange={setValue}
            onImageUpload={mockImageUpload}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default memo(EditorSection);
