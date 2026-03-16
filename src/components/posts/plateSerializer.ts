/**
 * Plate (Slate JSON) → HTML 직렬화
 * 클라이언트에서 onChange마다 호출되므로 의존성 없이 경량으로 구현
 */

let _wrapLabel = "↩ Wrap";
let _scrollLabel = "↔ Scroll";

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

// ── Element serializer ──
function serializeNode(node: SlateNode): string {
  if (isText(node)) return serializeLeaf(node);

  const el = node as SlateElement;
  const children = el.children?.map(serializeNode).join("") ?? "";

  // Block-level style
  const blockStyle: string[] = [];
  if (el.align) blockStyle.push(`text-align: ${el.align}`);
  if (el.lineHeight) blockStyle.push(`line-height: ${el.lineHeight}`);
  if (el.indent) blockStyle.push(`margin-left: ${(el.indent as number) * 24}px`);
  const styleAttr = blockStyle.length ? ` style="${blockStyle.join("; ")}"` : "";

  switch (el.type) {
    // ── Blocks ──
    case "p":
      return `<p${styleAttr}>${children}</p>`;
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

    // ── Code block ──
    case "code_block": {
      const lang = el.lang ? ` class="language-${esc(String(el.lang))}"` : "";
      return `<div class="code-block-wrap"><pre><code${lang}>${children}</code></pre><button type="button" class="code-wrap-toggle" data-wrap-btn></button></div>`;
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
      const colgroup = colSizes?.length
        ? `<colgroup>${colSizes.map((w) => `<col${w ? ` style="width: ${w}px"` : ""} />`).join("")}</colgroup>`
        : "";
      const caption = el.caption as string | undefined;
      const captionHtml = caption ? `<caption>${caption}</caption>` : "";
      const tblAttrs: string[] = [`data-col-sizes="${(colSizes || []).join(",")}"`];
      const borderColor = el.borderColor as string | undefined;
      const borderStyle = el.borderStyle as string | undefined;
      const borderWidth = el.borderWidth as string | undefined;
      const tblStyles: string[] = [];
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
      return `<table ${tblAttrs.join(" ")}${tblStyleAttr}>${captionHtml}${colgroup}${children}</table>`;
    }
    case "tr":
      return `<tr>${children}</tr>`;
    case "td":
    case "th": {
      const tag = el.type === "th" ? "th" : "td";
      const cellAttrs: string[] = [];
      if (el.colSpan && (el.colSpan as number) > 1) cellAttrs.push(` colspan="${el.colSpan}"`);
      if (el.rowSpan && (el.rowSpan as number) > 1) cellAttrs.push(` rowspan="${el.rowSpan}"`);
      const cellStyles: string[] = [];
      if (el.background) cellStyles.push(`background-color: ${el.background}`);
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
            const c = v.color || "var(--border-light-color)";
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

    // ── Image (with width%, align, caption) ──
    case "img": {
      const imgUrl = esc(String(el.url ?? ""));
      const imgAlt = el.alt ? ` alt="${esc(String(el.alt))}"` : "";
      const imgW = el.width as number | undefined;
      const imgH = el.height as number | undefined;
      const imgFilter = el.filter as string | undefined;
      const imgAlign = (el.align as string) || "center";
      const imgCaption = el.caption as string | undefined;
      const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
      const figStyle = `display:flex;flex-direction:column;align-items:${justifyMap[imgAlign] || "center"};margin:1em 0`;
      const imgStyles: string[] = [];
      if (imgW && imgW > 0) imgStyles.push(`width:${imgW}px`);
      if (imgH && imgH > 0) imgStyles.push(`height:${imgH}px`);
      imgStyles.push("max-width:100%");
      if (imgFilter) imgStyles.push(`filter:${imgFilter}`);
      const imgStyleAttr = imgStyles.length ? ` style="${imgStyles.join(";")}"` : "";
      const capHtml = imgCaption ? `<figcaption style="font-size:0.85em;color:#6b7280;margin-top:4px;text-align:${imgAlign}">${esc(imgCaption)}</figcaption>` : "";
      return `<figure style="${figStyle}"><img src="${imgUrl}"${imgAlt}${imgStyleAttr} />${capHtml}</figure>`;
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
    case "media_embed":
      return `<iframe src="${esc(String(el.url ?? ""))}" data-original-url="${esc(String(el.url ?? ""))}" width="100%" height="400" frameborder="0" loading="lazy" allowfullscreen></iframe>`;

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

    // ── Fallback ──
    default:
      return children || "";
  }
}

/**
 * Slate JSON → HTML 문자열
 */
export function slateToHtml(value: SlateNode[]): string {
  if (!value || !Array.isArray(value)) return "";
  return value.map(serializeNode).join("");
}
