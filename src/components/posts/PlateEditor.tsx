"use client";

import React, { useState, useCallback, useEffect, useRef, useImperativeHandle } from "react";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
import { insertImage, insertMediaEmbed } from "@platejs/media";
import { upsertLink, unwrapLink } from "@platejs/link";
import "katex/dist/katex.min.css";
import { slateToHtml, setWrapLabel, setScrollLabel, type SlateNode } from "./plateSerializer";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./RichTextEditor.module.css";

// ── plate/ submodules ──
import type { PlateEditorProps } from "./plate/types";
export type { EditorImageInfo, PlateEditorHandle } from "./plate/types";
import { isInAncestor, getEditorText, _mathEditingSet } from "./plate/utils";
import { plugins } from "./plate/plugins";

// ── hooks ──
import {
  useTableInfo,
  useBorderPopover,
  useTableActions,
} from "./plate/hooks";

// ── toolbar components ──
import MainToolbar from "./plate/toolbars/MainToolbar";
import TableToolbar from "./plate/toolbars/TableToolbar";
import ImageToolbar from "./plate/toolbars/ImageToolbar";
import MathToolbar from "./plate/toolbars/MathToolbar";
import InlineInputToolbar from "./plate/toolbars/InlineInputToolbar";

// Re-export ImagePanel for backward compatibility
export { ImagePanel } from "./plate/ImagePanel";

// ── Main component ──
export default function PlateEditor({
  value,
  onChange,
  onImageUpload,
  editorRef,
}: PlateEditorProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const isInternalUpdate = useRef(false);
  const prevValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastSlateValueRef = useRef<SlateNode[] | undefined>(undefined);
  const [, setTick] = useState(0);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);

  // ── Labels (language 변경 시에만 재설정) ──
  useEffect(() => {
    setWrapLabel(`↩ ${t("common.codeWrap")}`);
    setScrollLabel(`↔ ${t("common.codeScroll")}`);
  }, [t]);

  // ── Inline input states ──
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedInputValue, setEmbedInputValue] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const embedInputRef = useRef<HTMLInputElement>(null);

  // ── HTML mode ──
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");

  // ── Math editing ──
  const [mathEditing, setMathEditing] = useState(false);
  _mathEditingSet.current = setMathEditing;

  const editor = usePlateEditor({
    plugins,
    value: value || "<p></p>",
  });

  // ── Selection save/restore ──
  const savedSelectionRef = useRef<typeof editor.selection>(null);
  const saveSelection = useCallback(() => {
    savedSelectionRef.current = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
  }, [editor]);
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      editor.tf.select(savedSelectionRef.current);
      editor.tf.focus();
    }
  }, [editor]);

  // ── Hooks for derived state ──
  const isInTable = isInAncestor(editor, "table");

  const { currentTableInfo, cellBg, cellVAlign, tableCaption, isZebraActive, currentZebraColor } = useTableInfo(editor, isInTable);
  const { toggleZebraStripe, reapplyZebraIfActive, resetTableFormat, setCellAttr } = useTableActions(editor);
  const borderPopover = useBorderPopover(editor, savedSelectionRef);

  // ── Image state ──
  const selectedImage = (() => {
    if (!editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      return entry ? (entry[0] as Record<string, unknown>) : null;
    } catch { return null; }
  })();
  const isInImage = !!selectedImage;

  // ── void 블록 전후에 빈 paragraph 보장 ──
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (editor as any).normalizeNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).normalizeNode = (entry: any, options: any) => {
      const [node, path] = entry;
      if (path.length === 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const type = (node as any).type;
        if (type === "media_embed" || type === "hr") {
          const idx = path[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const emptyP = { type: "p", children: [{ text: "" }] } as any;
          if (idx === 0) { editor.tf.insertNodes(emptyP, { at: [0] }); return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prev = editor.children[idx - 1] as any;
          if (prev && (prev.type === "media_embed" || prev.type === "hr")) {
            editor.tf.insertNodes(emptyP, { at: [idx] }); return;
          }
          if (idx === editor.children.length - 1) {
            editor.tf.insertNodes(emptyP, { at: [idx + 1] }); return;
          }
        }
      }
      orig(entry, options);
    };
  }, [editor]);

  // ── 외부 value 동기화 ──
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      prevValueRef.current = value;
      return;
    }
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    try {
      const nodes = editor.api.html.deserialize({ element: value || "<p></p>" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setValue(nodes as any);
    } catch {
      editor.tf.setValue(value || "<p></p>");
    }
  }, [value, editor]);

  // ── onChange ──
  const handleChange = useCallback(
    ({ value: slateValue }: { value: SlateNode[] }) => {
      setTick((t) => t + 1);
      if (slateValue !== lastSlateValueRef.current) {
        lastSlateValueRef.current = slateValue;
        isInternalUpdate.current = true;
        const html = slateToHtml(slateValue);
        prevValueRef.current = html;
        onChangeRef.current(html);
      }
    },
    [],
  );

  // ── Image actions ──
  const addImage = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onImageUpload(file);
      insertImage(editor, url);
    };
    input.click();
  }, [editor, onImageUpload]);

  const setImageAttr = useCallback((attr: string, val: unknown) => {
    if (!editor?.selection) return;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) editor.tf.setNodes({ [attr]: val }, { at: entry[1] });
    } catch { /* ignore */ }
  }, [editor]);

  const moveImage = useCallback((direction: "up" | "down") => {
    if (!editor?.selection) return;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (!entry) return;
      const path = entry[1];
      const idx = path[path.length - 1];
      const parentPath = path.slice(0, -1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent = (editor as any).api.node(parentPath)?.[0] as { children?: unknown[] } | undefined;
      const siblingCount = parent?.children?.length ?? 0;
      if (direction === "up" && idx > 0) {
        editor.tf.moveNodes({ at: path, to: [...parentPath, idx - 1] });
      } else if (direction === "down" && idx < siblingCount - 1) {
        editor.tf.moveNodes({ at: path, to: [...parentPath, idx + 1] });
      }
    } catch { /* ignore */ }
  }, [editor]);

  // ── Link / Embed insert ──
  const doInsertLink = useCallback((rawUrl: string) => {
    if (!editor || !rawUrl) return;
    let url = rawUrl;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("mailto:") && !url.startsWith("tel:")) {
      url = `https://${url}`;
    }
    restoreSelection();
    const sel = editor.selection;
    let selectedText: string | undefined;
    if (sel && !editor.api.isCollapsed()) {
      selectedText = editor.api.string(sel);
    }
    setTimeout(() => {
      try {
        upsertLink(editor, { url, target: "_blank", text: selectedText });
      } catch {
        editor.tf.insertNodes({
          type: "a", url, target: "_blank",
          children: [{ text: selectedText || url }],
        });
      }
    }, 0);
  }, [editor, restoreSelection]);

  const doInsertEmbed = useCallback((url: string) => {
    if (!editor || !url) return;
    restoreSelection();
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embedNode = { type: "media_embed", url, children: [{ text: "" }] } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emptyP = { type: "p", children: [{ text: "" }] } as any;
      try {
        if (!editor.selection) {
          editor.tf.insertNodes([embedNode, emptyP], { at: [editor.children.length] });
          return;
        }
        insertMediaEmbed(editor, { url });
      } catch {
        try { editor.tf.insertNodes([embedNode, emptyP]); }
        catch {
          try { upsertLink(editor, { url, target: "_blank" }); }
          catch { editor.tf.insertNodes({ type: "a", url, target: "_blank", children: [{ text: url }] }); }
        }
      }
      // embed 뒤에 빈 paragraph 보장
      try {
        if (editor.selection) {
          const path = editor.selection.anchor.path;
          for (let i = 0; i < path.length; i++) {
            const node = editor.api.node([...path.slice(0, i + 1)]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (node && (node[0] as any).type === "media_embed") {
              const nextPath = [...path.slice(0, i), path[i] + 1];
              const next = editor.api.node(nextPath);
              if (!next) editor.tf.insertNodes(emptyP, { at: nextPath });
              editor.tf.select({ anchor: { path: [...nextPath, 0], offset: 0 }, focus: { path: [...nextPath, 0], offset: 0 } });
              break;
            }
          }
        }
      } catch { /* ignore */ }
    }, 0);
  }, [editor, restoreSelection]);

  // ── Math insert ──
  const doInsertMath = useCallback((latex: string, mode: "inline" | "block") => {
    if (!editor) return;
    restoreSelection();
    editor.tf.insertNodes({
      type: mode === "inline" ? "inline_equation" : "equation",
      texExpression: latex,
      children: [{ text: "" }],
    });
  }, [editor, restoreSelection]);

  // ── Inline input close handlers (moved from JSX to avoid hook-in-render) ──
  const closeLinkInput = useCallback(() => { setShowLinkInput(false); setLinkInputValue(""); }, []);
  const closeEmbedInput = useCallback(() => { setShowEmbedInput(false); setEmbedInputValue(""); }, []);

  // ── Link unwrap on Backspace at link boundary ──
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
      const { anchor } = editor.selection;
      const anchorPath = anchor.path;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = { children: editor.children };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let linkNode: any = null;
      let linkDepth = -1;
      for (let i = 0; i < anchorPath.length; i++) {
        cur = cur?.children?.[anchorPath[i]];
        if (!cur) break;
        if (cur.type === "a") { linkNode = cur; linkDepth = i; break; }
      }
      if (linkNode) {
        const children = linkNode.children as { text: string }[];
        const lastChild = children[children.length - 1];
        const lastChildIdx = children.length - 1;
        const isAtEnd = anchorPath[linkDepth + 1] === lastChildIdx && anchor.offset === (lastChild?.text?.length ?? 0);
        if (isAtEnd) {
          e.preventDefault();
          unwrapLink(editor);
        }
      }
    }
  }, [editor]);

  // ── All media (images + video embeds, for ref) ──
  const contentImages = React.useMemo(() => {
    const imgs: { url: string; path: number[]; mediaType?: string }[] = [];
    const walk = (nodes: unknown[], path: number[]) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node, i) => {
        const n = node as Record<string, unknown>;
        if (n.type === "img" && n.url) imgs.push({ url: n.url as string, path: [...path, i], mediaType: "img" });
        if (n.type === "media_embed" && n.url) imgs.push({ url: n.url as string, path: [...path, i], mediaType: "media_embed" });
        if (n.children) walk(n.children as unknown[], [...path, i]);
      });
    };
    walk(editor.children as unknown[], []);
    return imgs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor.children]);

  // ── 본문에서 제거된 미디어를 패널에 유지 ──
  const [detachedImages, setDetachedImages] = useState<{ url: string; mediaType?: string }[]>([]);
  const prevUrlSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentUrls = new Set(contentImages.map((img) => img.url));
    const prevUrls = prevUrlSetRef.current;
    // 이전에 있었는데 지금 없는 URL → detached로 추가
    if (prevUrls.size > 0) {
      const removed: { url: string; mediaType?: string }[] = [];
      for (const url of prevUrls) {
        if (!currentUrls.has(url)) {
          const prev = contentImages.find((img) => img.url === url) ??
            detachedImages.find((img) => img.url === url);
          removed.push({ url, mediaType: prev?.mediaType });
        }
      }
      if (removed.length > 0) {
        setDetachedImages((prev) => {
          const existing = new Set(prev.map((d) => d.url));
          const newItems = removed.filter((r) => !existing.has(r.url) && !currentUrls.has(r.url));
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
      }
    }
    // 본문에 다시 삽입된 URL은 detached에서 제거
    setDetachedImages((prev) => prev.filter((d) => !currentUrls.has(d.url)));
    prevUrlSetRef.current = currentUrls;
  }, [contentImages]); // eslint-disable-line react-hooks/exhaustive-deps

  // 패널에 표시할 전체 미디어: 본문 + detached
  const allImages = React.useMemo(() => {
    const detachedItems = detachedImages.map((d) => ({
      ...d,
      path: [] as number[],
      detached: true,
    }));
    return [...contentImages, ...detachedItems];
  }, [contentImages, detachedImages]);

  const removeDetached = useCallback((url: string) => {
    setDetachedImages((prev) => prev.filter((d) => d.url !== url));
  }, []);

  const selectImageAt = useCallback((path: number[]) => {
    try {
      editor.tf.select(path);
      editor.tf.focus();
      requestAnimationFrame(() => {
        const domNode = editor.api.toDOMNode(editor.api.node(path)?.[0] as never);
        if (domNode) domNode.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch { /* ignore */ }
  }, [editor]);

  const removeImage = useCallback((path: number[]) => {
    try { editor.tf.removeNodes({ at: path }); } catch { /* ignore */ }
  }, [editor]);

  const reorderImage = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromImg = allImages[fromIdx];
    const toImg = allImages[toIdx];
    if (!fromImg || !toImg) return;
    try { editor.tf.moveNodes({ at: fromImg.path, to: toImg.path }); } catch { /* ignore */ }
  }, [editor, allImages]);

  const insertImageByUrl = useCallback((url: string) => {
    if (editor) insertImage(editor, url);
  }, [editor]);

  const insertMediaByUrl = useCallback((url: string) => {
    if (editor) insertMediaEmbed(editor, { url });
  }, [editor]);

  useImperativeHandle(editorRef, () => ({
    getImages: () => allImages,
    selectImageAt,
    reorderImage,
    removeImage,
    insertImageByUrl,
    insertMediaByUrl,
    removeDetached,
  }), [allImages, selectImageAt, reorderImage, removeImage, insertImageByUrl, insertMediaByUrl, removeDetached]);

  // ── MainToolbar toggle handlers ──
  const toggleLinkInput = useCallback(() => {
    if (showLinkInput) { setShowLinkInput(false); setLinkInputValue(""); return; }
    saveSelection();
    setShowEmbedInput(false);
    setShowLinkInput(true);
    setLinkInputValue("");
    setTimeout(() => linkInputRef.current?.focus(), 30);
  }, [showLinkInput, saveSelection]);

  const toggleEmbedInput = useCallback(() => {
    if (showEmbedInput) { setShowEmbedInput(false); setEmbedInputValue(""); return; }
    saveSelection();
    setShowLinkInput(false);
    setShowEmbedInput(true);
    setEmbedInputValue("");
    setTimeout(() => embedInputRef.current?.focus(), 30);
  }, [showEmbedInput, saveSelection]);

  const toggleHtmlMode = useCallback(() => {
    if (!htmlMode) {
      setHtmlSource(slateToHtml(editor.children as SlateNode[]));
    } else {
      try {
        const nodes = editor.api.html.deserialize({ element: htmlSource || "<p></p>" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.setValue(nodes as any);
        isInternalUpdate.current = true;
        prevValueRef.current = htmlSource;
        onChangeRef.current(htmlSource);
      } catch { /* ignore */ }
    }
    setHtmlMode(!htmlMode);
  }, [htmlMode, htmlSource, editor]);

  const insertMathBlock = useCallback(() => doInsertMath("", "block"), [doInsertMath]);

  if (!editor) return null;

  // ── Character count ──
  const text = getEditorText(editor);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // ── Toolbar visibility ──
  const noOverlay = !showLinkInput && !showEmbedInput;

  return (
    <div className={styles.wrapper} data-theme={theme}>
      <Plate editor={editor} onChange={handleChange}>

        <MainToolbar
          editor={editor}
          isMac={isMac}
          showLinkInput={showLinkInput}
          onToggleLinkInput={toggleLinkInput}
          showEmbedInput={showEmbedInput}
          onToggleEmbedInput={toggleEmbedInput}
          htmlMode={htmlMode}
          onToggleHtmlMode={toggleHtmlMode}
          onAddImage={addImage}
          onInsertMath={insertMathBlock}
        />

        {/* ── Contextual Toolbars ── */}
        <div className={`${styles.editorContainer} ${isInTable && noOverlay ? styles.editorContainerActive : ""}`}>
          <TableToolbar
            editor={editor}
            visible={isInTable && noOverlay}
            cellBg={cellBg}
            cellVAlign={cellVAlign}
            tableCaption={tableCaption}
            currentTableInfo={currentTableInfo}
            isZebraActive={isZebraActive}
            currentZebraColor={currentZebraColor}
            setCellAttr={setCellAttr}
            toggleZebraStripe={toggleZebraStripe}
            reapplyZebraIfActive={reapplyZebraIfActive}
            resetTableFormat={resetTableFormat}
            saveSelection={saveSelection}
            borderPopover={borderPopover}
          />

          <ImageToolbar
            editor={editor}
            visible={isInImage && noOverlay}
            selectedImage={selectedImage}
            setImageAttr={setImageAttr}
            moveImage={moveImage}
          />

          <MathToolbar visible={mathEditing && noOverlay} />

          <InlineInputToolbar
            label="LINK"
            visible={showLinkInput}
            value={linkInputValue}
            onChange={setLinkInputValue}
            onSubmit={doInsertLink}
            onClose={closeLinkInput}
            placeholder="URL (https:// 생략 가능)"
            inputRef={linkInputRef}
          />

          <InlineInputToolbar
            label="EMBED"
            visible={showEmbedInput}
            value={embedInputValue}
            onChange={setEmbedInputValue}
            onSubmit={doInsertEmbed}
            onClose={closeEmbedInput}
            placeholder="YouTube · Spotify · X ..."
            inputType="url"
            inputRef={embedInputRef}
          />

          {htmlMode ? (
            <textarea
              className={styles.editorContent}
              value={htmlSource}
              onChange={(e) => {
                setHtmlSource(e.target.value);
                isInternalUpdate.current = true;
                prevValueRef.current = e.target.value;
                onChangeRef.current(e.target.value);
              }}
              style={{
                minHeight: 300, width: "100%",
                fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.6,
                padding: "var(--spacing-sm)", border: "none", outline: "none",
                resize: "vertical", background: "var(--bg-primary)", color: "var(--text-primary)",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}
              data-lenis-prevent
              spellCheck={false}
            />
          ) : (
            <PlateContent
              className={styles.editorContent}
              placeholder="Write your content..."
              style={{ minHeight: 300 }}
              data-lenis-prevent
              onKeyDown={handleContentKeyDown}
            />
          )}
        </div>

        {/* ── Status bar ── */}
        <div className={styles.statusBar}>
          <span>{charCount.toLocaleString()} {t("editor.charUnit")}</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()} {t("editor.wordUnit")}</span>
        </div>

      </Plate>
    </div>
  );
}
