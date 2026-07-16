"use client";

// ── 월/주/일/타임라인 공통 이벤트 사이드바 — 날짜별 목록 + 연결된 이벤트는 인라인으로 펼쳐 연결 노드 확인 ──
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import HelpButton from "@/components/ui/HelpButton";
import Button from "@/components/ui/Button";
import { PanelLeftClose, ArrowDownWideNarrow, ArrowUpNarrowWide, Link2, ChevronDown, Star } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import Popover from "@/components/ui/Popover";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventEndDate, eventTimeLabel, statusName, priorityOf, priorityName, connectedComponent } from "./model";
import { formatDateValue, toDateStr } from "../dateUtils";
import styles from "./Calendar.module.css";

type Filter = "all" | "past" | "current" | "upcoming";

// 좌측 dot 이 상태를 채움 정도로 표현 — 예정=빈원 / 진행=반채움 / 완료=체크 / 중단=채움 (색은 라벨색)
const STATUS_DOT: Record<string, string> = { todo: styles.evItemDotTodo, doing: styles.evItemDotDoing, done: styles.evItemDotDone, hold: styles.evItemDotHold };

export default function CalendarEventList({
  events, labels, language, onEventGoto, onClose, timeFormat = "12h",
}: {
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  /** 사이드바 이벤트 클릭 → 현재 뷰를 그 이벤트 위치로 이동 */
  onEventGoto?: (ev: CalEvent) => void;
  onClose: () => void;
  timeFormat?: TimeFormat;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc"); // 기본 최신순
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const today = toDateStr(new Date());
  const byDate = (a: CalEvent, b: CalEvent) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99"));

  // 연결된 작업(의존성 컴포넌트, 2개 이상) — 이벤트id → 체인 멤버(날짜순)
  const chainByEvent = React.useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const visited = new Set<string>();
    for (const e of events) {
      if (visited.has(e.id)) continue;
      const comp = connectedComponent(e.id, events);
      comp.forEach((id) => visited.add(id));
      const members = events.filter((ev) => comp.has(ev.id)).sort(byDate);
      if (members.length >= 2) members.forEach((m) => map.set(m.id, members));
    }
    return map;
  }, [events]);

  const groups = React.useMemo(() => {
    const arr = events.filter((ev) => {
      if (filter === "past") return eventEndDate(ev) < today;
      if (filter === "current") return ev.date <= today && eventEndDate(ev) >= today;
      if (filter === "upcoming") return ev.date > today;
      return true;
    });
    const sorted = [...arr].sort(byDate);
    const ordered = sortDir === "desc" ? sorted.reverse() : sorted;
    const map = new Map<string, CalEvent[]>();
    for (const ev of ordered) { if (!map.has(ev.date)) map.set(ev.date, []); map.get(ev.date)!.push(ev); }
    return [...map.entries()];
  }, [events, filter, today, sortDir]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: t("전체", "All") },
    { key: "past", label: t("이전", "Past") },
    { key: "current", label: t("현재", "Now") },
    { key: "upcoming", label: t("예정", "Upcoming") },
  ];

  const eventBtn = (ev: CalEvent, withDot = true) => {
    const pr = priorityOf(ev.priority);
    return (
      <button
        type="button"
        className={`${styles.evItem}${ev.status === "done" ? ` ${styles.evItemDone}` : ""}`}
        style={{ ["--_c" as string]: eventColorVar(ev, labels) }}
        onClick={() => onEventGoto?.(ev)}
        title={ev.title}
      >
        {withDot && (ev.status ? (
          <Tooltip content={`${t("상태", "Status")}: ${statusName(ev.status, language)}`} placement="top">
            <span className={`${styles.evItemDot} ${STATUS_DOT[ev.status]}`} aria-label={statusName(ev.status, language)} />
          </Tooltip>
        ) : (
          <span className={styles.evItemDot} />
        ))}
        <span className={styles.evItemTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
        {ev.time && <span className={styles.evItemTime}>{eventTimeLabel(ev, timeFormat)}</span>}
        {pr && (
          <Tooltip content={`${t("중요도", "Priority")}: ${priorityName(ev.priority, language)}`} placement="top">
            <span className={styles.evItemStar} style={{ ["--_sc" as string]: pr.color }} aria-label={priorityName(ev.priority, language)}>
              {ev.priority === "high" ? <Star size={13} fill="currentColor" strokeWidth={1.75} aria-hidden />
                : ev.priority === "normal" ? (
                  <span className={styles.evStarHalf}>
                    <Star size={13} strokeWidth={1.75} aria-hidden />
                    <Star size={13} fill="currentColor" strokeWidth={1.75} aria-hidden className={styles.evStarHalfFill} />
                  </span>
                )
                : <Star size={13} strokeWidth={1.75} aria-hidden />}
            </span>
          </Tooltip>
        )}
      </button>
    );
  };

  return (
    <aside className={styles.evSidebar} contentEditable={false}>
      <div className={styles.evSidebarHead}>
        <span className={styles.evSidebarTitle}>{t("이벤트", "Events")}</span>
        <span className={styles.evSidebarActions}>
          <Tooltip content={sortDir === "desc" ? t("최신순", "Newest first") : t("오래된순", "Oldest first")} placement="top">
            <Button
              variant="ghost" shape="circle" size="sm" soundDisabled
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              aria-label={t("정렬 전환", "Toggle sort")}
              icon={sortDir === "desc" ? <ArrowDownWideNarrow size={15} /> : <ArrowUpNarrowWide size={15} />}
            />
          </Tooltip>
          <Tooltip content={t("목록 닫기", "Close list")} placement="top">
            <Button
              variant="ghost" shape="circle" size="sm" soundDisabled
              onClick={onClose}
              aria-label={t("목록 닫기", "Close list")}
              icon={<PanelLeftClose size={15} />}
            />
          </Tooltip>
        </span>
      </div>
      {/* 필터 + 도움말 — 도움말은 SegmentedControl 오른쪽 끝.
          범례(상태·중요도 색/별)가 설명하는 대상이 바로 이 필터와 아래 목록이라, 헤더의
          조작 버튼(정렬·닫기) 틈이 아니라 설명 대상 옆에 두는 게 맞다. */}
      <div className={styles.evFilters}>
        <SegmentedControl<Filter>
          variant="subtle"
          items={chips.map((c) => ({ value: c.key, label: c.label }))}
          value={filter}
          onChange={setFilter}
          size="sm"
        />
        <Popover
          className={styles.evFiltersHelp}
          placement="bottom-end"
          offset={6}
          trigger={
            <Tooltip content={t("도움말", "Help")} placement="top">
              {/* 사이트 전역 도움말 규격(공통 HelpButton — subtle circle "?") */}
              <HelpButton size="sm" soundDisabled aria-label={t("도움말", "Help")} />
            </Tooltip>
          }
        >
          {() => (
            <div className={styles.evHelp}>
              <div className={styles.evHelpGroup}>
                <span className={styles.evHelpTitle}>{t("상태", "Status")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={`${styles.evItemDot} ${styles.evItemDotTodo} ${styles.evHelpDot}`} /></span>{t("예정", "To-do")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={`${styles.evItemDot} ${styles.evItemDotDoing} ${styles.evHelpDot}`} /></span>{t("진행 중", "In progress")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={`${styles.evItemDot} ${styles.evItemDotDone} ${styles.evHelpDot}`} /></span>{t("완료", "Done")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={`${styles.evItemDot} ${styles.evItemDotHold} ${styles.evHelpDot}`} /></span>{t("중단", "On hold")}</span>
              </div>
              <div className={styles.evHelpGroup}>
                <span className={styles.evHelpTitle}>{t("중요도", "Priority")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={styles.evHelpStar}><Star size={13} strokeWidth={1.75} /></span></span>{t("낮음", "Low")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={`${styles.evHelpStar} ${styles.evStarHalf}`}><Star size={13} strokeWidth={1.75} /><Star size={13} fill="currentColor" strokeWidth={1.75} className={styles.evStarHalfFill} /></span></span>{t("보통", "Normal")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><span className={styles.evHelpStar}><Star size={13} fill="currentColor" strokeWidth={1.75} /></span></span>{t("높음", "High")}</span>
              </div>
              <div className={styles.evHelpGroup}>
                {/* 앞 두 그룹과 같은 결로 제목을 붙인다 — 여기만 없으면 마지막 줄이 떠 보인다 */}
                <span className={styles.evHelpTitle}>{t("연결", "Links")}</span>
                <span className={styles.evHelpRow}><span className={styles.evHelpIcon}><Link2 size={13} className={styles.evHelpLink} /></span>{t("연결된 작업 · 눌러서 펼치기", "Connected tasks · click to expand")}</span>
              </div>
            </div>
          )}
        </Popover>
      </div>
      <div className={styles.evList} data-lenis-prevent>
        {groups.length === 0 ? (
          <div className={styles.evEmpty}>{t("이벤트가 없습니다", "No events")}</div>
        ) : (
          groups.map(([date, evs]) => (
            <div key={date} className={`${styles.evGroup}${date === today ? ` ${styles.evGroupToday}` : ""}`}>
              <div className={styles.evDate}>
                {formatDateValue(date, null, language)}
                {date === today && <span className={styles.evTodayTag}>{t("오늘", "Today")}</span>}
              </div>
              {evs.map((ev) => {
                const chain = chainByEvent.get(ev.id);
                const expanded = expandedId === ev.id;
                return (
                  <div key={ev.id} className={styles.evRow}>
                    <div className={styles.evRowMain}>
                      {eventBtn(ev)}
                      {chain && (
                        <Tooltip content={t("연결된 작업", "Connected tasks")} placement="top">
                          <button
                            type="button"
                            className={`${styles.evLinkToggle}${expanded ? ` ${styles.evLinkToggleOn}` : ""}`}
                            onClick={() => setExpandedId((x) => (x === ev.id ? null : ev.id))}
                            aria-label={t("연결된 작업 펼치기", "Expand connected tasks")}
                          >
                            <Link2 size={12} />
                            <span className={styles.evLinkCount}>{chain.length}</span>
                            <ChevronDown size={12} className={`${styles.evLinkChevron}${expanded ? ` ${styles.evLinkChevronOn}` : ""}`} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {chain && expanded && (
                        <motion.div
                          className={styles.evChainCollapse}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className={styles.evChainExpand}>
                            {chain.map((m) => (
                              <div key={m.id} className={`${styles.evChainRow}${m.status === "done" ? ` ${styles.evChainRowDone}` : ""}${m.id === ev.id ? ` ${styles.evChainRowCurrent}` : ""}`} style={{ ["--_c" as string]: eventColorVar(m, labels) }}>
                                <span className={styles.evChainRail} aria-hidden><span className={styles.evChainNode} /></span>
                                {eventBtn(m, false)}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
