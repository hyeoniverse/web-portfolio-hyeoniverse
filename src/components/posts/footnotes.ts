// ── 본문 각주 — 번호를 누르면 각주로, 각주의 ↩ 를 누르면 읽던 자리로 ──
// richtext 는 각주를 `<sup data-footnote-ref="1" id="fnref-1">[1]</sup>` · `<div data-footnote-content="1" id="fn-1">` 로
// 저장한다(plateSerializer). 링크가 아니라서 누를 수 없었다 — 번호를 링크로 감싸고 각주 끝에 돌아가기 링크를 단다.
// markdown(marked-footnote)은 처음부터 `a[data-footnote-ref]` · `a[data-footnote-backref]` 링크라 클릭만 맡는다.
// 이동은 고정 네비게이션에 가리지 않게 띄워 부드럽게(목차와 같은 거리 · 같은 Lenis), 도착한 곳은 잠깐 강조한다.

import { fillLabel } from "@/lib/bodyLabels";
import type Lenis from "@studio-freight/lenis";

/** 고정 네비게이션 · 왼쪽 위 뒤로가기 버튼(DetailLayout, 아래 끝 약 135px)에 가리지 않을 거리.
 *  목차의 100px 로는 첫 각주 줄이 뒤로가기 버튼 밑에 깔렸다 */
const NAV_OFFSET = 160;
/** 옮긴 뒤 이만큼은 본문 크기가 바뀌면 목표를 다시 맞춘다(ms). 지나온 다이어그램이 다가올 때 그려지며(readerExtras/islands)
 *  글이 길어져, 출발할 때 잡은 자리가 밀렸다 — 1468px 아래에 멈췄다 */
const PIN_MS = 2500;
/** 도착 강조 시간(ms) — CSS 의 [data-footnote-flash] 애니메이션 길이(--duration-slower × 2)와 같다 */
const FLASH_MS = 1600;

const LINKS = "sup[data-footnote-ref] > a, a[data-footnote-ref], a[data-footnote-backref]";

export interface FootnoteLabels {
  /** 각주 번호 링크 — {{n}} 자리에 번호 */
  footnoteRef: string;
  /** 각주 끝의 돌아가기 링크 */
  footnoteBack: string;
}

/** 각주 링크를 만들고 클릭을 맡는다. 정리 함수를 돌려준다 */
export function enhanceFootnotes(root: HTMLElement, labels: FootnoteLabels): () => void {
  const byId = (id: string) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ?? document.getElementById(id);

  /* richtext — 번호를 링크로 */
  root.querySelectorAll<HTMLElement>("sup[data-footnote-ref]").forEach((sup) => {
    const n = sup.getAttribute("data-footnote-ref") ?? "";
    if (!n || sup.querySelector("a") || !byId(`fn-${n}`)) return;
    const a = document.createElement("a");
    a.href = `#fn-${n}`;
    a.setAttribute("aria-label", fillLabel(labels.footnoteRef, { n }));
    a.append(...sup.childNodes);
    sup.append(a);
  });

  /* richtext — 각주 끝에 돌아가기 */
  root.querySelectorAll<HTMLElement>("div[data-footnote-content]").forEach((note) => {
    const n = note.getAttribute("data-footnote-content") ?? "";
    if (!n || note.querySelector("a[data-footnote-backref]") || !byId(`fnref-${n}`)) return;
    const back = document.createElement("a");
    back.href = `#fnref-${n}`;
    back.setAttribute("data-footnote-backref", "");
    back.setAttribute("aria-label", labels.footnoteBack);
    back.title = labels.footnoteBack;
    /* U+FE0E — 글자 모양으로. 없으면 이모지 글꼴의 파란 상자로 그려졌다 */
    back.textContent = "\u21A9\uFE0E";
    note.append(" ", back);
  });

  let flashTimer = 0;
  let unpin = () => {};
  const lenisOf = () => (window as typeof window & { lenis?: Lenis }).lenis;
  /* 목표를 네비 아래에 둔다 — smooth 가 아니면 바로 */
  const scrollTo = (target: HTMLElement, smooth: boolean, onDone?: () => void) => {
    const lenis = lenisOf();
    if (lenis) {
      lenis.scrollTo(target, { offset: -NAV_OFFSET, duration: smooth ? 0.8 : 0, immediate: !smooth, onComplete: onDone });
      return;
    }
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET, behavior: smooth ? "smooth" : "auto" });
    if (onDone) window.setTimeout(onDone, smooth ? 900 : 0);
  };
  /* 옮긴 뒤 잠깐 붙잡아 둔다 — 본문 크기가 바뀌면 다시 맞추고, 사람이 직접 스크롤하면 바로 놓는다 */
  const pin = (target: HTMLElement) => {
    unpin();
    const until = performance.now() + PIN_MS;
    const realign = () => {
      if (performance.now() > until) return unpin();
      if (Math.abs(target.getBoundingClientRect().top - NAV_OFFSET) > 4) scrollTo(target, false);
    };
    const ro = new ResizeObserver(realign);
    ro.observe(root);
    const release = () => unpin();
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    const timer = window.setTimeout(() => unpin(), PIN_MS);
    unpin = () => {
      ro.disconnect();
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
      window.clearTimeout(timer);
      unpin = () => {};
    };
    return realign;
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>(LINKS);
    const hash = link?.getAttribute("href");
    if (!link || !hash?.startsWith("#") || !root.contains(link)) return;
    const target = byId(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    e.preventDefault();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    unpin();
    /* 스크롤이 끝나면 밀린 만큼 바로 맞추고, 그 뒤 잠깐 붙잡아 둔다(늦게 그려지는 다이어그램) */
    scrollTo(target, !reduce, () => pin(target)());

    /* 키보드로 누른 사람도 그 자리에서 이어 가게 초점을 옮긴다 — 이동은 위에서 했으니 브라우저 스크롤은 막는다 */
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    history.replaceState(history.state, "", hash);

    root.querySelectorAll("[data-footnote-flash]").forEach((el) => el.removeAttribute("data-footnote-flash"));
    target.setAttribute("data-footnote-flash", "");
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => target.removeAttribute("data-footnote-flash"), FLASH_MS);
  };

  root.addEventListener("click", onClick);
  return () => {
    root.removeEventListener("click", onClick);
    window.clearTimeout(flashTimer);
    unpin();
  };
}
