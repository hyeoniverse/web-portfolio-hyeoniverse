/**
 * Plate (Slate JSON) → HTML 직렬화
 * 클라이언트에서 onChange마다 호출되므로 의존성 없이 경량으로 구현
 */

import { formatDateValue } from "./plate/dateUtils";
import { officeViewerUrl } from "@/lib/officeViewer";
import { ALIGN_TO_JUSTIFY } from "./plate/constants";

let _wrapLabel = "↩ Wrap";
let _scrollLabel = "↔ Scroll";

// 열 기본 배경(테마 고정 라이트 neutral-50 = presets.COLUMN_DEFAULT_BG). --_col-bg 미지정 시 fallback.
const COLUMN_BG_FALLBACK = "oklch(97.3% 0.0082 91.48)";

/** slateToHtml 호출 전에 세팅하면 코드블록 버튼 라벨에 반영 */
export function setWrapLabel(label: string) {
  _wrapLabel = label;
}
export function setScrollLabel(label: string) {
  _scrollLabel = label;
}

// Slate node 타입
interface SlateText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: boolean;
  kbd?: boolean;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
}

interface SlateElement {
  type?: string;
  children: SlateNode[];
  [key: string]: unknown;
}

export type SlateNode = SlateText | SlateElement;

function isText(node: SlateNode): node is SlateText {
  return "text" in node;
}

// ── HTML escape ──
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Inline style builder (text marks) ──
function buildInlineStyle(node: SlateText): string {
  const parts: string[] = [];
  if (node.color) parts.push(`color: ${node.color}`);
  if (node.backgroundColor) parts.push(`background-color: ${node.backgroundColor}`);
  if (node.fontFamily) parts.push(`font-family: ${node.fontFamily}`);
  if (node.fontSize) parts.push(`font-size: ${node.fontSize}`);
  if (node.fontWeight) parts.push(`font-weight: ${node.fontWeight}`);
  if (node.letterSpacing) parts.push(`letter-spacing: ${node.letterSpacing}`);
  return parts.length ? ` style="${parts.join("; ")}"` : "";
}

// ── Leaf (text) serializer ──
function serializeLeaf(node: SlateText): string {
  let text = esc(node.text);
  if (!text && !node.text) return "";

  if (node.bold) text = `<strong>${text}</strong>`;
  if (node.italic) text = `<em>${text}</em>`;
  if (node.underline) text = `<u>${text}</u>`;
  if (node.strikethrough) text = `<s>${text}</s>`;
  if (node.code) text = `<code>${text}</code>`;
  if (node.superscript) text = `<sup>${text}</sup>`;
  if (node.subscript) text = `<sub>${text}</sub>`;
  if (node.highlight) text = `<mark>${text}</mark>`;
  if (node.kbd) text = `<kbd>${text}</kbd>`;

  const style = buildInlineStyle(node);
  if (style) text = `<span${style}>${text}</span>`;

  return text;
}

// ── 그림이 든 문단 ──
// 이미지는 <figure> 로 직렬화하는데, <figure> 는 <p> 안에 둘 수 없다. HTML 파서는 <p> 를 <figure> 앞에서
// 닫고 남은 </p> 로 빈 문단을 하나 더 만든다. 그래서 그림 문단(<p><figure/></p>)을 불러와 다시 저장할 때마다
// 그림 앞뒤로 빈 문단이 하나씩 늘었고, 공개 글에도 그만큼 빈 줄이 생겼다(#839).
// 그림은 문단 밖으로 꺼내고, 그림 앞뒤의 글자는 각자 문단으로 둔다. 빈 글자·폭 없는 공백뿐인 쪽은 버린다.
// <figure> 를 불러오면 그림 하나를 담은 문단이 되므로, 다시 불러와 저장해도 같은 HTML 이 나온다.
const isImageNode = (c: SlateNode) => !isText(c) && (c as SlateElement).type === "img";
const hasContent = (nodes: SlateNode[]) =>
  nodes.some((c) => !isText(c) || c.text.replace(/[\u200b\u200c\u200d\ufeff\s]/g, "").length > 0);

function serializeParagraphWithImages(el: SlateElement, styleAttr: string): string {
  const out: string[] = [];
  let run: SlateNode[] = [];
  const flush = () => {
    if (hasContent(run)) out.push(`<p${styleAttr}>${run.map(serializeNode).join("")}</p>`);
    run = [];
  };
  for (const c of el.children ?? []) {
    if (isImageNode(c)) { flush(); out.push(serializeNode(c)); } else run.push(c);
  }
  flush();
  return out.join("");
}

// ── Element serializer ──
function serializeNode(node: SlateNode): string {
  if (isText(node)) return serializeLeaf(node);

  const el = node as SlateElement;
  // 자식 직렬화 — 각 자식도 자체 try/catch 로 방어됨(아래). 여기서도 한 번 더 감싸 부모가 안 깨지게.
  let children = "";
  try { children = el.children?.map(serializeNode).join("") ?? ""; } catch { children = ""; }

  // ── 노드별 방어 — 한 블록의 직렬화 실패가 전체 직렬화(=자동저장)를 깨뜨리지 않게.
  //    특수블록의 예상 못한 속성 상태로 throw 나도 내용(children)은 보존하고 나머지 블록은 정상 저장된다.
  //    (예전엔 throw 하면 slateToHtml 전체가 실패 → onChange 가 form.content 를 못 갱신 → 자동저장 정지) ──
  try {
    // Block-level style
    const blockStyle: string[] = [];
    if (el.align) blockStyle.push(`text-align: ${el.align}`);
    if (el.lineHeight) blockStyle.push(`line-height: ${el.lineHeight}`);
    if (el.indent) blockStyle.push(`margin-left: ${(el.indent as number) * 24}px`);
    const styleAttr = blockStyle.length ? ` style="${blockStyle.join("; ")}"` : "";

    switch (el.type) {
    // ── Blocks ──
    case "p": {
      const lst = el.listStyleType as string | undefined;
      if (lst) {
        const olTypes = new Set(["decimal", "decimal-leading-zero", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"]);
        const start = el.listStart ? ` start="${el.listStart}"` : "";
        const checked = el.checked;
        const indentLevel = (el.indent as number) || 1;
        const indentAttr = ` data-indent="${indentLevel}"`;
        const indentMargin = indentLevel > 1 ? `; margin-left: ${(indentLevel - 1) * 24}px` : "";
        // li에 style + data-list-style-type 두 가지 모두 넣어야 ListPlugin deserializer가 인식
        if (checked !== undefined) {
          return `<ul${indentAttr}><li style="list-style-type: ${esc(lst)}" data-list-style-type="${esc(lst)}" data-checked="${checked ? "true" : "false"}">${children}</li></ul>`;
        }
        if (olTypes.has(lst)) {
          return `<ol${start}><li style="list-style-type: ${esc(lst)}${indentMargin}" data-list-style-type="${esc(lst)}"${indentAttr}>${children}</li></ol>`;
        }
        return `<ul><li style="list-style-type: ${esc(lst)}${indentMargin}" data-list-style-type="${esc(lst)}"${indentAttr}>${children}</li></ul>`;
      }
      if (el.children?.some(isImageNode)) return serializeParagraphWithImages(el, styleAttr);
      return `<p${styleAttr}>${children}</p>`;
    }
    case "h1": return `<h1${styleAttr}>${children}</h1>`;
    case "h2": return `<h2${styleAttr}>${children}</h2>`;
    case "h3": return `<h3${styleAttr}>${children}</h3>`;
    case "h4": return `<h4${styleAttr}>${children}</h4>`;
    case "h5": return `<h5${styleAttr}>${children}</h5>`;
    case "h6": return `<h6${styleAttr}>${children}</h6>`;
    case "blockquote":
      return `<blockquote${styleAttr}>${children}</blockquote>`;
    case "hr":
      return `<hr />`;
    case "toc":
      // 목차는 heading 에서 동적 생성되므로 마커만 저장 (재오픈 시 라이브 렌더)
      return `<div data-toc="true"></div>`;

    // ── Toggle (접기/펼치기) ──
    case "toggle": {
      const isOpen = el.open !== false;
      // children 중 text leaf가 직접 있으면 p로 감싸서 직렬화
      const toggleChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<p>${serializeLeaf(child as SlateText)}</p>`;
        return serializeNode(child);
      }).join("");
      return `<div data-toggle${isOpen ? " data-open" : ""}>${toggleChildren}</div>`;
    }

    // ── Callout ──
    case "callout": {
      // children 중 text leaf가 직접 있으면 p로 감싸서 직렬화
      const calloutChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<p>${serializeLeaf(child as SlateText)}</p>`;
        return serializeNode(child);
      }).join("");
      const cBg = esc(String(el.bg ?? "var(--bg-tertiary)"));
      const cIcon = String(el.icon ?? "");
      let iconHtml: string;
      if (cIcon.startsWith("img:")) {
        iconHtml = `<img src="${esc(cIcon.slice(4))}" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:2px" />`;
      } else if (cIcon.startsWith("icon:")) {
        // SVG 아이콘 — data 속성에 id 저장, detail page에서 렌더
        iconHtml = `<span data-icon="${esc(cIcon.slice(5))}" style="display:inline-flex;width:20px;height:20px"></span>`;
      } else {
        iconHtml = esc(cIcon);
      }
      const borderStyle = cBg === "var(--bg-primary)" ? ";border:1px solid var(--border-color-light)" : "";
      const iconSpan = cIcon ? `<span data-callout-icon-visual style="font-size:20px;line-height:1;flex-shrink:0">${iconHtml}</span>` : "";
      return `<div data-callout data-callout-bg="${cBg}"${cIcon ? ` data-callout-icon="${esc(cIcon)}"` : ""} style="display:flex;gap:${cIcon ? "12px" : "0"};padding:16px;border-radius:8px;background:${cBg};margin:16px 0${borderStyle}">${iconSpan}<div style="flex:1;min-width:0">${calloutChildren}</div></div>`;
    }

    // ── Tabs ──
    case "tabs": {
      const active = Number(el.activeTab ?? 0);
      const panels = (el.children || []).map((child) => serializeNode(child)).join("");
      return `<div data-tabs data-active="${active}">${panels}</div>`;
    }
    case "tab_panel": {
      const content = (el.children || []).map((child) => {
        if (isText(child)) return `<p>${serializeLeaf(child as SlateText)}</p>`;
        return serializeNode(child);
      }).join("");
      const tabIcon = el.icon ? ` data-tab-icon="${esc(String(el.icon))}"` : "";
      return `<div data-tab-panel data-label="${esc(String(el.label ?? ""))}"${tabIcon}>${content}</div>`;
    }

    // ── Poll (투표) ── void 요소: 옵션은 el.options 배열(라벨은 plain text)
    case "poll": {
      const pollId = esc(String(el.pollId ?? ""));
      const multiple = el.multiple ? "true" : "false";
      const start = el.startAt ? ` data-start="${esc(String(el.startAt))}"` : "";
      const end = el.endAt ? ` data-end="${esc(String(el.endAt))}"` : "";
      const before = el.resultsBeforeVote ? ` data-results-before="true"` : "";
      // 기본 true(취소 가능) → false 일 때만 명시
      const noRetract = el.allowRetract === false ? ` data-allow-retract="false"` : "";
      const chart = el.resultChart === "pie" ? ` data-result-chart="pie"` : "";
      const title = (el.title as string)?.trim() ? ` data-poll-title="${esc(String(el.title))}"` : "";
      const subtitle = (el.subtitle as string)?.trim() ? ` data-poll-subtitle="${esc(String(el.subtitle))}"` : "";
      const description = (el.description as string)?.trim() ? ` data-poll-description="${esc(String(el.description))}"` : "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optionList = (Array.isArray((el as any).options) ? (el as any).options : []) as { optionId?: string; label?: string }[];
      const opts = optionList
        .filter((o) => (o.label ?? "").trim())
        .map((o) => `<div data-poll-option data-option-id="${esc(String(o.optionId ?? ""))}">${esc(String(o.label ?? ""))}</div>`)
        .join("");
      return `<div data-poll data-poll-id="${pollId}" data-multiple="${multiple}"${start}${end}${before}${noRetract}${chart}${title}${subtitle}${description}>${opts}</div>`;
    }

    // ── Diagram (비주얼) ── void: el.data(DiagramData: 위치보존 노드/엣지) 를 JSON attribute 로 저장
    case "diagram": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (el as any).data ?? { nodes: [], edges: [] };
      return `<div data-diagram="${esc(JSON.stringify(data))}"></div>`;
    }

    // ── Playground ── void: el.data(html/css/js) 를 JSON attribute 로 저장
    case "playground": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (el as any).data ?? { html: "", css: "", js: "" };
      return `<div data-playground="${esc(JSON.stringify(data))}"></div>`;
    }

    // ── Calendar (이벤트 달력) ── 연결형: 블록은 calendarId 만 참조(서버 원본). width 는 per-block.
    case "calendar": {
      const calId = el.calendarId as string | undefined;
      const widthAttr = el.width ? ` data-cal-width="${esc(String(el.width))}"` : "";
      if (calId) return `<div data-calendar-id="${esc(calId)}"${widthAttr}></div>`;
      // legacy inline fallback (calendarId 생성 전/구버전)
      const data = {
        month: (el.month as string) || "",
        events: Array.isArray(el.events) ? el.events : [],
        labels: Array.isArray(el.labels) ? el.labels : [],
        ...(el.width ? { width: el.width } : {}),
      };
      return `<div data-calendar="${esc(JSON.stringify(data))}"></div>`;
    }

    // ── Column layout ──
    case "column_group": {
      const layout = el.layout as string | undefined;
      const colBg = el.columnBg as string | undefined;
      const colDiv = el.columnDivider as string | undefined;
      const colScroll = (el.columnScroll as boolean | undefined) !== false; // 기본 on
      const attrs = [
        "data-column-group",
        layout ? ` data-layout="${esc(layout)}"` : "",
        colBg ? ` data-column-bg="${esc(colBg)}"` : "",
        colDiv ? ` data-column-divider="${esc(colDiv)}"` : "",
        colScroll ? "" : ` data-column-scroll="false"`,
      ].join("");
      // 에디터와 동일: 열 사이 항상 8px(=--spacing-xs), 구분선은 열 pseudo(.prose [data-column]::after)가 gap 중앙에 그림.
      // 배경/패딩/라디우스는 그룹이 아니라 열 개별(콘텐츠 폭·줄바꿈이 에디터와 일치). 그룹은 --_col-bg / --_col-divider 변수만 지정.
      const colBgVal = colBg === "transparent" ? "transparent" : (colBg || COLUMN_BG_FALLBACK);
      // 에디터(elements.tsx)와 동일: 미지정=기본 subtle 선(--border-color-light), transparent=선 없음, 그 외=지정색. 항상 출력.
      const dividerColor = colDiv === "transparent" ? "transparent" : (colDiv || "var(--border-color-light)");
      const divVar = `;--_col-divider:${dividerColor}`;
      const colBox = `flex:1;min-width:40px;background:var(--_col-bg,${COLUMN_BG_FALLBACK});padding:var(--spacing-sm);border-radius:var(--radius-2xl)`;
      // text leaf 방어
      const groupChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<div data-column style="${colBox}"><p>${serializeLeaf(child as SlateText)}</p></div>`;
        return serializeNode(child);
      }).join("");
      // 스크롤 ON: px 열 고정 → 넘치면 가로 스크롤. OFF: px 열 shrink(--_col-shrink:1) → 화면 폭에 맞춤.
      return `<div ${attrs} style="display:flex;gap:var(--spacing-xs);margin:16px 0;overflow-x:${colScroll ? "auto" : "hidden"};--_col-shrink:${colScroll ? 0 : 1};--_col-bg:${colBgVal}${divVar}">${groupChildren}</div>`;
    }
    case "column": {
      const colW = el.width as string | undefined;
      const colPx = el.widthPx as number | undefined;
      // text leaf 방어
      const colChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<p>${serializeLeaf(child as SlateText)}</p>`;
        return serializeNode(child);
      }).join("");
      // 배경/패딩/라디우스는 열 개별(에디터 ColumnElement 와 동일 → 콘텐츠 폭·줄바꿈 일치). --_col-bg 는 그룹이 지정.
      const colBox = `background:var(--_col-bg,${COLUMN_BG_FALLBACK});padding:var(--spacing-sm);border-radius:var(--radius-2xl);min-width:40px`;
      // px 지정: 정확한 px 고정(grow/shrink 0) → 합 초과 시 가로 스크롤. 없으면 유동 % fill.
      // data-width(%) 도 함께 실어 재편집 시 @platejs/layout normalizer 가 합 100 을 보게 함(무한 normalize 루프 방지).
      if (typeof colPx === "number" && colPx > 0) {
        const cw = Math.round(colPx);
        return `<div data-column${colW ? ` data-width="${esc(colW)}"` : ""} data-width-px="${cw}" style="flex:0 var(--_col-shrink,0) ${cw}px;${colBox}">${colChildren}</div>`;
      }
      const w = colW ? Math.max(0.001, parseFloat(colW)) : 1;
      return `<div data-column${colW ? ` data-width="${esc(colW)}"` : ""} style="flex:${w} 1 0;${colBox}">${colChildren}</div>`;
    }

    // ── Code block ──
    case "code_block": {
      const lang = el.lang ? ` class="language-${esc(String(el.lang))}"` : "";
      /* mermaid 블록의 뷰 모드(코드만/다이어그램만/나란히)도 같이 싣는다.
         에디터는 HTML 로 저장하므로 여기서 안 내보내면 다시 열 때 유실돼서,
         나란히 보던 다이어그램이 코드만 보이는 상태로 열린다. */
      const gv = el.graphView ? ` data-graph-view="${esc(String(el.graphView))}"` : "";
      /* 줄바꿈(wrap) 토글 상태(el.wrap) 왕복 — 없으면 다시 열 때 유실돼 스크롤 모드로 리셋된다.
         data-wrap: deserializer 가 노드 attr 복원. inline style: reader(attachCodeWrapToggle)가
         pre.style.whiteSpace 로 초기 상태를 판정하므로 저장된 wrap 이 상세/미리보기에도 그대로 뜬다. */
      const wrapAttr = el.wrap ? ` data-wrap="true" style="white-space:pre-wrap;word-break:break-all"` : "";
      /* data-lenis-prevent 는 싣지 않는다. 그걸 달면 Lenis 가 코드블록 위의 휠을 통째로 무시해서, 블록 끝에 닿아도
         페이지가 이어서 내려가지 않았다. 휠은 리더가 블록마다 축을 보고 나눠 준다(attachCodeWrapToggle 의
         attachWheelRouting). 편집기의 코드블록은 제 요소에 따로 달고 있다 */
      return `<div class="code-block-wrap"><pre${gv}${wrapAttr}><code${lang}>${children}</code></pre></div>`;
    }
    case "code_line":
      return `${children}\n`;

    // ── List ──
    case "list": {
      const lst = el.listStyleType as string | undefined;
      if (lst === "decimal" || lst === "lower-alpha" || lst === "lower-roman") {
        const start = el.listStart ? ` start="${el.listStart}"` : "";
        return `<ol${start}${styleAttr}><li>${children}</li></ol>`;
      }
      return `<ul${styleAttr}><li>${children}</li></ul>`;
    }

    // ── Table ──
    case "table": {
      const colSizes = el.colSizes as number[] | undefined;
      // 행/열 고정 개수(구버전 boolean 호환). 열 고정=가로 스크롤 우선, 행 고정=페이지 sticky(→fit).
      const freezeRows = typeof el.freezeRows === "number" ? (el.freezeRows as number)
        : (el.freezeRow === true || el.freezeHeader === true ? 1 : 0);
      const freezeCols = typeof el.freezeCols === "number" ? (el.freezeCols as number)
        : (el.freezeCol === true ? 1 : 0);
      const colFreeze = freezeCols > 0;
      const rowFreeze = freezeRows > 0;
      const anyFreeze = rowFreeze || colFreeze;
      // 엑셀 틀 고정: 고정 시 .tbl-freeze 2D 스크롤 박스. 열 고정이면 자연 너비(가로 스크롤), 아니면 fit 유지.
      const fitWidth = (el.fitWidth === true) && !colFreeze;
      const totalW = colSizes?.reduce((s, w) => s + (w || 0), 0) || 0;
      const colgroup = colSizes?.length
        ? `<colgroup>${colSizes.map((w) => {
            const colStyle = fitWidth
              ? (totalW ? ` style="width: ${((w || 0) / totalW * 100).toFixed(4)}%"` : "")
              : (w ? ` style="width: ${w}px"` : "");
            return `<col${colStyle} />`;
          }).join("")}</colgroup>`
        : "";
      const caption = el.caption as string | undefined;
      const captionHtml = caption ? `<caption>${caption}</caption>` : "";
      const tblAttrs: string[] = [`data-col-sizes="${(colSizes || []).join(",")}"`];
      if (el.fitWidth === true) tblAttrs.push(`data-fit-width="true"`);
      // 행/열 고정 개수 — round-trip + 리더 sticky(enhanceReaderExtras 가 offset 계산해 적용).
      if (freezeRows > 0) tblAttrs.push(`data-freeze-rows="${freezeRows}"`);
      if (freezeCols > 0) tblAttrs.push(`data-freeze-cols="${freezeCols}"`);
      // 헤더 전용 스타일 — round-trip 용 data 속성 + reader 렌더용 CSS 변수(th 가 상속받아 참조)
      const headerBg = el.headerBg as string | undefined;
      const headerColor = el.headerColor as string | undefined;
      const headerBold = el.headerBold;
      if (headerBg) tblAttrs.push(`data-header-bg="${esc(headerBg)}"`);
      if (headerColor) tblAttrs.push(`data-header-color="${esc(headerColor)}"`);
      if (headerBold === false) tblAttrs.push(`data-header-bold="false"`);
      const borderColor = el.borderColor as string | undefined;
      const borderStyle = el.borderStyle as string | undefined;
      const borderWidth = el.borderWidth as string | undefined;
      const tblStyles: string[] = [];
      if (fitWidth) tblStyles.push("width: 100%", "table-layout: fixed");
      // 비-fit 은 자연 너비(colSizes 합) → 넓으면 .tbl-freeze 안에서 가로 스크롤(에디터와 동일). .prose table{width:100%} 오버라이드.
      else if (totalW) tblStyles.push(`width: ${totalW}px`, "table-layout: fixed");
      if (headerBg) tblStyles.push(`--tbl-header-bg: ${headerBg}`);
      if (headerColor) tblStyles.push(`--tbl-header-color: ${headerColor}`);
      if (headerBold === false) tblStyles.push("--tbl-header-weight: 400");
      const hasBorder = borderColor || borderStyle || borderWidth;
      if (hasBorder) {
        tblAttrs.push(`data-border-style="${esc(borderStyle || "solid")}"`);
        if (borderColor) tblAttrs.push(`data-border-color="${esc(borderColor)}"`);
        if (borderWidth) tblAttrs.push(`data-border-width="${esc(borderWidth)}"`);
        // CSS custom properties for reader-side cell border
        if (borderColor) tblStyles.push(`--tbl-border-color: ${borderColor}`);
        if (borderStyle) tblStyles.push(`--tbl-border-style: ${borderStyle}`);
        if (borderWidth) tblStyles.push(`--tbl-border-width: ${borderWidth}`);
      }
      const tblStyleAttr = tblStyles.length ? ` style="${tblStyles.join("; ")}"` : "";
      const tableHtml = `<table ${tblAttrs.join(" ")}${tblStyleAttr}>${captionHtml}${colgroup}${children}</table>`;
      // 가로 스크롤 컨테이너로 감쌈 — 고정 표(sticky) + 비-fit 자연 너비 표(넓으면 스크롤). fit 표는 감쌀 필요 없음.
      const needsScroll = !fitWidth && totalW > 0;
      return (anyFreeze || needsScroll) ? `<div class="tbl-freeze">${tableHtml}</div>` : tableHtml;
    }
    case "tr": {
      /* 행 높이(Plate 는 tr 노드의 `size` 에 저장 — setTableRowSize 가 setNodes({size}) 한다).
         에디터는 HTML 로 저장하므로 여기서 안 내보내면 다시 열 때 통째로 사라진다(= 높이가 저장 안 됨).
         style 로도 넣어 리더뷰에서 바로 먹고, data 속성으로 왕복시켜 파서가 정확히 되읽는다
         (열 너비를 colgroup + data-col-sizes 로 왕복시키는 것과 같은 방식). */
      const rowH = el.size as number | undefined;
      if (rowH && rowH > 0) return `<tr data-row-size="${rowH}" style="height: ${rowH}px">${children}</tr>`;
      return `<tr>${children}</tr>`;
    }
    case "td":
    case "th": {
      const tag = el.type === "th" ? "th" : "td";
      const cellAttrs: string[] = [];
      if (el.colSpan && (el.colSpan as number) > 1) cellAttrs.push(` colspan="${el.colSpan}"`);
      if (el.rowSpan && (el.rowSpan as number) > 1) cellAttrs.push(` rowspan="${el.rowSpan}"`);
      const cellStyles: string[] = [];
      if (el.background && tag !== "th") cellStyles.push(`background-color: ${el.background}`);
      // 헤더 셀(th) — 헤더 tint(기본 --tbl-header-bg=--bg-secondary, 불투명 뉴트럴)를 base(--bg-primary)
      // 위에 gradient 로 얹어 완전 불투명화 → 행 고정 sticky 시 아래 행이 비쳐 보이지 않게.
      if (tag === "th") {
        // var(--bg-primary) 는 잔재이므로 커스텀 색에서 제외
        const customTh = el.background && String(el.background) !== "var(--bg-primary)" ? String(el.background) : "";
        const thBg = customTh || "var(--tbl-header-bg, var(--bg-tertiary-alt))";
        cellStyles.push(`background-color: var(--bg-primary)`);
        cellStyles.push(`background-image: linear-gradient(${thBg}, ${thBg})`);
        cellStyles.push(`color: var(--tbl-header-color, inherit)`);
        cellStyles.push(`font-weight: var(--tbl-header-weight, 700)`);
        // 커스텀 헤더 색은 data-th-bg 로 왕복 — deserializer 가 background-color(불투명 base=--bg-primary)를
        // el.background 로 잘못 읽어 리로드 시 헤더가 페이지 배경색으로 투명해지던 버그 방지.
        if (customTh) cellAttrs.push(` data-th-bg="${esc(customTh)}"`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cb = el.cellBorders as Record<string, any> | undefined;
      if (cb) {
        for (const side of ["top", "right", "bottom", "left"] as const) {
          const v = cb[side];
          if (v === null) {
            cellStyles.push(`border-${side}: none`);
          } else if (v && typeof v === "object") {
            const w = v.width || "1px";
            const s = v.style || "solid";
            const c = v.color || "var(--border-color-light)";
            cellStyles.push(`border-${side}: ${w} ${s} ${c}`);
          }
        }
        cellAttrs.push(` data-cell-borders="1"`);
      }
      if (cellStyles.length) cellAttrs.push(` style="${cellStyles.join("; ")}"`);
      return `<${tag}${cellAttrs.join("")}>${children}</${tag}>`;
    }

    // ── Link ──
    case "a":
      return `<a href="${esc(String(el.url ?? ""))}"${el.target ? ` target="${el.target}"` : ""}>${children}</a>`;

    // ── Image (with width%, align, caption, layout) ──
    case "img": {
      const imgUrl = esc(String(el.url ?? ""));
      const imgAlt = el.alt ? ` alt="${esc(String(el.alt))}"` : "";
      const imgW = el.width as number | undefined;
      const imgH = el.height as number | undefined;
      const imgFilter = el.filter as string | undefined;
      const imgAlign = (el.align as string) || "center";
      const imgCaption = el.caption as string | undefined;
      const imgLayout = (el.layout as string) || "inline";
      const imgLockAspect = (el.lockAspect as boolean) ?? true;
      const justifyMap = ALIGN_TO_JUSTIFY;
      const isFloat = imgLayout === "float-left" || imgLayout === "float-right";
      const figStyle = isFloat
        ? `float:${imgLayout === "float-left" ? "left" : "right"};margin:${imgLayout === "float-left" ? "0 24px 24px 0" : "0 0 24px 24px"}`
        : imgLayout === "block"
          ? `display:block;margin:1em 0`
          : `display:flex;flex-direction:column;align-items:${justifyMap[imgAlign] || "center"};margin:1em 0`;
      const imgStyles: string[] = [];
      if (imgW && imgW > 0) imgStyles.push(`width:${imgW}px`);
      if (imgH && imgH > 0) imgStyles.push(`height:${imgH}px`);
      imgStyles.push("max-width:100%");
      if (imgFilter) imgStyles.push(`filter:${imgFilter}`);
      const imgStyleAttr = imgStyles.length ? ` style="${imgStyles.join(";")}"` : "";
      // data 속성으로 에디터 메타데이터 보존
      const dataAttrs = [
        imgW && imgW > 0 ? ` data-width="${imgW}"` : "",
        imgH && imgH > 0 ? ` data-height="${imgH}"` : "",
        imgCaption ? ` data-caption="${esc(imgCaption)}"` : "",
        imgLayout !== "inline" ? ` data-layout="${imgLayout}"` : "",
        imgAlign !== "center" ? ` data-align="${imgAlign}"` : "",
        !imgLockAspect ? ` data-lock-aspect="false"` : "",
        imgFilter ? ` data-filter="${esc(imgFilter)}"` : "",
      ].join("");
      const capHtml = imgCaption ? `<figcaption style="font-size:0.85em;color:#6b7280;margin-top:4px;text-align:${imgAlign}">${esc(imgCaption)}</figcaption>` : "";
      return `<figure style="${figStyle}"><img src="${imgUrl}"${imgAlt}${imgStyleAttr}${dataAttrs} />${capHtml}</figure>`;
    }

    // ── Figure (legacy) ──
    case "figure": {
      const imgChild = el.children?.find((c): c is SlateElement => !isText(c) && (c as SlateElement).type === "img");
      const capChild = el.children?.find((c): c is SlateElement => !isText(c) && ((c as SlateElement).type === "figcaption" || (c as SlateElement).type === "figure_caption"));
      const imgHtml = imgChild ? serializeNode(imgChild) : "";
      const capHtmlLegacy = capChild ? `<figcaption>${capChild.children?.map(serializeNode).join("") ?? ""}</figcaption>` : "";
      return `<figure>${imgHtml}${capHtmlLegacy}</figure>`;
    }

    // ── Media embed ──
    case "media_embed": {
      const rawUrl = String(el.url ?? "");
      // 동영상 파일 — <video> 로 렌더 (에디터와 동일하게 크기·정렬·float 반영)
      const isVid = el.mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(rawUrl);
      if (isVid) {
        const vw = el.width ? `${el.width}px` : "";
        const vh = el.height ? `${el.height}px` : "";
        const vidLayout = (el.layout as string) || "block";
        const vidAlign = (el.align as string) || "center";
        const vidStart = (el.vidStart as number) || 0;
        const vidStyle = ["max-width:100%", "border-radius:8px", vw && `width:${vw}`, vh && `height:${vh}`].filter(Boolean).join(";");
        const vsrc = `${esc(rawUrl)}${vidStart > 0 ? `#t=${vidStart}` : ""}`;
        // 재생 옵션 — 발행글엔 autoplay 도 반영(음소거 필수). 다운로드 방지는 controlsList + 우클릭 차단.
        const vAttrs = [
          "controls", 'preload="metadata"',
          el.vidLoop ? "loop" : "",
          (el.vidMuted || el.vidAutoplay) ? "muted" : "",
          el.vidAutoplay ? "autoplay playsinline" : "",
          el.noDownload ? 'controlsList="nodownload noplaybackrate"' : "",
        ].filter(Boolean).join(" ");
        const cap = (el.caption as string) || "";
        const capHtml = cap ? `<figcaption data-video-caption style="text-align:center;font-size:0.85em;color:var(--text-tertiary);margin-top:6px;font-family:var(--font-space-grotesk)">${esc(cap)}</figcaption>` : "";
        if (vidLayout === "float-left" || vidLayout === "float-right") {
          const side = vidLayout === "float-left" ? "left" : "right";
          const m = vidLayout === "float-left" ? "4px 20px 8px 0" : "4px 0 8px 20px";
          return `<figure style="float:${side};margin:${m};max-width:60%"><video src="${vsrc}" ${vAttrs} style="${vidStyle}"></video>${capHtml}</figure>`;
        }
        const vJustify = vidAlign === "left" ? "flex-start" : vidAlign === "right" ? "flex-end" : "center";
        return `<figure style="display:flex;flex-direction:column;align-items:${vJustify};margin:16px 0"><video src="${vsrc}" ${vAttrs} style="${vidStyle}"></video>${capHtml}</figure>`;
      }
      let embedSrc = rawUrl;
      const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
      if (ytMatch) {
        embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
        const params = new URLSearchParams();
        if (el.ytStart && (el.ytStart as number) > 0) params.set("start", String(el.ytStart));
        if (el.ytAutoplay) params.set("autoplay", "1");
        if (el.ytLoop) { params.set("loop", "1"); params.set("playlist", ytMatch[1]); }
        if (el.ytMute) params.set("mute", "1");
        if (el.ytControls === false) params.set("controls", "0");
        const qs = params.toString();
        if (qs) embedSrc += `?${qs}`;
      } else {
        const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      const w = el.width ? `${el.width}px` : "100%";
      const align = (el.align as string) || "center";
      const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      return `<div style="display:flex;justify-content:${justify}"><iframe src="${esc(embedSrc)}" data-original-url="${esc(rawUrl)}" style="width:${w};max-width:100%;aspect-ratio:16/9" frameborder="0" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
    }

    // ── File embed (PDF, audio, office, text, etc.) ──
    case "file_embed": {
      const fileUrl = esc(String(el.url ?? ""));
      const fName = esc(String(el.fileName ?? ""));
      const fSize = el.fileSize as number | undefined;
      const isAudio = /\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?|$)/i.test(fileUrl);
      const isPdf = /\.pdf(\?|$)/i.test(fileUrl);
      const isOffice = /\.(docx?|xlsx?|pptx?)(\?|$)/i.test(fileUrl);
      const isText = /\.(txt|csv|json|xml|ya?ml|toml|ini|log|md)(\?|$)/i.test(fileUrl);
      const hasPreview = isPdf || isOffice || isText;
      const iconSvg = isAudio
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
          + '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
        : isPdf || isText
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>'
            + '<path d="M10 13h4"/><path d="M10 17h4"/><path d="M10 9h1"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';
      const dlSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>';
      const sizeHtml = fSize
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px">`
          + `${fSize < 1024 * 1024 ? (fSize / 1024).toFixed(1) + " KB" : (fSize / (1024 * 1024)).toFixed(1) + " MB"}</div>`
        : "";
      const audioHtml = isAudio
        ? `<audio src="${fileUrl}" controls preload="metadata" style="width:100%;margin-top:6px;border-radius:var(--radius-2xl)"></audio>`
        : "";
      let previewHtml = "";
      if (isPdf) {
        previewHtml = `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;color:var(--text-secondary);font-family:var(--font-space-grotesk);margin-bottom:6px">Preview</summary>`
          + `<iframe src="${fileUrl}" title="${fName}" style="width:100%;height:500px;border:1px solid var(--border-color-light);border-radius:var(--radius-2xl)"></iframe></details>`;
      } else if (isOffice) {
        const viewerUrl = officeViewerUrl(fileUrl);
        previewHtml = `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;color:var(--text-secondary);font-family:var(--font-space-grotesk);margin-bottom:6px">Preview</summary>`
          + `<iframe src="${viewerUrl}" title="${fName}" style="width:100%;height:500px;border:1px solid var(--border-color-light);border-radius:var(--radius-2xl)"></iframe></details>`;
      } else if (isText) {
        previewHtml = `<details style="margin-top:6px" data-text-preview="${fileUrl}"><summary style="cursor:pointer;font-size:12px;color:var(--text-secondary);font-family:var(--font-space-grotesk);margin-bottom:6px">Preview</summary>`
          + `<pre style="padding:12px 16px;border:1px solid var(--border-color-light);border-radius:var(--radius-2xl);background:var(--bg-secondary);font-size:12px;color:var(--text-secondary);overflow:auto;max-height:400px;white-space:pre-wrap;word-break:break-all;font-family:var(--font-mono)">Loading...</pre></details>`;
      }
      const maxW = hasPreview ? "640px" : "480px";
      return [
        `<div data-file-embed data-url="${fileUrl}" data-filename="${fName}"${fSize ? ` data-filesize="${fSize}"` : ""}`,
        ` style="max-width:${maxW};margin:var(--spacing-sm) 0">`,
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;`,
        `border-radius:var(--radius-capsule,999px);border:1px solid var(--border-color-light);background:var(--bg-secondary)">`,
        `<div style="width:32px;height:32px;border-radius:50%;background:var(--color-neutral-alpha-5);`,
        `display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary)">${iconSvg}</div>`,
        `<div style="flex:1;min-width:0">`,
        `<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fName}</div>`,
        `${sizeHtml}</div>`,
        `<a href="${fileUrl}" download="${fName}" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;`,
        `display:flex;align-items:center;justify-content:center;border:1px solid var(--border-color-light);`,
        `background:var(--bg-primary);color:var(--text-primary);text-decoration:none">${dlSvg}</a>`,
        `</div>${audioHtml}${previewHtml}</div>`,
      ].join("");
    }

    // ── Audio player ──
    case "audio_embed": {
      const audioUrl = esc(String(el.url ?? ""));
      const audioTitle = esc(String(el.title ?? ""));
      const audioIconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
      const titleHtml = audioTitle
        ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-left:18px;color:var(--text-secondary)">`
          + `${audioIconSvg}<span style="font-size:13px;font-weight:500">${audioTitle}</span></div>`
        : "";
      return [
        `<div data-audio-embed data-url="${audioUrl}" data-title="${audioTitle}"`,
        ` style="max-width:480px;margin:var(--spacing-sm) 0">`,
        `${titleHtml}`,
        `<audio src="${audioUrl}" controls preload="metadata" style="width:100%"></audio>`,
        `</div>`,
      ].join("");
    }

    // ── Math (KaTeX) ──
    case "equation":
    case "math_block": {
      const tex = String(el.texExpression ?? "");
      return `<div data-math-block="true" data-latex="${esc(tex)}">${esc(tex)}</div>`;
    }
    case "inline_equation":
    case "math_inline": {
      const tex = String(el.texExpression ?? "");
      return `<span data-math-inline="true" data-latex="${esc(tex)}">${esc(tex)}</span>`;
    }

    // ── Date mention (inline) ── date/time 을 attribute 로, 표시 텍스트는 리더가 locale 로 재포맷
    case "date_mention": {
      const date = String(el.date ?? "");
      const time = el.time ? String(el.time) : "";
      const timeAttr = time ? ` data-time="${esc(time)}"` : "";
      const fallback = formatDateValue(date, time || null, "ko");
      return `<span data-date-mention="${esc(date)}"${timeAttr} class="date-mention">${esc(fallback)}</span>`;
    }

    // ── Post link (inline) ── 다른 게시물로 이동하는 링크
    case "post_link": {
      const slug = String(el.slug ?? "");
      const title = String(el.title ?? slug);
      const idAttr = el.postId ? ` data-post-id="${esc(String(el.postId))}"` : "";
      const iconAttr = el.icon ? ` data-post-icon="${esc(String(el.icon))}"` : "";
      return `<a data-post-link="${esc(slug)}"${idAttr}${iconAttr} href="/posts/${esc(slug)}" class="post-link">${esc(title)}</a>`;
    }

    // ── Footnote ──
    case "footnote_ref": {
      const fnId = String(el.footnoteId ?? "");
      return `<sup data-footnote-ref="${esc(fnId)}" id="fnref-${esc(fnId)}">[${esc(fnId)}]</sup>`;
    }
    case "footnote_content": {
      const fnId = String(el.footnoteId ?? "");
      return `<div data-footnote-content="${esc(fnId)}" id="fn-${esc(fnId)}">${children}</div>`;
    }

    // ── Fallback ──
    default:
      return children || "";
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.error(`[plateSerializer] "${(el as { type?: string }).type}" 블록 직렬화 실패 — 내용 보존 fallback 으로 대체(자동저장은 계속 동작):`, err);
    }
    return children ? `<div>${children}</div>` : "";
  }
}

/**
 * Slate JSON → HTML 문자열. 노드별 방어는 serializeNode 내부에서 처리(한 블록 실패가 전체를 안 깨뜨림).
 */
export function slateToHtml(value: SlateNode[]): string {
  if (!value || !Array.isArray(value)) return "";
  return value.map((n) => {
    try { return serializeNode(n); } catch { return ""; }
  }).join("");
}
