import { buildPollResult, buildPollSortControl, compactNum, type PollSortKey } from "../pollResultView";

import type { ReaderExtrasContext } from "./context";

/* 투표 — 옵션 클릭을 /api/polls 로 보내 집계한다. 중복 투표는 서버가 IP 로 거른다. */
export function renderPoll({ el, isCancelled }: ReaderExtrasContext) {
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
        if (isCancelled() || !d) return;
        state.counts = d.counts || {}; state.total = d.total || 0; state.mine = d.mine || [];
        // 아직 투표 안 했고 진행 중이면 선택(편집) 모드로 시작
        editing = isOpen() && state.mine.length === 0;
        pending.clear();
        state.mine.forEach((id) => pending.add(id));
        render();
      })
      .catch(() => {});
  });
}
