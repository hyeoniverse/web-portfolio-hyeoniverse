"use client";

import styles from "./VisitHeatmap.module.css";
import { useState, type CSSProperties } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

/* ── 방문 시간대 히트맵 — KST 요일(행)×시각(열) 방문 분포(#1161).
   방문은 ip·날짜당 1행이라 "그날 첫 방문 시각" 분포다 — 언제 들어오기 시작하는지를 본다.
   GitHub 잔디 스타일: 고정 크기 사각 셀을 촘촘하게, 패널 폭에 늘리지 않는다.
   셀 클릭 상세는 만들었다 뺐다 — 지금 트래픽에선 셀당 방문이 한두 건이라 보여줄 게 없다.
   상세는 툴팁이 맡는다. */

/* 빈 칸 + 4단계 농도. 빈 칸은 텍스트색 5% — 테마 무관하게 배경보다 한 톤만 진하다.
   최고 단계도 원색 대신 86% — 원색 전면 칠은 달력 히트맵과 같은 이유로 피한다 */
const LEVEL_COLORS = [
  "color-mix(in srgb, var(--text-primary) 5%, var(--bg-primary))",
  "color-mix(in srgb, var(--bg-accent-solid) 20%, var(--bg-primary))",
  "color-mix(in srgb, var(--bg-accent-solid) 42%, var(--bg-primary))",
  "color-mix(in srgb, var(--bg-accent-solid) 64%, var(--bg-primary))",
  "color-mix(in srgb, var(--bg-accent-solid) 86%, var(--bg-primary))",
] as const;

function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((count / max) * 4)) as 1 | 2 | 3 | 4;
}

type HourFormat = "24" | "12";

/** 12시간제 숫자 — 0→12, 13→1 */
const to12 = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);

/** 행 순서는 월~일 — 데이터 행렬은 0=일 인덱스라 표시 순서만 바꾼다 */
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* 격자 한 칸의 자리 — 좁은 화면은 행=시각 · 열=요일(세로), 넓은 화면은 행=요일 · 열=시각(가로).
   마크업은 한 벌이고 CSS 가 화면 폭에 맞는 쪽 변수를 grid-row · grid-column 으로 쓴다.
   wide 의 열은 끝이 있을 수 있다(오전/오후 캡션이 12칸에 걸친다) */
type Place = { narrow: [row: number, col: number]; wide: [row: number, col: string | number] };
const place = ({ narrow, wide }: Place) =>
  ({ "--hm-nr": narrow[0], "--hm-nc": narrow[1], "--hm-wr": wide[0], "--hm-wc": wide[1] }) as CSSProperties;

function VisitHeatmap({
  matrix,
  max,
}: {
  matrix: number[][];
  max: number;
  language: "ko" | "en";
}) {
  const { t } = useLanguage();
  const [hourFormat, setHourFormat] = useState<HourFormat>("24");

  const dowLabels =
    [0, 1, 2, 3, 4, 5, 6].map((i) => t(`admin.inline.visitHeatmap.dow${i}`));

  const meridiem = (hour: number) =>
    t(hour < 12 ? "admin.inline.visitHeatmap.am" : "admin.inline.visitHeatmap.pm");

  const tooltipHour = (hour: number) => {
    if (hourFormat === "24") return fillTemplate(t("admin.inline.visitHeatmap.hour24"), { hour });
    return fillTemplate(t("admin.inline.visitHeatmap.hour12"), { meridiem: meridiem(hour), hour: to12(hour) });
  };

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapToolbar}>
        <SegmentedControl<HourFormat>
          items={[
            { value: "12", label: t("admin.inline.visitHeatmap.n12h") },
            { value: "24", label: t("admin.inline.visitHeatmap.n24h") },
          ]}
          value={hourFormat}
          onChange={setHourFormat}
        />
      </div>
      <div className={styles.heatmap}>
        {DOW_ORDER.map((dow, i) => (
          <span key={`dow-${dow}`} className={styles.heatmapDow} style={place({ narrow: [1, i + 2], wide: [i + 1, 1] })}>
            {dowLabels[dow]}
          </span>
        ))}
        {DOW_ORDER.map((dow, i) =>
          matrix[dow].map((count, hour) => (
            /* title 속성은 1초쯤 지나야 떠서 없는 것처럼 느껴진다 — 공용 Tooltip 로 즉시 표시.
               Tooltip 이 칸을 span 으로 감싸므로 자리는 그 감싼 span(격자의 자식)에 준다 */
            <Tooltip
              key={`${dow}-${hour}`}
              content={`${dowLabels[dow]} ${tooltipHour(hour)} · ${count.toLocaleString()}`}
              placement="top"
              wrapperStyle={place({ narrow: [hour + 2, i + 2], wide: [i + 1, hour + 2] })}
            >
              <span
                className={styles.heatmapCell}
                style={{ background: LEVEL_COLORS[levelFor(count, max)] }}
              />
            </Tooltip>
          )),
        )}
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            key={`hour-${hour}`}
            className={styles.heatmapHourLabel}
            style={place({ narrow: [hour + 2, 1], wide: [8, hour + 2] })}
            aria-hidden
          >
            {/* 세로 격자에는 오전/오후 캡션 줄이 없어 0시 · 12시 라벨 앞에 붙인다 */}
            {hourFormat === "12" && hour % 12 === 0 && (
              <span className={styles.heatmapMeridiemInline}>{meridiem(hour)} </span>
            )}
            {hourFormat === "24" ? hour : to12(hour)}
          </span>
        ))}
        {hourFormat === "12" && (
          <>
            {/* 오전/오후 캡션 — 가로 격자에서 각각 앞·뒤 12칸 아래 */}
            <span className={styles.heatmapMeridiem} style={place({ narrow: [1, 1], wide: [9, "2 / 14"] })} aria-hidden>
              {meridiem(0)}
            </span>
            <span className={styles.heatmapMeridiem} style={place({ narrow: [1, 1], wide: [9, "14 / 26"] })} aria-hidden>
              {meridiem(12)}
            </span>
          </>
        )}
      </div>
      <div className={styles.heatmapLegend} aria-hidden>
        <span>{t("admin.inline.visitHeatmap.less")}</span>
        {LEVEL_COLORS.map((color, i) => (
          <span key={i} className={styles.heatmapCell} style={{ background: color }} />
        ))}
        <span>{t("admin.inline.visitHeatmap.more")}</span>
      </div>
    </div>
  );
}

export default VisitHeatmap;
