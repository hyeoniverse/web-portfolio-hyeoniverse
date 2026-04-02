// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInAncestor(editor: any, type: string): boolean {
  if (!editor?.selection) return false;
  try {
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (const idx of path) {
      if (!node?.children?.[idx]) return false;
      node = node.children[idx];
      if (node.type === type) return true;
    }
    return false;
  } catch { return false; }
}

/** selection 경로를 따라 특정 type 노드와 path를 찾는다 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findAncestorOfType(editor: any, type: string): { node: any; path: number[] } | null {
  if (!editor?.selection) return null;
  try {
    const anchorPath: number[] = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < anchorPath.length; i++) {
      if (!node?.children?.[anchorPath[i]]) return null;
      node = node.children[anchorPath[i]];
      if (node.type === type) return { node, path: anchorPath.slice(0, i + 1) };
    }
    return null;
  } catch { return null; }
}

/** path를 따라 노드를 직접 가져온다 (editor.api.node 대체) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function nodeAtPath(editor: any, path: number[]): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (const idx of path) {
      node = node?.children?.[idx];
      if (!node) return null;
    }
    return node;
  } catch { return null; }
}

/** selection 경로에서 td/th 셀 노드를 찾는다 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findCurrentCell(editor: any): any | null {
  if (!editor?.selection) return null;
  try {
    const path: number[] = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (const idx of path) {
      if (!node?.children?.[idx]) return null;
      node = node.children[idx];
      if (node.type === "td" || node.type === "th") return node;
    }
    return null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEditorText(editor: any): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getText = (node: any): string => {
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) return node.children.map(getText).join("");
    return "";
  };
  return (editor.children || []).map(getText).join("");
}

// ── 블록 DnD를 위한 모듈 스코프 ref ──
export const _blockDragPath: { current: number[] | null } = { current: null };

// 수식 편집 중 심볼 삽입을 위한 모듈 스코프 ref (MathFloatingEdit ↔ 툴바 통신)
export const _mathSymbolInsert: { current: ((latex: string) => void) | null } = { current: null };
export const _mathEditingSet: { current: ((v: boolean) => void) | null } = { current: null };
export const _mathDeleteNode: { current: (() => void) | null } = { current: null };

// 이미지 업로드 함수 공유 (CalloutElement 이모지 피커에서 사용)
export const _imageUploadFn: { current: ((file: File) => Promise<string>) | null } = { current: null };

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
