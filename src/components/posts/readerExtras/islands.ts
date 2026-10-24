import type React from "react";
import { normalizePlayground, RUNNER_TEMPLATES } from "../plate/playground/model";
import { normalizeGallery } from "../plate/gallery/model";

import type { ReaderExtrasContext } from "./context";

/* React island 네 종류 — mermaid 다이어그램 · 코드 플레이그라운드 · 캘린더 · 슬라이드 갤러리.
   셋 다 무거운 의존성이라 동적 import 로 가져와 마운트하고, 언마운트 때 root 를 정리한다. */

/** 화면 근처(위아래 600px)에 올 때 한 번 돈다. 다이어그램을 로드 직후 한꺼번에 그리면 mermaid · elkjs 가
 *  메인 스레드를 1초 가까이 막았다(느린 CPU 조건, 글 상세 TBT 의 대부분). 그 전까지는 코드 블록이 그대로 보인다 */
function whenNear(host: HTMLElement, cleanups: (() => void)[], run: () => void) {
  if (typeof IntersectionObserver === "undefined") return run();
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    run();
  }, { rootMargin: "600px 0px" });
  io.observe(host);
  cleanups.push(() => io.disconnect());
}

export function renderIslands({ el, labels, body, cleanups, isCancelled }: ReaderExtrasContext) {
  // ── mermaid ── 에디터와 동일 UI(SegmentedControl + MermaidPreview) React island 로 마운트
  el.querySelectorAll<HTMLElement>("code.language-mermaid").forEach((code) => {
    const src = (code.textContent || "").trim();
    // 직렬화는 .code-block-wrap > pre > code 구조 → wrap 전체를 island 로 교체
    const host = (code.closest(".code-block-wrap") ?? code.closest("pre") ?? code) as HTMLElement;
    if (!src || host.dataset.mermaidDone) return;
    host.dataset.mermaidDone = "1";
    let root: import("react-dom/client").Root | null = null;
    whenNear(host, cleanups, () => {
      if (isCancelled() || !host.isConnected) return;
      const mount = document.createElement("div");
      host.replaceWith(mount);
      Promise.all([
        import("react"),
        import("react-dom/client"),
        import("../plate/ReaderMermaid"),
      ]).then(([ReactMod, rdc, mod]) => {
        if (isCancelled() || !mount.isConnected) return;
        const r = rdc.createRoot(mount);
        root = r;
        r.render(ReactMod.createElement(mod.default, {
          code: src,
          labels: { diagram: labels.diagram, code: labels.code, split: labels.split, copyCode: labels.copyCode, copied: labels.copied },
          controls: {
            zoomIn: body.mermaidZoomIn,
            zoomOut: body.mermaidZoomOut,
            reset: body.mermaidReset,
            panUp: body.mermaidPanUp,
            panDown: body.mermaidPanDown,
            panLeft: body.mermaidPanLeft,
            panRight: body.mermaidPanRight,
            fullscreen: body.mermaidFullscreen,
            exitFullscreen: body.mermaidExitFullscreen,
          },
        }));
      }).catch(() => { /* noop */ });
    });
    // 언마운트는 microtask 로 미룬다 — 부모가 렌더 중일 때 동기 unmount 하면
    // "synchronously unmount a root while React was already rendering" 경고가 난다.
    cleanups.push(() => { const r = root; queueMicrotask(() => { try { r?.unmount(); } catch { /* noop */ } }); });
  });

  // ── 코드 플레이그라운드 (data-playground) ── 읽기전용 Sandpack 을 React island 로 마운트
  el.querySelectorAll<HTMLElement>("[data-playground]").forEach((host) => {
    if (host.dataset.pgDone) return;
    host.dataset.pgDone = "1";
    const data = normalizePlayground((() => { try { return JSON.parse(host.getAttribute("data-playground") || "{}"); } catch { return {}; } })());
    const mount = document.createElement("div");
    mount.className = "reader-playground";
    host.replaceWith(mount);
    const pgTheme: "dark" | "light" = (document.documentElement.getAttribute("data-theme") || "").includes("dark") ? "dark" : "light";
    let root: import("react-dom/client").Root | null = null;
    // HTML/CSS/JS(html·static) → 자체 srcdoc 러너, 나머지 → Sandpack
    const isRunner = RUNNER_TEMPLATES.has(data.template);
    Promise.all([
      import("react"),
      import("react-dom/client"),
      isRunner ? import("../plate/playground/PlaygroundRunner") : import("../plate/playground/PlaygroundSandpack"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (isCancelled() || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      const props = isRunner
        ? { data, readOnly: true, height: 460, resizable: true }
        : { data, readOnly: true, explorer: true, theme: pgTheme, height: 460, resizable: true };
      r.render(ReactMod.createElement(mod.default as React.ComponentType<Record<string, unknown>>, props));
    }).catch(() => { /* noop */ });
    // 언마운트는 microtask 로 미룬다 — 부모가 렌더 중일 때 동기 unmount 하면
    // "synchronously unmount a root while React was already rendering" 경고가 난다.
    cleanups.push(() => { const r = root; queueMicrotask(() => { try { r?.unmount(); } catch { /* noop */ } }); });
  });

  // ── 슬라이드 갤러리 (data-gallery) ── 작업물 상세와 같은 갤러리(장마다 음성 · 자막)를 React island 로 마운트
  el.querySelectorAll<HTMLElement>("[data-gallery]").forEach((host) => {
    if (host.dataset.galleryDone) return;
    host.dataset.galleryDone = "1";
    const data = normalizeGallery((() => { try { return JSON.parse(host.getAttribute("data-gallery") || "{}"); } catch { return {}; } })());
    if (data.gallery.length === 0) { host.remove(); return; }
    const mount = document.createElement("div");
    mount.className = "reader-gallery";
    host.replaceWith(mount);
    let root: import("react-dom/client").Root | null = null;
    Promise.all([
      import("react"),
      import("react-dom/client"),
      import("../../gallery/ReaderGallery"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (isCancelled() || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      r.render(ReactMod.createElement(mod.default, { data, title: document.title, labels: body }));
    }).catch(() => { /* noop */ });
    cleanups.push(() => { const r = root; queueMicrotask(() => { try { r?.unmount(); } catch { /* noop */ } }); });
  });

  // ── Calendar ── 연결형(data-calendar-id: 서버 fetch) / legacy(data-calendar: inline). 읽기전용 React island.
  const calLang = (document.documentElement.lang || "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
  el.querySelectorAll<HTMLElement>("[data-calendar-id], [data-calendar]").forEach((host) => {
    if (host.dataset.calDone) return;
    host.dataset.calDone = "1";
    const calendarId = host.getAttribute("data-calendar-id") || undefined;
    let data: unknown = {};
    if (!calendarId) { try { data = JSON.parse(host.getAttribute("data-calendar") || "{}"); } catch { /* noop */ } }
    const mount = document.createElement("div");
    host.replaceWith(mount);
    let root: import("react-dom/client").Root | null = null;
    Promise.all([
      import("react"),
      import("react-dom/client"),
      import("../plate/ReaderCalendar"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (isCancelled() || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      r.render(ReactMod.createElement(mod.default, { calendarId, data, language: calLang, uiLabels: body }));
    }).catch(() => { /* noop */ });
    // 언마운트는 microtask 로 미룬다 — 부모가 렌더 중일 때 동기 unmount 하면
    // "synchronously unmount a root while React was already rendering" 경고가 난다.
    cleanups.push(() => { const r = root; queueMicrotask(() => { try { r?.unmount(); } catch { /* noop */ } }); });
  });
}
