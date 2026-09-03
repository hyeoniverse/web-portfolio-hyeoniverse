import type React from "react";
import { normalizePlayground, RUNNER_TEMPLATES } from "../plate/playground/model";

import type { ReaderExtrasContext } from "./context";

/* React island 세 종류 — mermaid 다이어그램 · 코드 플레이그라운드 · 캘린더.
   셋 다 무거운 의존성이라 동적 import 로 가져와 마운트하고, 언마운트 때 root 를 정리한다. */
export function renderIslands({ el, labels, cleanups, isCancelled }: ReaderExtrasContext) {
  // ── mermaid ── 에디터와 동일 UI(SegmentedControl + MermaidPreview) React island 로 마운트
  el.querySelectorAll<HTMLElement>("code.language-mermaid").forEach((code) => {
    const src = (code.textContent || "").trim();
    // 직렬화는 .code-block-wrap > pre > code 구조 → wrap 전체를 island 로 교체
    const host = (code.closest(".code-block-wrap") ?? code.closest("pre") ?? code) as HTMLElement;
    if (!src || host.dataset.mermaidDone) return;
    host.dataset.mermaidDone = "1";
    const mount = document.createElement("div");
    host.replaceWith(mount);
    let root: import("react-dom/client").Root | null = null;
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
      }));
    }).catch(() => { /* noop */ });
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
      r.render(ReactMod.createElement(mod.default, { calendarId, data, language: calLang }));
    }).catch(() => { /* noop */ });
    // 언마운트는 microtask 로 미룬다 — 부모가 렌더 중일 때 동기 unmount 하면
    // "synchronously unmount a root while React was already rendering" 경고가 난다.
    cleanups.push(() => { const r = root; queueMicrotask(() => { try { r?.unmount(); } catch { /* noop */ } }); });
  });
}
