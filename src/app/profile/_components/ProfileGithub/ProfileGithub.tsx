"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { SiGithub } from "react-icons/si";
import { useLanguage } from "@/providers/LanguageProvider";
import { Star, GitFork, ExternalLink, ArrowUpRight } from "@/components/icons";
import type { GithubShowcase } from "@/lib/githubShowcase";
import { useInViewOnce, useCountUp } from "./useGithubPanelMotion";
import styles from "./ProfileGithub.module.css";

/** 표시할 주 사용 언어 개수 — 꼬리 언어까지 늘어놓으면 지표가 아니라 목록이 된다. */
const TOP_LANGUAGES = 5;

/** 언어 막대에 고정 색을 붙인다 — 매번 다른 색이면 비중을 눈으로 비교할 수 없다. */
const LANG_SLOTS = 5;

/** 카드 개수 상한 — 패널은 100vh 고정이라 넘치면 잘린다. 두 줄(3열 기준)까지가 한계다. */
const MAX_REPOS = 6;

/** 언어 막대를 끝까지 채우는 데 걸리는 시간. 조각마다 나눠 이어 붙인다. */
const LANG_FILL_MS = 1300;

function formatMonth(iso: string, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { year: "numeric", month: "short" });
}

/** 계정 생성일로부터 몇 해째인지 — 소수점 없이 올림 없이 센다. */
function yearsSince(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

/** 보일 때 0 에서 올라가는 지표 한 칸. 훅을 쓰므로 항목마다 컴포넌트로 나눈다. */
function CountedStat({
  label, target, suffix, run, className = "",
}: { label: string; target: number; suffix?: string; run: boolean; className?: string }) {
  const value = useCountUp(target, run);
  return (
    <div className={`${styles.stat} ${className}`}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>
        {value.toLocaleString()}
        {suffix && <span className={styles.statSuffix}>{suffix}</span>}
      </dd>
    </div>
  );
}

/**
 * 프로필 페이지의 GitHub 패널 — 활동 지표 + 언어 비중 + 활동 추이 + 고른 저장소.
 *
 * 저장소를 전부 늘어놓지 않는 이유는 /works 와 성격이 겹치기 때문이다. works 는 정리해 둔
 * 결과물이고 여기는 활동의 근거다. 그래서 지표는 전체에서 집계하되 카드는 고른 것만 낸다.
 *
 * 가로 스크롤 트랙의 패널 하나로 들어간다. 예전에는 그 섹션 **아래**에 따로 놓여 있었는데,
 * 가로 섹션이 100vh 를 차지하며 휠을 가로채는 탓에 닿을 방법이 없었고, 어쩌다 페이지가
 * 내려가면 패널이 잘린 채로 남았다. 바깥 여백·최대폭은 패널(panelInner)이 맡는다.
 */
export default function ProfileGithub({
  showcase,
  animateClass = "",
  active = false,
  part = "overview",
}: {
  showcase: GithubShowcase;
  /** 패널 진입 애니메이션 클래스 — 다른 패널의 항목들과 같은 박자로 등장한다. */
  animateClass?: string;
  /** 이 패널이 화면 가운데에 왔는가 — 막대·잔디·숫자 연출의 시작 신호. */
  active?: boolean;
  /** 한 패널에 다 넣으면 빽빽해서 훑기 어렵다 — 지표와 저장소를 두 패널로 나눈다. */
  part?: "overview" | "pinned";
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const locale = language === "ko" ? "ko-KR" : "en-US";

  /* 막대가 자라고 숫자가 올라가는 연출은 한 번만 돈다.
     신호는 두 갈래다 — 데스크톱 가로 스크롤은 부모가 주는 active, 모바일 세로 스크롤은
     화면에 들어왔는지(IntersectionObserver). 둘 중 먼저 오는 쪽으로 시작하고 되돌리지 않는다. */
  const { ref: rootRef, inView } = useInViewOnce<HTMLDivElement>();
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (active || inView) setEntered(true);
  }, [active, inView]);
  /* 범례에 커서를 올리면 그 언어의 막대 구간만 남기고 나머지를 죽인다 — 어느 조각인지 잇는다. */
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);

  const isPinned = part === "pinned";
  const languages = showcase.languages.slice(0, TOP_LANGUAGES);

  /* 조각이 한 칸씩 쌓여 보이게, 앞 조각이 끝나는 지점에서 다음 조각이 시작한다.
     길이에 비례해 시간을 나눠 채우는 속도를 일정하게 유지한다 — 시간을 똑같이 나누면
     짧은 조각은 기어가고 긴 조각은 튀어서 "쌓인다" 는 느낌이 깨진다. */
  const langTimings = (() => {
    const sum = languages.reduce((acc, l) => acc + l.percent, 0) || 1;
    let acc = 0;
    return languages.map((l) => {
      const duration = (l.percent / sum) * LANG_FILL_MS;
      const delay = acc;
      acc += duration;
      return { delay, duration };
    });
  })();
  const langFillEndMs = langTimings.length
    ? langTimings[langTimings.length - 1].delay + langTimings[langTimings.length - 1].duration
    : 0;
  const lastPushed = formatMonth(showcase.lastPushedAt, locale);
  const years = yearsSince(showcase.createdAt);
  const contributions = showcase.contributions;

  /* 활동 막대는 가장 높은 해를 기준으로 정규화한다 — 절대값이면 한 해만 튀고 나머지가 눌린다. */
  const activityMax = Math.max(1, ...showcase.activity.map((a) => a.count));

  /* 숫자 지표는 올라가고, 날짜처럼 셀 수 없는 값은 그대로 둔다. */
  const counted: { label: string; target: number; suffix?: string }[] = [
    { label: L("공개 저장소", "Public repos"), target: showcase.publicRepos },
    { label: L("받은 스타", "Stars earned"), target: showcase.totalStars },
    { label: L("팔로워", "Followers"), target: showcase.followers },
    ...(years > 0 ? [{ label: L("함께한 햇수", "Years on GitHub"), target: years, suffix: L("년", "y") }] : []),
  ];

  return (
    <div
      ref={rootRef}
      className={styles.section}
      data-in={entered ? "true" : undefined}
      aria-labelledby="profile-github-heading"
    >
      {/* 제목과 링크에 각각 animate 를 건다. 묶음(.head)에 한 번만 걸면 둘이 한 덩어리로
          같이 떠서 링크가 따로 들어오는 느낌이 없다 — 패널의 stagger 가 항목 단위로 돈다. */}
      <div className={styles.head}>
        <h2 id="profile-github-heading" className={`${styles.title} ${animateClass}`}>
          <SiGithub size={20} aria-hidden />
          {isPinned ? "Pinned" : "GitHub"}
        </h2>
        <a
          className={`${styles.profileLink} ${animateClass}`}
          href={showcase.profileUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          @{showcase.login}
          <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
        </a>
      </div>

      {/* 큰 덩어리마다 한 번씩 걸면 블록 통째로 떠서 정지 사진처럼 보인다.
          잎 항목마다 걸어야 패널의 stagger 가 하나씩 순서대로 밀어 올린다. */}
      {!isPinned && (
      <dl className={styles.stats}>
        {counted.map((c) => (
          <CountedStat key={c.label} label={c.label} target={c.target} suffix={c.suffix} run={entered} className={animateClass} />
        ))}
        {lastPushed && (
          <div className={`${styles.stat} ${animateClass}`}>
            <dt className={styles.statLabel}>{L("최근 활동", "Last active")}</dt>
            <dd className={styles.statValue}>{lastPushed}</dd>
          </div>
        )}
      </dl>
      )}

      {!isPinned && languages.length > 0 && (
        <div className={styles.block}>
          <span className={`${styles.blockLabel} ${animateClass}`}>{L("주 사용 언어", "Top languages")}</span>
          {/* 개수만 나열하면 어느 쪽에 치우쳐 있는지 안 보인다 — 비중을 폭으로 그린다 */}
          <div
            className={`${styles.langBar} ${animateClass}`}
            style={{ "--_sheen-delay": `${Math.round(langFillEndMs)}ms` } as CSSProperties}
            role="img" aria-label={languages.map((l) => `${l.name} ${Math.round(l.percent)}%`).join(", ")}>
            {languages.map((l, i) => (
              <span
                key={l.name}
                className={styles.langSlice}
                data-dim={hoveredLang && hoveredLang !== l.name ? "true" : undefined}
                style={{
                  "--_w": `${l.percent}%`,
                  background: `var(--_lang-${i % LANG_SLOTS})`,
                  animationDelay: `${Math.round(langTimings[i].delay)}ms`,
                  animationDuration: `${Math.round(langTimings[i].duration)}ms`,
                } as CSSProperties}
              />
            ))}
          </div>
          <ul className={`${styles.langList} ${animateClass}`}>
            {languages.map((l, i) => (
              /* 막대 조각이 자기 자리를 다 채우는 순간 그 언어의 범례가 켜진다 —
                 어느 색이 어느 언어인지 눈으로 이어진다. */
              <li
                key={l.name}
                className={styles.lang}
                style={{ animationDelay: `${Math.round(langTimings[i].delay + langTimings[i].duration * 0.7)}ms` } as CSSProperties}
                onMouseEnter={() => setHoveredLang(l.name)}
                onMouseLeave={() => setHoveredLang(null)}
              >
                <span className={styles.langDot} style={{ background: `var(--_lang-${i % LANG_SLOTS})` }} aria-hidden />
                {l.name}
                <span className={styles.langPercent}>{Math.round(l.percent)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 잔디는 GraphQL 로만 얻을 수 있어 토큰이 있을 때만 온다.
          없으면 REST 로 만든 연도별 활동 막대를 대신 그린다 — 자리를 비워 두지 않는다. */}
      {isPinned ? null : contributions ? (
        <div className={styles.block}>
          <span className={`${styles.blockLabel} ${animateClass}`}>
            {L("최근 1년 커밋", "Last 12 months")}
            <span className={styles.blockValue}>
              {L(`${contributions.total.toLocaleString(locale)}회`, `${contributions.total.toLocaleString(locale)} contributions`)}
            </span>
          </span>
          <div className={`${styles.grass} ${animateClass}`} role="img" aria-label={L("최근 1년 커밋 잔디", "Contribution graph for the last 12 months")}>
            {contributions.weeks.map((week, wi) => (
              <div key={wi} className={styles.grassWeek}>
                {week.map((day, di) => (
                  <span
                    key={day.date}
                    className={styles.grassDay}
                    data-level={day.level}
                    /* 왼쪽 위에서 오른쪽 아래로 번지게 — 한꺼번에 뜨면 그냥 이미지가 된다 */
                    style={{ animationDelay: `${wi * 12 + di * 8}ms` }}
                    title={`${day.date} · ${day.count}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.block}>
          <span className={`${styles.blockLabel} ${animateClass}`}>{L("연도별 활동", "Activity by year")}</span>
          <div className={`${styles.activity} ${animateClass}`}>
            {showcase.activity.map((a, i) => (
              <div key={a.year} className={styles.activityCol} title={L(`${a.year}년 ${a.count}개 저장소`, `${a.count} repos in ${a.year}`)}>
                <span
                  className={styles.activityBar}
                  style={{ height: `${(a.count / activityMax) * 100}%`, animationDelay: `${i * 70}ms` }}
                />
                <span className={styles.activityYear}>{String(a.year).slice(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPinned && showcase.repos.length > 0 && (
        <div className={styles.block}>
          <ul className={styles.repos}>
            {showcase.repos.slice(0, MAX_REPOS).map((r) => (
              <li key={r.name} className={animateClass}>
                <a className={styles.repo} href={r.url} target="_blank" rel="noreferrer noopener">
                  <span className={styles.repoName}>
                    <span className={styles.repoNameText} title={r.name}>{r.name}</span>
                    <ArrowUpRight size={14} strokeWidth={1.8} className={styles.repoArrow} aria-hidden />
                  </span>
                  {/* 설명이 없어도 요소를 남긴다 — 있는 카드와 없는 카드의 내부 배치가
                      달라지면 나란히 놓였을 때 줄이 안 맞는다. */}
                  <span className={styles.repoDesc}>{r.description}</span>
                  {r.topics.length > 0 && (
                    <span className={styles.repoTopics}>
                      {r.topics.slice(0, 3).map((tp) => (
                        <span key={tp} className={styles.repoTopic}>{tp}</span>
                      ))}
                    </span>
                  )}
                  <span className={styles.repoMeta}>
                    {r.language && <span className={styles.repoLang}>{r.language}</span>}
                    {r.stars > 0 && (
                      <span className={styles.repoStat}><Star size={12} strokeWidth={1.8} aria-hidden />{r.stars}</span>
                    )}
                    {r.forks > 0 && (
                      <span className={styles.repoStat}><GitFork size={12} strokeWidth={1.8} aria-hidden />{r.forks}</span>
                    )}
                    {r.pushedAt && <span className={styles.repoDate}>{formatMonth(r.pushedAt, locale)}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
