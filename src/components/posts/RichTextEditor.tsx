"use client";

import { useCallback, useState } from "react";
import { Extension } from "@tiptap/core";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import Youtube from "@tiptap/extension-youtube";
import { common, createLowlight } from "lowlight";
import styles from "./RichTextEditor.module.css";

const lowlight = createLowlight(common);

// ── Custom font size extension ──
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans (Inter)", value: "Inter, sans-serif" },
  { label: "Serif (Instrument)", value: "'Instrument Serif', serif" },
  { label: "Grotesk (Space)", value: "'Space Grotesk', sans-serif" },
  { label: "Mono (JetBrains)", value: "'JetBrains Mono', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = [
  { label: "Default", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
];

const PRESET_COLORS = [
  "#000000", "#374151", "#6b7280", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ── Embed URL helpers ──
function getYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/) ??
    null;
  return m ? m[1] : null;
}

function isEmbeddableUrl(url: string): boolean {
  return /twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com|codepen\.io|codesandbox\.io|figma\.com|spotify\.com|soundcloud\.com/i.test(
    url
  );
}

function buildOEmbedHtml(url: string): string {
  // Twitter/X
  if (/twitter\.com|x\.com/i.test(url)) {
    return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`;
  }
  // Instagram
  if (/instagram\.com/i.test(url)) {
    return `<blockquote class="instagram-media" data-instgrm-permalink="${url}"><a href="${url}"></a></blockquote><script async src="https://www.instagram.com/embed.js"></script>`;
  }
  // Spotify
  if (/spotify\.com/i.test(url)) {
    const embedUrl = url.replace("open.spotify.com/", "open.spotify.com/embed/");
    return `<iframe src="${embedUrl}" width="100%" height="352" frameborder="0" allow="encrypted-media" loading="lazy"></iframe>`;
  }
  // Generic iframe fallback
  return `<iframe src="${url}" width="100%" height="400" frameborder="0" loading="lazy" allowfullscreen></iframe>`;
}

function insertEmbed(editor: Editor) {
  const url = window.prompt("Paste a URL (YouTube, Twitter/X, Instagram, Spotify, etc.):");
  if (!url) return;

  // YouTube → use native extension
  const ytId = getYouTubeId(url);
  if (ytId) {
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    return;
  }

  // Other embeddable → insert raw HTML
  if (isEmbeddableUrl(url)) {
    const html = buildOEmbedHtml(url);
    editor.chain().focus().insertContent(html).run();
    return;
  }

  // Fallback: insert as a styled link
  editor
    .chain()
    .focus()
    .insertContent(
      `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`
    )
    .run();
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
  value,
  onChange,
  onImageUpload,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write your content...",
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
      FontSize,
      Youtube.configure({
        inline: false,
        ccLanguage: "ko",
      }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  const addImage = useCallback(async () => {
    if (!onImageUpload || !editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    };
    input.click();
  }, [editor, onImageUpload]);

  const addLink = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("Enter URL:");
    if (!url) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      // 선택된 텍스트 없음 → URL을 텍스트로 삽입 + 링크 적용
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const [hasInteracted, setHasInteracted] = useState(false);

  if (!editor) return null;

  const focused = hasInteracted || editor.isFocused;
  const isBlockActive = (name: string, attrs?: Record<string, unknown>) =>
    focused && editor.isActive(name, attrs);

  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string) ?? "";

  return (
    <div className={styles.wrapper} onClick={() => setHasInteracted(true)}>
      <div className={styles.toolbar}>
        {/* ── Text formatting ── */}
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("bold") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("italic") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("strike") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("code") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"<>"}
        </button>

        <div className={styles.divider} />

        {/* ── Font family ── */}
        <select
          className={styles.fontSelect}
          value={
            FONT_FAMILIES.find((f) =>
              f.value && isBlockActive("textStyle", { fontFamily: f.value })
            )?.value ?? ""
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor.chain().focus().setFontFamily(val).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* ── Font size ── */}
        <select
          className={styles.fontSelect}
          value={currentFontSize}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor
                .chain()
                .focus()
                .setMark("textStyle", { fontSize: val })
                .run();
            } else {
              editor
                .chain()
                .focus()
                .unsetMark("textStyle")
                .run();
            }
          }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className={styles.divider} />

        {/* ── Text color ── */}
        <div className={styles.colorGroup}>
          <span className={styles.colorLabel}>A</span>
          <div
            className={styles.colorIndicator}
            style={{
              background:
                (editor.getAttributes("textStyle").color as string) ??
                "var(--text-primary)",
            }}
          />
          <input
            type="color"
            className={styles.colorInput}
            value={
              (editor.getAttributes("textStyle").color as string) ?? "#000000"
            }
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            title="Text color"
          />
        </div>

        {/* ── Highlight color ── */}
        <div className={styles.colorGroup}>
          <span className={styles.colorLabel}>BG</span>
          <div
            className={styles.colorIndicator}
            style={{
              background:
                (editor.getAttributes("highlight").color as string) ??
                "transparent",
            }}
          />
          <input
            type="color"
            className={styles.colorInput}
            value={
              (editor.getAttributes("highlight").color as string) ?? "#ffff00"
            }
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: e.target.value })
                .run()
            }
            title="Background color"
          />
        </div>

        {/* ── Color presets ── */}
        <div className={styles.presetColors}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={styles.presetDot}
              style={{ background: color }}
              onClick={() =>
                editor.chain().focus().setColor(color).run()
              }
              title={color}
            />
          ))}
        </div>

        {/* ── Unset formatting ── */}
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() =>
            editor.chain().focus().unsetColor().unsetHighlight().unsetFontFamily().unsetMark("textStyle").run()
          }
          title="Clear formatting"
        >
          Clear
        </button>

        <div className={styles.divider} />

        {/* ── Headings ── */}
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("heading", { level: 1 }) ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("heading", { level: 2 }) ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("heading", { level: 3 }) ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>

        <div className={styles.divider} />

        {/* ── Lists & blocks ── */}
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("bulletList") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          UL
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("orderedList") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          OL
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("blockquote") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${isBlockActive("codeBlock") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Code
        </button>

        <div className={styles.divider} />

        {/* ── Insert ── */}
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={addLink}
        >
          Link
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={addImage}
        >
          Image
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          HR
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${styles.embedBtn}`}
          onClick={() => insertEmbed(editor)}
          title="YouTube, Twitter, Instagram, Spotify..."
        >
          Embed
        </button>
      </div>

      <div className={styles.editor} data-lenis-prevent>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
