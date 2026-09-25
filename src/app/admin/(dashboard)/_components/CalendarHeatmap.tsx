"use client";

import shared from "../Dashboard.module.css";
import local from "./CalendarHeatmap.module.css";

/* 이 컴포넌트 전용 규칙은 CalendarHeatmap.module.css 에, 대시보드 여러 곳이 함께 쓰는 규칙은
   Dashboard.module.css 에 있다. 둘을 합쳐서 styles 하나로 쓴다. */
const styles = { ...shared, ...local };
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
/** GitHub-style 캘린더 히트맵 — 7행(요일) × N열(주). 각 셀은 그날 조회수에 따라 4단계 accent 농도. */
/** 월별 캘린더 뷰 — 일반적인 달력 모양 (7-col 요일 × 6-row 주). 한 달치를 한 번에 보여줌.
 *  focus month state 는 DailyViewsChart 가 소유 — stat 패널 (이 달 합계 / 직전 달 대비) 과 동기화. */
function CalendarHeatmap({
  data,
  language,
  onSelectDay,
  focus,
  setFocus,
}: {
  data: { day: string; views: number }[];
  language: "ko" | "en";
  onSelectDay?: (day: string) => void;
  focus: { year: number; month: number };
  setFocus: (f: { year: number; month: number }) => void;
}) {
  const lastDay = data[data.length - 1]?.day;

  // 해당 month 의 1일 요일 + 일수
  const firstDayDow = new Date(focus.year, focus.month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(focus.year, focus.month + 1, 0).getDate();

  // ISO 변환 (KST 기준 YYYY-MM-DD)
  const isoOf = (d: number) =>
    `${focus.year}-${String(focus.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 데이터 lookup
  const dataMap = useMemo(
    () => new Map(data.map((d) => [d.day, d.views])),
    [data],
  );

  // Quantile coloring (data 전체 기준)
  const nonZero = useMemo(
    () =>
      data
        .filter((d) => d.views > 0)
        .map((d) => d.views)
        .sort((a, b) => a - b),
    [data],
  );
  const q = (p: number) =>
    nonZero.length === 0 ? 0 : (nonZero[Math.floor(nonZero.length * p)] ?? 0);
  const lvl1 = q(0.33);
  const lvl2 = q(0.66);
  /* 상대(quantile) 등급에 절대 하한을 섞는다 — 표본이 작은 시기엔 2~3 조회가 상위 33% 라는
     이유만으로 "많음"으로 칠해졌다. 최고 등급은 10 이상, 중간 등급은 3 이상일 때만 준다
     (중간 하한을 더 올리면 저트래픽 시기에 달력 전체가 한 색이 되어 단계가 사라진다). */
  const STRONG_MIN = 10;
  const MID_MIN = 3;
  const levelFor = (v: number): 0 | 1 | 2 | 3 => {
    if (v <= 0) return 0;
    let lvl: 1 | 2 | 3 = v <= lvl1 ? 1 : v <= lvl2 ? 2 : 3;
    if (lvl === 3 && v < STRONG_MIN) lvl = 2;
    if (lvl === 2 && v < MID_MIN) lvl = 1;
    return lvl;
  };
  // 0 조회 cell 은 section bg 와 동일 색 — grid 의 hairline (1px gap) 만 보이고 cell 자체는 비어있게.
  // color-mix 로 accent + bg-primary 를 비율별로 섞어 opaque 단계 생성.
  // accent-alpha-XX 같은 alpha 색을 쓰면 grid bg (border-light-color, 30% alpha 어두운 색) 가 비쳐 탁해짐.
  // 최고 단계도 원색 대신 80% — 원색 전면 칠은 달력에서 혼자 너무 쨍하다.
  const LEVEL_COLORS = [
    "var(--bg-primary)",
    "color-mix(in srgb, var(--color-accent) 22%, var(--bg-primary))",
    "color-mix(in srgb, var(--color-accent) 50%, var(--bg-primary))",
    "color-mix(in srgb, var(--color-accent) 80%, var(--bg-primary))",
  ] as const;

  /* 오늘 표시용 — 데이터가 KST 날짜 문자열이므로 오늘도 KST 로 만든다 */
  const todayIso = useMemo(
    () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
    [],
  );

  // 6행×7열 grid — 첫 일주의 빈 cell 부터 시작
  const CELLS = 42;
  const cells: Array<{ day: number; iso: string; views: number } | null> =
    Array.from({ length: CELLS }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = firstDayDow + d - 1;
    if (idx >= CELLS) break;
    const iso = isoOf(d);
    cells[idx] = { day: d, iso, views: dataMap.get(iso) ?? 0 };
  }

  // Navigation bounds — 데이터 범위 내에서만 이동
  const firstDataDay = data[0]?.day;
  const firstYM = firstDataDay
    ? {
        year: Number(firstDataDay.slice(0, 4)),
        month: Number(firstDataDay.slice(5, 7)) - 1,
      }
    : null;
  const lastYM = lastDay
    ? {
        year: Number(lastDay.slice(0, 4)),
        month: Number(lastDay.slice(5, 7)) - 1,
      }
    : null;
  const cmpYM = (
    a: { year: number; month: number },
    b: { year: number; month: number },
  ) => (a.year !== b.year ? a.year - b.year : a.month - b.month);
  const canPrev = firstYM ? cmpYM(focus, firstYM) > 0 : false;
  const canNext = lastYM ? cmpYM(focus, lastYM) < 0 : false;

  const goPrev = () => {
    if (focus.month === 0) setFocus({ year: focus.year - 1, month: 11 });
    else setFocus({ year: focus.year, month: focus.month - 1 });
  };
  const goNext = () => {
    if (focus.month === 11) setFocus({ year: focus.year + 1, month: 0 });
    else setFocus({ year: focus.year, month: focus.month + 1 });
  };

  const monthLabel = new Date(focus.year, focus.month, 1).toLocaleDateString(
    language === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long" },
  );
  const dowLabels =
    language === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={styles.calendarHeatmap}>
      <header className={styles.calendarHeader}>
        <Button
          variant="ghost"
          shape="square"
          size="xs"
          icon={<ChevronLeft size={14} strokeWidth={2} />}
          onClick={goPrev}
          disabled={!canPrev}
          aria-label={language === "ko" ? "이전 달" : "Previous month"}
        />
        <span className={styles.calendarMonth}>{monthLabel}</span>
        <Button
          variant="ghost"
          shape="square"
          size="xs"
          icon={<ChevronRight size={14} strokeWidth={2} />}
          onClick={goNext}
          disabled={!canNext}
          aria-label={language === "ko" ? "다음 달" : "Next month"}
        />
      </header>

      <div className={styles.calendarDowRow}>
        {dowLabels.map((d, i) => (
          <span key={i} className={styles.calendarDow}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {cells.map((cell, i) => (
          <Pressable
            key={i}
            className={`${styles.calendarCell} ${!cell ? styles.calendarCellEmpty : ""}`}
            style={cell ? { background: LEVEL_COLORS[levelFor(cell.views)] } : undefined}
            onClick={cell ? () => onSelectDay?.(cell.iso) : undefined}
            disabled={!cell}
            title={cell ? `${cell.iso} · ${cell.views.toLocaleString()}` : ""}
            aria-label={cell ? `${cell.iso}: ${cell.views} views` : "empty"}
            data-strong={(cell && levelFor(cell.views) === 3) || undefined}
            data-today={cell?.iso === todayIso || undefined}
          >
            {cell && (
              <>
                <span className={styles.calendarCellDay}>{cell.day}</span>
                <span className={styles.calendarCellViews}>
                  {cell.views > 0 ? cell.views.toLocaleString() : ""}
                </span>
              </>
            )}
          </Pressable>
        ))}
      </div>

      <div className={styles.calendarLegend}>
        <span className={styles.calendarLegendLabel}>
          {language === "ko" ? "적음" : "Less"}
        </span>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={styles.calendarLegendCell}
            style={{ background: LEVEL_COLORS[i] }}
          />
        ))}
        <span className={styles.calendarLegendLabel}>
          {language === "ko" ? "많음" : "More"}
        </span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
