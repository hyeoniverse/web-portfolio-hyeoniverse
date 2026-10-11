"use client";

/* 디자인 장 — 프레임 둘. 카드 · 유리판 없이 하늘 위에 바로 그린다.
   첫 프레임(design)은 장 표지: 왼쪽 장 머리, 오른쪽 이 사이트의 토큰 전부를 별로 뿌린 하늘(TokenSky).
   둘째 프레임(design-tokens)은 다섯 단계 — 위쪽 별자리 줄을 따라 길잡이 별이 지금 칸으로 옮겨 앉고,
   오른쪽 하늘은 칸마다 무리 하나(층 · 색 · 글자 · 움직임 · 검사)로 다가가 실제 값을 짚는다 */
import { useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Pressable from "@/components/ui/Pressable";
import { designChapter, designSteps } from "../../_data/design";
import { useFrame, useFrameSteps } from "../prezi/context";
import { ChapterHead, useL } from "../features/shared";
import TokenSky, { type SkyMode } from "./TokenSky";
import styles from "./Design.module.css";

const EASES = ["standard", "enter", "exit", "spring"] as const;
const DURATIONS = ["instant", "fast", "base", "slow", "slower"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
const v = (o: Record<string, string | number>) => o as CSSProperties;

/* ── 움직임 토큰을 화면에서 읽는다 — 견본의 움직임 값이 CSS 의 값 그대로(움직임 줄이기면 0.01ms 로 보인다) ── */

const MOTION_KEYS = [...EASES.map((e) => `--ease-${e}`), ...DURATIONS.map((d) => `--duration-${d}`)];
const readMotion = () => {
  const cs = getComputedStyle(document.documentElement);
  return MOTION_KEYS.map((k) => cs.getPropertyValue(k).trim()).join("|");
};
const noSubscribe = () => () => {};

function useMotionTokens() {
  const raw = useSyncExternalStore(noSubscribe, readMotion, () => "");
  const parts = raw ? raw.split("|") : [];
  const eases = EASES.map((_, i) => {
    const m = parts[i]?.match(/cubic-bezier\(([^)]+)\)/);
    const n = m ? m[1].split(",").map(Number) : null;
    return n && n.length === 4 && n.every(Number.isFinite) ? (n as [number, number, number, number]) : null;
  });
  const durations = DURATIONS.map((_, i) => parts[EASES.length + i] ?? "");
  return { eases, durations };
}

/** 길이 문자열(0.3s · 300ms · 0.01ms)을 초로 */
const toSec = (s: string) => {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return s.endsWith("ms") ? n / 1000 : n;
};

/** 초를 읽기 좋게 — 0.01초보다 짧으면(움직임 줄이기의 0.01ms) ms 로 */
const fmtSec = (s: number | null) => (s == null ? "" : s < 0.01 ? `${+(s * 1000).toFixed(2)}ms` : `${+s.toFixed(2)}s`);

/** 칸의 자리 — 지난 칸은 작아지며 물러나고, 올 칸은 커진 채 기다린다(카메라가 다음 칸으로 다가가는 느낌) */
const posOf = (i: number, step: number) => (i < step ? "before" : i > step ? "after" : "on");

/** 첫 프레임 — 장 표지 */
export function DesignCover() {
  const L = useL();
  const { current } = useFrame();
  return (
    <section id="design" className={styles.cover} data-live={current || undefined}>
      <div className={styles.coverHead}>
        <ChapterHead eyebrow={designChapter.eyebrow} title={designChapter.title} note={designChapter.note} />
        <Link className={styles.live} href="/design-system">
          {L(designChapter.live)} <span aria-hidden>→</span>
        </Link>
      </div>
      <div className={styles.sky}>
        <TokenSky mode="cover" live={current} />
      </div>
    </section>
  );
}

/** 둘째 프레임 — 다섯 단계. 위쪽 별을 눌러도 그 칸으로 간다 */
export function DesignTokens() {
  const L = useL();
  const n = designSteps.length;
  const { step, setStep, current } = useFrameSteps(n);
  const { eases, durations } = useMotionTokens();
  /* 움직임 칸의 이름표 — 값은 CSS 에서 읽은 그대로 */
  const motionValue = (name: string) => {
    const e = EASES.findIndex((x) => `--ease-${x}` === name);
    if (e >= 0) return eases[e] ? `cubic-bezier(${eases[e]!.join(", ")})` : "";
    const d = DURATIONS.findIndex((x) => `--duration-${x}` === name);
    return d >= 0 ? fmtSec(toSec(durations[d] ?? "")) : "";
  };
  return (
    <section className={styles.frame} data-live={current || undefined} style={v({ "--step": step, "--n": n })}>
      {/* 별자리 줄 — 점선이 지금 칸까지 채워지고, 길잡이 별이 지금 별로 옮겨 앉는다 */}
      <nav className={styles.chart} aria-label={L({ ko: "디자인 단계", en: "Design steps" })}>
        <span className={styles.chartFill} aria-hidden />
        <ol className={styles.chartList}>
          {designSteps.map((s, i) => (
            <li key={s.id} className={styles.chartItem}>
              <Pressable
                className={styles.chartBtn}
                data-on={i === step || undefined}
                data-past={i < step || undefined}
                aria-current={i === step ? "step" : undefined}
                aria-label={`${pad2(i + 1)} ${L(s.label)}`}
                onClick={() => setStep(i)}
              >
                <span className={styles.chartDot} aria-hidden>
                  {i === step && current && <span className={styles.chartGuide} data-guide="" data-guide-priority="1" />}
                </span>
                <span className={styles.chartNum}>{pad2(i + 1)}</span>
                <span className={styles.chartLabel}>{L(s.label)}</span>
              </Pressable>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.main}>
        {/* 설명 — 다섯 개를 한 자리에 겹쳐 두고 지금 것만 보인다(칸을 넘겨도 높이가 들썩이지 않게) */}
        <div className={styles.copies}>
          {designSteps.map((s, i) => (
            <div key={s.id} className={styles.stepCopy} data-pos={posOf(i, step)} aria-hidden={i !== step} inert={i !== step}>
              <span className={styles.stepNum}>
                {pad2(i + 1)} <span>/ {pad2(n)}</span>
              </span>
              <h3 className={styles.stepTitle}>{L(s.title)}</h3>
              <p className={styles.stepBody}>{L(s.body)}</p>
            </div>
          ))}
        </div>
        {/* 견본 — 늘 같은 카드, 단계마다 짚는 곳만 바뀐다 */}
        <div className={styles.stage}>
          <TokenSky mode={step as SkyMode} live={current} motionValue={motionValue} />
        </div>
      </div>
    </section>
  );
}
