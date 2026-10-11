"use client";

/* About 개편 시안 — 큰 산세리프 제목(topology) + 화면 폭 워드마크 · 사진 타일 격자 · 아주 작은 대문자 캡션(magnetism). 스크롤은 섞는다: 첫 화면은 그대로 흐르고, "한눈에 보기" 한 장면만 화면에 고정해 숫자가 차례로 들어온다.
   내용은 _data/showcase.ts. 방향이 정해지면 관리자 About 편집과 이어 붙인다. */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { hero, stack, live as liveText, facts, type L10n } from "../_data/showcase";
import GuideStar, { GuideAnchor } from "./guide/GuideStar";
import TimeSky from "./guide/TimeSky";
import { useVisitorWeather } from "./guide/useVisitorWeather";
import HeroMap from "./map/HeroMap";
import PreziStage from "./prezi/PreziStage";
import { useFrameSteps } from "./prezi/context";
import { HeroCta } from "./landing/Landing";
import { AboutConfigProvider } from "@/app/about/_panels/AboutConfig";
import type { SiteConfigData } from "@/config/site.config";
import styles from "./AboutNext.module.css";

function useL() {
  const { language } = useLanguage();
  return (v: L10n | string) => (typeof v === "string" ? v : v[language] ?? v.ko);
}

/* ── 첫 화면 ── */

/** 워드마크를 줄 폭에 꼭 맞게 — 글꼴 · 화면 폭마다 글자 폭이 달라 비율로 맞춘다 */
function useFitWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "100px";
      const ratio = (el.parentElement?.clientWidth ?? el.clientWidth) / el.scrollWidth;
      el.style.fontSize = `${Math.floor(100 * ratio * 0.995)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, []);
  return ref;
}

/** 워드마크에 마우스를 올리면 커서 가까운 글자가 솟는다(--d). 마우스가 있는 기기에서만, 렌더 없이 스타일만 바꾼다 */
function useWordmarkHover(wordRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const word = wordRef.current;
    const wrap = word?.parentElement;
    if (!word || !wrap) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = [...word.querySelectorAll<HTMLElement>("[data-letter]")];
    let rects: DOMRect[] = [];
    const onMove = (e: PointerEvent) => {
      if (!rects.length) rects = letters.map((el) => el.getBoundingClientRect());
      rects.forEach((r, i) => {
        const d = Math.max(0, 1 - Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width * 2.4));
        letters[i].style.setProperty("--d", d.toFixed(3));
      });
    };
    const onLeave = () => {
      letters.forEach((el) => el.style.setProperty("--d", "0"));
      rects = [];
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [wordRef]);
}

/** 첫 화면을 지나며 스크롤한 거리를 --sy 로 — 스크린샷 띠가 스크롤만큼 더 밀려 빨라 보인다 */
function useHeroScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--sy", String(Math.min(window.scrollY, el.offsetHeight)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return ref;
}

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

/* 기술 스택 띠 — 스크린샷 띠와 반대로 흐른다. 끊김 없이(절반 = 두 벌) 네 벌 */
function StackTicker() {
  const items = [...stack, ...stack, ...stack, ...stack];
  return (
    <div className={styles.stackTicker} aria-label={stack.join(", ")}>
      <div className={styles.stackTrack} aria-hidden>
        {items.map((name, i) => (
          <span key={i} className={styles.stackItem}>{name}</span>
        ))}
      </div>
    </div>
  );
}

/** 흩어진 브랜드 별 — 로고와 같은 네 꼭지 별. 자리 · 크기는 화면 폭을 따르고(좁으면 일부 숨김), 깊이(depth)만큼
    커서 · 스크롤에 따라 움직여 겹겹이 떠 보인다. 큰 별 하나는 옅은 바탕 무늬, 나머지는 반짝이 */
const STARS = [
  { top: "4%", right: "-12vw", size: "min(90svh, 70vw)", depth: 0.4, alpha: 0.14, spin: 90, bg: true },
  { top: "42%", left: "22%", size: "clamp(1rem, 1.6vw, 1.5rem)", depth: 2.2, alpha: 0.85, spin: 16, wide: true },
  { top: "50%", left: "6%", size: "clamp(1.25rem, 2vw, 2rem)", depth: 1.2, alpha: 0.8, spin: 30 },
  { top: "56%", right: "8%", size: "clamp(1.75rem, 3vw, 3rem)", depth: 1.9, alpha: 0.7, spin: 20, wide: true },
  { bottom: "26%", left: "34%", size: "clamp(1.5rem, 2.6vw, 2.75rem)", depth: 0.9, alpha: 0.5, spin: 40, wide: true },
  { top: "6%", left: "52%", size: "clamp(0.75rem, 1.1vw, 1.1rem)", depth: 2.6, alpha: 0.9, spin: 14 },
  { top: "36%", right: "30%", size: "clamp(0.9rem, 1.3vw, 1.3rem)", depth: 2.4, alpha: 0.75, spin: 18, wide: true },
  { bottom: "34%", right: "22%", size: "clamp(1rem, 1.5vw, 1.5rem)", depth: 1.4, alpha: 0.6, spin: 26, wide: true },
] as const;

const STAR_PATH = "M50 0C53 36 64 47 100 50C64 53 53 64 50 100C47 64 36 53 0 50C36 47 47 36 50 0Z";

/** 별마다 다른 움직임 — 순서로 정해지는 값이라 서버 · 클라이언트가 같다(황금각으로 방향을 고루 흩뜨린다).
    · 커서를 따라가는 방향을 이 각도만큼 돌린다(어떤 별은 비스듬히, 어떤 별은 반대로)
    · 스크롤에 위 · 아래 · 옆으로 다르게 흐른다
    · 평소에도 저마다의 궤도 · 속도로 떠다닌다 */
function starMotion(i: number) {
  const ang = (i * 137.5 * Math.PI) / 180;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return {
    "--c": r(Math.cos(ang)),
    "--s": r(Math.sin(ang)),
    "--sdir": i % 3 === 0 ? -0.6 : i % 3 === 1 ? 1 : 0.4,
    "--sx": r(Math.sin(ang * 2) * 0.5),
    "--fx": `${r(Math.cos(ang * 3) * 14)}px`,
    "--fy": `${r(Math.sin(ang * 3) * 14)}px`,
    "--float": `${5 + ((i * 1.7) % 6)}s`,
    "--float-delay": `${-((i * 1.3) % 5)}s`,
  };
}

function Stars() {
  return (
    <div className={styles.stars} aria-hidden>
      {/* 별자리 선 — 커서와 가까운 별을 잇는다(경로는 컴포넌트가 매 프레임 그린다) */}
      {/* 길잡이 별의 출발점 — 여기서 떠나 페이지 끝까지 따라간다 */}
      <span className={styles.heroGuide}>
        <GuideAnchor size="clamp(2.5rem, 5vw, 5rem)" />
      </span>
      <svg className={styles.constellation}>
        <path data-constellation />
      </svg>
      {STARS.map((st, i) => (
        <svg
          key={i}
          className={styles.star}
          data-star
          viewBox="0 0 100 100"
          data-wide={"wide" in st || undefined}
          data-bg={"bg" in st || undefined}
          style={
            {
              top: "top" in st ? st.top : undefined,
              bottom: "bottom" in st ? st.bottom : undefined,
              left: "left" in st ? st.left : undefined,
              right: "right" in st ? st.right : undefined,
              "--size": st.size,
              "--depth": st.depth,
              "--alpha": st.alpha,
              "--spin": `${st.spin}s`,
              "--dir": i % 2 ? "reverse" : "normal",
              "--twinkle-delay": `${(i * 0.7) % 3}s`,
              ...starMotion(i),
            } as React.CSSProperties
          }
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

/** 작은 별 하나를 판 위 (x, y) 에 띄워 keyframes 대로 움직이고 지운다 — 터지는 별 · 반짝이 꼬리 공용 */
function spawnStar(host: HTMLElement, x: number, y: number, size: number, frames: Keyframe[], duration: number) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add(styles.burst);
  svg.innerHTML = `<path d="${STAR_PATH}"/>`;
  svg.style.setProperty("--size", `${size}px`);
  svg.style.left = `${x}px`;
  svg.style.top = `${y}px`;
  host.appendChild(svg);
  svg.animate(frames, { duration, easing: "cubic-bezier(.2,.7,.3,1)" }).finished.then(
    () => svg.remove(),
    () => svg.remove(),
  );
}

/** 별똥별 — 판 위쪽 어딘가에서 왼쪽 아래로 긋고 사라진다 */
function shootStar(host: HTMLElement) {
  const el = document.createElement("span");
  el.className = styles.shooting;
  el.setAttribute("aria-hidden", "true");
  const w = host.clientWidth, h = host.clientHeight;
  const sx = w * (0.45 + Math.random() * 0.55), sy = h * Math.random() * 0.35;
  const len = Math.max(w, h) * 0.7;
  const ang = 150 + Math.random() * 15; // 왼쪽 아래로
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  el.style.rotate = `${ang}deg`;
  host.appendChild(el);
  const rad = (ang * Math.PI) / 180;
  el.animate(
    [
      { translate: "0 0", opacity: 0, scale: "0.3 1" },
      { opacity: 1, scale: "1 1", offset: 0.15 },
      { translate: `${Math.cos(rad) * len}px ${Math.sin(rad) * len}px`, opacity: 0, scale: "0.6 1" },
    ],
    { duration: 1100, easing: "cubic-bezier(.3,.1,.6,1)" },
  ).finished.then(() => el.remove(), () => el.remove());
}

/** 별과 놀기 — 판 위에서
    · 커서 위치를 -1~1 로 --mx · --my 에(별이 깊이만큼 따라감)
    · 커서가 다가오면 별이 밀려나고(--rx · --ry) 가까울수록 빨리 돈다. 빨리 스크롤해도 빨리 돈다
    · 커서와 가까운 별을 가는 선으로 잇는다(별자리)
    · 커서가 지나간 자리에 작은 별이 떨어진다(반짝이 꼬리)
    · 작은 별은 잡아 던질 수 있다 — 놓으면 날아가 판 가장자리에 튕기고 그 자리에 머문다
    · 빈 곳을 클릭 · 탭하면 작은 별이 터져 나온다
    · 몇 초마다 별똥별이 지나간다(판이 화면에 보일 때만)
    렌더 없이 스타일 · 애니메이션만 바꾼다 */
function useStarPlay(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const stars = [...el.querySelectorAll<SVGElement>("[data-star]")];
    const line = el.querySelector<SVGPathElement>("[data-constellation]");
    const REACH = 220, PUSH = 70, LINK = 280;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    let px = -1e4, py = -1e4; // 판 기준 커서 좌표
    let spinBoost = 0; // 스크롤 속도로 더해지는 회전
    const st = stars.map(() => ({ px: 0, py: 0, dx: 0, dy: 0, vx: 0, vy: 0 }));
    let drag: { i: number; lx: number; ly: number; lt: number; vx: number; vy: number } | null = null;

    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--mx", x.toFixed(3));
      el.style.setProperty("--my", y.toFixed(3));
      spinBoost *= 0.92;
      const box = el.getBoundingClientRect();
      let moving = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 || spinBoost > 0.05 || drag !== null;
      let path = "";
      stars.forEach((star, i) => {
        const s = st[i];
        const r = star.getBoundingClientRect();
        const isBg = star.hasAttribute("data-bg");
        /* 던진 별 — 미끄러지다 멈추고, 판 가장자리에 닿으면 튕긴다 */
        if (!drag || drag.i !== i) {
          if (Math.abs(s.vx) + Math.abs(s.vy) > 0.05) {
            s.dx += s.vx;
            s.dy += s.vy;
            s.vx *= 0.95;
            s.vy *= 0.95;
            if ((r.left < box.left && s.vx < 0) || (r.right > box.right && s.vx > 0)) s.vx *= -0.8;
            if ((r.top < box.top && s.vy < 0) || (r.bottom > box.bottom && s.vy > 0)) s.vy *= -0.8;
            moving = true;
          }
        }
        /* 밀려나기 — 지금 밀린 만큼을 빼고 제자리 중심에서 잰다(안 그러면 밀린 자리에서 다시 재 떨린다).
           큰 바탕 별은 조금만 */
        const cx = r.left + r.width / 2 - box.left - s.px;
        const cy = r.top + r.height / 2 - box.top - s.py;
        const ddx = cx - px, ddy = cy - py;
        const d = Math.hypot(ddx, ddy);
        const reach = REACH + Math.min(r.width / 2, 60);
        const k = drag?.i === i ? 0 : (d < reach ? (1 - d / reach) ** 2 : 0) * Math.min(1, 120 / r.width);
        const gx = d ? (ddx / d) * k * PUSH : 0;
        const gy = d ? (ddy / d) * k * PUSH : 0;
        s.px += (gx - s.px) * 0.12;
        s.py += (gy - s.py) * 0.12;
        if (Math.abs(gx - s.px) + Math.abs(gy - s.py) > 0.3) moving = true;
        star.style.setProperty("--rx", (s.px + s.dx).toFixed(1));
        star.style.setProperty("--ry", (s.py + s.dy).toFixed(1));
        const spin = star.getAnimations().find((a) => (a as CSSAnimation).animationName?.includes("starSpin"));
        if (spin) spin.playbackRate = 1 + k * 8 + spinBoost;
        /* 별자리 — 커서 가까운 작은 별만 */
        if (!isBg && d < LINK) path += `M${px.toFixed(0)} ${py.toFixed(0)}L${(cx + s.px).toFixed(0)} ${(cy + s.py).toFixed(0)}`;
      });
      line?.setAttribute("d", path);
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /** 그 좌표에 있는 작은 별(바탕 별 제외) — 잡기 쉽게 가장자리를 조금 넓혀 잰다 */
    const starAt = (cx: number, cy: number) =>
      stars.findIndex((star) => {
        if (star.hasAttribute("data-bg")) return false;
        const r = star.getBoundingClientRect();
        return cx > r.left - 8 && cx < r.right + 8 && cy > r.top - 8 && cy < r.bottom + 8;
      });

    let lastTrail = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = e.clientX - r.left, ny = e.clientY - r.top;
      if (fine && !drag) el.toggleAttribute("data-over-star", starAt(e.clientX, e.clientY) >= 0);
      if (drag) {
        const s = st[drag.i];
        const now = performance.now();
        const dt = Math.max(1, now - drag.lt);
        s.dx += nx - drag.lx;
        s.dy += ny - drag.ly;
        drag.vx = ((nx - drag.lx) / dt) * 16;
        drag.vy = ((ny - drag.ly) / dt) * 16;
        drag.lx = nx;
        drag.ly = ny;
        drag.lt = now;
      } else if (fine && performance.now() - lastTrail > 45) {
        /* 반짝이 꼬리 — 커서가 지나간 자리에 작은 별이 떨어지며 사라진다 */
        lastTrail = performance.now();
        const size = 6 + Math.random() * 8;
        spawnStar(el, nx, ny, size, [
          { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 0.9 },
          { transform: `translate(${(Math.random() - 0.5) * 30}px, ${20 + Math.random() * 30}px) scale(0) rotate(${Math.random() * 240}deg)`, opacity: 0 },
        ], 700);
      }
      px = nx;
      py = ny;
      tx = (nx / r.width) * 2 - 1;
      ty = (ny / r.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      if (drag) return;
      tx = ty = 0;
      px = py = -1e4;
      kick();
    };

    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest("a, button, input, label")) return;
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left, oy = e.clientY - r.top;
      /* 작은 별을 잡았으면 끌기(마우스만 — 터치는 페이지 스크롤과 부딪힌다). 별은 글자 아래층이라
         누른 좌표로 직접 찾는다 */
      const i = e.pointerType === "mouse" ? starAt(e.clientX, e.clientY) : -1;
      if (i >= 0) {
        const grabbed = stars[i];
        st[i].vx = st[i].vy = 0;
        drag = { i, lx: ox, ly: oy, lt: performance.now(), vx: 0, vy: 0 };
        grabbed.setAttribute("data-dragging", "");
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
        kick();
        return;
      }
      /* 빈 곳 — 터지는 별 */
      const n = 9;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 60 + Math.random() * 90;
        const turn = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 180);
        spawnStar(el, ox, oy, 10 + Math.random() * 22, [
          { transform: "translate(0, 0) scale(0.2) rotate(0deg)", opacity: 1 },
          { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(1) rotate(${turn}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${Math.cos(ang) * dist * 1.25}px, ${Math.sin(ang) * dist * 1.25 + 30}px) scale(0) rotate(${turn * 1.4}deg)`, opacity: 0 },
        ], 900 + Math.random() * 400);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const s = st[drag.i];
      /* 마지막 움직임 속도로 던진다 — 너무 세면 줄인다 */
      s.vx = Math.max(-60, Math.min(60, drag.vx));
      s.vy = Math.max(-60, Math.min(60, drag.vy));
      stars[drag.i].removeAttribute("data-dragging");
      drag = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      kick();
    };

    /* 빨리 스크롤하면 별도 빨리 돈다 */
    let lastY = window.scrollY;
    const onScroll = () => {
      const v = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      spinBoost = Math.min(12, spinBoost + v * 0.08);
      kick();
    };

    /* 별똥별 — 판이 화면에 보이고 탭이 열려 있을 때만, 4~8초마다 */
    let visible = true;
    let shootTimer = 0;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(el);
    const scheduleShoot = () => {
      shootTimer = window.setTimeout(() => {
        if (visible && !document.hidden) shootStar(el);
        scheduleShoot();
      }, 4000 + Math.random() * 4000);
    };
    scheduleShoot();

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(shootTimer);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ref]);
}

/* 첫 화면 — 내비게이션 아래부터 브랜드 색 판. 위에서부터 메타 줄 · 소개와 목차, 엇갈린 스크린샷 · 스택 띠,
   바닥에 화면 폭 워드마크(스크롤하면 커진다). 판 위에 브랜드 별이 흩어져 커서 · 스크롤에 반응한다 */
export function Hero({ live }: { live: LiveInfo }) {
  const { language } = useLanguage();
  const lead = hero.lead[language] ?? hero.lead.ko;
  const heroRef = useHeroScroll<HTMLElement>();
  const wordRef = useFitWidth<HTMLHeadingElement>();
  const panelRef = useRef<HTMLDivElement>(null);
  useWordmarkHover(wordRef);
  useStarPlay(panelRef);
  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={panelRef} className={styles.heroInner}>
        <Stars />
        <LiveRow live={live} />
        <div className={styles.heroIntro}>
          <div className={styles.introText}>
            <p className={styles.lead}>
              {lead.before}
              <em className={styles.leadAccent}>{lead.accent}</em>
              {lead.after}
            </p>
            {/* 설명 한 줄 · 단추 — 랜딩의 가치 제안 자리 */}
            <HeroCta />
          </div>
          <HeroMap />
        </div>
        {/* 스크린샷 띠 — 끊김 없이 돌도록(절반 = 한 벌) 두 벌 잇는다 */}
        <div className={styles.marquee} aria-hidden>
          <div className={styles.marqueeRow}>
            <div className={styles.marqueeTrack}>
              {[...hero.shots, ...hero.shots].map((s, i) => (
                <Image key={i} className={styles.marqueeShot} src={s.src} alt="" width={s.width} height={s.height} sizes="(width <= 768px) 70vw, 40vw" />
              ))}
            </div>
          </div>
        </div>
        <StackTicker />
        <div className={styles.wordWrap}>
          {/* 글자마다 차례로 올라온다 — 읽기는 통째로(aria-label) */}
          <h1 ref={wordRef} className={styles.wordmark} aria-label={hero.wordmark}>
            {[...hero.wordmark].map((ch, i) => (
              <span key={i} data-letter className={styles.letter} style={{ "--i": i } as React.CSSProperties} aria-hidden>
                {ch}
              </span>
            ))}
          </h1>
        </div>
      </div>
    </section>
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
