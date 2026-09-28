"use client";

import { useRef, useState, useLayoutEffect, useCallback, useMemo, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { ProcessStep } from "@/data/about";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { renderHighlight } from "../renderHighlight";
import PinnedTitleRow from "../PinnedTitleRow";
import { useAboutConfig } from "../AboutConfig";
import { adaptProcess } from "@/app/about/_config/adaptAbout";
import Pressable from "@/components/ui/Pressable";
import entry from "../AboutEntry.module.css";
import frame from "../AboutPanel.module.css";
import local from "./ProcessPanel.module.css";
const shared = { ...entry, ...frame };
const styles = { ...shared, ...local };

/** 기간 일수(양 끝 포함). 날짜가 없으면 1 */
const spanDays = (p: ProcessStep) =>
  p.start && p.end ? Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86_400_000) + 1 : 1;
/** 2026-02-05 → 2026.02.05 */
const fmtDate = (d: string) => d.replaceAll("-", ".");

/** 커밋 종류 이름 — conventional commit 접두어를 묶은 여섯 갈래 */
const MIX_LABEL: Record<string, Record<Language, string>> = {
  feat: { ko: "기능", en: "Feature" },
  fix: { ko: "수정", en: "Fix" },
  design: { ko: "디자인", en: "Design" },
  refactor: { ko: "리팩터", en: "Refactor" },
  perf: { ko: "성능", en: "Perf" },
  etc: { ko: "기타", en: "Other" },
};

/** Collapsed row height for mobile accordion layout (px) */
const COLLAPSED_HEIGHT = 36;

interface ProcessPanelProps {
  language: Language;
  process: ProcessStep[];
  scrollBy?: (deltaX: number) => void;
}


function ProcessPanel({ language, process: fallbackProcess, scrollBy }: ProcessPanelProps) {
  const about = useAboutConfig();
  const cfgList = about.process;
  /* 사이트 설정에 목록이 있으면 그걸 쓰고, 없으면 props 로 받은 기본값. props 자체를
     덮어쓰지 않는다 — 부모가 준 값이라 이 컴포넌트가 고칠 것이 아니다. */
  const process = cfgList && cfgList.length > 0 ? adaptProcess(cfgList) : fallbackProcess;
  const isMobile = useMobileLayout();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  /* 타임라인 — 모든 단계에 기간이 있으면 막대 길이를 실제 일수로 나누고, 막대 높이는 하루 평균 커밋(가장 바쁜 단계 = 1) */
  const timed = process.length > 0 && process.every((p) => p.start && p.end);
  const maxRate = useMemo(
    () => Math.max(0, ...process.map((p) => (p.commits != null ? p.commits / spanDays(p) : 0))),
    [process],
  );
  // 주별 막대 높이의 기준 — 모든 단계를 통틀어 가장 바쁜 주(단계끼리 높이를 견줄 수 있게)
  const maxWeek = useMemo(() => Math.max(0, ...process.flatMap((p) => p.weekly ?? [])), [process]);
  const summary = useMemo(() => {
    if (!timed) return null;
    const start = process[0].start!;
    const end = process[process.length - 1].end!;
    return {
      start, end,
      days: Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1,
      commits: process.reduce((n, p) => n + (p.commits ?? 0), 0),
      prs: process.reduce((n, p) => n + (p.prs ?? 0), 0),
    };
  }, [process, timed]);

  /* 간트 축의 달 눈금 — 전체 기간 안의 매달 1일 자리(0 → 1) */
  const months = useMemo(() => {
    if (!summary) return [];
    const t0 = Date.parse(summary.start);
    const total = summary.days * 86_400_000;
    const out: { label: string; at: number }[] = [];
    const d = new Date(summary.start);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    while (d.getTime() <= Date.parse(summary.end)) {
      out.push({ label: String(d.getUTCMonth() + 1).padStart(2, "0"), at: (d.getTime() - t0) / total });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }, [summary]);

  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    process.length,
    undefined,
    scrollBy,
  );

  const active = process[activeIndex];

  // 모바일/태블릿: 아코디언 레이아웃
  const stepListRef = useRef<HTMLDivElement>(null);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);

  const handleMobileIndexChange = useCallback((activeIdx: number) => {
    setMobileActiveIdx(activeIdx);
    const stepList = stepListRef.current;
    if (!stepList) return;

    const rows = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepRow}`),
    );
    const contents = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepContent}`),
    );
    const total = rows.length;
    const listHeight = stepList.offsetHeight;
    const activeHeight = listHeight - COLLAPSED_HEIGHT * (total - 1);

    rows.forEach((row, i) => {
      if (i === activeIdx) {
        row.style.height = `${activeHeight}px`;
        row.style.opacity = "1";
      } else {
        row.style.height = `${COLLAPSED_HEIGHT}px`;
        row.style.opacity = "0.5";
      }
    });
    contents.forEach((el, i) => {
      el.style.opacity = i === activeIdx ? "1" : "0";
    });
  }, []);

  // 모바일: 초기 레이아웃 설정
  useLayoutEffect(() => {
    if (!isMobile) return;
    handleMobileIndexChange(0);
  }, [isMobile, handleMobileIndexChange]);

  // 모바일: GSAP ScrollTrigger 고정 스크롤
  const mobileStRef = useMobilePinScroll(
    contentRef, process.length, 500, handleMobileIndexChange,
  );

  // 행 클릭 → 해당 위치로 스크롤 (데스크톱은 훅, 모바일은 ScrollTrigger)
  const handleRowClick = useCallback(
    (index: number) => {
      if (isMobile) {
        const handle = mobileStRef.current;
        const st = handle?.scrollTrigger;
        if (!st) return;
        const targetProgress = (index + 0.5) / process.length;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
        handle?.syncIndex(index);
      } else {
        scrollToItem(index);
      }
    },
    [process.length, scrollToItem, mobileStRef, isMobile],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.procPanel}`}>
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        {/* 타이틀 행 */}
        <PinnedTitleRow panelKey="process" className={isMobile ? styles.procTitleRow : undefined} />

        {/* 데스크톱: 위에 지금 단계의 상세, 아래에 실제 기간만큼 길이를 나눈 타임라인. 스크롤이 타임라인 위의
            재생 위치처럼 지금 단계 막대를 채우며 지나간다 */}
        {active && (
          <div className={styles.procStage}>
            <article className={styles.procDetail} key={activeIndex}>
              <span className={styles.procDetailNum}>{active.step}</span>
              <div className={styles.procDetailMain}>
                {active.start && active.end && (
                  <p className={styles.procDetailPeriod}>
                    {fmtDate(active.start)} — {fmtDate(active.end)} · {spanDays(active)}{L("일", " days")}
                    {active.commits != null && ` · ${L("커밋", "commits")} ${active.commits.toLocaleString()}`}
                    {active.prs != null && ` · PR ${active.prs.toLocaleString()}`}
                  </p>
                )}
                <h4 className={styles.procDetailTitle}>{active.title[language]}</h4>
              </div>
              {/* 설명은 번호 아래까지 칸 폭 전체 — 영문처럼 긴 글이 좁은 칸에서 아래로 넘치지 않게 */}
              <p className={styles.procDetailDesc}>{renderHighlight(active.description[language])}</p>
            </article>

            {/* 간트 — 단계마다 한 줄, 막대는 공통 달력 축 위에 실제 시작·끝 자리에 놓인다.
                아래 내비의 가로 레일과 겹치지 않게 세로로 쌓는다 */}
            {/* 오른쪽 — 사실 줄(대표 수치·차트) 위, 간트 아래. 왼쪽은 글만 둬서 긴 설명(영문 등)이 차트와 겹치지 않는다 */}
            <div className={styles.procSide}>
              {/* 사실 줄 — 대표 수치 · 주별 커밋 · 커밋 종류. 없으면(예전 형식) 커밋·PR 수만 */}
              {active.metric || active.weekly?.length || active.mix?.length ? (
                <div className={styles.procFacts}>
                  {/* 대표 수치 — 이 단계에서 가장 내세울 결과 하나 */}
                  {active.metric && (
                    <div className={styles.procMetric}>
                      <span className={styles.procMetricValue}>{active.metric}</span>
                      <span className={styles.procMetricLabel}>{active.metricLabel?.[language]}</span>
                    </div>
                  )}

                  {/* 주별 커밋 · 커밋 종류 — git 이력에서 센 값 */}
                  {(active.weekly?.length || active.mix?.length) ? (
                    <>
                      {active.weekly && active.weekly.length > 0 && (
                        <figure className={styles.procWeekly}>
                          <div className={styles.procWeeklyBars} style={{ "--n": active.weekly.length } as React.CSSProperties}>
                            {active.weekly.map((n, w) => (
                              <span
                                key={w}
                                className={styles.procWeeklyBar}
                                style={{ "--i": w, "--h": (maxWeek > 0 ? n / maxWeek : 0).toFixed(3) } as React.CSSProperties}
                                title={`${L(`${w + 1}주차`, `Week ${w + 1}`)} · ${n}`}
                              />
                            ))}
                          </div>
                          <figcaption>
                            {L("주별 커밋", "Commits per week")}
                            {active.commits != null && spanDays(active) > 1 && ` · ${L("하루", "")} ${(active.commits / spanDays(active)).toFixed(1)}${L("", "/day")}`}
                          </figcaption>
                        </figure>
                      )}
                      {active.mix && active.mix.length > 0 && (
                        <figure className={styles.procMix}>
                          <div className={styles.procMixBar}>
                            {active.mix.map((m) => (
                              <span key={m.kind} className={styles.procMixSeg} data-kind={m.kind} style={{ flexGrow: m.count }} />
                            ))}
                          </div>
                          <ul className={styles.procMixLegend}>
                            {active.mix.map((m) => (
                              <li key={m.kind} data-kind={m.kind}>
                                <span>{MIX_LABEL[m.kind]?.[language] ?? m.kind}</span>
                                <b>{m.count}</b>
                              </li>
                            ))}
                          </ul>
                          <figcaption>{L("커밋 종류", "Commit types")}</figcaption>
                        </figure>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                (active.commits != null || active.prs != null) && (
                  <dl className={styles.procDetailStats}>
                    {active.commits != null && (
                      <div><dd>{active.commits.toLocaleString()}</dd><dt>{L("커밋", "Commits")}</dt></div>
                    )}
                    {active.prs != null && (
                      <div><dd>{active.prs.toLocaleString()}</dd><dt>{L("병합 PR", "Merged PRs")}</dt></div>
                    )}
                    {active.commits != null && spanDays(active) > 1 && (
                      <div><dd>{(active.commits / spanDays(active)).toFixed(1)}</dd><dt>{L("하루 평균 커밋", "Commits / day")}</dt></div>
                    )}
                  </dl>
                )
              )}
            {/* 기간이 없는 단계가 섞여 있으면(예전 형식) 축과 막대 없이 단계 목록만 */}
            <div className={`${styles.procGantt} ${summary ? "" : styles.procGanttPlain}`}>
                {summary && (
                  <div className={styles.procGanttAxis} aria-hidden>
                    {months.map((m) => (
                      <span key={m.label} style={{ left: `${m.at * 100}%` }}>{m.label}</span>
                    ))}
                  </div>
                )}
                <ol className={styles.procGanttRows}>
                  {process.map((p, i) => {
                    const isActive = i === activeIndex;
                    const rate = maxRate > 0 && p.commits != null ? p.commits / spanDays(p) / maxRate : 0.3;
                    const from = summary ? (Date.parse(p.start!) - Date.parse(summary.start)) / 86_400_000 / summary.days : 0;
                    const width = summary ? spanDays(p) / summary.days : 0;
                    return (
                      <li
                        key={i}
                        className={`${styles.procGanttRow} ${isActive ? styles.procGanttRowActive : ""} ${i < activeIndex ? styles.procGanttRowDone : ""}`}
                      >
                        <Pressable
                          data-clickable="true"
                          className={styles.procGanttBtn}
                          onClick={() => handleRowClick(i)}
                          aria-current={isActive ? "step" : undefined}
                        >
                          <span className={styles.procGanttNum}>{p.step}</span>
                          <span className={styles.procGanttTitle}>{p.title[language]}</span>
                          {summary && (
                            <span className={styles.procGanttTrack} aria-hidden>
                              <span
                                className={styles.procGanttBar}
                                style={{ left: `${from * 100}%`, width: `${width * 100}%`, "--rate": rate.toFixed(3) } as React.CSSProperties}
                              />
                            </span>
                          )}
                        </Pressable>
                      </li>
                    );
                  })}
                </ol>
                {summary && (
                  <p className={styles.procSummary}>
                    {fmtDate(summary.start)} — {fmtDate(summary.end)} · {summary.days}{L("일", " days")} · {L("커밋", "commits")} {summary.commits.toLocaleString()} · PR {summary.prs.toLocaleString()}
                  </p>
                )}
            </div>
            </div>
          </div>
        )}

        {/* 모바일: 아코디언 스텝 행 — 활성은 확장, 나머지는 축소 */}
        <div ref={stepListRef} className={styles.processStepList}>
          {process.map((p, i) => {
            const isDone = i < mobileActiveIdx;
            const isActive = i === mobileActiveIdx;
            return (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.processStepRow} ${
                  isActive ? styles.processStepRowActive : ""
                }`}
                onClick={() => handleRowClick(i)}
              >
                {/* 왼쪽: 연속 연결선 + 점 */}
                <div className={styles.processStepConnector}>
                  <div
                    className={`${styles.processConnectorDot} ${
                      isDone
                        ? styles.processConnectorDotDone
                        : isActive
                          ? styles.processConnectorDotActive
                          : ""
                    }`}
                  />
                  {i < process.length - 1 && (
                    <div
                      className={`${styles.processConnectorLine} ${
                        isDone ? styles.processConnectorLineDone : ""
                      }`}
                    />
                  )}
                </div>

                {/* 오른쪽: 축소 = 스텝 라벨만, 확장 = 전체 콘텐츠 */}
                <span className={styles.processStepLabel}>
                  {p.step}. {p.title[language]}
                </span>
                <div className={styles.processStepContent}>
                  <div className={styles.processStepHeader}>
                    <span className={styles.processStepNum}>{p.step}</span>
                    <h4 className={styles.processStepContentTitle}>
                      {p.title[language]}
                    </h4>
                  </div>
                  {p.start && p.end && (
                    <p className={styles.processStepPeriod}>
                      {fmtDate(p.start)} — {fmtDate(p.end)}
                      {p.commits != null && ` · ${L("커밋", "commits")} ${p.commits.toLocaleString()}`}
                    </p>
                  )}
                  <p className={styles.processStepContentDesc}>
                    {renderHighlight(p.description[language])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(ProcessPanel);
