"use client";

import styles from "../Dashboard.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanelTitle } from "../components";
import CalendarHeatmap from "./CalendarHeatmap";
import DayDetailPanel from "./DayDetailPanel";
import { CalendarDays, LineChart, TrendingDown, TrendingUp } from "@/components/icons";
import Button from "@/components/ui/Button";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import { ModalAlert } from "@/components/ui/ModalTemplates";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tooltip from "@/components/ui/Tooltip";
import { type TFunction } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
/** Catmull-Rom 보간으로 cubic bezier path 생성 (부드러운 곡선) */
/** Monotone cubic Hermite interpolation (Fritsch-Carlson).
   Catmull-Rom 의 overshoot 없이 자연스러운 smooth curve 보장 — baseline 아래로 dip 안 함. */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;

  // 1. 인접 segment slopes
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    m.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
  }

  // 2. 각 point 의 tangent (Fritsch-Carlson: 부호 다르면 0, 같으면 weighted harmonic)
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      const dx1 = pts[i].x - pts[i - 1].x;
      const dx2 = pts[i + 1].x - pts[i].x;
      const common = dx1 + dx2;
      t[i] = (3 * common) / ((common + dx2) / m[i - 1] + (common + dx1) / m[i]);
    }
  }

  // 3. tangent → cubic Bezier control points
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const cp1x = pts[i].x + dx / 3;
    const cp1y = pts[i].y + (t[i] * dx) / 3;
    const cp2x = pts[i + 1].x - dx / 3;
    const cp2y = pts[i + 1].y - (t[i + 1] * dx) / 3;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

/* ── 시각화 컴포넌트 ── */
/** 일별 조회수 — SVG 면적 차트. 시작일/종료일 기반 날짜 범위 선택. 부드러운 스플라인 + 그라데이션 fill.
 *  점/하단 라벨 클릭 시 해당 날짜의 상세 분석 패널이 펼쳐짐. */
export function DailyViewsChart({
  data: rawData,
  language,
  t,
}: {
  data: { day: string; views: number }[];
  language: "ko" | "en";
  t: TFunction;
}) {
  // 기본 범위: 최근 14일 (rawData 의 마지막 14개)
  const defaultRange = useMemo(() => {
    if (rawData.length === 0) return { start: "", end: "" };
    const end = rawData[rawData.length - 1].day;
    const startIdx = Math.max(0, rawData.length - 14);
    const start = rawData[startIdx].day;
    return { start, end };
  }, [rawData]);

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"line" | "calendar">("line");

  // 캘린더 모드의 focus month (year + month-index). rawData 의 마지막 날 기준 default.
  const [focusYM, setFocusYM] = useState<{ year: number; month: number }>(
    () => {
      const last = rawData[rawData.length - 1]?.day;
      if (last) {
        const [y, m] = last.split("-").map(Number);
        return { year: y, month: m - 1 };
      }
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    },
  );

  /* 마우스 drag-to-scroll — chartScroll 영역에서 mousedown + 이동하면 가로 스크롤.
     touch 는 native pan-x 가 이미 동작. drag 가 임계값 (>5px) 넘으면 click 차단.
     dragging state 로 cursor: grabbing 토글. */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScroll - dx;
  };
  const handlePointerUp = () => {
    dragState.current.active = false;
    setIsDragging(false);
  };
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  // 시작일이 종료일보다 늦으면 자동 swap (사용자가 거꾸로 골랐을 때 보정)
  const [normStart, normEnd] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  // 범위 변경 시 인덱스 리셋
  useEffect(() => {
    setSelectedIdx(null);
    setHoveredIdx(null);
  }, [normStart, normEnd]);

  // chartScroll 위에서 wheel — vertical wheel 을 horizontal scroll 로 변환, 페이지 세로 scroll 차단.
  // React onWheel 은 passive 라 preventDefault 불가 → native addEventListener (passive: false)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // rawData 에서 [normStart, normEnd] 구간만 슬라이스
  const data = useMemo(
    () => rawData.filter((d) => d.day >= normStart && d.day <= normEnd),
    [rawData, normStart, normEnd],
  );

  // 같은 길이의 직전 구간과 비교한 변화율 (line mode)
  const wow = useMemo(() => {
    if (data.length === 0) return null;
    const startIdxInRaw = rawData.findIndex((d) => d.day === data[0].day);
    if (startIdxInRaw <= 0) return null; // 직전 구간 없음
    const prevSlice = rawData.slice(
      Math.max(0, startIdxInRaw - data.length),
      startIdxInRaw,
    );
    if (prevSlice.length === 0) return null;
    const cur = data.reduce((s, d) => s + d.views, 0);
    const prev = prevSlice.reduce((s, d) => s + d.views, 0);
    if (prev === 0 && cur === 0) return null;
    if (prev === 0) return { pct: 100, direction: "up" as const };
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { pct, direction: pct >= 0 ? ("up" as const) : ("down" as const) };
  }, [rawData, data]);

  // 캘린더 모드: 현재 focus month 의 데이터 + 직전 달 대비 변화율
  const monthStats = useMemo(() => {
    const monthPrefix = `${focusYM.year}-${String(focusYM.month + 1).padStart(2, "0")}-`;
    const curMonthData = rawData.filter((d) => d.day.startsWith(monthPrefix));
    const curTotal = curMonthData.reduce((s, d) => s + d.views, 0);

    const prev =
      focusYM.month === 0
        ? { year: focusYM.year - 1, month: 11 }
        : { year: focusYM.year, month: focusYM.month - 1 };
    const prevPrefix = `${prev.year}-${String(prev.month + 1).padStart(2, "0")}-`;
    const prevMonthData = rawData.filter((d) => d.day.startsWith(prevPrefix));
    const prevTotal = prevMonthData.reduce((s, d) => s + d.views, 0);

    let mom: { pct: number; direction: "up" | "down" } | null = null;
    if (prevMonthData.length > 0) {
      if (prevTotal === 0 && curTotal === 0) mom = null;
      else if (prevTotal === 0) mom = { pct: 100, direction: "up" as const };
      else {
        const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
        mom = { pct, direction: pct >= 0 ? "up" : "down" };
      }
    }

    return { total: curTotal, mom };
  }, [rawData, focusYM]);

  // rawData 의 첫 날짜 / 마지막 날짜 — picker 의 min/max 안내용 (maxDate = 오늘, 미래 선택 차단)
  const minDate = rawData[0]?.day ?? "";
  const maxDate = rawData[rawData.length - 1]?.day ?? "";

  // 최대 선택 가능 범위: 2주(14일)
  const MAX_RANGE_DAYS = 14;
  const addDays = (iso: string, days: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // 잘못된 선택을 감지해서 모달로 안내. (오늘 picker 가 raw iso 를 그대로 넘겨주므로 detect 가능)
  const { openModal } = useModalStore();
  const notifyClamp = (reason: "future" | "range") => {
    const desc =
      language === "ko"
        ? reason === "future"
          ? "오늘 이후 날짜는 선택할 수 없습니다. 오늘 날짜로 변경했습니다."
          : "최대 14일까지만 선택 가능합니다. 14일 범위로 변경했습니다."
        : reason === "future"
          ? "Future dates aren't selectable. Adjusted to today."
          : "Up to 14 days can be selected. Adjusted to a 14-day range.";
    openModal(
      <ModalAlert
        desc={desc}
        confirmText={language === "ko" ? "확인" : "OK"}
      />,
      {
        header: {
          title: language === "ko" ? "날짜 범위 안내" : "Date range notice",
        },
      },
    );
  };

  // 시작일 변경 — 미래(>maxDate) 또는 14일 초과면 modal 안내 + 자동 보정
  const handleStartChange = (iso: string) => {
    const wasFuture = iso > maxDate;
    const newStart = iso > maxDate ? maxDate : iso < minDate ? minDate : iso;
    const maxAllowedEnd = addDays(newStart, MAX_RANGE_DAYS - 1);
    const wasOverRange = endDate > maxAllowedEnd;

    setStartDate(newStart);
    if (endDate > maxAllowedEnd || endDate < newStart) {
      setEndDate(maxAllowedEnd > maxDate ? maxDate : maxAllowedEnd);
    }
    setOpenPicker(null);

    if (wasFuture) notifyClamp("future");
    else if (wasOverRange) notifyClamp("range");
  };

  // 종료일 변경 — 미래 차단 + 14일 초과면 modal 안내 + 자동 보정
  const handleEndChange = (iso: string) => {
    const wasFuture = iso > maxDate;
    const newEnd = iso > maxDate ? maxDate : iso < minDate ? minDate : iso;
    const minAllowedStart = addDays(newEnd, -(MAX_RANGE_DAYS - 1));
    const wasOverRange = startDate < minAllowedStart;

    setEndDate(newEnd);
    if (startDate < minAllowedStart || startDate > newEnd) {
      setStartDate(minAllowedStart < minDate ? minDate : minAllowedStart);
    }
    setOpenPicker(null);

    if (wasFuture) notifyClamp("future");
    else if (wasOverRange) notifyClamp("range");
  };

  const max = Math.max(...data.map((d) => d.views), 1);
  const total = data.reduce((s, d) => s + d.views, 0);
  const W = 800;
  const H = 360;
  const PAD_T = 28;
  const PAD_B = 40;
  /* 첫/마지막 dot 이 chartScroll 의 overflow 에 잘리는 문제 방지용 horizontal inset.
     dot 이 translateX(-50%) 로 중앙정렬되니까 양 끝 dot 이 SVG edge 밖으로 반쯤 튀어나옴 → clip.
     이 값만큼 좌표계 안쪽으로 밀어서 dot 이 viewport 안에 완전히 들어옴. */
  const PAD_X = 16;
  const stepX = (W - 2 * PAD_X) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: H - PAD_B - (d.views / max) * (H - PAD_T - PAD_B),
    v: d.views,
    day: d.day,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${W - PAD_X},${H - PAD_B} L${PAD_X},${H - PAD_B} Z`;
  const todayPt = points[points.length - 1];
  // active indicator — hover 우선, 없으면 selected. 같은 element 가 left/top transition 으로 부드럽게 슬라이드
  const activeIdx = hoveredIdx ?? selectedIdx;
  const activePt = activeIdx !== null ? points[activeIdx] : null;

  // 라벨 culling — 30일 이하면 모두 표시. 그 이상은 ~14개 정도로 추리기
  const labelStep = data.length <= 30 ? 1 : Math.ceil(data.length / 14);
  const showLabel = (i: number) =>
    i === 0 || i === data.length - 1 || i % labelStep === 0;

  const toggle = (i: number) => setSelectedIdx((cur) => (cur === i ? null : i));

  return (
    <div className={styles.dailyChart}>
      {/* Row 1: 제목 + 우측 stats/toggle — 너비 변해도 일관된 단일 행 */}
      <header className={styles.panelHeader}>
        <PanelTitle variant="inset">
          {t("admin.dashboard.dailyViewsTitle")}
        </PanelTitle>
        <div className={styles.dailyChartStatItem}>
          <span className={styles.dailyChartStatLabel}>
            {viewMode === "calendar"
              ? language === "ko"
                ? "이 달 합계"
                : "Month total"
              : language === "ko"
                ? "기간 합계"
                : "Total"}
          </span>
          <span className={styles.dailyChartTotal}>
            {(viewMode === "calendar"
              ? monthStats.total
              : total
            ).toLocaleString()}
          </span>
        </div>
        {(() => {
          const trend = viewMode === "calendar" ? monthStats.mom : wow;
          if (!trend) return null;
          return (
            <div className={styles.dailyChartStatItem}>
              <span className={styles.dailyChartStatLabel}>
                {viewMode === "calendar"
                  ? language === "ko"
                    ? "직전 달 대비"
                    : "vs prev month"
                  : language === "ko"
                    ? "직전 기간 대비"
                    : "vs prev"}
              </span>
              <span
                className={`${styles.trendBadge} ${trend.direction === "up" ? styles.trendUp : styles.trendDown}`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp size={11} strokeWidth={2.5} />
                ) : (
                  <TrendingDown size={11} strokeWidth={2.5} />
                )}
                {Math.abs(trend.pct)}%
              </span>
            </div>
          );
        })()}
        <SegmentedControl<"line" | "calendar">
          items={[
            { value: "line", label: <LineChart size={13} strokeWidth={2} /> },
            {
              value: "calendar",
              label: <CalendarDays size={13} strokeWidth={2} />,
            },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </header>

      {/* Row 2: 날짜 범위 선택기 (line mode 만) — 별도 행으로 분리해서 너비 변해도 row1 영향 X */}
      {viewMode === "line" && (
        <div className={styles.dailyChartHeaderSub}>
          <div className={styles.periodRange}>
            <DateRangeTrigger
              label={language === "ko" ? "시작일" : "Start"}
              date={startDate}
              isOpen={openPicker === "start"}
              onOpen={() =>
                setOpenPicker((cur) => (cur === "start" ? null : "start"))
              }
              onClose={() => setOpenPicker(null)}
              onSelect={handleStartChange}
              language={language}
              minDate={minDate}
              maxDate={maxDate}
            />
            <span className={styles.periodRangeSep} aria-hidden>
              —
            </span>
            <DateRangeTrigger
              label={language === "ko" ? "종료일" : "End"}
              date={endDate}
              isOpen={openPicker === "end"}
              onOpen={() =>
                setOpenPicker((cur) => (cur === "end" ? null : "end"))
              }
              onClose={() => setOpenPicker(null)}
              onSelect={handleEndChange}
              language={language}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>
        </div>
      )}
      {viewMode === "calendar" ? (
        <CalendarHeatmap
          data={rawData}
          language={language}
          focus={focusYM}
          setFocus={setFocusYM}
          onSelectDay={(day) => {
            // 캘린더에서 선택한 날짜를 line mode 의 selectedIdx 로 연결 (DayDetailPanel 표시).
            // data 가 슬라이스라 범위 밖이면 line mode 의 startDate/endDate 를 조정해서 포함시킴.
            const idx = data.findIndex((d) => d.day === day);
            if (idx >= 0) {
              setSelectedIdx(idx);
            } else {
              // 선택한 날짜가 현재 line slice 밖이면 startDate/endDate 를 그 날 중심으로 14일 조정
              const dayIdxRaw = rawData.findIndex((d) => d.day === day);
              if (dayIdxRaw >= 0) {
                const halfRange = Math.floor(MAX_RANGE_DAYS / 2);
                const startIdx = Math.max(0, dayIdxRaw - halfRange);
                const endIdx = Math.min(
                  rawData.length - 1,
                  startIdx + MAX_RANGE_DAYS - 1,
                );
                setStartDate(rawData[startIdx].day);
                setEndDate(rawData[endIdx].day);
                setSelectedIdx(dayIdxRaw - startIdx);
                setViewMode("line");
              }
            }
          }}
        />
      ) : (
        // 모바일에서 일수가 많으면 가로 스크롤 — children 의 min-width 가 일당 24px 정도로 늘어나 scroll 발생.
        // desktop 에서는 width: 100% 로 fit-to-container, scroll 안 일어남.
        // 마우스 drag-to-scroll + wheel 도 가로로 변환 (chart 위 wheel 시 페이지 세로 scroll 막음).
        <div
          ref={scrollRef}
          className={`${styles.chartScroll} ${isDragging ? styles.chartScrollDragging : ""}`}
          style={{ ["--_days" as string]: String(data.length) }}
          role="img"
          aria-label={t("admin.dashboard.dailyViewsTitle")}
          onMouseLeave={() => setHoveredIdx(null)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={handleClickCapture}
        >
          {/* path 만 SVG — 늘어나도 곡선 형태는 자연스러움 */}
          <div className={styles.chartArea}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className={styles.areaSvg}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0.35"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* 오늘/선택된 날짜 vertical reference — dot 위치에서 baseline 까지만 (dot 위쪽으로는 안 그려짐) */}
            <span
              className={styles.todayLine}
              style={{
                left: `${(todayPt.x / W) * 100}%`,
                top: `${(todayPt.y / H) * 100}%`,
                bottom: `${(PAD_B / H) * 100}%`,
              }}
              aria-hidden
            />
            {activePt && (
              <span
                className={styles.selectedLine}
                style={{
                  left: `${(activePt.x / W) * 100}%`,
                  top: `${(activePt.y / H) * 100}%`,
                  bottom: `${(PAD_B / H) * 100}%`,
                }}
                aria-hidden
              />
            )}
            {/* 각 날짜의 세로 컬럼 전체가 hit area — 점 위/아래 어디 클릭해도 해당 날짜 선택.
              hoveredIdx 는 chartArea 의 dotColumn 뿐 아니라 areaDays 의 라벨 hover 로도 set 되므로
              dot 표시는 state 기반 .dotHovered 클래스로 통일 */}
            {points.map((p, i) => {
              const isToday = i === points.length - 1;
              const isSelected = selectedIdx === i;
              const isHovered = hoveredIdx === i;
              const isHoveringElsewhere =
                hoveredIdx !== null && hoveredIdx !== i;
              // 다른 날짜 선택 / 다른 dot hover 중이면 오늘 dot 숨김 (active indicator 가 이동했으므로)
              const showAsToday =
                isToday && selectedIdx === null && !isHoveringElsewhere;
              // 다른 dot 을 hover 중이면 selected dot 도 숨김 — indicator 가 hover 위치로 이동한 느낌
              const showAsSelected = isSelected && !isHoveringElsewhere;
              const isEmphasized = showAsToday || showAsSelected || isHovered;
              return (
                <Pressable
                  key={i}
                  className={styles.dotColumn}
                  style={{
                    left: `${(p.x / W) * 100}%`,
                    width: `${(stepX / W) * 100}%`,
                  }}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  aria-label={`${data[i].day}: ${data[i].views} views`}
                >
                  {/* 각 dot 위 숫자 label — today/selected/hover 시 강조 */}
                  <span
                    className={`${styles.dotValue} ${isEmphasized ? styles.dotValueEmphasized : ""}`}
                    style={{ top: `${(p.y / H) * 100}%` }}
                  >
                    {p.v.toLocaleString()}
                  </span>
                  <span
                    className={`${styles.dotCircle} ${showAsToday ? styles.dotToday : ""} ${showAsSelected ? styles.dotSelected : ""} ${isHovered ? styles.dotHovered : ""}`}
                    style={{ top: `${(p.y / H) * 100}%` }}
                  />
                </Pressable>
              );
            })}
          </div>
          {/* 하단 day 라벨 — absolute 포지션, 점과 같은 X 위치(0%~100%)에 중앙 정렬.
            indicator 는 hovered → selected → today 순으로 위치, smooth slide */}
          <div className={styles.areaDays}>
            {/* Sliding circle indicator — 라벨 뒤 배경 */}
            {(() => {
              const targetIdx = hoveredIdx ?? selectedIdx ?? data.length - 1;
              /* points 의 x (PAD_X inset 적용된 값) 기반 → SVG dot 과 라벨이 동일 위치 정렬 */
              const leftPct = (points[targetIdx].x / W) * 100;
              const isOnSelected = hoveredIdx === null && selectedIdx !== null;
              const isOnHovered = hoveredIdx !== null;
              return (
                <span
                  className={`${styles.dayIndicator} ${isOnSelected ? styles.dayIndicatorSelected : ""} ${isOnHovered ? styles.dayIndicatorHover : ""}`}
                  style={{ left: `${leftPct}%` }}
                  aria-hidden
                />
              );
            })()}
            {data.map((d, i) => {
              // 30/90일은 라벨 너무 많아 culling — 0/마지막/labelStep 단위만 표시
              if (!showLabel(i)) return null;
              const date = new Date(d.day);
              const dn = date.getDate();
              const dow = date.toLocaleDateString(
                language === "ko" ? "ko-KR" : "en-US",
                { weekday: "short" },
              );
              const isToday = i === data.length - 1;
              const isSelected = selectedIdx === i;
              const leftPct = (points[i].x / W) * 100;
              return (
                <Pressable
                  key={d.day}
                  className={`${styles.areaDay} ${isToday ? styles.areaDayToday : ""} ${isSelected ? styles.areaDaySelected : ""}`}
                  style={{ left: `${leftPct}%` }}
                  title={`${d.day} · ${d.views.toLocaleString()}`}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoveredIdx(i)}
                >
                  {dn}
                  <span className={styles.areaDayDow}>{dow}</span>
                </Pressable>
              );
            })}
          </div>
        </div>
      )}
      {/* 선택된 날짜 상세 패널 */}
      {selectedIdx !== null && (
        <DayDetailPanel
          data={data}
          selectedIdx={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          language={language}
          t={t}
        />
      )}
    </div>
  );
}

/* ── 날짜 범위 trigger — 클릭 시 DatePickerPopover 열림 ── */
function DateRangeTrigger({
  label,
  date,
  isOpen,
  onOpen,
  onClose,
  onSelect,
  language,
}: {
  label: string;
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (iso: string) => void;
  language: "ko" | "en";
  minDate: string;
  maxDate: string;
}) {
  const [y, m, d] = date.split("-");
  const formatted = (() => {
    if (!date) return "—";
    const dt = new Date(date);
    return dt.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  })();

  const tooltipText =
    language === "ko"
      ? "최대 14일 범위, 미래 날짜는 선택 불가"
      : "Up to 14-day range, future dates not allowed";

  return (
    <div className={styles.periodTrigger}>
      <Tooltip content={tooltipText} placement="bottom" delay={300}>
        <Button
          type="button"
          variant="outline"
          size="2xs"
          active={isOpen}
          className={styles.periodTriggerBtn}
          onClick={onOpen}
          aria-label={`${label}: ${formatted}`}
        >
          <span className={styles.periodTriggerLabel}>{label}</span>
          <span className={styles.periodTriggerDate}>{formatted}</span>
        </Button>
      </Tooltip>
      {isOpen && (
        <DatePickerPopover
          year={y}
          month={m}
          day={d}
          format="date"
          onSelect={(yy, mm, dd) => {
            // raw iso 그대로 부모에 전달 — 부모에서 modal 안내 + auto-clamp 처리
            const iso = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
            onSelect(iso);
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

export default DailyViewsChart;
