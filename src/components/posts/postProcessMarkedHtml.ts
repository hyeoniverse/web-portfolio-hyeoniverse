import { CALLOUT_BY_TYPE, type CalloutType } from "./plate/calloutTypes";

/** HTML 엔티티 디코드 (annotation 안 LaTeX 복원용) */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
const attrEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `<span class="CLS" ...> ... </span>` 를 중첩(span depth) 고려해 balanced 매칭 후 replacer 로 치환.
 *  katex 출력처럼 span 이 깊게 중첩된 구조를 regex 대신 안전하게 처리. */
function replaceBalancedSpan(html: string, cls: string, replacer: (inner: string) => string): string {
  const marker = `<span class="${cls}"`;
  let out = "";
  let idx = 0;
  for (;;) {
    const start = html.indexOf(marker, idx);
    if (start === -1) { out += html.slice(idx); break; }
    const openEnd = html.indexOf(">", start);
    if (openEnd === -1) { out += html.slice(idx); break; }
    let depth = 1;
    let p = openEnd + 1;
    while (depth > 0 && p < html.length) {
      const nextOpen = html.indexOf("<span", p);
      const nextClose = html.indexOf("</span>", p);
      if (nextClose === -1) { p = html.length; break; }
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; p = nextOpen + 5; }
      else { depth--; p = nextClose + 7; }
    }
    const inner = html.slice(openEnd + 1, p - 7);
    out += html.slice(idx, start) + replacer(inner);
    idx = p;
  }
  return out;
}

/** katex 출력(span.katex-display / span.katex) → Plate math 노드(data-math-block / data-math-inline) */
function katexToPlateMath(html: string): string {
  const latexOf = (inner: string) => {
    const m = inner.match(/<annotation[^>]*>([\s\S]*?)<\/annotation>/);
    return m ? decodeEntities(m[1]).trim() : "";
  };
  // 블록 먼저(중첩된 inner .katex 까지 통째로 소비) → 그 다음 남은 inline
  html = replaceBalancedSpan(html, "katex-display", (inner) => {
    const tex = latexOf(inner);
    return `<div data-math-block="true" data-latex="${attrEsc(tex)}">${htmlEsc(tex)}</div>`;
  });
  html = replaceBalancedSpan(html, "katex", (inner) => {
    const tex = latexOf(inner);
    return `<span data-math-inline="true" data-latex="${attrEsc(tex)}">${htmlEsc(tex)}</span>`;
  });
  return html;
}

/** marked HTML → Plate 호환 후처리 */
export function postProcessMarkedHtml(html: string): string {
  // 각주 참조
  html = html.replace(
    /<sup><a[^>]*data-footnote-ref[^>]*>(\d+)<\/a><\/sup>/g,
    (_, num) => `<sup data-footnote-ref="${num}" id="fnref-${num}">[${num}]</sup>`
  );
  // 각주 정의
  html = html.replace(
    /<section[^>]*data-footnotes[^>]*>[\s\S]*?<\/section>/g,
    (section) => {
      const items: string[] = [];
      const liRe = /<li id="footnote-(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
      let m;
      while ((m = liRe.exec(section)) !== null) {
        const id = m[1];
        const text = m[2].replace(/<\/?p>/g, "").replace(/<a[^>]*data-footnote-backref[^>]*>[^<]*<\/a>/g, "").trim();
        items.push(`<div data-footnote-content="${id}" id="fn-${id}">${text}</div>`);
      }
      return items.join("\n");
    }
  );
  // 알림 블록 → callout (타입별 배경색·아이콘 — 라이브 자동변환과 동일 출처)
  html = html.replace(
    /<div class="markdown-alert markdown-alert-(\w+)">([\s\S]*?)<\/div>/g,
    (_, type: string, inner: string) => {
      const def = CALLOUT_BY_TYPE[type.toLowerCase() as CalloutType] ?? CALLOUT_BY_TYPE.note;
      const body = inner.replace(/<p class="markdown-alert-title">[\s\S]*?<\/p>/, "").trim();
      return `<div data-callout data-callout-bg="${def.bg}" data-callout-icon="${def.icon}">${body}</div>`;
    }
  );
  // 수식: katex 출력(span.katex-display / span.katex) → data-math-block / data-math-inline.
  //  블록을 먼저 balanced 매칭으로 통째로 치환(인라인 regex 가 블록 안 .katex 를 오인 변환하던 버그 수정).
  html = katexToPlateMath(html);
  // 열블록 마커 + 표 → column HTML 복원
  html = html.replace(
    /<!-- columns ([^>]*?) -->\s*<table>([\s\S]*?)<\/table>/g,
    (full, metaStr: string, tableBody: string) => {
      // 메타 파싱: "33%,33%,34% layout=2-col bg=var(--bg-tertiary) divider=transparent"
      const parts = metaStr.trim().split(/\s+/);
      const widths = (parts[0] || "").split(",");
      const layout = parts.find((p) => p.startsWith("layout="))?.slice(7) || "";
      const bg = parts.find((p) => p.startsWith("bg="))?.slice(3) || "";
      const divider = parts.find((p) => p.startsWith("divider="))?.slice(8) || "";
      // 표 본문에서 셀 내용 추출 (thead 제외, tbody의 첫 행)
      const cells: string[] = [];
      const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
      let m: RegExpExecArray | null;
      const rows = tableBody.split(/<\/tr>/);
      const dataRow = rows.length > 1 ? rows[rows.length - 2] : rows[0];
      while ((m = tdRe.exec(dataRow)) !== null) {
        cells.push(m[1].trim());
      }
      if (cells.length === 0) return full;
      const groupAttrs = [
        "data-column-group",
        layout ? ` data-layout="${layout}"` : "",
        bg ? ` data-column-bg="${bg}"` : "",
        divider ? ` data-column-divider="${divider}"` : "",
      ].join("");
      const columns = cells.map((content, i) => {
        const w = widths[i] || "";
        const wAttr = w ? ` data-width="${w}"` : "";
        const inner = content.startsWith("<") ? content : `<p>${content}</p>`;
        return `<div data-column${wAttr}>${inner || "<p></p>"}</div>`;
      }).join("");
      return `<div ${groupAttrs}>${columns}</div>`;
    }
  );
  // 파일 첨부 링크 → file_embed 복원: [📎 name](url) → <div data-file-embed ...>
  html = html.replace(
    /<a href="([^"]+)">📎\s*([^<]+)<\/a>/g,
    (_, url, name) => `<div data-file-embed data-url="${url}" data-filename="${name.trim()}"></div>`
  );
  // 오디오 첨부 링크 → audio_embed 복원: [🔊 title](url) → <div data-audio-embed ...>
  html = html.replace(
    /<a href="([^"]+)">🔊\s*([^<]+)<\/a>/g,
    (_, url, title) => `<div data-audio-embed data-url="${url}" data-title="${title.trim()}"></div>`
  );
  // 코드블록 wrap toggle 버튼 제거
  html = html.replace(/<button[^>]*class="code-wrap-toggle"[^>]*>[\s\S]*?<\/button>/g, "");
  // callout 아이콘 visual span 제거 (deserialize 시 중복 방지)
  html = html.replace(/<span data-callout-icon-visual[^>]*>[\s\S]*?<\/span>/g, "");
  // <ul>/<ol> → Plate indent-list 호환 (li를 개별 div로)
  const convertList = (listHtml: string, type: "disc" | "decimal", depth = 1): string => {
    return listHtml.replace(/<li>([\s\S]*?)<\/li>/g, (_, content: string) => {
      let nested = "";
      let text = content;
      text = text.replace(/<(ul|ol)>([\s\S]*?)<\/\1>/g, (_m: string, tag: string, inner: string) => {
        nested += convertList(inner, tag === "ol" ? "decimal" : "disc", depth + 1);
        return "";
      });
      // checkbox → 일반 리스트로 변환 (PlateEditor fixTodo에서 todo로 후처리)
      const checkboxMatch = text.match(/<input([^>]*)type="checkbox"([^>]*)>/);
      if (checkboxMatch) {
        text = text.replace(/<input[^>]*type="checkbox"[^>]*>\s*/, "");
        text = text.replace(/<\/?p>/g, "").trim();
        return `<p>\u200B\u2610 ${text}</p>${nested}`;
      }
      text = text.replace(/<\/?p>/g, "").trim();
      return `<li data-indent="${depth}" data-list-style-type="${type}">${text}</li>${nested}`;
    });
  };
  html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => convertList(inner, "disc"));
  html = html.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => convertList(inner, "decimal"));
  // 📺 미디어 임베드 마커 링크(richtext→md 시 생성) → media_embed iframe 복원 (round-trip).
  // 단독 문단 `[📺 url](url)` 만 대상 (일반 링크 오변환 방지).
  html = html.replace(
    /<p><a href="([^"]+)"[^>]*>\s*📺[^<]*<\/a><\/p>/g,
    (_m, url) =>
      `<div style="display:flex;justify-content:center"><iframe src="${url}" data-original-url="${url}" style="width:100%;aspect-ratio:16/9" frameborder="0" loading="lazy" allowfullscreen></iframe></div>`
  );
  return html;
}
