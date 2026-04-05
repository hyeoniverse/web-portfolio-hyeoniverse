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
      const borderStyle = cBg === "var(--bg-primary)" ? ";border:1px solid var(--border-light-color)" : "";
      const iconSpan = cIcon ? `<span data-callout-icon-visual style="font-size:20px;line-height:1;flex-shrink:0">${iconHtml}</span>` : "";
      return `<div data-callout data-callout-bg="${cBg}"${cIcon ? ` data-callout-icon="${esc(cIcon)}"` : ""} style="display:flex;gap:${cIcon ? "12px" : "0"};padding:16px;border-radius:8px;background:${cBg};margin:16px 0${borderStyle}">${iconSpan}<div style="flex:1;min-width:0">${calloutChildren}</div></div>`;
    }

    // ── Column layout ──
    case "column_group": {
      const layout = el.layout as string | undefined;
      const colBg = el.columnBg as string | undefined;
      const colDiv = el.columnDivider as string | undefined;
      const attrs = [
        "data-column-group",
        layout ? ` data-layout="${esc(layout)}"` : "",
        colBg ? ` data-column-bg="${esc(colBg)}"` : "",
        colDiv ? ` data-column-divider="${esc(colDiv)}"` : "",
      ].join("");
      const gapStyle = colDiv ? "gap:0" : "gap:16px";
      const bgStyle = colBg ? `;background:${colBg};padding:8px;border-radius:6px` : "";
      // text leaf 방어
      const groupChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<div data-column style="flex:1;min-width:0"><p>${serializeLeaf(child as SlateText)}</p></div>`;
        return serializeNode(child);
      }).join("");
      return `<div ${attrs} style="display:flex;${gapStyle};margin:16px 0${bgStyle}">${groupChildren}</div>`;
    }
    case "column": {
      const colW = el.width as string | undefined;
      // text leaf 방어
      const colChildren = (el.children || []).map((child) => {
        if (isText(child)) return `<p>${serializeLeaf(child as SlateText)}</p>`;
        return serializeNode(child);
      }).join("");
      return `<div data-column${colW ? ` data-width="${esc(colW)}" style="flex:0 0 ${esc(colW)};min-width:0"` : ` style="flex:1;min-width:0"`}>${colChildren}</div>`;
    }

    // ── Code block ──
    case "code_block": {
      const lang = el.lang ? ` class="language-${esc(String(el.lang))}"` : "";
      return `<div class="code-block-wrap"><pre><code${lang}>${children}</code></pre></div>`;
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
      const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
      const isFloat = imgLayout === "float-left" || imgLayout === "float-right";
      const figStyle = isFloat
        ? `float:${imgLayout === "float-left" ? "left" : "right"};margin:0`
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

    // ── File embed (PDF, audio, etc.) ──
    case "file_embed": {
      const fileUrl = esc(String(el.url ?? ""));
      const fName = esc(String(el.fileName ?? ""));
      const fSize = el.fileSize as number | undefined;
      const isAudio = /\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?|$)/i.test(fileUrl);
      const iconSvg = isAudio
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
          + '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
        : /\.pdf/i.test(fileUrl)
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
        ? `<audio src="${fileUrl}" controls preload="metadata" style="width:100%;margin-top:6px;border-radius:var(--radius-sm)"></audio>`
        : "";
      return [
        `<div data-file-embed data-url="${fileUrl}" data-filename="${fName}"${fSize ? ` data-filesize="${fSize}"` : ""}`,
        ` style="max-width:480px;margin:var(--spacing-sm) 0">`,
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;`,
        `border-radius:var(--radius-capsule,999px);border:1px solid var(--border-light-color);background:var(--bg-secondary)">`,
        `<div style="width:32px;height:32px;border-radius:50%;background:var(--color-neutral-alpha-6);`,
        `display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary)">${iconSvg}</div>`,
        `<div style="flex:1;min-width:0">`,
        `<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fName}</div>`,
        `${sizeHtml}</div>`,
        `<a href="${fileUrl}" download style="width:34px;height:34px;border-radius:50%;flex-shrink:0;`,
        `display:flex;align-items:center;justify-content:center;border:1px solid var(--border-light-color);`,
        `background:var(--bg-primary);color:var(--text-primary);text-decoration:none">${dlSvg}</a>`,
        `</div>${audioHtml}</div>`,
      ].join("");
    }

    // ── Audio player ──
    case "audio_embed": {
      const audioUrl = esc(String(el.url ?? ""));
      const audioTitle = esc(String(el.title ?? ""));
      const audioIconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
      const titleHtml = audioTitle
        ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--text-secondary)">`
          + `${audioIconSvg}<span style="font-size:13px;font-weight:500">${audioTitle}</span></div>`
        : "";
      return [
        `<div data-audio-embed data-url="${audioUrl}" data-title="${audioTitle}"`,
        ` style="max-width:480px;padding:10px 14px;margin:var(--spacing-sm) 0">`,
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
}

/**
 * Slate JSON → HTML 문자열
 */
export function slateToHtml(value: SlateNode[]): string {
  if (!value || !Array.isArray(value)) return "";
  return value.map(serializeNode).join("");
}
