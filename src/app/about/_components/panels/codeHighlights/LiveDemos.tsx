"use client";

/* Code Highlights 의 코드 옆 데모 — 코드가 하는 일을 작은 화면으로 보여 준다.
   예제 코드와 같은 식(전환 곡선·Hermite·구간 진행도·휠 이동량)을 그대로 쓴다.
   보이는 패인에서만 돌고(active), 동작 줄이기 설정이면 멈춘 한 장면을 보여 준다. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Pressable from "@/components/ui/Pressable";
import { Slider } from "@/components/ui/Slider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useMotionPaused } from "@/stores/motionStore";
import styles from "./LiveDemos.module.css";

type DemoProps = { active: boolean };

/** 0 → 1 을 되풀이하는 시계. 멈춰 있거나 움직임 멈춤(3.9-4, 움직임 줄이기 포함)이면 hold 값에 선다 */
function useLoop(active: boolean, seconds: number, hold = 0.6) {
  const [t, setT] = useState(hold);
  const paused = useMotionPaused();
  useEffect(() => {
    if (!active || paused) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) / 1000 / seconds) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, seconds]);
  /* 서 있을 때는 hold 장면 — 효과 안에서 setState 하지 않고 렌더에서 고른다 */
  return !active || paused ? hold : t;
}

/** 손으로 끌면 잠시 자동 재생을 멈춘다 */
function useScrub(auto: number) {
  const [manual, setManual] = useState<number | null>(null);
  const timer = useRef(0);
  const set = (v: number) => {
    setManual(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setManual(null), 2500);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [manual ?? auto, set] as const;
}

const L = (language: string, ko: string, en: string) => (language === "ko" ? ko : en);
const easeCut = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function Frame({ children, caption }: { children: ReactNode; caption: ReactNode }) {
  return (
    <figure className={styles.demo}>
      {children}
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}

/* ── 1. 장면 전환 컷 ── */
const KINDS = ["wipe", "iris", "rise", "slide"] as const;
type Kind = (typeof KINDS)[number];

export function SceneCutDemo({ active }: DemoProps) {
  const { language } = useLanguage();
  // 한 바퀴 = 컷 네 개. 컷마다 드러나는 1.1초 + 멈춤 0.5초
  const loop = useLoop(active, 6.4, 0.35);
  const [pinned, setPinned] = useState<Kind | null>(null);
  const slot = loop * KINDS.length;
  const autoKind = KINDS[Math.floor(slot) % KINDS.length];
  const autoP = clamp01((slot % 1) / 0.7);
  const [p, setP] = useScrub(autoP);
  const kind = pinned ?? autoKind;

  const t = 1 - easeCut(p); // 1 → 0 으로 줄며 전환이 끝난다 (예제 코드와 같은 식)
  const enter: React.CSSProperties =
    kind === "wipe" ? { clipPath: `inset(0 0 0 ${t * 100}%)` }
    : kind === "iris" ? { clipPath: `circle(${(1 - t) * 75}% at 50% 50%)` }
    : kind === "rise" ? { clipPath: `inset(${t * 100}% 0 0 0)` }
    : { transform: `translateY(${t * 100}%)` };
  const out = 1 - t;
  const leave: React.CSSProperties = { transform: `scale(${1 - out * 0.08})`, filter: `brightness(${1 - out * 0.15})` };

  return (
    <Frame caption={L(language, "컷을 누르면 고정, 막대를 끌면 되감기", "Tap a cut to pin it, drag to scrub")}>
      <div className={styles.stage}>
        <div className={`${styles.scene} ${styles.sceneA}`} style={leave}>
          <span>{L(language, "지금 장면", "Current")}</span>
        </div>
        <div className={`${styles.scene} ${styles.sceneB}`} style={enter}>
          <span>{L(language, "다음 장면", "Next")}</span>
        </div>
      </div>
      <div className={styles.chips}>
        {KINDS.map((k) => (
          <Pressable
            key={k}
            className={`${styles.chip} ${k === kind ? styles.chipOn : ""}`}
            onClick={() => setPinned(pinned === k ? null : k)}
            aria-pressed={pinned === k}
          >
            {k}
          </Pressable>
        ))}
      </div>
      <Slider className={styles.slider} value={[p * 100]} onValueChange={([v]) => setP(v / 100)} />
    </Frame>
  );
}

/* ── 2. 속도를 이어받는 스냅 ── */
export function SnapDemo({ active }: DemoProps) {
  const { language } = useLanguage();
  const loop = useLoop(active, 3.2, 0.7);
  const u = clamp01(loop / 0.75); // 0.75 까지 움직이고 나머지는 멈춰 보여 준다
  const v = 0.9; // 멈추기 직전 속도(거리 단위 접선)

  // 두 방식의 위치(0 → 1). lerp 는 한 프레임 8% 씩 — 출발 속도가 튀고 끝이 한없이 느리다
  const hermite = (x: number) => (x ** 3 - 2 * x ** 2 + x) * v + (-2 * x ** 3 + 3 * x ** 2);
  const lerp = (x: number) => 1 - Math.pow(1 - 0.08, x * 60);

  const W = 260, H = 120, X0 = 50;
  const px = (x: number) => X0 + x * (W - X0 - 10);
  const py = (y: number) => H - 14 - y * (H - 30);
  const path = (f: (x: number) => number) =>
    Array.from({ length: 41 }, (_, i) => i / 40).map((x, i) => `${i ? "L" : "M"}${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`).join(" ");
  // 멈추기 전 움직임 — 같은 속도로 들어온 선
  const before = `M${px(-0.18 / 1)},${py(-v * 0.18)} L${px(0)},${py(0)}`;

  return (
    <Frame caption={L(language, "같은 속도로 들어와 멈추기까지 · 가로 시간, 세로 위치", "Hand-off to rest · x time, y position")}>
      <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <line x1={px(0)} x2={px(0)} y1={8} y2={H - 14} className={styles.axis} />
        <line x1={X0 - 20} x2={W - 6} y1={py(1)} y2={py(1)} className={styles.target} />
        <path d={before} className={styles.incoming} />
        <path d={path(lerp)} className={styles.curveLerp} />
        <path d={path(hermite)} className={styles.curveHermite} />
        <circle cx={px(u)} cy={py(lerp(u))} r={3.5} className={styles.dotLerp} />
        <circle cx={px(u)} cy={py(hermite(u))} r={3.5} className={styles.dotHermite} />
        <text x={X0 - 22} y={py(1) - 4} className={styles.plotLabel}>{L(language, "목표", "target")}</text>
      </svg>
      <div className={styles.lanes}>
        <div className={styles.lane}>
          <span className={styles.laneName}>lerp</span>
          <span className={styles.laneTrack}><i className={styles.laneDotLerp} style={{ left: `${lerp(u) * 100}%` }} /></span>
        </div>
        <div className={styles.lane}>
          <span className={styles.laneName}>Hermite</span>
          <span className={styles.laneTrack}><i className={styles.laneDotHermite} style={{ left: `${hermite(u) * 100}%` }} /></span>
        </div>
      </div>
    </Frame>
  );
}

/* ── 3. 구간 진행도를 CSS 변수로 ── */
export function ScrollVarsDemo({ active }: DemoProps) {
  const { language } = useLanguage();
  const auto = useLoop(active, 7, 0.4);
  const [progress, setProgress] = useScrub(auto);
  const count = 3;
  const index = Math.min(count - 1, Math.floor(progress * count));
  const f = progress * count - index;
  const itemIn = index === 0 ? 1 : Math.min(1, f / 0.35);
  const itemOut = index === count - 1 ? 0 : Math.max(0, (f - 0.8) / 0.2);
  const itemP = Math.min(1, f);

  const bars: [string, number][] = [["--item-in", itemIn], ["--item-p", itemP], ["--item-out", itemOut]];
  const r = clamp01(itemIn * 1.8);

  return (
    <Frame caption={L(language, "막대를 끄는 게 곧 스크롤", "Dragging the bar is scrolling")}>
      <div className={styles.varsCard}>
        <span className={styles.varsIndex}>{String(index + 1).padStart(2, "0")}</span>
        <div
          className={styles.varsBody}
          style={{ opacity: r - itemOut * 1.2, transform: `translateY(${(1 - r - itemOut) * 12}px)` }}
        >
          <b>{L(language, `항목 ${index + 1}`, `Item ${index + 1}`)}</b>
          <span className={styles.varsLines} style={{ clipPath: `inset(0 ${(1 - clamp01(0.1 + itemP * 1.5)) * 100}% 0 0)` }}>
            <i /><i /><i />
          </span>
        </div>
      </div>
      <ul className={styles.varsBars}>
        {bars.map(([name, value]) => (
          <li key={name}>
            <code>{name}</code>
            <span className={styles.varsTrack}><i style={{ transform: `scaleX(${value})` }} /></span>
            <b>{value.toFixed(2)}</b>
          </li>
        ))}
      </ul>
      <Slider className={styles.slider} value={[progress * 100]} onValueChange={([v]) => setProgress(v / 100)} />
    </Frame>
  );
}

/* ── 4. 가로 스크롤과 Lenis 휠 ── */
export function LenisWheelDemo({ active }: DemoProps) {
  const { language } = useLanguage();
  // 한 바퀴 = 표시 없음 4틱 → 표시 있음 4틱
  const loop = useLoop(active, 6, 0.3);
  const fixed = loop >= 0.5;
  const ticks = Math.floor(((loop % 0.5) / 0.5) * 5); // 0~4
  const x = Math.min(ticks, 4) * 51; // 휠 한 번에 가로 51px
  const y = fixed ? 0 : Math.min(ticks, 4) * 98; // 표시가 없으면 세로로도 98px

  return (
    <Frame
      caption={
        fixed
          ? L(language, "표시 있음 · 가로로만 간다", "With marker · horizontal only")
          : L(language, "표시 없음 · 세로로도 밀린다", "No marker · page slides down too")
      }
    >
      <div className={styles.lenisView}>
        <div className={styles.lenisPage} style={{ transform: `translateY(${-y / 4}px)` }}>
          <span className={styles.lenisBlock} />
          <div className={styles.lenisSection} data-marked={fixed || undefined}>
            <div className={styles.lenisTrack} style={{ transform: `translateX(${-x / 4}px)` }}>
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
          <span className={styles.lenisBlock} />
          <span className={styles.lenisBlock} />
        </div>
      </div>
      <p className={styles.lenisCount}>
        <span>{L(language, "가로", "x")} +{x}px</span>
        <span className={fixed ? undefined : styles.lenisBad}>{L(language, "세로", "y")} +{y}px</span>
      </p>
    </Frame>
  );
}

export const LIVE_DEMOS: Record<string, (p: DemoProps) => ReactNode> = {
  sceneCut: SceneCutDemo,
  snap: SnapDemo,
  scrollVars: ScrollVarsDemo,
  lenisWheel: LenisWheelDemo,
};
