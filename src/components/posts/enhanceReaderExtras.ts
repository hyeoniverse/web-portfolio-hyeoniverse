// ── 공개 페이지 richtext 부가 렌더 ──
// 에디터에서 저장된 마커를 리더에서 실제 렌더한다:
//  - <code class="language-mermaid">  → mermaid SVG 다이어그램
//  - <div data-toc>                   → 본문 heading 기반 목차(앵커 링크)
// dangerouslySetInnerHTML 로 그려진 DOM 을 후처리하므로 클라이언트에서만 호출.

/** 컨테이너 내 mermaid 코드블록 + TOC 마커를 렌더. cleanup 함수 반환. */
export function enhanceReaderExtras(
  el: HTMLElement,
  labels?: { viewCode?: string; hideCode?: string; copyCode?: string; copied?: string },
): () => void {
  let cancelled = false;
  const docCleanups: Array<() => void> = [];
  const L = {
    viewCode: labels?.viewCode ?? "코드 보기",
    hideCode: labels?.hideCode ?? "코드 숨기기",
    copyCode: labels?.copyCode ?? "코드 복사",
    copied: labels?.copied ?? "복사됨",
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

  // ── mermaid ──
  const blocks = Array.from(el.querySelectorAll<HTMLElement>("code.language-mermaid"));
  if (blocks.length) {
    import("mermaid")
      .then(({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        blocks.forEach(async (code, i) => {
          const src = (code.textContent || "").trim();
          // 직렬화는 .code-block-wrap > pre > code 구조 → wrap 전체를 그래프 figure 로 교체
          const host = (code.closest(".code-block-wrap") ?? code.closest("pre") ?? code) as HTMLElement;
          if (!src || host.dataset.mermaidDone) return;
          try {
            const id = `rmmd-${i}-${Math.floor(Math.random() * 1e9).toString(36)}`;
            const { svg } = await mermaid.render(id, src);
            if (cancelled) return;

            const fig = document.createElement("figure");
            fig.className = "reader-mermaid";
            fig.dataset.mermaidDone = "1";

            // ── "..." 메뉴 (popover) ──
            const menuWrap = document.createElement("div");
            menuWrap.className = "reader-mermaid-menu";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "reader-mermaid-menu-btn";
            btn.setAttribute("aria-label", "menu");
            btn.innerHTML = "<span></span><span></span><span></span>"; // 3-dot
            const menu = document.createElement("div");
            menu.className = "reader-mermaid-menu-list";
            menu.hidden = true;
            const itemView = document.createElement("button");
            itemView.type = "button";
            itemView.className = "reader-mermaid-menu-item";
            itemView.textContent = L.viewCode;
            const itemCopy = document.createElement("button");
            itemCopy.type = "button";
            itemCopy.className = "reader-mermaid-menu-item";
            itemCopy.textContent = L.copyCode;
            menu.append(itemView, itemCopy);
            menuWrap.append(btn, menu);

            // ── 그래프 (기본) ──
            const graph = document.createElement("div");
            graph.className = "reader-mermaid-graph";
            graph.innerHTML = svg;

            // ── 코드 보기 (기본 숨김) ──
            const codeView = document.createElement("pre");
            codeView.className = "reader-mermaid-code";
            codeView.hidden = true;
            const codeEl = document.createElement("code");
            codeEl.textContent = src;
            codeView.appendChild(codeEl);

            const closeMenu = () => { menu.hidden = true; };
            btn.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
            itemView.addEventListener("click", () => {
              codeView.hidden = !codeView.hidden;
              itemView.textContent = codeView.hidden ? L.viewCode : L.hideCode;
              closeMenu();
            });
            itemCopy.addEventListener("click", () => {
              try { navigator.clipboard?.writeText(src); } catch { /* noop */ }
              const prev = itemCopy.textContent;
              itemCopy.textContent = L.copied;
              setTimeout(() => { itemCopy.textContent = prev; }, 1200);
              closeMenu();
            });
            const onDocClick = (e: MouseEvent) => { if (!menuWrap.contains(e.target as Node)) closeMenu(); };
            document.addEventListener("click", onDocClick);
            docCleanups.push(() => document.removeEventListener("click", onDocClick));

            fig.append(menuWrap, graph, codeView);
            host.replaceWith(fig);
          } catch {
            /* 파싱 실패 시 원본 코드블록 유지 */
          }
        });
      })
      .catch(() => {});
  }

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

    const state = { counts: {} as Record<string, number>, total: 0, mine: [] as string[], busy: false };

    const isOpen = () => {
      const now = Date.now();
      if (startAt && now < new Date(startAt).getTime()) return false;
      if (endAt && now > new Date(endAt).getTime()) return false;
      return true;
    };

    const render = () => {
      const now = Date.now();
      const notStarted = !!startAt && now < new Date(startAt).getTime();
      const ended = !!endAt && now > new Date(endAt).getTime();
      const open = !notStarted && !ended;
      const voted = state.mine.length > 0;
      // 투표 후 / 종료 / "투표 전 결과 공개" 설정이면 결과 표시
      const showResults = voted || ended || resultsBeforeVote;
      const total = ko ? `${state.total}명 참여` : `${state.total} vote${state.total === 1 ? "" : "s"}`;
      poll.innerHTML = "";
      const list = document.createElement("div");
      list.className = "poll-list";
      options.forEach((opt) => {
        const count = state.counts[opt.id] || 0;
        const pct = state.total > 0 ? Math.round((count / state.total) * 100) : 0;
        const mineHas = state.mine.includes(opt.id);
        const row = document.createElement("button");
        row.type = "button";
        row.className = "poll-option-btn"
          + (mineHas ? " poll-voted" : "")
          + (showResults ? " poll-show-result" : "");
        row.disabled = state.busy || !open;
        if (showResults) {
          const bar = document.createElement("span");
          bar.className = "poll-bar";
          bar.style.width = pct + "%";
          row.appendChild(bar);
        }
        const marker = document.createElement("span");
        marker.className = "poll-marker" + (multiple ? " poll-marker-multi" : "") + (mineHas ? " poll-marker-on" : "");
        row.appendChild(marker);
        const label = document.createElement("span");
        label.className = "poll-label";
        label.textContent = opt.label;
        row.appendChild(label);
        if (showResults) {
          const right = document.createElement("span");
          right.className = "poll-pct";
          right.textContent = pct + "%";
          row.appendChild(right);
        }
        if (open) row.addEventListener("click", () => vote(opt.id));
        list.appendChild(row);
      });
      poll.appendChild(list);
      const footer = document.createElement("div");
      footer.className = "poll-footer";
      if (notStarted) footer.textContent = ko ? `${fmt(startAt!)} 시작 예정` : `Starts ${fmt(startAt!)}`;
      else if (ended) footer.textContent = (ko ? "투표 종료" : "Voting closed") + ` · ${total}`;
      else if (voted) footer.textContent = total;
      else footer.textContent = ko ? "투표하면 결과가 공개됩니다" : "Vote to see results";
      poll.appendChild(footer);
    };

    const vote = async (optionId: string) => {
      if (state.busy || !isOpen()) return;
      state.busy = true; render();
      try {
        const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId, multiple }),
        });
        if (res.ok) {
          const d = await res.json();
          state.counts = d.counts || {}; state.total = d.total || 0; state.mine = d.mine || [];
        }
      } catch { /* noop */ }
      state.busy = false; render();
    };

    render(); // 로딩 전 — 옵션만
    fetch(`/api/polls/${encodeURIComponent(pollId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        state.counts = d.counts || {}; state.total = d.total || 0; state.mine = d.mine || [];
        render();
      })
      .catch(() => {});
  });

  return () => { cancelled = true; docCleanups.forEach((fn) => fn()); };
}
