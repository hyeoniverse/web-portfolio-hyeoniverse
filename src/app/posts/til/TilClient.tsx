"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import TransitionLink from "@/components/ui/TransitionLink";
import { PostArticleBody } from "@/components/posts/PostArticleView";
import PageTitle from "@/components/ui/PageTitle";
import Pressable from "@/components/ui/Pressable";
import { SITE_TIME_ZONE } from "@/constants";
import type { TilEntry } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import PostsSubnav from "../_components/PostsSubnav";
import index from "../_components/IndexPage.module.css";
import styles from "./Til.module.css";
import { CONSTELLATIONS } from "./constellations";
import { ConstellationArt, ConstellationStrip, isComplete, monthDays } from "./TilConstellation";

/** 한국 시간 기준 YYYY-MM-DD — 서버(UTC)와 브라우저가 같은 날로 묶도록 시간대를 고정한다 */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });
/** YYYY-MM-DD 문자열의 하루 뒤/앞 — 연속 기록(streak) 계산용. 정오로 잡아 서머타임 경계를 피한다 */
const shiftDay = (key: string, delta: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

const MASCOT = "/images/mascot/bunny-";
/** 커밋 해시처럼 보이는 7자리 — 글 id 로 정해져 늘 같다 */
const shortHash = (id: string) => {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
};
/** 피드에 한 번에 보이는 날 수 — 더 보기로 늘린다 */
const PAGE_DAYS = 14;

/** 3D 몽이 — three 묶음이 커서 브라우저에서만 따로 싣는다 */
const TilMong3D = dynamic(() => import("./TilMong3D"), { ssr: false });

/** 몽이 — 표정 · 방향별 PNG. 장식이라 alt 를 비운다 */
function Mong({ pose, size, className }: { pose: string; size: number; className?: string }) {
  return (
    <Image
      src={`${MASCOT}${pose}.png`}
      alt=""
      width={size}
      height={Math.round(size * 1.6)}
      className={`${styles.mong} ${className ?? ""}`}
      aria-hidden
    />
  );
}

/* TIL 페이지 — [연도 탭] · 1년 잔디(주 단위 열 × 요일 7행) · 아래에 [기록 피드 | 따라오는 몽이 · 고정 TIL].
   글 수에 따라 칸이 진해지고, 칸을 누르면 피드가 그날로 좁혀진다. 몽이가 상황마다 표정을 바꿔 맞이한다. */
export default function TilClient({ tag, entries }: { tag: string; entries: TilEntry[] }) {
  const { t, language, dateLocale } = useLanguage();
  const lang = language === "en" ? "en" : "ko";
  const titleOf = (e: TilEntry) => (lang === "en" && e.title_en) || e.title;
  const excerptOf = (e: TilEntry) => (lang === "en" && e.excerpt_en) || e.excerpt;
  const contentOf = (e: TilEntry) => (lang === "en" && e.content_en) || e.content;

  const byDay = useMemo(() => {
    const map = new Map<string, TilEntry[]>();
    for (const e of entries) {
      const key = dayKey(new Date(e.created_at));
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [entries]);

  const today = dayKey(new Date());
  const thisYear = Number(today.slice(0, 4));
  const years = useMemo(() => {
    const set = new Set<number>([thisYear]);
    for (const key of byDay.keys()) set.add(Number(key.slice(0, 4)));
    return [...set].sort((a, b) => b - a);
  }, [byDay, thisYear]);
  const [year, setYear] = useState(years[0]);
  const [selected, setSelected] = useState<string | null>(null);
  // 날을 고를 때마다 3D 몽이가 정면으로 돌아본다
  const [snap, setSnap] = useState(0);
  const pick = (key: string | null) => {
    setSelected(key);
    setSnap((n) => n + 1);
  };

  // 잔디 격자 — 1월 1일이 든 주의 일요일부터 12월 31일이 든 주까지. 열 = 주, 행 = 요일
  const weeks = useMemo(() => {
    const start = shiftDay(`${year}-01-01`, -new Date(`${year}-01-01T12:00:00Z`).getUTCDay());
    const out: (string | null)[][] = [];
    for (let key = start; key <= `${year}-12-31`; key = shiftDay(key, 7)) {
      out.push(Array.from({ length: 7 }, (_, i) => {
        const k = shiftDay(key, i);
        return k.startsWith(`${year}-`) ? k : null;
      }));
    }
    return out;
  }, [year]);
  // 월 이름 — 그 달 1일이 든 주(열) 위에 단다
  const monthLabels = weeks.map((week) => {
    const first = week.find((k) => k?.endsWith("-01"));
    return first ? new Date(`${first}T12:00:00Z`).toLocaleDateString(dateLocale, { month: "short", timeZone: "UTC" }) : "";
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    i % 2 === 1 ? new Date(Date.UTC(2024, 0, 7 + i, 12)).toLocaleDateString(dateLocale, { weekday: "short", timeZone: "UTC" }) : "",
  );

  // 좁은 화면에서 잔디가 가로로 넘치면 올해는 오늘 근처를, 지난해는 연말을 보여 준다(최근 기록이 먼저 보이게)
  const grassRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = grassRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const col = year === thisYear ? weeks.findIndex((w) => w.includes(today)) : weeks.length - 1;
    const ratio = (col + 1) / weeks.length;
    el.scrollLeft = Math.max(0, el.scrollWidth * ratio - el.clientWidth * 0.75);
  }, [year, thisYear, today, weeks]);

  // 보는 달 — 올해면 이번 달, 지난해면 12월부터. 고른 달의 별자리를 크게 보고 피드도 그달로 좁힌다
  const thisMonth = Number(today.slice(5, 7)) - 1;
  const [month, setMonth] = useState(thisMonth);
  // 잔디 칸을 고르면 그날로 좁히고, 별자리도 그달로 바꾼다
  const pickDay = (key: string | null) => {
    if (key) setMonth(Number(key.slice(5, 7)) - 1);
    pick(key);
  };
  const changeYear = (y: number) => {
    setYear(y);
    setMonth(y === thisYear ? thisMonth : 11);
    pick(null);
    setShown(PAGE_DAYS);
  };
  const monthName = (m: number) =>
    new Date(Date.UTC(2024, m, 1, 12)).toLocaleDateString(dateLocale, { month: "short", timeZone: "UTC" });
  const constellation = CONSTELLATIONS[month];
  const litDays = monthDays(byDay, year, month);
  const lit = Math.min(litDays.length, constellation.stars.length);
  const complete = lit >= constellation.stars.length;
  const doneCount = CONSTELLATIONS.filter((c, m) => isComplete(c, monthDays(byDay, year, m))).length;

  // 숫자 — 올해 기록 수 · 지금 이어지는 날 수 · 가장 길게 이어진 날 수
  const yearCount = [...byDay.entries()].filter(([k]) => k.startsWith(`${year}-`)).reduce((n, [, v]) => n + v.length, 0);
  const { current, longest } = useMemo(() => {
    const days = [...byDay.keys()].sort();
    let best = 0;
    let run = 0;
    let prev = "";
    for (const d of days) {
      run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    let cur = 0;
    // 오늘 아직 안 썼으면 어제부터 센다 — 하루가 끝나기 전엔 끊긴 게 아니다
    let cursor = byDay.has(today) ? today : shiftDay(today, -1);
    while (byDay.has(cursor)) {
      cur++;
      cursor = shiftDay(cursor, -1);
    }
    return { current: cur, longest: best };
  }, [byDay, today]);

  const pinned = entries.filter((e) => e.is_pinned);
  // 피드 — 고른 날이 있으면 그날만, 없으면 보는 달의 모든 날(최신순)
  const feedDays = useMemo(
    () =>
      selected
        ? [[selected, byDay.get(selected) ?? []] as const].filter(([, l]) => l.length > 0)
        : [...byDay.entries()]
            .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`))
            .sort(([a], [b]) => (a < b ? 1 : -1)),
    [byDay, selected, year, month],
  );
  const [shown, setShown] = useState(PAGE_DAYS);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedEntries = selected ? byDay.get(selected) ?? [] : [];
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3);
  const formatDay = (key: string) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "UTC" });

  return (
    <div className={index.container}>
      <PostsSubnav />
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <PageTitle>TIL.</PageTitle>
          <p className={styles.subtitle}>{t("tilPage.subtitle")}</p>
          <p className={styles.hint}>{fillTemplate(t("tilPage.tagHint"), { tag })}</p>
        </div>
        <Mong pose="wave-front" size={96} className={styles.heroMong} />
      </header>

      <div className={styles.toolbar}>
        <div className={styles.years} role="tablist" aria-label={t("tilPage.yearTabs")}>
          {years.map((y) => (
            <Pressable
              key={y}
              noTapScale
              role="tab"
              aria-selected={y === year}
              className={`${styles.yearTab} ${y === year ? styles.yearTabActive : ""}`}
              onClick={() => changeYear(y)}
            >
              {y}
            </Pressable>
          ))}
        </div>
        <dl className={styles.stats}>
          <div className={styles.stat}><dt>{t("tilPage.statYear")}</dt><dd>{yearCount}</dd></div>
          <div className={styles.stat}><dt>{t("tilPage.statDone")}</dt><dd>{doneCount}/12</dd></div>
          <div className={styles.stat}><dt>{t("tilPage.statStreak")}</dt><dd>{current}</dd></div>
          <div className={styles.stat}><dt>{t("tilPage.statLongest")}</dt><dd>{longest}</dd></div>
        </dl>
      </div>

      {/* 잔디 — 좁은 화면에선 가로로 스크롤된다 */}
      <div ref={grassRef} className={styles.grassScroll}>
        <div className={styles.grass} style={{ ["--til-weeks" as string]: weeks.length }}>
          <span />
          {monthLabels.map((m, i) => (
            <span key={`m${i}`} className={styles.monthLabel}>{m}</span>
          ))}
          {Array.from({ length: 7 }, (_, row) => (
            <div key={`r${row}`} className={styles.grassRow}>
              <span className={styles.weekdayLabel}>{weekdayLabels[row]}</span>
              {weeks.map((week, col) => {
                const key = week[row];
                if (!key) return <span key={col} className={styles.cellEmpty} />;
                const list = byDay.get(key) ?? [];
                const label = list.length ? `${key} - ${list.map(titleOf).join(", ")}` : key;
                return (
                  <Pressable
                    key={col}
                    noTapScale
                    className={[
                      styles.cell,
                      styles[`lv${level(list.length)}`],
                      key === today && styles.cellToday,
                      key === selected && styles.cellSelected,
                    ].filter(Boolean).join(" ")}
                    title={label}
                    aria-label={label}
                    aria-pressed={key === selected}
                    onClick={() => pickDay(key === selected ? null : key)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend} aria-hidden>
        <span>{t("tilPage.less")}</span>
        {[0, 1, 2, 3].map((lv) => <span key={lv} className={`${styles.cell} ${styles[`lv${lv}`]}`} />)}
        <span>{t("tilPage.more")}</span>
      </div>

      {/* 이달의 별자리 — TIL 을 쓴 날마다 별이 하나씩 켜지고, 다 켜면 별자리 완성 */}
      <section className={`${styles.sky} ${complete ? styles.skyDone : ""}`}>
        <div className={styles.skyInfo}>
        <div className={styles.skyHead}>
          <h2 className={styles.skyTitle}>
            <span className={styles.skyMonth}>{year}.{String(month + 1).padStart(2, "0")}</span>
            {lang === "en" ? constellation.en : constellation.ko}
            {lang !== "en" && <span className={styles.skyLatin}>{constellation.en}</span>}
          </h2>
          <p className={styles.skyProgress}>
            {complete ? (
              <strong className={styles.skyComplete}>✦ {t("tilPage.complete")}</strong>
            ) : (
              fillTemplate(t("tilPage.starsLeft"), { n: constellation.stars.length - lit })
            )}
            <span className={styles.skyCount}>{lit} / {constellation.stars.length}</span>
          </p>
        </div>
        <div className={styles.skyBar} aria-hidden>
          <span style={{ width: `${(lit / constellation.stars.length) * 100}%` }} />
        </div>
        {/* 열두 달 별자리 모음 — 완성한 달이 빛난다. 누르면 그달을 크게 */}
        <ConstellationStrip
          year={year}
          byDay={byDay}
          month={month}
          onMonth={(m) => { setMonth(m); pick(null); setShown(PAGE_DAYS); }}
          monthLabel={monthName}
        />
        </div>
        <div className={styles.skyArt}>
          <ConstellationArt
            c={constellation}
            days={litDays}
            big
            selected={selected}
            onPick={(d) => pickDay(d === selected ? null : d)}
            labelOf={(d) => `${formatDay(d)} - ${(byDay.get(d) ?? []).map(titleOf).join(", ")}`}
          />
        </div>
      </section>


      <div className={styles.body}>
        {/* 기록 피드 — git log 처럼 날짜별로 이어진다. 잔디 칸을 고르면 그날로 좁혀지고, 글은 그 자리에서 펼쳐 읽는다 */}
        <section className={styles.feed} aria-live="polite">
          <div className={styles.feedHead}>
            <h2 className={styles.feedTitle}><b>$</b> git log --til</h2>
            {selected && (
              <Pressable noTapScale className={styles.feedFilter} onClick={() => pick(null)}>
                {formatDay(selected)} · {t("tilPage.showAll")} ×
              </Pressable>
            )}
          </div>
          {feedDays.length === 0 ? (
            <p className={styles.feedEmpty}>{selected ? t("tilPage.restDay") : t("tilPage.emptyYear")}</p>
          ) : (
            <ol className={styles.log}>
              {feedDays.slice(0, shown).map(([key, list]) => (
                <li key={key} className={styles.logDay}>
                  <Pressable noTapScale className={styles.logDate} onClick={() => pick(key === selected ? null : key)}>
                    <span className={styles.logDot} aria-hidden />
                    <time dateTime={key}>{key.replaceAll("-", ".")}</time>
                    <span className={styles.logCount}>{fillTemplate(t("tilPage.dayCount"), { n: list.length })}</span>
                  </Pressable>
                  <ul className={styles.logEntries}>
                    {list.map((e) => {
                      const open = expanded.has(e.id) || !!selected;
                      return (
                        <li key={e.id} className={styles.logEntry}>
                          <Pressable noTapScale className={styles.logEntryHead} aria-expanded={open} onClick={() => toggle(e.id)}>
                            <span className={styles.logHash} aria-hidden>{shortHash(e.id)}</span>
                            <strong className={styles.entryTitle}>{titleOf(e)}</strong>
                            <span className={styles.logChevron} aria-hidden>{open ? "−" : "+"}</span>
                          </Pressable>
                          {!open && excerptOf(e) && <p className={styles.entryExcerpt}>{excerptOf(e)}</p>}
                          {open && (
                            <div className={styles.entryBody}>
                              {contentOf(e) ? (
                                <PostArticleBody
                                  data={{
                                    displayTitle: titleOf(e),
                                    displayContent: contentOf(e),
                                    displayExcerpt: excerptOf(e),
                                    contentType: e.content_type,
                                    tags: e.tags,
                                    viewCount: 0,
                                    createdAt: e.created_at,
                                  }}
                                />
                              ) : (
                                excerptOf(e) && <p className={styles.entryExcerpt}>{excerptOf(e)}</p>
                              )}
                              <TransitionLink href={`/posts/${e.slug}`} className={styles.entryMore}>
                                {t("tilPage.openPost")} →
                              </TransitionLink>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
          {feedDays.length > shown && (
            <Pressable noTapScale className={styles.loadMore} onClick={() => setShown((n) => n + PAGE_DAYS)}>
              {t("tilPage.loadMore")}
            </Pressable>
          )}
        </section>

        {/* 오른쪽 — 화면을 따라오는 3D 몽이와 말풍선, 고정 TIL */}
        <aside className={styles.side}>
          <div className={styles.mong3d} aria-hidden>
            <TilMong3D
              expression={complete && !selected ? "happy" : !selected ? "normal" : selectedEntries.length > 0 ? "happy" : "surprised"}
              snapToFront={snap}
            />
          </div>
          <p className={styles.bubble}>
            {!selected ? (
              complete
                ? fillTemplate(t("tilPage.completeCheer"), { name: lang === "en" ? constellation.en : constellation.ko })
                : current >= 3 ? fillTemplate(t("tilPage.streakCheer"), { n: current }) : t("tilPage.pickDay")
            ) : (
              <>
                <strong>{formatDay(selected)}</strong>
                <br />
                {selectedEntries.length === 0 ? t("tilPage.restDay") : fillTemplate(t("tilPage.dayCount"), { n: selectedEntries.length })}
              </>
            )}
          </p>
          {pinned.length > 0 && (
            <section className={styles.pinned}>
              <h2 className={styles.pinnedTitle}>
                <Mong pose="heart-left" size={28} />
                Pinned
              </h2>
              <ul className={styles.entryList}>
                {pinned.map((e) => (
                  <li key={e.id}>
                    <TransitionLink href={`/posts/${e.slug}`} className={styles.entry}>
                      <span className={styles.entryDate}>{dayKey(new Date(e.created_at))}</span>
                      <strong className={styles.entryTitle}>{titleOf(e)}</strong>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
