import { useState, useCallback, useRef, useEffect } from "react";
import { useStateFromProp } from "@/hooks/useStateFromProp";

import {
  useEditorRef,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";

import { showToast } from "@/stores/toastStore";

import base from "../../RichTextEditor.module.css";
import code from "../../EditorCode.module.css";
import diagram from "../../EditorDiagram.module.css";
import media from "../../EditorMedia.module.css";
const styles = { ...base, ...code, ...diagram, ...media };

/* 요소들이 공유하는 조각 — 블록 아래 클릭 영역 · 인라인 캡션 · 인라인 커서 타깃 · 빈 블록 플레이스홀더 — elements.tsx 에서 분리 (#680). */

export function BlockTailClickZone({ path }: { path: number[] | null }) {
  const editor = useEditorRef();
  if (!path) return null;
  return (
    <span
      contentEditable={false}
      onClick={(e) => {
        e.stopPropagation();
        try {
          const nextPath = [path[0] + 1];
          const nextNode = editor.api.node(nextPath);
          if (nextNode) {
            editor.tf.select({ path: [...nextPath, 0], offset: 0 });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: nextPath });
            editor.tf.select({ path: [...nextPath, 0], offset: 0 });
          }
          editor.tf.focus();
        } catch { /* ignore */ }
      }}
      style={{ display: "block", width: "100%", minHeight: 8, cursor: "text" }}
    />
  );
}

/** 인라인 캡션 입력 — 이미지/표 공용 */
const CAPTION_MAX = 200;

export function InlineCaption({ caption, onCommit, onEditingChange, autoEdit, overlayMode }: { caption: string; onCommit: (v: string) => void; onEditingChange?: (editing: boolean) => void; autoEdit?: boolean; overlayMode?: boolean }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const setEditingWrapped = useCallback((v: boolean) => { setEditing(v); onEditingChange?.(v); }, [onEditingChange]);
  const [draft, setDraft] = useStateFromProp(caption);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoEditDone = useRef(false);
  const overLimitRef = useRef(false);

  // 높이는 CSS field-sizing:content 가 내용에 맞춰 자동 조절 (인라인 height 박으면 그게 무시되므로 설정 X).
  // field-sizing 미지원 브라우저 대비 fallback — 명시 height 대신 rows 만으로 대략.
  const shownValue = editing ? draft : caption;

  // autoEdit: 처음 마운트 시 자동 편집 모드 진입
  useEffect(() => {
    if (autoEdit && !autoEditDone.current) {
      autoEditDone.current = true;
      setEditingWrapped(true);
    }
  }, [autoEdit, setEditingWrapped]);

  const commit = useCallback(() => {
    setEditingWrapped(false);
    const trimmed = draft.trim();
    if (trimmed !== caption) onCommit(trimmed);
  }, [draft, caption, onCommit, setEditingWrapped]);

  return (
    <textarea
      ref={inputRef}
      data-img-caption
      contentEditable={false}
      rows={1}
      value={shownValue}
      readOnly={!editing}
      onChange={(e) => {
        const v = e.target.value;
        if (v.length > CAPTION_MAX) {
          // 제한 초과 — 잘라내고 toast 1회 알림 (다시 제한 아래로 내려가면 재알림 허용)
          if (!overLimitRef.current) { showToast(t("editor.captionMaxLength"), "warning"); overLimitRef.current = true; }
          setDraft(v.slice(0, CAPTION_MAX));
        } else {
          overLimitRef.current = false;
          setDraft(v);
        }
      }}
      onBlur={() => { if (editing) setTimeout(() => commit(), 0); }}
      // 캡션 클릭이 (1) 부모 onClick=selectImage 로 버블되거나 (2) Slate 네이티브 mousedown
      // 리스너가 caret 을 옆(float) 텍스트에 놓는 것 둘 다 차단해야 캡션이 편집됨.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // 전파만 차단(에디터/Slate 가 caret 가져가는 것 방지). textarea 는 진짜 폼 요소라
        // preventDefault 하면 네이티브 focus 자체가 막히므로 호출하지 않는다.
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (!editing) { setEditingWrapped(true); setDraft(caption); setTimeout(() => { inputRef.current?.focus(); }, 0); }
      }}
      onKeyDown={(e) => {
        if (!editing) return;
        // Enter=확정 / Shift+Enter=줄바꿈 / Esc=취소
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(caption); setEditingWrapped(false); }
      }}
      placeholder={editing ? t("editor.captionInput") : (caption || t("editor.captionAdd"))}
      autoFocus={editing}
      className={styles.captionInput}
      style={{
        display: "block",
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        textAlign: "center",
        fontSize: overlayMode ? 11 : "var(--font-size-body)",
        lineHeight: 1.5,
        padding: overlayMode ? "0" : "var(--spacing-2xs) var(--spacing-3xs) 0",
        fontFamily: "var(--font-space-grotesk)",
        color: overlayMode
          ? (editing ? "#fff" : "rgba(255,255,255,0.9)")
          : (caption || editing ? "var(--text-tertiary)" : "var(--text-muted)"),
        cursor: editing ? "text" : "pointer",
      }}
    />
  );
}

export function InlineCursorTarget({ side, element }: { side: "before" | "after"; element: Record<string, unknown> }) {
  const editor = useEditorRef();
  return (
    <span
      contentEditable={false}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const path = editor.api.findPath(element as Parameters<typeof editor.api.findPath>[0]);
          if (!path) return;
          if (side === "before") {
            const point = editor.api.before({ path, offset: 0 });
            if (point) editor.tf.select(point);
          } else {
            const point = editor.api.after({ path, offset: 0 });
            if (point) editor.tf.select(point);
          }
          editor.tf.focus();
        } catch { /* ignore */ }
      }}
      style={{
        position: "absolute",
        [side === "before" ? "left" : "right"]: -6,
        top: 0,
        width: 6,
        height: "100%",
        cursor: "text",
        zIndex: 5,
      }}
    />
  );
}

// ── 코드블록 엘리먼트 (줄바꿈/스크롤 토글) ──
/** 예시 하나 — 코드 + 렌더 그래프 + 확대/축소/전체화면/복사 */

export function isEmptyBlock(element: unknown): boolean {
  const ch = (element as { children?: { text?: string }[] })?.children;
  return !!ch && ch.length === 1 && (ch[0]?.text ?? "") === "";
}
// 커서가 놓인 빈 블록에 뜨는 placeholder (contentEditable=false, 흐름 밖)
// listIndent — 리스트 항목이면 마커 폭(~1.1em)만큼 오른쪽으로 밀어 실제 텍스트 시작점과 정렬한다
// (안 그러면 마커가 placeholder 첫 글자 위에 겹쳐 그려진다).
export function BlockPlaceholder({ text, listIndent }: { text: string; listIndent?: boolean }) {
  const left = listIndent ? "calc(var(--float-edge, 0px) + 1.15em)" : "var(--float-edge, 0px)";
  return (
    <span
      contentEditable={false}
      className={styles.blockPlaceholder}
      // right:0 + overflow ellipsis — 열 너비가 좁으면 잘리는 대신 말줄임표(…)
      style={{ position: "absolute", left, right: 0, top: 0, pointerEvents: "none", color: "var(--text-muted)", opacity: 0.45, userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
    >
      {text}
    </span>
  );
}
