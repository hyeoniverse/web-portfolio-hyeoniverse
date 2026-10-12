"use client";

/* 시간 흐름 배경 — 페이지 맨 뒤에 깔린 하늘. 방문자의 지금 시각 · 지금 날씨에서 출발한다.
   첫 화면은 방문자 시계가 가리키는 하늘(해 뜨는 · 지는 시각은 그 동네 기준)이고, 스크롤하는 만큼 하루가 한 바퀴 흘러
   (새벽 → 해돋이 → 아침 → 한낮 → 노을 → 저녁 → 밤) 페이지 끝에서 다시 지금 시각으로 돌아온다.
   실제 하늘처럼 위(천정)와 아래(지평선)의 색이 다르고, 해가 왼쪽에서 떠올라 오른쪽으로 진다. 밤에는 별이 돋는다.
   밤하늘에는 그 위치 · 그 시각에 실제로 떠 있는 별자리를 그린다(lib/weather/stars). 계절마다 지평선 빛깔이 다르다.
   날씨(구름 · 흐림 · 안개 · 비 · 눈 · 뇌우)는 그 위에 층으로 얹는다.
   글자색은 장의 자리가 아니라 지금 하늘의 밝기를 따른다 — <html data-about-sky-tone> 로 본문 · 푸터의 색 체계를 바꾼다.
   렌더 없이 색 변수 · 해 자리 · 별 투명도만 매 프레임 고친다 */
import { useEffect, useRef, useState } from "react";
import { markReady, ReadyWait } from "@/lib/readyGate";
import { useLanguage } from "@/providers/LanguageProvider";
import { colorTone, NAV_BACKDROP_EVENT } from "@/lib/navBackdrop";
import { minuteOfPhase, phaseOf, skyAnchors, SKY_KEYS, type SkyKey } from "@/lib/weather/sky";
import { seasonOf } from "@/lib/weather/stars";
import { moonLitPath, moonPhaseName, moonState } from "@/lib/weather/moon";
import { SKY_CONSTELLATIONS, SKY_STARS } from "@/data/generated/skyCatalog";
import StarChart from "./StarChart";
import { PREZI_PROGRESS_EVENT, preziState } from "../prezi/context";
import WeatherCanvas from "./WeatherCanvas";
import { useVisitorWeather, weatherSettled } from "./useVisitorWeather";
import styles from "./TimeSky.module.css";

/** 단계마다 해 — x: 화면 가로 자리(0~1), up: 지평선 위 높이(0 = 지평선, 1 = 화면 맨 위, 음수는 지평선 아래), glow: 지평선 빛 */
const SUN: Record<SkyKey, { x: number; up: number; glow: number }> = {
  /* 새벽 — 해는 아직 지평선 아래, 지평선만 희미하게 밝다 */
  dawn: { x: 0.12, up: -0.15, glow: 0.4 },
  /* 해돋이 — 해가 지평선에 걸리고 빛이 가장 세게 번진다 */
  sunrise: { x: 0.18, up: 0.06, glow: 1 },
  morning: { x: 0.3, up: 0.45, glow: 0.35 },
  day: { x: 0.55, up: 0.85, glow: 0.1 },
  dusk: { x: 0.8, up: 0.1, glow: 0.9 },
  evening: { x: 0.92, up: -0.25, glow: 0.3 },
  /* 밤 — 해는 지평선 아래를 돌아 다시 왼쪽(새벽)으로 */
  night: { x: 0.05, up: -0.5, glow: 0 },
};

/** 단계마다 별 — 새벽엔 아직 남아 있다가 해가 뜨며 사라지고, 저녁에 다시 돋아 밤에 다 뜬다 */
const STAR: Record<SkyKey, number> = { dawn: 0.7, sunrise: 0, morning: 0, day: 0, dusk: 0, evening: 0.45, night: 1 };

/** 한 단계 안에서 머무는 몫 — 나머지 동안 다음 단계로 넘어간다(계속 섞이기만 하면 어느 시각인지 알아보기 어렵다) */
const HOLD = 0.55;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export default function TimeSky() {
  const ref = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const weather = useVisitorWeather();
  /* 첫 화면 준비 — 날씨를 받고(또는 실패하고) 하늘이 그 값으로 한 번 그려진 뒤 로딩 덮개에 알린다 */
  useEffect(() => {
    let raf = 0;
    void weatherSettled.then(() => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => markReady("about-sky"));
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  const sunrise = weather?.sunrise ?? null;
  const sunset = weather?.sunset ?? null;
  const { language } = useLanguage();
  /* 별자리가 그려질 "그 시각" — 스크롤로 흐른 하늘의 시각. 5분 단위로만 바꿔 다시 그린다 */
  const [skyTime, setSkyTime] = useState<Date | null>(null);

  /* 하늘의 색 체계는 사이트 테마 그대로 — 본문의 색 체계를 하늘 밝기에 맞춰 바꿔도 하늘 색이 따라 뒤집히지 않게 */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pin = () => { el.style.colorScheme = getComputedStyle(document.documentElement).colorScheme; };
    pin();
    const mo = new MutationObserver(pin);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    const probe = probeRef.current;
    if (!el || !probe) return;
    const root = document.documentElement;
    const anchors = skyAnchors(sunrise, sunset);
    /* 출발점 — 방문자 시계의 지금 */
    const now = new Date();
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    const start = phaseOf(nowMinute, anchors);
    let lastBucket = -1;
    let raf = 0;
    /* 프레지 — 창 스크롤 대신 카메라가 지나는 차례(0~1)를 받는다 */
    let preziP: number | null = preziState.p;
    let navTone: string | null = null;
    let textTone: string | null = null;
    const update = () => {
      raf = 0;
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = preziP ?? Math.min(1, Math.max(0, window.scrollY / range));
      /* 페이지 끝까지 내리면 하루가 한 바퀴 — 다시 지금 시각 */
      const n = SKY_KEYS.length;
      const phase = (start + p * n) % n;
      const i = Math.floor(phase);
      const f = phase - i;
      const t = f < HOLD ? 0 : smooth((f - HOLD) / (1 - HOLD));
      const a = SKY_KEYS[i];
      const b = SKY_KEYS[(i + 1) % n];
      const pct = (t * 100).toFixed(1);
      el.style.setProperty("--_z", `color-mix(in oklab, var(--_${b}) ${pct}%, var(--_${a}))`);
      el.style.setProperty("--_h", `color-mix(in oklab, var(--_${b}-h) ${pct}%, var(--_${a}-h))`);
      const sa = SUN[a], sb = SUN[b];
      /* 밤 → 새벽은 해가 지평선 아래에서 건너간다 — 가로 자리는 섞지 않고 바로 옮긴다 */
      el.style.setProperty("--sun-x", (a === "night" ? sb.x : mix(sa.x, sb.x, t)).toFixed(4));
      el.style.setProperty("--sun-up", mix(sa.up, sb.up, t).toFixed(4));
      el.style.setProperty("--glow", mix(sa.glow, sb.glow, t).toFixed(3));
      el.style.setProperty("--night", mix(STAR[a], STAR[b], t).toFixed(3));
      /* 그 시각 — 하늘 단계를 다시 분으로. 지금보다 이른 분이면 자정을 넘긴 다음 날 */
      const minute = minuteOfPhase(phase, anchors);
      const bucket = Math.round(minute / 5);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        /* 분 단위로 반올림 — 단계 ↔ 분 왕복의 소수 오차로 지금보다 아주 조금 이르게 나오면 하루 뒤 하늘이 된다 */
        const ahead = ((Math.round(minute - nowMinute) % 1440) + 1440) % 1440;
        setSkyTime(new Date(now.getTime() + ahead * 60_000));
      }

      /* nav 로고 — 화면 맨 위라 천정 색(바탕색에 깔아 둔 --_z)을 잰다. 하늘은 pointer-events: none 이라 로고 쪽 판단기가 못 잰다 */
      const nextNav = colorTone(getComputedStyle(el).backgroundColor);
      if (nextNav !== navTone) {
        navTone = nextNav;
        if (nextNav) {
          root.dataset.navBackdropTone = nextNav;
          /* 날씨 층 색 — 밝은 하늘엔 어두운 빗줄기 · 눈 테두리 */
          el.dataset.bright = nextNav;
        }
        else delete root.dataset.navBackdropTone;
        window.dispatchEvent(new Event(NAV_BACKDROP_EVENT));
      }
      /* 본문 글자 — 화면 가운데쯤의 하늘(천정 · 지평선 반반)을 잰다 */
      const nextText = colorTone(getComputedStyle(probe).backgroundColor);
      if (nextText && nextText !== textTone) {
        textTone = nextText;
        root.dataset.aboutSkyTone = nextText;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onPrezi = (e: Event) => {
      preziP = Math.min(1, Math.max(0, (e as CustomEvent<number>).detail));
      onScroll();
    };
    onScroll();
    /* 테마를 바꾸면 하늘 색이 바뀌니 글자 색(밝기 판정)도 다시 잰다 — 스크롤을 기다리지 않게. 색 체계를 하늘에 옮겨 단 뒤(다음 프레임),
       테마 전환 효과가 끝난 뒤(약 350ms) 한 번 더 */
    let themeTimer = 0;
    const onTheme = () => {
      requestAnimationFrame(onScroll);
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(onScroll, 420);
    };
    const themeMo = new MutationObserver(onTheme);
    themeMo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener(PREZI_PROGRESS_EVENT, onPrezi);
    return () => {
      cancelAnimationFrame(raf);
      themeMo.disconnect();
      window.clearTimeout(themeTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener(PREZI_PROGRESS_EVENT, onPrezi);
      delete root.dataset.navBackdropTone;
      delete root.dataset.aboutSkyTone;
      window.dispatchEvent(new Event(NAV_BACKDROP_EVENT));
    };
  }, [sunrise, sunset]);

  const kind = weather?.kind ?? "clear";
  const lat = weather?.lat ?? 37.6;
  const lon = weather?.lon ?? 127;
  /* 계절 — 지평선 빛깔이 달라진다(날짜가 하늘에서 보이게). 첫 그림 전에는 정하지 않는다(서버 · 클라이언트 날짜가 다를 수 있다) */
  const season = skyTime ? seasonOf(skyTime, lat) : undefined;
  const caption = skyTime ? skyCaption(skyTime, lat, weather?.city ?? (language === "ko" ? "서울" : "Seoul"), language) : null;
  return (
    <div ref={ref} className={styles.sky} data-weather={kind} data-season={season} aria-hidden>
      <ReadyWait id="about-sky" />
      <div className={styles.season} />
      <div className={styles.glow} />
      <div className={styles.sun} />
      <div className={styles.stars} />
      <div className={`${styles.stars} ${styles.starsFar}`} />
      {/* 실제 별자리 — 방문자 위치 · 그 시각 */}
      {skyTime && <StarChart date={skyTime} lat={lat} lon={lon} language={language} />}
      {/* 날씨 층 — data-weather 에 따라 CSS 가 켠다 */}
      <div className={styles.overcast} />
      <div className={styles.clouds} />
      <div className={`${styles.clouds} ${styles.cloudsFar}`} />
      <div className={styles.fog} />
      <WeatherCanvas kind={kind} />
      {/* 이 하늘이 실제 하늘이라는 표시 — 어느 곳 · 몇 시의 하늘인지, 별 · 별자리 수, 달 위상 */}
      {caption && (
        <p className={styles.caption}>
          {caption.text} ·{" "}
          {/* 지금 위상 — 북반구에선 차오를 땐 오른쪽, 기울 땐 왼쪽이 밝다(남반구는 반대) */}
          <svg className={styles.captionMoon} viewBox="-12 -12 24 24" aria-hidden>
            <circle className={styles.captionMoonDark} r={10} />
            {caption.illum > 0.01 && <path className={styles.captionMoonLit} d={moonLitPath(caption.illum, 10)} transform={caption.litLeft ? "rotate(180)" : undefined} />}
          </svg>{" "}
          {caption.phase}
        </p>
      )}
      {/* 글자 밝기 재는 칸 — 보이지 않는다 */}
      <div ref={probeRef} className={styles.probe} />
    </div>
  );
}

const STAR_COUNT = SKY_STARS.length / 3;
const CONSTELLATION_COUNT = new Set(SKY_CONSTELLATIONS.map((c) => c.id)).size;

/** "서울 · 10월 10일 오전 4:46의 실제 하늘 — 별 921개 · 별자리 88개" + 달 위상(아이콘으로 그린다) */
function skyCaption(date: Date, lat: number, city: string, language: "ko" | "en") {
  const when = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  const m = moonState(date);
  const text =
    language === "ko"
      ? `${city} · ${when}의 실제 하늘 — 별 ${STAR_COUNT}개 · 별자리 ${CONSTELLATION_COUNT}개`
      : `Real sky over ${city} at ${when} — ${STAR_COUNT} stars · ${CONSTELLATION_COUNT} constellations`;
  return { text, phase: moonPhaseName(m.phase)[language], illum: m.illum, litLeft: m.waxing === lat < 0 };
}
