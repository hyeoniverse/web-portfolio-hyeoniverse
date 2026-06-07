// ── 공개 페이지 richtext 부가 렌더 ──
// 에디터에서 저장된 마커를 리더에서 실제 렌더한다:
//  - <code class="language-mermaid">  → mermaid SVG 다이어그램
//  - <div data-toc>                   → 본문 heading 기반 목차(앵커 링크)
// dangerouslySetInnerHTML 로 그려진 DOM 을 후처리하므로 클라이언트에서만 호출.

/** 컨테이너 내 mermaid 코드블록 + TOC 마커를 렌더. cleanup 함수 반환. */
export function enhanceReaderExtras(el: HTMLElement): () => void {
  let cancelled = false;

  // ── TOC ──
  const tocMarkers = el.querySelectorAll<HTMLElement>("[data-toc]");
  if (tocMarkers.length) {
    // id 없는 heading 에 slug id 부여 (앵커 링크용)
    Array.from(el.querySelectorAll<HTMLElement>("h1, h2, h3, h4")).forEach((h, i) => {
      if (!h.id) {
        const slug = (h.textContent || "").trim().toLowerCase()
          .replace(/[^\w가-힣\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);
        h.id = slug || `heading-${i}`;
      }
    });
  }
  tocMarkers.forEach((tocEl) => {
    if (tocEl.dataset.tocRendered) return;
    const headings = Array.from(
      el.querySelectorAll<HTMLElement>("h1, h2, h3, h4"),
    ).filter((h) => h.id && !tocEl.contains(h));
    tocEl.dataset.tocRendered = "1";
    tocEl.innerHTML = "";
    if (!headings.length) return;
    const nav = document.createElement("nav");
    nav.className = "reader-toc";
    headings.forEach((h) => {
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent || "";
      a.dataset.depth = h.tagName.charAt(1);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      nav.appendChild(a);
    });
    tocEl.appendChild(nav);
  });

  // ── mermaid ──
  const blocks = Array.from(el.querySelectorAll<HTMLElement>("code.language-mermaid"));
  if (blocks.length) {
    import("mermaid")
      .then(({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        blocks.forEach(async (code, i) => {
          const src = (code.textContent || "").trim();
          const host = code.closest("pre") ?? code;
          if (!src) return;
          try {
            const id = `rmmd-${i}-${Math.floor(Math.random() * 1e9).toString(36)}`;
            const { svg } = await mermaid.render(id, src);
            if (cancelled) return;
            const wrap = document.createElement("div");
            wrap.className = "reader-mermaid";
            wrap.innerHTML = svg;
            host.replaceWith(wrap);
          } catch {
            /* 파싱 실패 시 원본 코드블록 유지 */
          }
        });
      })
      .catch(() => {});
  }

  return () => { cancelled = true; };
}
