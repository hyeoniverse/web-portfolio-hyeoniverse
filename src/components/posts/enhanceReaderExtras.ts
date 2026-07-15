// ── 공개 페이지 richtext 부가 렌더 ──
// 에디터에서 저장된 마커를 리더에서 실제 렌더한다:
//  - <code class="language-mermaid">  → mermaid SVG 다이어그램
//  - <div data-toc>                   → 본문 heading 기반 목차(앵커 링크)
// dangerouslySetInnerHTML 로 그려진 DOM 을 후처리하므로 클라이언트에서만 호출.

import type React from "react";
import { buildPollResult, buildPollSortControl, compactNum, type PollSortKey } from "./pollResultView";
import { normalizePlayground, RUNNER_TEMPLATES } from "./plate/playground/model";
import { formatDateValue } from "./plate/dateUtils";
import { fetchPostIcon, isImageIcon } from "./plate/postLinkIcon";

/** 컨테이너 내 mermaid 코드블록 + TOC 마커를 렌더. cleanup 함수 반환. */
export function enhanceReaderExtras(
  el: HTMLElement,
  labels?: { viewCode?: string; hideCode?: string; copyCode?: string; copied?: string; diagram?: string; code?: string; split?: string },
): () => void {
  let cancelled = false;
  const docCleanups: Array<() => void> = [];
  const L = {
    viewCode: labels?.viewCode ?? "코드 보기",
    hideCode: labels?.hideCode ?? "코드 숨기기",
    copyCode: labels?.copyCode ?? "코드 복사",
    copied: labels?.copied ?? "복사됨",
    diagram: labels?.diagram ?? "다이어그램",
    code: labels?.code ?? "코드",
    split: labels?.split ?? "스플릿",
  };

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
      import("./plate/ReaderMermaid"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (cancelled || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      r.render(ReactMod.createElement(mod.default, {
        code: src,
        labels: { diagram: L.diagram, code: L.code, split: L.split, copyCode: L.copyCode, copied: L.copied },
      }));
    }).catch(() => { /* noop */ });
    docCleanups.push(() => { try { root?.unmount(); } catch { /* noop */ } });
  });

  // ── 비주얼 다이어그램 (data-diagram) ── 위치 보존 노드/엣지 → vanilla SVG(읽기전용) 렌더
  el.querySelectorAll<HTMLElement>("[data-diagram]").forEach((host) => {
    if (host.dataset.diagramDone) return;
    host.dataset.diagramDone = "1";
    let data: { nodes?: Array<{ id: string; label?: string; x: number; y: number; width?: number; height?: number; shape?: string; color?: string; fontSize?: number; textColor?: string }>; edges?: Array<{ source: string; target: string; label?: string; arrow?: string; arrowStart?: string; arrowEnd?: string; line?: string; curve?: string }> } = {};
    try { data = JSON.parse(host.getAttribute("data-diagram") || "{}"); } catch { /* noop */ }
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const edges = Array.isArray(data.edges) ? data.edges : [];
    if (!nodes.length) { host.remove(); return; }

    const NS = "http://www.w3.org/2000/svg";
    const nodeW = (n: { label?: string; width?: number }) => n.width ?? Math.max(80, ((n.label || "").length) * 8 + 28);
    const nodeH = (n: { height?: number }) => n.height ?? 40;
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + nodeW(n)); maxY = Math.max(maxY, n.y + nodeH(n)); });
    const pad = 24;
    const vb = `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", vb);
    svg.setAttribute("class", "reader-diagram-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // 화살표 marker — 채운 삼각형 / 열린 화살(둘 다 orient auto-start-reverse 라 start·end 양쪽에 재사용)
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      `<marker id="rd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>` +
      `<marker id="rd-arrow-open" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="currentColor" stroke-width="1.6"/></marker>`;
    svg.appendChild(defs);
    const markerId = (a?: string) => (a === "arrow" ? "url(#rd-arrow-open)" : "url(#rd-arrow)");

    // edges (center→center, target 사각형 경계에서 멈춤 근사)
    edges.forEach((e) => {
      const s = byId.get(e.source); const tg = byId.get(e.target);
      if (!s || !tg) return;
      const sx = s.x + nodeW(s) / 2, sy = s.y + nodeH(s) / 2;
      const tx = tg.x + nodeW(tg) / 2, ty = tg.y + nodeH(tg) / 2;
      // target 사각형 경계로 클립
      const dx = tx - sx, dy = ty - sy;
      const halfW = nodeW(tg) / 2, halfH = nodeH(tg) / 2;
      const scale = dx === 0 && dy === 0 ? 0 : Math.min(Math.abs(halfW / (dx || 1e-6)), Math.abs(halfH / (dy || 1e-6)));
      const ex = tx - dx * scale, ey = ty - dy * scale;
      // 선 모양 — 직선(line) / 꺾은선·곡선(path)
      const mx = (sx + ex) / 2, my = (sy + ey) / 2, horiz = Math.abs(ex - sx) >= Math.abs(ey - sy);
      let el: SVGElement;
      if (e.curve === "smoothstep") {
        el = document.createElementNS(NS, "path");
        el.setAttribute("d", horiz ? `M${sx},${sy} L${mx},${sy} L${mx},${ey} L${ex},${ey}` : `M${sx},${sy} L${sx},${my} L${ex},${my} L${ex},${ey}`);
        el.setAttribute("fill", "none");
      } else if (e.curve === "bezier" || e.curve == null) {
        el = document.createElementNS(NS, "path");
        el.setAttribute("d", horiz ? `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` : `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`);
        el.setAttribute("fill", "none");
      } else { // straight
        el = document.createElementNS(NS, "line");
        el.setAttribute("x1", String(sx)); el.setAttribute("y1", String(sy));
        el.setAttribute("x2", String(ex)); el.setAttribute("y2", String(ey));
      }
      el.setAttribute("class", "reader-diagram-edge");
      const endA = e.arrowEnd ?? e.arrow ?? "arrowclosed";
      const startA = e.arrowStart ?? "none";
      if (endA !== "none") el.setAttribute("marker-end", markerId(endA));
      if (startA !== "none") el.setAttribute("marker-start", markerId(startA));
      if (e.line === "dashed") el.setAttribute("stroke-dasharray", "6 4");
      else if (e.line === "dotted") el.setAttribute("stroke-dasharray", "1.5 4");
      svg.appendChild(el);
      if (e.label) {
        const lt = document.createElementNS(NS, "text");
        lt.setAttribute("x", String((sx + ex) / 2)); lt.setAttribute("y", String((sy + ey) / 2 - 4));
        lt.setAttribute("text-anchor", "middle"); lt.setAttribute("class", "reader-diagram-edge-label");
        lt.textContent = e.label;
        svg.appendChild(lt);
      }
    });

    // nodes — 도형별 SVG(실좌표)
    const poly = (pts: string) => { const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", pts); return p; };
    nodes.forEach((n) => {
      const w = nodeW(n), h = nodeH(n);
      const x = n.x, y = n.y, cx = x + w / 2, cy = y + h / 2, r = x + w, b = y + h;
      const hx = Math.min(w * 0.2, 22), ry = Math.min(h * 0.16, 8);
      const shapeEls: SVGElement[] = [];
      switch (n.shape) {
        case "ellipse": { const el2 = document.createElementNS(NS, "ellipse"); el2.setAttribute("cx", String(cx)); el2.setAttribute("cy", String(cy)); el2.setAttribute("rx", String(w / 2)); el2.setAttribute("ry", String(h / 2)); shapeEls.push(el2); break; }
        case "diamond": shapeEls.push(poly(`${cx},${y} ${r},${cy} ${cx},${b} ${x},${cy}`)); break;
        case "hexagon": shapeEls.push(poly(`${x + hx},${y} ${r - hx},${y} ${r},${cy} ${r - hx},${b} ${x + hx},${b} ${x},${cy}`)); break;
        case "parallelogram": shapeEls.push(poly(`${x + hx},${y} ${r},${y} ${r - hx},${b} ${x},${b}`)); break;
        case "trapezoid": shapeEls.push(poly(`${x + hx},${y} ${r - hx},${y} ${r},${b} ${x},${b}`)); break;
        case "subroutine": {
          const rc = document.createElementNS(NS, "rect"); rc.setAttribute("x", String(x)); rc.setAttribute("y", String(y)); rc.setAttribute("width", String(w)); rc.setAttribute("height", String(h)); rc.setAttribute("rx", "4"); shapeEls.push(rc);
          [x + 8, r - 8].forEach((lx) => { const ln = document.createElementNS(NS, "line"); ln.setAttribute("x1", String(lx)); ln.setAttribute("y1", String(y)); ln.setAttribute("x2", String(lx)); ln.setAttribute("y2", String(b)); ln.setAttribute("class", "reader-diagram-node-line"); shapeEls.push(ln); }); break;
        }
        case "cylinder": {
          const body = document.createElementNS(NS, "path"); body.setAttribute("d", `M${x},${y + ry} V${b - ry} a${w / 2},${ry} 0 0 0 ${w},0 V${y + ry} Z`); shapeEls.push(body);
          const top = document.createElementNS(NS, "ellipse"); top.setAttribute("cx", String(cx)); top.setAttribute("cy", String(y + ry)); top.setAttribute("rx", String(w / 2)); top.setAttribute("ry", String(ry)); shapeEls.push(top); break;
        }
        case "text": break; // 무테 — 라벨만
        default: { const rc = document.createElementNS(NS, "rect"); rc.setAttribute("x", String(x)); rc.setAttribute("y", String(y)); rc.setAttribute("width", String(w)); rc.setAttribute("height", String(h)); rc.setAttribute("rx", String(n.shape === "circle" || n.shape === "round" || n.shape === "stadium" ? h / 2 : 8)); shapeEls.push(rc); }
      }
      shapeEls.forEach((el, i) => {
        el.setAttribute("class", el.getAttribute("class") || "reader-diagram-node");
        if (n.color && i === 0 && el.tagName !== "line") (el as SVGElement).style.fill = n.color;
        svg.appendChild(el);
      });
      const txt = document.createElementNS(NS, "text");
      txt.setAttribute("x", String(n.x + w / 2)); txt.setAttribute("y", String(n.y + h / 2));
      txt.setAttribute("text-anchor", "middle"); txt.setAttribute("dominant-baseline", "central");
      txt.setAttribute("class", "reader-diagram-label");
      if (typeof n.fontSize === "number") txt.style.fontSize = `${n.fontSize}px`;
      if (n.textColor) txt.style.fill = n.textColor;
      txt.textContent = n.label || "";
      svg.appendChild(txt);
    });

    const fig = document.createElement("figure");
    fig.className = "reader-diagram";
    fig.appendChild(svg);
    host.replaceWith(fig);
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
      isRunner ? import("./plate/playground/PlaygroundRunner") : import("./plate/playground/PlaygroundSandpack"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (cancelled || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      const props = isRunner
        ? { data, readOnly: true, height: 460, resizable: true }
        : { data, readOnly: true, explorer: true, theme: pgTheme, height: 460, resizable: true };
      r.render(ReactMod.createElement(mod.default as React.ComponentType<Record<string, unknown>>, props));
    }).catch(() => { /* noop */ });
    docCleanups.push(() => { try { root?.unmount(); } catch { /* noop */ } });
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
      import("./plate/ReaderCalendar"),
    ]).then(([ReactMod, rdc, mod]) => {
      if (cancelled || !mount.isConnected) return;
      const r = rdc.createRoot(mount);
      root = r;
      r.render(ReactMod.createElement(mod.default, { calendarId, data, language: calLang }));
    }).catch(() => { /* noop */ });
    docCleanups.push(() => { try { root?.unmount(); } catch { /* noop */ } });
  });

  // ── Tabs ── 헤더(라벨 버튼)를 만들어 끼우고, active 패널만 표시 + 클릭 전환
  el.querySelectorAll<HTMLElement>("[data-tabs]").forEach((tabs) => {
    if (tabs.dataset.tabsRendered) return;
    const panels = Array.from(tabs.children).filter((c) => c.hasAttribute("data-tab-panel")) as HTMLElement[];
    if (!panels.length) return;
    tabs.dataset.tabsRendered = "1";
    const active = Math.min(Math.max(0, Number(tabs.getAttribute("data-active") || 0)), panels.length - 1);
    const header = document.createElement("div");
    header.className = "tabs-header";
    panels.forEach((panel, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tabs-tab" + (i === active ? " tabs-tab-active" : "");
      const icon = panel.getAttribute("data-tab-icon") || "";
      if (icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "tabs-tab-icon";
        if (icon.startsWith("img:")) {
          const img = document.createElement("img");
          img.src = icon.slice(4);
          img.alt = "";
          iconSpan.appendChild(img);
        } else if (!icon.startsWith("icon:")) {
          iconSpan.textContent = icon; // 이모지
        }
        if (iconSpan.childNodes.length || iconSpan.textContent) btn.appendChild(iconSpan);
      }
      const labelSpan = document.createElement("span");
      labelSpan.textContent = panel.getAttribute("data-label") || `Tab ${i + 1}`;
      btn.appendChild(labelSpan);
      btn.addEventListener("click", () => {
        header.querySelectorAll(".tabs-tab").forEach((b, j) => b.classList.toggle("tabs-tab-active", j === i));
        panels.forEach((p, j) => { p.style.display = j === i ? "" : "none"; });
      });
      header.appendChild(btn);
      panel.style.display = i === active ? "" : "none";
    });
    tabs.insertBefore(header, tabs.firstChild);
  });

  // ── Poll (투표) ── 옵션 클릭 → /api/polls 로 집계. 투표 후 막대/비율 공개. dedup 은 서버(IP).
  const ko = (document.documentElement.lang || "ko").toLowerCase().startsWith("ko");
  el.querySelectorAll<HTMLElement>("[data-poll]").forEach((poll) => {
    if (poll.dataset.pollRendered) return;
    const pollId = poll.getAttribute("data-poll-id") || "";
    const multiple = poll.getAttribute("data-multiple") === "true";
    const startAt = poll.getAttribute("data-start");
    const endAt = poll.getAttribute("data-end");
    const resultsBeforeVote = poll.getAttribute("data-results-before") === "true";
    const allowRetract = poll.getAttribute("data-allow-retract") !== "false"; // 기본 true
    const pollTitle = poll.getAttribute("data-poll-title") || "";
    const pollSubtitle = poll.getAttribute("data-poll-subtitle") || "";
    const pollDescription = poll.getAttribute("data-poll-description") || "";
    const fmt = (iso: string) => {
      try { return new Date(iso).toLocaleString(ko ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }); }
      catch { return iso; }
    };
    const options = Array.from(poll.querySelectorAll<HTMLElement>("[data-poll-option]")).map((o) => ({
      id: o.getAttribute("data-option-id") || "",
      label: o.textContent || "",
    })).filter((o) => o.id);
    if (!pollId || !options.length) return;
    poll.dataset.pollRendered = "1";

    const state = { counts: {} as Record<string, number>, total: 0, mine: [] as string[], busy: false, sortKey: "order" as PollSortKey, sortDir: "asc" as "asc" | "desc" };
    let editing = false;                // 선택(제출 전) 모드 여부
    const pending = new Set<string>();  // 제출 전 로컬 선택

    const isOpen = () => {
      const now = Date.now();
      if (startAt && now < new Date(startAt).getTime()) return false;
      if (endAt && now > new Date(endAt).getTime()) return false;
      return true;
    };

    // 결과 = 도넛(원형) + 범례(항목별 막대). 공용 렌더러(에디터 미리보기와 동일 DOM).
    const buildResults = () => buildPollResult({
      options, counts: state.counts, total: state.total, mine: state.mine, sortKey: state.sortKey, sortDir: state.sortDir, ko,
    });
    // 정렬 컨트롤(vanilla) — 에디터의 공통 SegmentedControl 과 동일 모양. 같은 key 재클릭=방향 토글.
    const buildSortControl = () => buildPollSortControl(state.sortKey, state.sortDir, ko, (key) => {
      if (key === state.sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else { state.sortKey = key; state.sortDir = key === "votes" ? "desc" : "asc"; }
      render();
    });

    const render = () => {
      const now = Date.now();
      const notStarted = !!startAt && now < new Date(startAt).getTime();
      const ended = !!endAt && now > new Date(endAt).getTime();
      const open = !notStarted && !ended;
      const voted = state.mine.length > 0;
      // 제출 완료(결과 모드) / 종료 / "투표 전 결과 공개" 설정이면 결과 표시
      const showResults = (voted && !editing) || ended || resultsBeforeVote;
      // 결과 차트(도넛+막대)는 showResults 일 때, 선택 리스트는 편집 중이거나 아직 결과 표시 전일 때.
      // "투표 전 결과 공개" 면 차트 + 선택 리스트가 함께 뜬다(집계 보면서 투표).
      const showChart = showResults;
      const showList = editing || !showResults;
      const total = ko ? `${compactNum(state.total, ko)}명 참여` : `${compactNum(state.total, ko)} vote${state.total === 1 ? "" : "s"}`;
      poll.innerHTML = "";
      // ── 헤더: 제목/부제목 + 기간(설정 시). 투표·결과 화면 모두 표시. ──
      if (pollTitle || pollSubtitle || pollDescription || startAt || endAt) {
        const header = document.createElement("div");
        header.className = "poll-header";
        const headLabel = (text: string) => { const l = document.createElement("div"); l.className = "poll-head-label"; l.textContent = text; header.appendChild(l); };
        if (pollTitle) { headLabel(ko ? "제목" : "Title"); const h = document.createElement("div"); h.className = "poll-title"; h.textContent = pollTitle; header.appendChild(h); }
        if (pollSubtitle) { headLabel(ko ? "부제목" : "Subtitle"); const s = document.createElement("div"); s.className = "poll-subtitle"; s.textContent = pollSubtitle; header.appendChild(s); }
        if (pollDescription) { headLabel(ko ? "설명" : "About"); const d = document.createElement("div"); d.className = "poll-desc"; d.textContent = pollDescription; header.appendChild(d); }
        if (startAt || endAt) {
          const period = document.createElement("div");
          period.className = "poll-period";
          const range = `${startAt ? fmt(startAt) : ""} ~ ${endAt ? fmt(endAt) : ""}`.trim();
          period.textContent = (ko ? "기간 " : "Period ") + range;
          header.appendChild(period);
        }
        poll.appendChild(header);
      }
      // 결과 = 정렬 컨트롤(집계 있을 때) + 도넛(원형) + 항목별 막대 범례
      if (showChart) {
        if (state.total > 0) poll.appendChild(buildSortControl());
        poll.appendChild(buildResults());
      }
      if (showList) {
        // 선택 리스트 — 항목 선택(마커 + 라벨). 결과 수치는 차트에서만 표시.
        const list = document.createElement("div");
        list.className = "poll-list";
        options.forEach((opt) => {
          const selected = editing ? pending.has(opt.id) : state.mine.includes(opt.id);
          const row = document.createElement("button");
          row.type = "button";
          row.className = "poll-option-btn" + (selected ? " poll-voted" : "");
          // 편집(선택) 모드에서만 클릭 가능
          row.disabled = state.busy || !open || !editing;
          const marker = document.createElement("span");
          marker.className = "poll-marker" + (multiple ? " poll-marker-multi" : "") + (selected ? " poll-marker-on" : "");
          row.appendChild(marker);
          const label = document.createElement("span");
          label.className = "poll-label";
          label.textContent = opt.label;
          row.appendChild(label);
          if (editing && open) row.addEventListener("click", () => toggleSelect(opt.id));
          list.appendChild(row);
        });
        poll.appendChild(list);
      }

      // footer — 텍스트(n명 참여 등) + 우측 액션(완료/다시 투표) 같은 줄
      const foot = document.createElement("div");
      foot.className = "poll-foot";
      const footText = document.createElement("span");
      footText.className = "poll-footer";
      if (notStarted) footText.textContent = ko ? `${fmt(startAt!)} 시작 예정` : `Starts ${fmt(startAt!)}`;
      else if (ended) footText.textContent = (ko ? "투표 종료" : "Voting closed") + ` · ${total}`;
      else if (voted && !editing) footText.textContent = total;
      else footText.textContent = ko ? "항목을 선택한 뒤 완료를 누르세요" : "Select, then submit";
      foot.appendChild(footText);

      if (open && editing) {
        const submit = document.createElement("button");
        submit.type = "button";
        submit.className = "poll-submit";
        submit.textContent = state.busy ? (ko ? "처리 중…" : "Submitting…") : (ko ? "투표 완료" : "Submit");
        submit.disabled = state.busy || pending.size === 0;
        submit.addEventListener("click", submitVote);
        foot.appendChild(submit);
      } else if (open && voted && allowRetract) {
        const re = document.createElement("button");
        re.type = "button";
        re.className = "poll-revote";
        re.textContent = ko ? "다시 투표" : "Change vote";
        re.disabled = state.busy;
        re.addEventListener("click", startEdit);
        foot.appendChild(re);
      }
      poll.appendChild(foot);
    };

    // 편집 모드에서 선택 토글 (단일=라디오, 복수=체크박스)
    const toggleSelect = (optionId: string) => {
      if (state.busy) return;
      if (multiple) {
        if (pending.has(optionId)) pending.delete(optionId);
        else pending.add(optionId);
      } else if (pending.has(optionId)) {
        pending.clear();
      } else {
        pending.clear();
        pending.add(optionId);
      }
      render();
    };

    // 완료 — 선택 세트를 서버에 제출(교체)
    const submitVote = async () => {
      if (state.busy || !isOpen() || pending.size === 0) return;
      state.busy = true; render();
      try {
        const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIds: Array.from(pending), multiple }),
        });
        if (res.ok) {
          const d = await res.json();
          state.counts = d.counts || {}; state.total = d.total || 0; state.mine = d.mine || [];
          editing = false;
        }
      } catch { /* noop */ }
      state.busy = false; render();
    };

    // 다시 투표 — 결과 모드 → 편집 모드 (현재 내 투표를 pending 으로)
    const startEdit = () => {
      if (state.busy) return;
      editing = true;
      pending.clear();
      state.mine.forEach((id) => pending.add(id));
      render();
    };

    render(); // 로딩 전 — 옵션만
    fetch(`/api/polls/${encodeURIComponent(pollId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        state.counts = d.counts || {}; state.total = d.total || 0; state.mine = d.mine || [];
        // 아직 투표 안 했고 진행 중이면 선택(편집) 모드로 시작
        editing = isOpen() && state.mine.length === 0;
        pending.clear();
        state.mine.forEach((id) => pending.add(id));
        render();
      })
      .catch(() => {});
  });

  // ── 표 헤더 배경 정규화 — 옛 직렬화(bg-tertiary 5%·var(--bg-primary) 잔재)든 새 직렬화든
  //   모든 th 를 보이는 헤더 틴트로 통일(재저장 불필요). 불투명 base 위 틴트 → 행 고정 sticky 에도 대응.
  el.querySelectorAll<HTMLElement>("th").forEach((th) => {
    const custom = th.getAttribute("data-th-bg");
    const tint = custom && custom !== "var(--bg-primary)" ? custom : "var(--tbl-header-bg, var(--bg-tertiary-alt))";
    th.style.backgroundColor = "var(--bg-primary)";
    th.style.backgroundImage = `linear-gradient(${tint}, ${tint})`;
  });

  // ── 표 행/열 고정 — 리더 (에디터와 동일 모델, 세로 스크롤바 없음) ──
  //   열 고정: .tbl-freeze 가로 스크롤 기준 CSS sticky-left. 행 고정: 페이지 스크롤에 맞춰 첫 N행을
  //   transform:translateY 로 네비 아래에 pin. 불투명 배경·구분선(stuck 시 바깥 모서리 box-shadow).
  const TBL_LINE = "var(--tbl-border-color, var(--border-light-color))"; // 바깥 모서리(위/좌) — 일반 테두리색
  const TBL_ACCENT = "var(--color-accent-alpha-50)";                     // 스크롤 경계(아래/우) — 옅은 accent
  const FREEZE_MAX_RATIO = 0.6; // 고정 열 합이 이 비율 넘으면 왼쪽부터 sticky 해제(스크롤 영역 확보)
  const COL_NOT_FROZEN = 1e9;   // 비고정 sentinel(음수 negative sticky offset 과 구분)
  const freezeBoxes = Array.from(el.querySelectorAll<HTMLElement>(".tbl-freeze"));
  if (freezeBoxes.length) {
    const cs = getComputedStyle(document.documentElement);
    const navRaw = (cs.getPropertyValue("--reader-nav-offset") || cs.getPropertyValue("--header-height") || "64").trim();
    const navOffset = parseFloat(navRaw) || 64;
    // 끊김 방지: 측정(위치/base/셀 목록)은 measure 에서 캐시, 스크롤 시엔 scrollY 산술 + 스타일 쓰기만(동기).
    type Cell = { c: HTMLElement; i: number; j: number; sr: boolean; sc: boolean };
    type Box = { box: HTMLElement; rows: number; cols: number; colStart: number; base: number; maxOff: number; top: number; rowCells: HTMLElement[]; sticky: Cell[] };
    let boxes: Box[] = [];
    // 각 셀의 원본 background-image(헤더 틴트 등) 최초 1회 캡처 — freeze 가 덮어써도 복원용
    const cellOrigImg = new WeakMap<HTMLElement, string>();
    const measure = () => {
      // 이전 인라인 스타일 정리(리사이즈로 sticky 열 구성이 바뀌면 잔상 방지) — 배경은 원본으로 복원
      for (const b of boxes) for (const { c } of b.sticky) {
        c.style.transform = ""; c.style.boxShadow = "";
        c.style.borderTop = ""; c.style.borderBottom = ""; c.style.borderLeft = ""; c.style.borderRight = "";
        c.style.backgroundImage = cellOrigImg.get(c) || "";
      }
      boxes = [];
      freezeBoxes.forEach((box) => {
        const tbl = box.querySelector<HTMLTableElement>(":scope > table");
        if (!tbl) return;
        const rows = Number(tbl.getAttribute("data-freeze-rows") || 0);
        const cols = Number(tbl.getAttribute("data-freeze-cols") || 0);
        if (rows === 0 && cols === 0) return; // 고정 없는 가로 스크롤 전용 박스 — JS 처리 불필요(CSS 만)
        const trs = Array.from(tbl.querySelectorAll<HTMLElement>(":scope > tbody > tr"));
        const firstCells = trs[0] ? Array.from(trs[0].children) : [];
        // 열 sticky offset — 고정 열 합이 박스 너비의 FREEZE_MAX_RATIO 넘으면 왼쪽부터 해제(-1), 오른쪽 우선 유지.
        const nCols = firstCells.length;
        const lefts: number[] = new Array(nCols).fill(COL_NOT_FROZEN);
        if (cols > 0 && nCols > 0) {
          const widths = firstCells.map((c) => (c as HTMLElement).getBoundingClientRect().width);
          const view = box.clientWidth;
          const budget = view > 0 ? view * FREEZE_MAX_RATIO : Infinity;
          // 오른쪽(마지막)부터, budget 안에 들어가는 만큼만 유지.
          let start = cols, acc = 0;
          for (let j = cols - 1; j >= 0; j--) {
            if (acc + (widths[j] || 0) <= budget) { acc += widths[j] || 0; start = j; } else break;
          }
          if (start === cols) {
            // 마지막 열조차 budget 초과 → 그 열만 negative sticky 로 오른쪽 budget폭만 고정(왼쪽은 스크롤).
            lefts[cols - 1] = Math.min(0, budget - (widths[cols - 1] || 0));
          } else {
            let left = 0;
            for (let j = start; j < cols; j++) { lefts[j] = left; left += widths[j] || 0; }
          }
        }
        const colStart = lefts.findIndex((v) => v < COL_NOT_FROZEN);
        const sticky: Cell[] = [];
        const rowCells: HTMLElement[] = [];
        trs.forEach((tr, i) => {
          Array.from(tr.children).forEach((cell, j) => {
            const c = cell as HTMLElement;
            if (!cellOrigImg.has(c)) cellOrigImg.set(c, c.style.backgroundImage || ""); // 원본 배경(헤더 틴트) 최초 캡처
            const sr = i < rows, sc = lefts[j] < COL_NOT_FROZEN;
            // 비고정 셀 — 위치/z/구분선 초기화하되 배경은 원본(헤더 틴트) 복원(지우면 헤더가 사라짐)
            if (!sr && !sc) {
              c.style.position = ""; c.style.left = ""; c.style.zIndex = "";
              c.style.borderTop = ""; c.style.borderBottom = ""; c.style.borderLeft = ""; c.style.borderRight = "";
              c.style.backgroundImage = cellOrigImg.get(c) || "";
              return;
            }
            // 열 sticky-left / 행-only relative — 위치·z·배경은 여기서 1회 설정
            if (sc) { c.style.position = "sticky"; c.style.left = `${lefts[j]}px`; }
            else c.style.position = "relative";
            c.style.zIndex = sr && sc ? "6" : sr ? "5" : "4";
            // 불투명 배경은 stuck 됐을 때만(apply) — 정지 시엔 투명(일반 셀처럼).
            sticky.push({ c, i, j, sr, sc });
            if (sr) rowCells.push(c);
          });
        });
        let blockH = 0; const frozen = trs.slice(0, rows);
        frozen.forEach((tr) => { blockH += tr.getBoundingClientRect().height; });
        const r = tbl.getBoundingClientRect();
        const maxOff = rows > 0 ? Math.max(0, r.height - blockH) : 0;
        const base = r.top + window.scrollY - navOffset; // rowOffset = scrollY - base
        const boxTop = box.getBoundingClientRect().top + window.scrollY; // 문서 좌표 (clip 계산용)
        boxes.push({ box, rows, cols, colStart, base, maxOff, top: boxTop, rowCells, sticky });
      });
      apply();
    };
    const apply = () => {
      const sy = window.scrollY;
      for (const b of boxes) {
        const off = b.rows > 0 ? Math.max(0, Math.min(sy - b.base, b.maxOff)) : 0;
        const rowStuck = off > 0.5;
        const colStuck = b.box.scrollLeft > 0;
        const tf = rowStuck ? `translate3d(0,${off}px,0)` : "";
        for (const c of b.rowCells) c.style.transform = tf;
        // 핀 라인(네비) 위쪽을 clip → 비고정 행이 고정 헤더 위로 삐져나오지 않게(에디터의 잘림과 동일).
        if (b.rows > 0) {
          const clipTop = sy - (b.top - navOffset);
          b.box.style.clipPath = clipTop > 0.5 ? `inset(${clipTop}px 0 0 0)` : "";
        }
        for (const { c, i, j, sr, sc } of b.sticky) {
          // 불투명 배경 — stuck 됐을 때만(정지 시 원본). 원본 배경(헤더 틴트/커스텀 색) 위에 --bg-primary base.
          const needBg = (sr && rowStuck) || (sc && colStuck);
          const origImg = cellOrigImg.get(c) || "";
          if (needBg) {
            const layers: string[] = [];
            if (origImg && origImg !== "none") layers.push(origImg);                         // 원본(헤더 틴트 등) 보존
            else { const col = c.style.backgroundColor; if (col) layers.push(`linear-gradient(${col}, ${col})`); } // 커스텀 셀 색
            layers.push("linear-gradient(var(--bg-primary), var(--bg-primary))");            // 불투명 base
            c.style.backgroundImage = layers.join(", ");
          } else c.style.backgroundImage = origImg;
          // 구분선 — 리더 표는 border-collapse:collapse 라 셀 box-shadow 가 안 그려짐 → 실제 border 로. stuck 시에만.
          // 바깥 모서리(위/좌)는 1px 일반색, 스크롤 경계(아래=행, 우=열)는 2px accent.
          c.style.borderTop = (sr && rowStuck && i === 0) ? `1px solid ${TBL_LINE}` : "";
          c.style.borderBottom = (sr && rowStuck && i === b.rows - 1) ? `2px solid ${TBL_ACCENT}` : "";
          c.style.borderLeft = (sc && colStuck && j === b.colStart) ? `1px solid ${TBL_LINE}` : "";
          c.style.borderRight = (sc && colStuck && j === b.cols - 1) ? `2px solid ${TBL_ACCENT}` : "";
        }
      }
    };
    measure();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    freezeBoxes.forEach((b) => b.addEventListener("scroll", apply, { passive: true }));
    // async 콘텐츠(플레이그라운드 lazy 마운트·이미지 로드 등)가 표 위 높이를 바꾸면 base(표 top)가
    // stale → 행 고정이 어긋남. content 높이 변화 시 재측정. (border 토글로 인한 미세 변화·루프 방지 임계값)
    let lastH = el.scrollHeight, remeasureRaf = 0;
    const onContentResize = () => {
      if (remeasureRaf) return;
      remeasureRaf = requestAnimationFrame(() => {
        remeasureRaf = 0;
        const h = el.scrollHeight;
        if (Math.abs(h - lastH) < 16) return;
        lastH = h;
        measure();
      });
    };
    const contentRo = new ResizeObserver(onContentResize);
    contentRo.observe(el);
    docCleanups.push(() => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", measure);
      freezeBoxes.forEach((b) => b.removeEventListener("scroll", apply));
      if (remeasureRaf) cancelAnimationFrame(remeasureRaf);
      contentRo.disconnect();
    });
  }

  return () => { cancelled = true; docCleanups.forEach((fn) => fn()); };
}
