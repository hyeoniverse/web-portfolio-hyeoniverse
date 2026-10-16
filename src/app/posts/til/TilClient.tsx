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
import TilSky from "./TilSky";

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

/* TIL 페이지 — [연도 탭 · 오늘의 기록 · 숫자] · 1년 잔디(주 단위 열 × 요일 7행) ·
   아래에 [배운 주제 + 바로 읽히는 기록 피드 | 따라오는 몽이 · 다시 보기(1주 · 1달 · 1년 전, 랜덤) · 고정 TIL].
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
  // 요일 이름 — 일요일부터 일곱 줄 모두
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 7 + i, 12)).toLocaleDateString(dateLocale, { weekday: "short", timeZone: "UTC" }),
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

  const monthName = (m: number) =>
    new Date(Date.UTC(2024, m, 1, 12)).toLocaleDateString(dateLocale, { month: "short", timeZone: "UTC" });
  const changeYear = (y: number) => {
    setYear(y);
    pick(null);
    setShown(PAGE_DAYS);
  };

  // 배운 주제 — TIL 에 함께 단 태그(TIL 태그 자체는 뺀다)를 많은 순으로. 고르면 피드가 그 주제로 좁혀진다
  const topics = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) for (const tg of e.tags ?? []) if (tg.toLowerCase() !== tag.toLowerCase()) count.set(tg, (count.get(tg) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries, tag]);
  const [topic, setTopic] = useState<string | null>(null);

  // 다시 보기 — 1주 · 1달 · 1년 전 오늘 무렵(앞뒤 3일 안에서 가장 가까운 날)에 배운 것
  const lookBack = useMemo(() => {
    const near = (center: string) => {
      for (let d = 0; d <= 3; d++) {
        for (const k of d ? [shiftDay(center, -d), shiftDay(center, d)] : [center]) {
          if (k < today && byDay.has(k)) return k;
        }
      }
      return null;
    };
    return [
      { label: t("tilPage.weekAgo"), day: near(shiftDay(today, -7)) },
      { label: t("tilPage.monthAgo"), day: near(shiftDay(today, -30)) },
      { label: t("tilPage.yearAgo"), day: near(shiftDay(today, -365)) },
    ];
  }, [byDay, today, t]);
  // 랜덤 TIL — 누를 때마다 하나 뽑는다(서버 그림과 어긋나지 않게 처음엔 비워 둔다)
  const [randomId, setRandomId] = useState<string | null>(null);
  const randomEntry = entries.find((e) => e.id === randomId) ?? null;
  const drawRandom = () => {
    if (entries.length === 0) return;
    const pool = entries.length > 1 ? entries.filter((e) => e.id !== randomId) : entries;
    setRandomId(pool[Math.floor(Math.random() * pool.length)].id);
  };

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
  // 피드 — 고른 날이 있으면 그날만, 없으면 고른 해의 모든 날(최신순). 주제를 고르면 그 주제 TIL 만
  const feedDays = useMemo(() => {
    const keep = (e: TilEntry) => !topic || (e.tags ?? []).includes(topic);
    const days: [string, TilEntry[]][] = selected
      ? [[selected, byDay.get(selected) ?? []]]
      : [...byDay.entries()].filter(([k]) => k.startsWith(`${year}-`)).sort(([a], [b]) => (a < b ? 1 : -1));
    return days.map(([k, l]) => [k, l.filter(keep)] as [string, TilEntry[]]).filter(([, l]) => l.length > 0);
  }, [byDay, selected, year, topic]);
  const [shown, setShown] = useState(PAGE_DAYS);
  const todayCount = byDay.get(today)?.length ?? 0;
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
        <div className={styles.toolbarStart}>
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
        {/* 오늘의 기록 — 오늘 심었는지 한눈에 */}
        <p className={`${styles.today} ${todayCount > 0 ? styles.todayDone : ""}`}>
          <span className={styles.todayDot} aria-hidden />
          {todayCount > 0 ? fillTemplate(t("tilPage.todayDone"), { n: todayCount }) : t("tilPage.todayNot")}
        </p>
        </div>
        <dl className={styles.stats}>
          <div className={styles.stat}><dt>{t("tilPage.statYear")}</dt><dd>{yearCount}</dd></div>
          <div className={styles.stat}><dt>{t("tilPage.statStreak")}</dt><dd>{current}</dd></div>
          <div className={styles.stat}><dt>{t("tilPage.statLongest")}</dt><dd>{longest}</dd></div>
        </dl>
      </div>

      {/* 잔디 — 좁은 화면에선 가로로 스크롤된다 */}
      <div ref={grassRef} className={styles.grassScroll}>
        <div className={styles.grass} style={{ ["--til-weeks" as string]: weeks.length }}>
          {/* 하늘 — 달마다 별자리. 그달 TIL 로 별이 켜진다 */}
          <TilSky year={year} weeks={weeks} byDay={byDay} monthName={monthName} />
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
                    onClick={() => pick(key === selected ? null : key)}
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


      <div className={styles.body}>
        {/* 기록 피드 — git log 처럼 날짜별로 이어지고, 짧은 TIL 은 본문까지 바로 읽힌다. 잔디 칸을 고르면 그날로 좁혀진다 */}
        <section className={styles.feed} aria-live="polite">
          <div className={styles.feedHead}>
            <h2 className={styles.feedTitle}><b>$</b> git log --til</h2>
            {selected && (
              <Pressable noTapScale className={styles.feedFilter} onClick={() => pick(null)}>
                {formatDay(selected)} · {t("tilPage.showAll")} ×
              </Pressable>
            )}
          </div>
          {/* 배운 주제 지도 — 무엇을 많이 배웠는지. 누르면 그 주제로 좁힌다 */}
          {topics.length > 0 && (
            <div className={styles.topics} role="group" aria-label={t("tilPage.topics")}>
              <span className={styles.topicsLabel}>{t("tilPage.topics")}</span>
              {topics.map(([name, n]) => (
                <Pressable
                  key={name}
                  noTapScale
                  aria-pressed={topic === name}
                  className={`${styles.topic} ${topic === name ? styles.topicOn : ""}`}
                  style={{ ["--w" as string]: Math.min(1, 0.35 + n / (topics[0][1] || 1)) }}
                  onClick={() => { setTopic(topic === name ? null : name); setShown(PAGE_DAYS); }}
                >
                  #{name}
                  <span className={styles.topicCount}>{n}</span>
                </Pressable>
              ))}
            </div>
          )}
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
                    {list.map((e) => (
                      <li key={e.id} className={styles.logEntry}>
                        {/* TIL 은 짧아 펼치지 않고 바로 읽는다 — 제목은 글로 가는 링크 */}
                        <TransitionLink href={`/posts/${e.slug}`} className={styles.logEntryHead}>
                          <span className={styles.logHash} aria-hidden>{shortHash(e.id)}</span>
                          <strong className={styles.entryTitle}>{titleOf(e)}</strong>
                          <span className={styles.entryMore}>{t("tilPage.openPost")} →</span>
                        </TransitionLink>
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
                        </div>
                      </li>
                    ))}
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

        {/* 오른쪽 — 화면을 따라오는 3D 몽이와 말풍선, 다시 보기, 고정 TIL */}
        <aside className={styles.side}>
          <div className={styles.mong3d} aria-hidden>
            <TilMong3D
              expression={!selected ? (todayCount > 0 ? "happy" : "normal") : selectedEntries.length > 0 ? "happy" : "surprised"}
              snapToFront={snap}
            />
          </div>
          <p className={styles.bubble}>
            {!selected ? (
              current >= 3 ? fillTemplate(t("tilPage.streakCheer"), { n: current }) : t("tilPage.pickDay")
            ) : (
              <>
                <strong>{formatDay(selected)}</strong>
                <br />
                {selectedEntries.length === 0 ? t("tilPage.restDay") : fillTemplate(t("tilPage.dayCount"), { n: selectedEntries.length })}
              </>
            )}
          </p>
          {/* 다시 보기 — 잊기 전에 꺼내 보는 지난 TIL */}
          <section className={styles.revisit}>
            <h2 className={styles.pinnedTitle}>
              <Mong pose="happy-top" size={28} />
              {t("tilPage.revisit")}
            </h2>
            <ul className={styles.revisitList}>
              {lookBack.map(({ label, day }) => {
                const first = day ? byDay.get(day)?.[0] : null;
                return (
                  <li key={label}>
                    {day && first ? (
                      <Pressable noTapScale className={styles.revisitItem} onClick={() => { setYear(Number(day.slice(0, 4))); setTopic(null); pick(day); }}>
                        <span className={styles.entryDate}>{label} · {day.replaceAll("-", ".")}</span>
                        <strong className={styles.revisitTitle}>{titleOf(first)}</strong>
                      </Pressable>
                    ) : (
                      <span className={styles.revisitEmpty}>{label} · {t("tilPage.revisitEmpty")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pressable noTapScale className={styles.randomBtn} onClick={drawRandom}>
              ✦ {t("tilPage.random")}
            </Pressable>
            {randomEntry && (
              <TransitionLink key={randomEntry.id} href={`/posts/${randomEntry.slug}`} className={`${styles.entry} ${styles.randomCard}`}>
                <span className={styles.entryDate}>{dayKey(new Date(randomEntry.created_at)).replaceAll("-", ".")}</span>
                <strong className={styles.entryTitle}>{titleOf(randomEntry)}</strong>
                {excerptOf(randomEntry) && <span className={styles.entryExcerpt}>{excerptOf(randomEntry)}</span>}
              </TransitionLink>
            )}
          </section>
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
