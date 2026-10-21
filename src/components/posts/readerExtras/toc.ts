import type { ReaderExtrasContext } from "./context";

/* 본문 heading 기반 목차 — 에디터가 남긴 [data-toc] 마커 자리에 앵커 링크 nav 를 만든다.
   id 없는 heading 에는 slug id 를 먼저 붙인다.
   들여쓰기는 글에서 가장 높은 단계를 0 으로 센다(data-level) — h2 부터 쓰는 글도 첫 단계가 들여쓰이지 않게.
   읽는 위치를 따라 별자리가 켜진다 — 지금 읽는 절은 data-state="active", 지나온 절은 "passed"(PostArticleBody.module.css) */
export function renderToc({ el, body, cleanups }: ReaderExtrasContext) {
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
    nav.setAttribute("aria-label", body.tocTitle);
    const title = document.createElement("p");
    title.className = "reader-toc-title";
    title.textContent = body.tocTitle;
    const count = document.createElement("span");
    count.className = "reader-toc-count";
    count.textContent = String(headings.length);
    title.appendChild(count);
    nav.appendChild(title);
    const top = Math.min(...headings.map((h) => Number(h.tagName.charAt(1))));
    const links = headings.map((h) => {
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent || "";
      a.dataset.depth = h.tagName.charAt(1);
      a.dataset.level = String(Number(h.tagName.charAt(1)) - top);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      nav.appendChild(a);
      return a;
    });
    tocEl.appendChild(nav);
    cleanups.push(trackReading(headings, links));
  });
}

/** 읽는 위치 — 화면 위쪽 30% 선을 지난 마지막 heading 이 지금 절. 스크롤마다 한 프레임에 한 번만 잰다 */
function trackReading(headings: HTMLElement[], links: HTMLAnchorElement[]): () => void {
  if (typeof window === "undefined") return () => {};
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = window.innerHeight * 0.3;
    let current = -1;
    headings.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) current = i; });
    links.forEach((a, i) => {
      const state = i < current ? "passed" : i === current ? "active" : "";
      if (state) a.dataset.state = state;
      else delete a.dataset.state;
      if (i === current) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
