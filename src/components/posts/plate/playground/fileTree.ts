// ── 러너(자체 srcdoc) 파일 탐색기용 공유 헬퍼 ──
// 경로 맵(Record<path, code>) → 폴더/파일 트리. 빈 폴더는 `<dir>/.gitkeep` placeholder 로 표현
// (Sandpack 커스텀 탐색기와 같은 규약). Sandpack 쪽은 자체 buildTree 를 그대로 두고, 여기선
// 러너 로컬 상태용으로 별도 구현 — Sandpack API 에 묶이지 않아 재사용이 안 되기 때문.

import type React from "react";
import { SiHtml5, SiCss, SiJavascript, SiTypescript, SiJson, SiMarkdown, SiReact } from "react-icons/si";
import { FileCode } from "@/components/icons";
import type { CmLang } from "./CodeMirrorEditor";

export type TreeNode = { name: string; path: string; dir: boolean; children: TreeNode[] };

/** 경로 목록 → 정렬된 폴더 우선 트리 */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const full of paths) {
    let parts = full.replace(/^\//, "").split("/").filter(Boolean);
    if (parts[parts.length - 1] === ".gitkeep") parts = parts.slice(0, -1); // 빈 폴더 placeholder
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc += "/" + part;
      const isFile = i === parts.length - 1 && /\.[^/]+$/.test(part);
      let node = level.find((n) => n.name === part && n.dir === !isFile);
      if (!node) { node = { name: part, path: isFile ? full : acc, dir: !isFile, children: [] }; level.push(node); }
      level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name)));
    nodes.forEach((n) => sort(n.children));
  };
  sort(root);
  return root;
}

/** 빈 폴더 placeholder 인가 */
export const isGitkeep = (p: string) => p.endsWith("/.gitkeep");

/** 확장자 → CodeMirror 언어 (html/css/js 만 지원 → 나머지는 js 로 폴백) */
export function fileLang(path: string): CmLang {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  return "javascript";
}

type IconMeta = { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string };
/** 확장자별 아이콘 (브랜드 컬러는 고유 identity 라 토큰화하지 않음 — Sandpack fileMeta 와 동일 규약) */
export function fileIcon(path: string): IconMeta {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "html": case "htm": return { Icon: SiHtml5, color: "#e34f26" };
    case "css": return { Icon: SiCss, color: "#2965f1" };
    case "js": case "mjs": case "cjs": return { Icon: SiJavascript, color: "#f7df1e" };
    case "ts": return { Icon: SiTypescript, color: "#3178c6" };
    case "jsx": case "tsx": return { Icon: SiReact, color: "#61dafb" };
    case "json": return { Icon: SiJson, color: "#cbcb41" };
    case "md": case "mdx": return { Icon: SiMarkdown, color: "#42a5f5" };
    default: return { Icon: FileCode, color: "var(--text-muted)" };
  }
}
