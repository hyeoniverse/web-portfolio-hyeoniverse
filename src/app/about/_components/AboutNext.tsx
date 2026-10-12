"use client";

/* About 개편 시안 — 큰 산세리프 제목(topology) + 화면 폭 워드마크 · 사진 타일 격자 · 아주 작은 대문자 캡션(magnetism). 스크롤은 섞는다: 첫 화면은 그대로 흐르고, "한눈에 보기" 한 장면만 화면에 고정해 숫자가 차례로 들어온다.
   내용은 _data/showcase.ts. 방향이 정해지면 관리자 About 편집과 이어 붙인다. */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { live as liveText, facts, type L10n } from "../_data/showcase";
import GuideStar, { GuideAnchor } from "./guide/GuideStar";
import TimeSky from "./guide/TimeSky";
import { useVisitorWeather } from "./guide/useVisitorWeather";
import PreziStage from "./prezi/PreziStage";
import { useFrameSteps } from "./prezi/context";
import { AboutConfigProvider } from "@/app/about/_panels/AboutConfig";
import type { SiteConfigData } from "@/config/site.config";
import styles from "./AboutNext.module.css";

function useL() {
  const { language, tx } = useLanguage();
  /* 다른 언어로 볼 때는 영어 칸을 About 글 번역(tx)으로 */
  return (v: L10n | string) => (typeof v === "string" ? v : language === "ko" ? v.ko ?? v.en : tx(v.en ?? v.ko));
}

/* ── 첫 화면 ── */

/* ── 첫 화면 — 살아 있는 정보 · 목차 · 기술 스택 띠 ── */

export interface LiveInfo {
  postCount: number | null;
  workCount: number | null;
  latestPost: { title: string; titleEn: string | null; slug: string } | null;
}

/* 방문자 날짜 · 시각 — 방문자 브라우저의 시계로 1초마다. 서버에선 자리만(하이드레이션 뒤 바로 채운다) */
const localDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" });
const localTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const clockStore = {
  subscribe(cb: () => void) {
    const id = setInterval(cb, 1000);
    return () => clearInterval(id);
  },
  get: () => `${localDate.format(Date.now())} · ${localTime.format(Date.now())}`,
  server: () => "--- -- --- · --:--:--",
};

export function LiveRow({ live }: { live: LiveInfo }) {
  const L = useL();
  const { language } = useLanguage();
  const time = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.server);
  const weather = useVisitorWeather();
  const post = live.latestPost;
  return (
    <ul className={styles.metaRow}>
      {/* 방문자 동네 · 지금 시각 · 날씨 — 뒤의 하늘이 이 시각 · 날씨에서 출발한다 */}
      <li>
        {weather?.city ?? L(liveText.here)} <span className={styles.clock}>{time}</span>
        {weather && (
          <span className={styles.weather}>
            {weather.temp != null && ` · ${weather.temp}°`} · {L(liveText.weather[weather.kind])}
          </span>
        )}
      </li>
      {post && (
        <li className={styles.liveLatest}>
          {L(liveText.latest)} —{" "}
          <Link href={`/posts/${post.slug}`} className={styles.liveLink}>
            {language === "en" && post.titleEn ? post.titleEn : post.title}
          </Link>
        </li>
      )}
      <li>
        {live.postCount != null && `${L(liveText.posts)} ${live.postCount}`}
        {live.postCount != null && live.workCount != null && " · "}
        {live.workCount != null && `${L(liveText.works)} ${live.workCount}`}
      </li>
    </ul>
  );
}

/* ── 한눈에 보기 — 프레임 하나, 두 단계. 숫자 여섯을 셋씩 나눠 단계마다 한 줄이 들어온다
   (휠 · ↓ 한 번 = 다음 줄). 넓은 화면은 앞 줄이 남은 채 아래에 쌓이고, 좁은 화면은 같은 자리에서 바뀐다 ── */

const FACT_GROUP = 3;

export function Facts() {
  const L = useL();
  const groups = Array.from({ length: Math.ceil(facts.items.length / FACT_GROUP) }, (_, g) =>
    facts.items.slice(g * FACT_GROUP, (g + 1) * FACT_GROUP),
  );
  const { step } = useFrameSteps(groups.length);
  return (
    <section id="facts" className={styles.facts} data-step={step}>
      <div className={styles.sectionHead}>
        <span className={styles.eyebrow}>{L(facts.eyebrow)}</span>
        <h2 className={styles.sectionTitle}>
          {L(facts.title)} <GuideAnchor size="0.8em" />
        </h2>
      </div>
      <div className={styles.factGroups}>
        {groups.map((items, g) => (
          <ul
            key={g}
            className={styles.factGrid}
            data-state={g === step ? "on" : g < step ? "past" : "next"}
            aria-hidden={g > step || undefined}
          >
            {items.map((item, i) => (
              <li key={i} className={styles.fact} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.factValue}>
                  {item.value}
                  {item.unit && <span className={styles.factUnit}>{L(item.unit)}</span>}
                </span>
                <span className={styles.factLabel}>{L(item.label)}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

export default function AboutNext({ live, about }: { live: LiveInfo; about: SiteConfigData["about"] }) {
  return (
    <AboutConfigProvider about={about}>
    <div className={styles.page}>
      <TimeSky />
      <GuideStar />
      {/* 프레지 — 페이지 전체가 별자리 세계, 카메라가 장면(프레임)마다 날아다닌다 */}
      <PreziStage live={live} />
    </div>
    </AboutConfigProvider>
  );
}
