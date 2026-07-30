import type { LocalizedText } from "@/types/common";

/**
 * 투표 결과 화면(도넛 원형 + 항목별 막대 범례 + 정렬) — 리더와 에디터 미리보기의 **단일 렌더러**.
 *
 * 에디터 미리보기가 실제 디테일/미리보기 페이지 결과와 100% 같아야 하므로, 결과 DOM 은 여기서만 만든다.
 * 리더(enhanceReaderExtras)는 실제 집계로, 에디터 미리보기(PollElements)는 샘플 집계로 동일 함수를 호출한다.
 * 순수 vanilla DOM — React/리더 어디서든 컨테이너에 주입해 쓴다.
 */

/** 도넛 슬라이스 팔레트 */
export const POLL_COLORS = ["#e0556a", "#5b8def", "#22c39a", "#f4a43b", "#9b6dd6", "#3bb0c3", "#e8b84b", "#7a8aa0", "#c879d6", "#8a9a3b"];
/** 도넛으로 표시할 최대 슬라이스 수(초과분은 "기타"로 묶음) */
const PIE_MAX = 8;

/** 큰 수 축약 표기 — 결과창(고정 폭 범례·도넛 중앙)이 큰 숫자에 안 깨지게. 1234→"1.2천"/"1.2K". */
export function compactNum(n: number, ko: boolean): string {
  try { return new Intl.NumberFormat(ko ? "ko" : "en", { notation: "compact", maximumFractionDigits: 1 }).format(n); }
  catch { return String(n); }
}

/** 정렬 기준 — order(기본/작성 순) · votes(득표) · alpha(철자). 방향은 sortDir 로. */
export type PollSortKey = "order" | "votes" | "alpha";

export type PollResultData = {
  options: { id: string; label: string }[];
  counts: Record<string, number>;
  total: number;
  mine: string[];
  /** 정렬 기준 + 방향. 컨트롤(에디터=SegmentedControl / 리더=vanilla)은 호출부에서 렌더. */
  sortKey: PollSortKey;
  sortDir: "asc" | "desc";
  ko: boolean;
};

/** 결과 블록(.poll-result) 을 만들어 반환 — 차트+범례만(정렬 컨트롤은 호출부 담당).
 *  도넛↔범례↔가운데 라벨 hover 연동·pop 애니메이션 내장. */
export function buildPollResult(d: PollResultData): HTMLElement {
  const { options, counts, total, mine, sortKey, sortDir, ko } = d;
  const ns = "http://www.w3.org/2000/svg";
  const SW = 4;
  const wrap = document.createElement("div");
  wrap.className = "poll-result";

  if (total === 0) {
    const empty = document.createElement("div");
    empty.className = "poll-result-empty";
    empty.textContent = ko ? "아직 표가 없어요" : "No votes yet";
    wrap.appendChild(empty);
    return wrap;
  }

  // ── 슬라이스 구성 ──
  //  1) 득표>0 항목. 2) "기타" 묶음은 항상 득표 기준(작은 것들)으로 결정 — 표시 정렬과 무관하게 의미 유지.
  //  3) 표시 정렬(sortKey+sortDir) 적용. "기타" 는 항상 맨 끝.
  type Part = { label: string; count: number; ids: string[]; idx: number; other?: boolean };
  const all: Part[] = options
    .map((opt, idx) => ({ label: opt.label, count: counts[opt.id] || 0, ids: [opt.id] as string[], idx }))
    .filter((x) => x.count > 0);
  let parts: Part[];
  if (all.length > PIE_MAX) {
    const byCount = all.slice().sort((a, b) => b.count - a.count);
    const rest = byCount.slice(PIE_MAX);
    parts = [
      ...byCount.slice(0, PIE_MAX),
      { label: ko ? "기타" : "Other", count: rest.reduce((s, r) => s + r.count, 0), ids: rest.flatMap((r) => r.ids), idx: Number.MAX_SAFE_INTEGER, other: true },
    ];
  } else {
    parts = all.slice();
  }
  // 표시 정렬 — 오름차순 canonical 후 desc 면 reverse. (votes asc=적은순, alpha asc=A→Z, order asc=작성순)
  const cmp = (a: Part, b: Part) => {
    if (sortKey === "votes") return a.count - b.count;
    if (sortKey === "alpha") return a.label.localeCompare(b.label, ko ? "ko" : "en");
    return a.idx - b.idx;
  };
  parts.sort(cmp);
  if (sortDir === "desc") parts.reverse();
  // "기타" 는 정렬과 무관하게 항상 맨 끝
  parts = [...parts.filter((p) => !p.other), ...parts.filter((p) => p.other)];
  const slices = parts.map((p, idx) => ({
    label: p.label, count: p.count, ids: p.ids,
    pct: total > 0 ? (p.count / total) * 100 : 0,
    color: p.other ? "var(--text-muted)" : POLL_COLORS[idx % POLL_COLORS.length],
    mine: p.ids.some((id) => mine.includes(id)),
  }));

  const chart = document.createElement("div");
  chart.className = "poll-pie-wrap";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "-4 -4 44 44"); // hover pop(확대·shadow) 여백
  svg.setAttribute("class", "poll-pie");
  const ring = (stroke: string, dash?: string, offset?: string, cls?: string) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "18"); c.setAttribute("cy", "18"); c.setAttribute("r", "15.915");
    c.setAttribute("fill", "none"); c.setAttribute("stroke-width", String(SW));
    if (cls) c.setAttribute("class", cls);
    if (dash) c.setAttribute("stroke-dasharray", dash);
    if (offset) c.setAttribute("stroke-dashoffset", offset);
    if (stroke.startsWith("var(")) c.style.stroke = stroke; else c.setAttribute("stroke", stroke);
    return c;
  };
  svg.appendChild(ring("var(--bg-tertiary)")); // 배경 트랙

  let cum = 0;
  const segs = slices.map((s) => {
    // butt cap + 연속(라운드캡·gap 은 인접 슬라이스끼리 겹쳐 뭉개짐)
    const seg = ring(s.color, `${s.pct} ${100 - s.pct}`, `${25 - cum}`, "poll-pie-seg");
    cum += s.pct;
    svg.appendChild(seg);
    return seg;
  });

  // 가운데 라벨 — 기본: 총 참여수 / hover: 해당 항목 %·표수 (툴팁 역할)
  const num = document.createElementNS(ns, "text");
  num.setAttribute("x", "18"); num.setAttribute("y", "16.5");
  num.setAttribute("text-anchor", "middle"); num.setAttribute("dominant-baseline", "central");
  num.setAttribute("class", "poll-pie-num");
  const sub = document.createElementNS(ns, "text");
  sub.setAttribute("x", "18"); sub.setAttribute("y", "21.5");
  sub.setAttribute("text-anchor", "middle"); sub.setAttribute("dominant-baseline", "central");
  sub.setAttribute("class", "poll-pie-sub");
  const resetCenter = () => {
    num.textContent = compactNum(total, ko);
    sub.textContent = ko ? "참여" : (total === 1 ? "vote" : "votes");
  };
  resetCenter();
  svg.appendChild(num); svg.appendChild(sub);
  chart.appendChild(svg);

  // 범례 — 항목별 [색점][라벨][비율 막대][%·표수]. 내 선택은 강조.
  const legend = document.createElement("div");
  legend.className = "poll-legend";
  const items = slices.map((s) => {
    const item = document.createElement("div");
    item.className = "poll-legend-item" + (s.mine ? " poll-legend-mine" : "");
    const dot = document.createElement("span"); dot.className = "poll-legend-dot"; dot.style.background = s.color;
    const lb = document.createElement("span"); lb.className = "poll-legend-label"; lb.textContent = s.label;
    const barWrap = document.createElement("span"); barWrap.className = "poll-legend-bar";
    const fill = document.createElement("span"); fill.className = "poll-legend-fill"; fill.style.width = `${s.pct}%`; fill.style.background = s.color;
    barWrap.appendChild(fill);
    const pc = document.createElement("span"); pc.className = "poll-legend-pct";
    pc.textContent = ko ? `${Math.round(s.pct)}% · ${compactNum(s.count, ko)}표` : `${Math.round(s.pct)}% · ${compactNum(s.count, ko)}`;
    item.append(dot, lb, barWrap, pc);
    legend.appendChild(item);
    return item;
  });
  chart.appendChild(legend);
  wrap.appendChild(chart);

  // hover 연동 — 세그먼트/범례 인덱스 매칭, 어느 쪽에 올려도 같이 강조 + 가운데 라벨 갱신
  segs.forEach((seg, idx) => {
    const s = slices[idx];
    const on = () => {
      seg.classList.add("poll-pie-seg-on");
      num.textContent = `${Math.round(s.pct)}%`;
      sub.textContent = ko ? `${compactNum(s.count, ko)}표` : compactNum(s.count, ko);
      items[idx]?.classList.add("poll-legend-on");
    };
    const off = () => {
      seg.classList.remove("poll-pie-seg-on");
      resetCenter();
      items[idx]?.classList.remove("poll-legend-on");
    };
    seg.addEventListener("mouseenter", on);
    seg.addEventListener("mouseleave", off);
    const li = items[idx];
    if (li) { li.addEventListener("mouseenter", on); li.addEventListener("mouseleave", off); }
  });

  return wrap;
}

/** 정렬 라벨 — 에디터(SegmentedControl)·리더(vanilla) 공용 텍스트 소스 */
export const POLL_SORT_LABELS: Record<PollSortKey, LocalizedText> = {
  order: { ko: "기본순", en: "Default" },
  votes: { ko: "득표순", en: "Most votes" },
  alpha: { ko: "철자순", en: "A–Z" },
};

/** 리더용 vanilla 정렬 컨트롤 — 에디터의 공통 SegmentedControl 과 동일 모양(capsule 세그먼트 + 방향 화살표).
 *  onChange(key): 같은 key 재클릭=방향 토글, 다른 key=전환. 방향 기본값은 호출부가 결정(포스트 페이지와 동일 패턴). */
export function buildPollSortControl(
  sortKey: PollSortKey,
  sortDir: "asc" | "desc",
  ko: boolean,
  onChange: (key: PollSortKey) => void,
): HTMLElement {
  const head = document.createElement("div");
  head.className = "poll-result-head";
  const seg = document.createElement("div");
  seg.className = "poll-sort-seg";
  (["order", "votes", "alpha"] as PollSortKey[]).forEach((key) => {
    const active = key === sortKey;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "poll-sort-seg-btn" + (active ? " poll-sort-seg-on" : "");
    btn.textContent = ko ? POLL_SORT_LABELS[key].ko : POLL_SORT_LABELS[key].en;
    if (active) {
      const arrow = document.createElement("span");
      arrow.className = "poll-sort-dir" + (sortDir === "desc" ? " poll-sort-dir-desc" : "");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↑";
      btn.appendChild(arrow);
    }
    // 에디터(Slate void) 안에서도 안전 — 네이티브 mousedown 전파 차단(focus 뺏김 방지)
    btn.addEventListener("mousedown", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onChange(key); });
    seg.appendChild(btn);
  });
  head.appendChild(seg);
  return head;
}
