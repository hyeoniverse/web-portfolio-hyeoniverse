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
  // ��림 블록 → callout
  html = html.replace(
    /<div class="markdown-alert markdown-alert-(\w+)">([\s\S]*?)<\/div>/g,
    (_, type, inner) => {
      const iconMap: Record<string, string> = { note: "ℹ️", tip: "💡", important: "❗", warning: "⚠️", caution: "🔴" };
      const body = inner.replace(/<p class="markdown-alert-title">[\s\S]*?<\/p>/, "").trim();
      return `<div data-callout data-callout-bg="var(--bg-tertiary)" data-callout-icon="${iconMap[type] || "💡"}">${body}</div>`;
    }
  );
  // 인라인 수식
  html = html.replace(
    /<span class="katex">([\s\S]*?)<\/span>(?=(?:(?!<span class="katex">).)*?(?:<\/p>|$))/g,
    (full) => {
      const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
      if (!ann) return full;
      return `<span data-math-inline="true" data-latex="${ann[1]}">${ann[1]}</span>`;
    }
  );
  // 블록 수식
  html = html.replace(
    /<span class="katex-display">([\s\S]*?)<\/span>\s*(?=\n|$)/g,
    (full) => {
      const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
      if (!ann) return full;
      return `<div data-math-block="true" data-latex="${ann[1]}">${ann[1]}</div>`;
    }
  );
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
  return html;
}
