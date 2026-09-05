"use client";

/* HTML↔노드 변환 보조 — 플로트 이미지 격리 · 블록 들여쓰기 복원 · 본문에서 떼어낸 미디어 직렬화 · 열 너비 계산 — PlateEditor.tsx 에서 분리 (#680). */

export function isolateFloatImageBlocks(nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const isFloatImg = (c: Record<string, unknown>) =>
    c?.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
  const meaningful = (c: Record<string, unknown>) =>
    typeof c.text === "string" ? (c.text as string).replace(/[​‌‍﻿\s]/g, "").length > 0 : true;
  const pad = (a: Array<Record<string, unknown>>) => {
    const arr = [...a];
    if (!arr.length || typeof arr[0]?.text !== "string") arr.unshift({ text: "" });
    if (typeof arr[arr.length - 1]?.text !== "string") arr.push({ text: "" });
    return arr;
  };
  const out: Array<Record<string, unknown>> = [];
  for (const block of nodes) {
    const kids = block?.children as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(kids)) { out.push(block); continue; }
    const imgIdx = kids.findIndex(isFloatImg);
    if (imgIdx === -1) { out.push(block); continue; }
    const before = kids.slice(0, imgIdx);
    const after = kids.slice(imgIdx + 1);
    const hasBefore = before.some(meaningful);
    const hasAfter = after.some(meaningful);
    if (!hasBefore && !hasAfter) { out.push(block); continue; }
    const blockType = typeof block.type === "string" ? block.type : "p";
    if (hasBefore) out.push({ ...block, type: blockType, children: pad(before) });
    out.push({ type: "p", children: [{ text: "" }, kids[imgIdx], { text: "" }] });
    // 뒤쪽에 또 float 이미지가 있을 수 있으니 재귀
    if (hasAfter) out.push(...isolateFloatImageBlocks([{ ...block, type: blockType, children: pad(after) }]));
  }
  return out;
}

// Plate deserialize 는 블록의 margin-left(들여쓰기)를 버린다 → 저장 HTML 의 margin-left 를 읽어 indent 복원.
// 최상위 블록 element ↔ 노드를 순서+타입으로 대응(불일치 시 스킵해 안전). 리스트(li+data-indent)는 자체 경로라 제외.
const INDENT_TAG_TYPE: Record<string, string> = { P: "p", H1: "h1", H2: "h2", H3: "h3", H4: "h4", H5: "h5", H6: "h6", BLOCKQUOTE: "blockquote" };
export function restoreBlockIndent(html: string, nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (typeof window === "undefined" || !html) return nodes;
  try {
    // el.children ↔ node.children 를 병렬로 재귀 순회 → 최상위뿐 아니라 열/탭 등 컨테이너 "안쪽"
    // 블록의 indent 도 복원. (안 하면 열에 넣은 묶인 블록/들여쓴 블록이 로드 시 풀린다.)
    const walk = (els: Element[], nodeList: Array<Record<string, unknown>>) => {
      for (let i = 0; i < Math.min(els.length, nodeList.length); i++) {
        const el = els[i] as HTMLElement;
        const node = nodeList[i];
        if (!el || !node) continue;
        const t = INDENT_TAG_TYPE[el.tagName];
        if (t && node.type === t && !node.listStyleType) {
          const ml = parseInt(el.style.marginLeft || "", 10);
          if (ml > 0) node.indent = Math.round(ml / 24);
        }
        // 컨테이너(열/탭/토글/콜아웃…) 내부로 재귀. 텍스트 리프는 children 이 없어 자동 종료.
        if (Array.isArray(node.children) && el.children.length) {
          walk(Array.from(el.children), node.children as Array<Record<string, unknown>>);
        }
      }
    };
    walk(Array.from(new DOMParser().parseFromString(html, "text/html").body.children), nodes);
  } catch { /* noop */ }
  return nodes;
}

// ── detached(본문에서 제거된) 미디어를 저장 HTML 에 숨김 div 로 round-trip ──
// 본문엔 안 보이지만 저장/로드 시 패널의 "삭제됨" 목록을 유지하기 위함.
// detached 가 없으면 빈 문자열 → 일반 글의 저장 HTML 은 그대로(영향 0).
export function serializeDetachedMedia(items: { url: string; mediaType?: string }[]): string {
  if (!items.length) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div data-detached-media="1" style="display:none">${items
    .map((d) => `<img src="${esc(d.url)}" data-detached-type="${esc(d.mediaType || "")}" />`)
    .join("")}</div>`;
}
export function stripDetachedMedia(html: string): string {
  return html.replace(/<div data-detached-media="1"[\s\S]*?<\/div>/g, "");
}
export function extractDetachedMedia(html: string): { url: string; mediaType?: string }[] {
  const block = html.match(/<div data-detached-media="1"[\s\S]*?<\/div>/);
  if (!block) return [];
  const out: { url: string; mediaType?: string }[] = [];
  const re = /<img\s[^>]*?src="([^"]*)"[^>]*?>/g;
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  let im: RegExpExecArray | null;
  while ((im = re.exec(block[0])) !== null) {
    const url = unesc(im[1]);
    const tm = im[0].match(/data-detached-type="([^"]*)"/);
    out.push({ url, mediaType: tm && tm[1] ? unesc(tm[1]) : undefined });
  }
  return out;
}

// 열 너비를 정수 %로 균등 분배(합=정확히 100). @platejs/layout normalizer 는 열 너비 합이
// 100 이 아니면 소수 보정을 반복 → 부동소수점 때문에 수렴 못 하고 normalize 무한루프.
// 항상 정수 합 100 을 보장해 normalizer 가 손대지 않게 한다.
export function equalColWidths(n: number): string[] {
  const base = Math.floor(100 / n);
  return Array.from({ length: n }, (_, i) => `${i < n - 1 ? base : 100 - base * (n - 1)}%`);
}

// weights → 정수 %(각 ≥1, 합 = total). @platejs/layout normalizer 는 열 width 합이 정확히 100 이 아니면
// 매 dirty 마다 재분배해 무한 normalize 루프(Slate throw)를 유발하므로, 모든 % 지정은 반드시 이걸 통과시킨다.
// total ≥ weights.length 필요 — 열 ≤ 12, total=100 이면 항상 성립. (largest-remainder 라운딩)

// 각 열의 **실제 렌더 폭**(px) — px/%/드래그 무엇이든 현재 값을 그대로 반영한다.
// (px 렌더는 flex: 0 0 <px> 라 measured === widthPx)
// 모듈 레벨인 이유: 열 레이아웃 popover 의 label 라인(총 너비)과 아래 ColumnWidthControls 가
// 반드시 같은 수를 봐야 해서 — 각자 재면 반올림이 갈려 라벨과 % 칸이 서로 안 맞는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function measureColumnPxs(editor: any, activePath: number[], count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    try {
      const entry = editor.api.node([...activePath, i]);
      if (!entry) return 0;
      const dom = editor.api.toDOMNode(entry[0]) as HTMLElement | null;
      return Math.round(dom?.getBoundingClientRect().width ?? 0);
    } catch { return 0; }
  }).map((w) => w || 1);
}

// ── Column width — 열마다 % 칸 + px 칸(둘 다 항상 활성, 토글 없음). ──
