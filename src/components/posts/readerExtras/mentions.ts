import { formatDateValue } from "../plate/dateUtils";
import { fetchPostIcon, isImageIcon } from "../plate/postLinkIcon";

import type { ReaderExtrasContext } from "./context";

/* 날짜 멘션과 문서 멘션 — 저장된 값은 그대로 두고 표시 텍스트만 현재 locale 로 다시 만들고,
   문서 링크에는 대상 게시물의 아이콘을 앞에 붙인다. */
export function renderMentions({ el }: ReaderExtrasContext) {
  // ── 날짜 멘션 (data-date-mention) ── locale 기준으로 표시 텍스트 재포맷
  const dmLang = (document.documentElement.lang || "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
  const DM_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>';
  el.querySelectorAll<HTMLElement>("[data-date-mention]").forEach((span) => {
    if (span.dataset.dmDone) return;
    span.dataset.dmDone = "1";
    const date = span.getAttribute("data-date-mention");
    const time = span.getAttribute("data-time");
    const text = formatDateValue(date, time, dmLang);
    if (!text) return;
    span.textContent = "";
    span.insertAdjacentHTML("beforeend", DM_ICON);
    const label = document.createElement("span");
    label.textContent = text;
    span.appendChild(label);
  });

  // ── 문서 멘션 (a[data-post-link]) ── 다른 링크와 구분되게 게시물 아이콘(이모지/이미지) 앞에 표시
  el.querySelectorAll<HTMLAnchorElement>("a[data-post-link]").forEach((a) => {
    if (a.dataset.plDone) return;
    a.dataset.plDone = "1";
    const slug = a.getAttribute("data-post-link") || "";
    const setIcon = (icon: string) => {
      if (!icon || a.querySelector(".post-link-icon")) return;
      const span = document.createElement("span");
      span.className = "post-link-icon";
      if (isImageIcon(icon)) {
        const img = document.createElement("img");
        img.src = icon; img.alt = ""; img.loading = "lazy";
        span.appendChild(img);
      } else {
        span.textContent = icon;
      }
      a.insertBefore(span, a.firstChild);
    };
    const stored = a.getAttribute("data-post-icon");
    if (stored) setIcon(stored);
    else if (slug) fetchPostIcon(slug).then(setIcon).catch(() => {});
  });
}
