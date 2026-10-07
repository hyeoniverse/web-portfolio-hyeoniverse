"use client";

import { useEffect } from "react";
import { formatHex, parse } from "culori";
import { useRoutePathname } from "@/hooks/useRoutePathname";

/** 상태줄 뒤 색을 화면 맨 위 배경색에 맞춘다.
 *
 *  - iOS Safari 등 — <meta name="theme-color"> 를 그 색으로 바꾼다. 서버 HTML 의 값(layout viewport)은
 *    OS 다크 모드 기준 고정값이라 사이트 테마 · 프리셋을 따라가지 않는다. 지우지 않고 content 만 바꾼다(Next 가 관리하는 요소다)
 *  - MacFolio 처럼 다른 사이트가 이 사이트를 iframe 으로 띄운 경우 — 부모 창은 다른 출처라 안을 읽을 수 없어,
 *    약속된 메시지(macfolio:bar-color)로 색을 알린다
 *
 *  테마 전환(html 의 data-theme · 색 덮어쓰기), 페이지 이동, 스크롤(맨 위 요소가 바뀐다) 때 다시 읽는다. */
const BAR_COLOR_MESSAGE = "macfolio:bar-color";

/** 맨 위 가운데 지점에 겹친 요소들 가운데 위에서부터 처음 만나는 불투명한 바탕색을 #rrggbb 로.
 *  반투명(유리판 네비 등)은 건너뛴다. 잠깐 덮었다 걷히는 막(로딩 화면 · 페이지 전환, `data-nav-tone-skip`)도 건너뛴다 —
 *  막이 걷힐 때 알려 주는 신호가 없어, 막 색을 읽으면 걷힌 뒤에도 그 색에 머문다(lib/navBackdrop 과 같은 규칙).
 *  모달 · 메뉴처럼 열려 있는 동안 화면을 덮는 것은 그 색을 따른다.
 *  hex 로 바꾸는 이유 — 값이 oklch 로 읽히는데, theme-color 를 오래된 Safari 도 읽고 받는 쪽(MacFolio)도 그대로 쓰게 */
function readTopColor(): string | null {
  const solid = (css: string) => {
    const c = parse(css);
    return c && (c.alpha ?? 1) >= 1 ? formatHex(c) : null;
  };
  for (const el of document.elementsFromPoint(window.innerWidth / 2, 1)) {
    if (el.closest("[data-nav-tone-skip]")) continue;
    const hex = solid(getComputedStyle(el).backgroundColor);
    if (hex) return hex;
  }
  return solid(getComputedStyle(document.body).backgroundColor) ?? solid(getComputedStyle(document.documentElement).backgroundColor);
}

export default function BarColorSync() {
  const pathname = useRoutePathname();

  useEffect(() => {
    const embedded = window.parent !== window;
    let last = "";
    const apply = () => {
      const color = readTopColor();
      if (!color || color === last) return;
      last = color;
      document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
        m.content = color;
      });
      if (embedded) window.parent.postMessage({ type: BAR_COLOR_MESSAGE, color }, "*");
    };

    /* 페이지 이동 직후에는 전환 덮개 · 늦게 그려지는 첫 화면이 맨 위를 가린다 — 몇 번 늦춰 다시 읽는다 */
    apply();
    const timers = [300, 900, 2000].map((ms) => window.setTimeout(apply, ms));

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; apply(); });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    /* 테마 전환(data-theme · 인라인 색 덮어쓰기) · 모달 · 메뉴 열고 닫기(스크롤 잠금이 html 의 class · style 을 바꾼다).
       색 transition · 여닫는 움직임이 끝난 뒤 값도 다시 읽는다 */
    const observer = new MutationObserver(() => {
      schedule();
      timers.push(window.setTimeout(apply, 400), window.setTimeout(apply, 1000));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
