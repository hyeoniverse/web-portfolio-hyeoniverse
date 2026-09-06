"use client";

import styles from "../Dashboard.module.css";
import { useEffect, useState, type CSSProperties } from "react";
import { Item, List, ListItem, Panel, PanelTitle } from "../components";
import { CountUp } from "./CountUp";
import { TrendingDown, TrendingUp } from "@/components/icons";
import CloseButton from "@/components/ui/CloseButton";
import { type TFunction } from "@/providers/LanguageProvider";
import Link from "next/link";
type DayTopPost = { id: string; title: string; slug: string; views: number };

/** 선택된 날짜의 분석 패널 — 순위, 평균 대비, 같은 요일 대비, 전일 대비, 그날 인기 게시물 */
export function DayDetailPanel({
  data,
  selectedIdx,
  onClose,
  language,
}: {
  data: { day: string; views: number }[];
  selectedIdx: number;
  onClose: () => void;
  language: "ko" | "en";
  t: TFunction;
}) {
  const [topPosts, setTopPosts] = useState<DayTopPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const sel = data[selectedIdx];

  // 선택 날짜 변경 시 인기 게시물 fetch
  useEffect(() => {
    let cancelled = false;
    setLoadingPosts(true);
    fetch(`/api/admin/dashboard/day?date=${sel.day}`)
      .then((r) => r.json())
      .then((d: { topPosts?: DayTopPost[] }) => {
        if (!cancelled) {
          setTopPosts(d.topPosts ?? []);
          setLoadingPosts(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopPosts([]);
          setLoadingPosts(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sel.day]);

  const selDate = new Date(sel.day);
  const allViews = data.map((d) => d.views);
  const avg = allViews.reduce((s, v) => s + v, 0) / allViews.length;
  const sortedDesc = [...allViews].sort((a, b) => b - a);
  const rank = sortedDesc.indexOf(sel.views) + 1;

  // 이전 같은 요일 (14일 안에서)
  const dow = selDate.getDay();
  let sameWeekday: { day: string; views: number } | null = null;
  for (let i = selectedIdx - 1; i >= 0; i--) {
    if (new Date(data[i].day).getDay() === dow) {
      sameWeekday = data[i];
      break;
    }
  }
  const prevDay = selectedIdx > 0 ? data[selectedIdx - 1] : null;

  const diffPct = (
    cur: number,
    base: number,
  ): { pct: number; dir: "up" | "down" | "flat" } | null => {
    if (base === 0) return cur > 0 ? { pct: 100, dir: "up" } : null;
    const pct = Math.round(((cur - base) / base) * 100);
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  };

  const vsAvg = diffPct(sel.views, Math.round(avg));
  const vsSameWeekday = sameWeekday
    ? diffPct(sel.views, sameWeekday.views)
    : null;
  const vsPrev = prevDay ? diffPct(sel.views, prevDay.views) : null;

  const fullDate = selDate.toLocaleDateString(
    language === "ko" ? "ko-KR" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "long",
    },
  );

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
    });

  // 행 데이터 — staggered animation index 부여 위해 배열로.
  // baseline 조회수 (ctx) 는 label 괄호 안에 inline 표기 — 별도 컬럼 없이도 비교 기준이 명확함.
  const periodLabel =
    language === "ko" ? `${data.length}일` : `${data.length}d`;
  const fmtViews = (n: number) =>
    language === "ko"
      ? `${n.toLocaleString()}회`
      : `${n.toLocaleString()} views`;
  const rows = [
    vsAvg && {
      id: "avg",
      label:
        language === "ko"
          ? `${periodLabel} 평균 대비 (${fmtViews(Math.round(avg))})`
          : `vs ${periodLabel} average (${fmtViews(Math.round(avg))})`,
      diff: vsAvg,
    },
    vsSameWeekday &&
      sameWeekday && {
        id: "weekday",
        label:
          language === "ko"
            ? `이전 ${selDate.toLocaleDateString("ko-KR", { weekday: "short" })}요일 대비 (${fmtShort(sameWeekday.day)}, ${fmtViews(sameWeekday.views)})`
            : `vs last ${selDate.toLocaleDateString("en-US", { weekday: "short" })} (${fmtShort(sameWeekday.day)}, ${fmtViews(sameWeekday.views)})`,
        diff: vsSameWeekday,
      },
    vsPrev &&
      prevDay && {
        id: "prev",
        label:
          language === "ko"
            ? `전일 대비 (${fmtShort(prevDay.day)}, ${fmtViews(prevDay.views)})`
            : `vs previous day (${fmtShort(prevDay.day)}, ${fmtViews(prevDay.views)})`,
        diff: vsPrev,
      },
  ].filter(Boolean) as {
    id: string;
    label: string;
    diff: { pct: number; dir: "up" | "down" | "flat" };
  }[];

  return (
    <Panel
      variant="grid"
      cols="1fr 1fr"
      divided
      className={styles.dayDetailPanel}
      role="region"
      aria-label="day detail"
      key={selectedIdx /* 다른 날짜 클릭 시 애니메이션 재실행 */}
    >
      <header className={styles.panelHeader} style={{ gridColumn: "1 / -1" }}>
        <div className={styles.dayDetailHeading}>
          <span className={styles.dayDetailDate}>{fullDate}</span>
          <span className={styles.dayDetailRank}>
            {language === "ko"
              ? `${rank}위 / ${data.length}일`
              : `Rank ${rank} of ${data.length}`}
          </span>
        </div>
        <CloseButton onClick={onClose} ariaLabel="close" />
      </header>

      {/* 좌측 컬럼 — 숫자 + 비교 List + range 분포 (Panel 로 그룹핑, DayDetail grid 의 col 1) */}
      <Panel>
        <Item
          style={{
            display: "flex",
            gap: "var(--spacing-xs)",
            alignItems: "baseline",
            paddingTop: "var(--spacing-2xs)",
            paddingBottom: "var(--spacing-2xs)",
            height: "calc(var(--font-size-3xl) + var(--spacing-xs))",
            flexShrink: 0,
            overflow: "visible",
          }}
        >
          <div className={styles.dayDetailNumber}>
            <CountUp value={sel.views} duration={700} />
          </div>
          <span className={styles.dayDetailUnit}>
            {language === "ko" ? "조회" : "views"}
          </span>
        </Item>

        <List>
          {rows.map((row) => (
            <ListItem
              key={row.id}
              layout="grid"
              style={{ gridTemplateColumns: "1fr auto", height: "var(--control-h-xl)", flexShrink: 0 }}
            >
              <span className={styles.dayDetailLabel}>{row.label}</span>
              <DiffBadge diff={row.diff} />
            </ListItem>
          ))}
        </List>

        <RangePosition
          values={allViews}
          selectedValue={sel.views}
          label={
            language === "ko"
              ? `${periodLabel} 분포 내 위치`
              : `Position in ${periodLabel} range`
          }
        />
      </Panel>

      {/* 그날 인기 게시물 — 우측 컬럼, top 5 만 컴팩트하게 */}
      <Panel style={{ animationDelay: `${120 + rows.length * 70 + 200}ms` }}>
        <PanelTitle
          variant="inset"
          style={{
            height: "calc(var(--font-size-3xl) + var(--spacing-xs))",
            paddingTop: "var(--spacing-2xs)",
            paddingBottom: "var(--spacing-2xs)",
            display: "flex",
            alignItems: "end",
            flexShrink: 0,
          }}
        >
          {language === "ko" ? "그날 인기 게시물" : "Top posts that day"}
        </PanelTitle>
        {loadingPosts ? (
          <p className={styles.muted}>
            {language === "ko" ? "불러오는 중..." : "Loading..."}
          </p>
        ) : topPosts.length === 0 ? (
          <p className={styles.muted}>
            {language === "ko"
              ? "이날 조회된 게시물이 없습니다."
              : "No posts viewed this day."}
          </p>
        ) : (
          <List>
            {topPosts.slice(0, 5).map((p, i) => {
              const max = topPosts[0].views;
              const pct = (p.views / max) * 100;
              return (
                <ListItem
                  key={p.id}
                  layout="grid"
                  style={{
                    gridTemplateColumns:
                      "auto minmax(0, 1.4fr) minmax(60px, 1fr) auto",
                    height: "var(--control-h-xl)",
                    flexShrink: 0,
                  }}
                >
                  <span className={styles.dayDetailTopRank}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/posts/${p.slug}`}
                    className={styles.itemTitle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </Link>
                  <span className={styles.bar} aria-hidden>
                    <span
                      className={`${styles.barFill} ${styles.barFillGradient} ${styles.barFillEnter}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className={styles.dayDetailTopViews}>
                    {p.views.toLocaleString()}
                  </span>
                </ListItem>
              );
            })}
          </List>
        )}
      </Panel>
    </Panel>
  );
}

function DiffBadge({
  diff,
}: {
  diff: { pct: number; dir: "up" | "down" | "flat" };
}) {
  const cls =
    diff.dir === "up"
      ? styles.trendUp
      : diff.dir === "down"
        ? styles.trendDown
        : styles.trendFlat;
  const sign = diff.dir === "up" ? "+" : diff.dir === "down" ? "" : "±";
  return (
    <span className={`${styles.trendBadge} ${cls}`}>
      {diff.dir === "up" && <TrendingUp size={11} strokeWidth={2.5} />}
      {diff.dir === "down" && <TrendingDown size={11} strokeWidth={2.5} />}
      {sign}
      {diff.pct}%
    </span>
  );
}

/** min~max 범위 안에서 선택된 값의 위치를 보여주는 미니 슬라이더 */
function RangePosition({
  values,
  selectedValue,
  label,
}: {
  values: number[];
  selectedValue: number;
  label: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const pct = range > 0 ? ((selectedValue - min) / range) * 100 : 50;

  return (
    <Item>
      <span className={styles.rangePosLabel}>{label}</span>
      <div
        className={styles.rangePosTrack}
        aria-hidden
        style={{ ["--_pct" as string]: pct } as CSSProperties}
      >
        <div className={styles.rangePosFill} />
        <div className={styles.rangePosMarker} />
      </div>
      <div className={styles.rangePosBounds}>
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </Item>
  );
}

export default DayDetailPanel;
