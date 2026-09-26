"use client";

import styles from "./VisitHeatmap.module.css";
import { useState } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tooltip from "@/components/ui/Tooltip";

/* ── 방문 시간대 히트맵 — KST 요일(행)×시각(열) 방문 분포(#1161).
   방문은 ip·날짜당 1행이라 "그날 첫 방문 시각" 분포다 — 언제 들어오기 시작하는지를 본다.
   GitHub 잔디 스타일: 고정 크기 사각 셀을 촘촘하게, 패널 폭에 늘리지 않는다.
   셀 클릭 상세는 만들었다 뺐다 — 지금 트래픽에선 셀당 방문이 한두 건이라 보여줄 게 없다.
   상세는 툴팁이 맡는다. */

/* 빈 칸 + 4단계 농도. 빈 칸은 텍스트색 5% — 테마 무관하게 배경보다 한 톤만 진하다.
   최고 단계도 원색 대신 86% — 원색 전면 칠은 달력 히트맵과 같은 이유로 피한다 */
const LEVEL_COLORS = [
  "color-mix(in srgb, var(--text-primary) 5%, var(--bg-primary))",
  "color-mix(in srgb, var(--color-accent) 20%, var(--bg-primary))",
  "color-mix(in srgb, var(--color-accent) 42%, var(--bg-primary))",
  "color-mix(in srgb, var(--color-accent) 64%, var(--bg-primary))",
  "color-mix(in srgb, var(--color-accent) 86%, var(--bg-primary))",
] as const;

function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((count / max) * 4)) as 1 | 2 | 3 | 4;
}

type HourFormat = "24" | "12";

/** 12시간제 숫자 — 0→12, 13→1 */
const to12 = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);

function VisitHeatmap({
  matrix,
  max,
  language,
}: {
  matrix: number[][];
  max: number;
  language: "ko" | "en";
}) {
  const [hourFormat, setHourFormat] = useState<HourFormat>("24");

  const dowLabels =
    language === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const meridiem = (hour: number) =>
    language === "ko" ? (hour < 12 ? "오전" : "오후") : hour < 12 ? "AM" : "PM";

  const tooltipHour = (hour: number) => {
    if (hourFormat === "24") return language === "ko" ? `${hour}시` : `${hour}:00`;
    return language === "ko"
      ? `${meridiem(hour)} ${to12(hour)}시`
      : `${to12(hour)} ${meridiem(hour)}`;
  };

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapToolbar}>
        <SegmentedControl<HourFormat>
          items={[
            { value: "12", label: language === "ko" ? "12시간" : "12h" },
            { value: "24", label: language === "ko" ? "24시간" : "24h" },
          ]}
          value={hourFormat}
          onChange={setHourFormat}
        />
      </div>
      <div className={styles.heatmap}>
        {/* 행 순서는 월~일 — 데이터 행렬은 0=일 인덱스라 표시 순서만 바꾼다 */}
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
          <div key={dow} className={styles.heatmapRow}>
            <span className={styles.heatmapDow}>{dowLabels[dow]}</span>
            {matrix[dow].map((count, hour) => (
              /* title 속성은 1초쯤 지나야 떠서 없는 것처럼 느껴진다 — 공용 Tooltip 로 즉시 표시 */
              <Tooltip
                key={hour}
                content={`${dowLabels[dow]} ${tooltipHour(hour)} · ${count.toLocaleString()}`}
                placement="top"
              >
                <span
                  className={styles.heatmapCell}
                  style={{ background: LEVEL_COLORS[levelFor(count, max)] }}
                />
              </Tooltip>
            ))}
          </div>
        ))}
        <div className={styles.heatmapRow} aria-hidden>
          <span className={styles.heatmapDow} />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className={styles.heatmapHourLabel}>
              {hourFormat === "24" ? hour : to12(hour)}
            </span>
          ))}
        </div>
        {hourFormat === "12" && (
          <div className={styles.heatmapRow} aria-hidden>
            <span className={styles.heatmapDow} />
            {/* 오전/오후 캡션 — 각각 앞·뒤 12칸에 걸친다 */}
            <span className={styles.heatmapMeridiem} style={{ gridColumn: "2 / 14" }}>
              {meridiem(0)}
            </span>
            <span className={styles.heatmapMeridiem} style={{ gridColumn: "14 / 26" }}>
              {meridiem(12)}
            </span>
          </div>
        )}
      </div>
      <div className={styles.heatmapLegend} aria-hidden>
        <span>{language === "ko" ? "적음" : "Less"}</span>
        {LEVEL_COLORS.map((color, i) => (
          <span key={i} className={styles.heatmapCell} style={{ background: color }} />
        ))}
        <span>{language === "ko" ? "많음" : "More"}</span>
      </div>
    </div>
  );
}

export default VisitHeatmap;
