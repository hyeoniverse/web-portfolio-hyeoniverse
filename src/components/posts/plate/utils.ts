import type { SlateEditor, TElement, TText, Descendant } from "platejs";

/** Slate child 가 element 인지 (text 가 아닌지) 판별 */
function isElement(node: Descendant): node is TElement {
  return "children" in node && Array.isArray((node as TElement).children);
}

export function isInAncestor(editor: SlateEditor, type: string): boolean {
  if (!editor?.selection) return false;
  try {
    const path: number[] = editor.selection.anchor.path;
    let children: readonly Descendant[] = editor.children;
    for (const idx of path) {
      const next: Descendant | undefined = children[idx];
      if (!next || !isElement(next)) return false;
      if (next.type === type) return true;
      children = next.children;
    }
    return false;
  } catch { return false; }
}

/** selection 경로를 따라 특정 type 노드와 path를 찾는다 */
export function findAncestorOfType(
  editor: SlateEditor,
  type: string,
): { node: TElement; path: number[] } | null {
  if (!editor?.selection) return null;
  try {
    const anchorPath: number[] = editor.selection.anchor.path;
    let children: readonly Descendant[] = editor.children;
    for (let i = 0; i < anchorPath.length; i++) {
      const next: Descendant | undefined = children[anchorPath[i]];
      if (!next || !isElement(next)) return null;
      if (next.type === type) return { node: next, path: anchorPath.slice(0, i + 1) };
      children = next.children;
    }
    return null;
  } catch { return null; }
}

/** path를 따라 노드를 직접 가져온다 (editor.api.node 대체) */
export function nodeAtPath(
  editor: SlateEditor,
  path: number[],
): Descendant | null {
  try {
    let children: readonly Descendant[] = editor.children;
    let node: Descendant | undefined;
    for (const idx of path) {
      node = children[idx];
      if (!node) return null;
      if (isElement(node)) children = node.children;
    }
    return node ?? null;
  } catch { return null; }
}

/** selection 경로에서 td/th 셀 노드를 찾는다 */
export function findCurrentCell(editor: SlateEditor): TElement | null {
  if (!editor?.selection) return null;
  try {
    const path: number[] = editor.selection.anchor.path;
    let children: readonly Descendant[] = editor.children;
    for (const idx of path) {
      const next: Descendant | undefined = children[idx];
      if (!next || !isElement(next)) return null;
      if (next.type === "td" || next.type === "th") return next;
      children = next.children;
    }
    return null;
  } catch { return null; }
}

export function getEditorText(editor: SlateEditor): string {
  const getText = (node: Descendant): string => {
    if (!isElement(node)) return (node as TText).text ?? "";
    return node.children.map(getText).join("");
  };
  return (editor.children || []).map(getText).join("");
}

// ── 인라인 이미지 DnD를 위한 모듈 스코프 ref ──
export const _inlineDragPath: { current: number[] | null } = { current: null };

// 수식 편집 중 심볼 삽입을 위한 모듈 스코프 ref (MathFloatingEdit ↔ 툴바 통신)
export const _mathSymbolInsert: { current: ((latex: string) => void) | null } = { current: null };
export const _mathEditingSet: { current: ((v: boolean) => void) | null } = { current: null };
export const _mathDeleteNode: { current: (() => void) | null } = { current: null };
export const _mathToggleMode: { current: (() => void) | null } = { current: null };

// 미디어 항목(패널 재삽입 등)이 동영상인지 판별 — mediaType("media_embed"|"video") 또는 확장자.
export function isVideoMedia(mediaType?: string, url?: string): boolean {
  return mediaType === "media_embed" || mediaType === "video"
    || (!!url && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url));
}

// 이미지 업로드 함수 공유 (CalloutElement 이모지 피커에서 사용)
export const _imageUploadFn: { current: ((file: File) => Promise<string>) | null } = { current: null };

// 업로드 실패 시 상세 사유 모달을 띄우는 핸들러 공유 — 여러 삽입 진입점(슬래시/툴바 등)이
// catch 블록에서 호출. PlateEditor 가 useModalStore 기반으로 등록.
export const _uploadErrorFn: { current: ((err: unknown) => void) | null } = { current: null };

// "/" 텍스트 없이 슬래시 메뉴를 수동으로 여는 트리거 — 블록 + 버튼이 호출, SlashMenu 가 등록.
// onCancel: 메뉴를 명령 선택 없이 닫을 때(blur/Esc/이동) 호출 — + 로 새로 만든 빈 블록 제거용.
export const _slashOpenTrigger: { current: ((onCancel?: () => void) => void) | null } = { current: null };

// 공통 EmojiPicker 열기 — 슬래시 "이모지" 명령에서 호출. EmojiMenu 가 마운트 시 채움.
export const _emojiPickerTrigger: { current: (() => void) | null } = { current: null };

// 게시물 링크 검색 열기 — 슬래시/툴바에서 호출. PostLinkMenu 가 마운트 시 채움("[[" 를 삽입해 인라인 검색 진입).
export const _postLinkTrigger: { current: (() => void) | null } = { current: null };

// 현재 편집 중인 글의 메타 — PostEditor 가 설정. PostLinkMenu 가 "연관 게시물" 스코어링에 사용.
export const _postLinkCategory: { current: string } = { current: "" };
export const _postLinkTags: { current: string[] } = { current: [] };
export const _postLinkExcludeId: { current: string } = { current: "" };

// 블록 DnD 자동 스크롤 대상 = 에디터 스크롤 컨테이너([data-slate-editor]). PlateEditor 가 마운트 시 채움.
export const _dndScrollContainer: { current: HTMLElement | null } = { current: null };

// ── Find & Replace: pure text-match helper ──

export interface FindMatch {
  path: number[];
  offset: number;
  length: number;
}

export interface FindOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
}

/**
 * Walk a Slate node tree and collect regex matches.
 * Pure function — no editor state dependency.
 */
export function findTextMatches(
  nodes: unknown[],
  query: string,
  opts: FindOptions = {},
): FindMatch[] {
  if (!query) return [];
  const { caseSensitive = false, wholeWord = false, useRegex = false } = opts;
  let regex: RegExp;
  try {
    if (useRegex) {
      regex = new RegExp(query, caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
      regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
    }
  } catch {
    return [];
  }

  const matches: FindMatch[] = [];
  const walk = (children: unknown[], parentPath: number[]) => {
    for (let i = 0; i < children.length; i++) {
      const node = children[i] as Record<string, unknown>;
      const path = [...parentPath, i];
      if (typeof node.text === "string") {
        let m: RegExpExecArray | null;
        regex.lastIndex = 0;
        while ((m = regex.exec(node.text)) !== null) {
          matches.push({ path, offset: m.index, length: m[0].length });
          if (m[0].length === 0) regex.lastIndex++;
        }
      } else if (Array.isArray(node.children)) {
        walk(node.children, path);
      }
    }
  };
  walk(nodes, []);
  return matches;
}
