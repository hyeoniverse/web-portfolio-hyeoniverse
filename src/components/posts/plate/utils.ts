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

// 수식 편집 중 심볼 삽입을 위한 모듈 스코프 ref (MathFloatingEdit ↔ 툴바 통신)
export const _mathSymbolInsert: { current: ((latex: string) => void) | null } = { current: null };
export const _mathEditingSet: { current: ((v: boolean) => void) | null } = { current: null };
