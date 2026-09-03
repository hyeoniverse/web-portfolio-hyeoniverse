import type { ReaderExtrasContext } from "./context";

/* 본문 heading 기반 목차 — 에디터가 남긴 [data-toc] 마커 자리에 앵커 링크 nav 를 만든다.
   id 없는 heading 에는 slug id 를 먼저 붙인다. */
export function renderToc({ el }: ReaderExtrasContext) {
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
}
