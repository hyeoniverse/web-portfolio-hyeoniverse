"use client";

/* AI 장 — 프레임 하나(ai)에 단계로 펼친다. 카드 · 유리판 없이 하늘 위에 바로 놓는다.
   단계 0 은 장 표지: 왼쪽 장 머리, 오른쪽 다섯 기능(요약 · 번역 · 커버 · 음성 · 공급자 전환)이 점선에 꿰인 별자리.
   다음 단계부터는 고른 별로 확대해 들어가 기능 하나씩 — 왼쪽 설명을 읽으며 오른쪽에서 바로 해 본다
   (좁은 화면은 기능마다 설명 → 데모 두 단계). 위쪽 작은 별 줄을 따라 빛나는 별이 지금 기능 자리로 미끄러져 간다.
   1~4 는 이 사이트의 실제 공급자를 부르는 데모(/api/demo — IP 마다 하루 몇 번),
   5 공급자 전환은 실제 차단 규칙(연속 실패 3 · 5번, 다시 시도하는 때)으로 움직이는 시뮬레이터 */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { type FailKind } from "../../_data/ai";
import { SummaryDemo, TranslateDemo, CoverDemo, SpeechDemo } from "../demos/ai";
import type { L10n } from "../../_data/showcase";
import { useFrame, useFrameSteps } from "../prezi/context";
import { STAR_PATH, StarMark, useL, useWide } from "../features/shared";
import FitZoom from "../features/FitZoom";
import styles from "./Ai.module.css";
import { useAboutText } from "../../_panels/AboutConfig";
/* 공급자 수 · 순서 같은 구조는 코드 기본값 — 관리자는 글만 바꾼다 */
import { fallbackPanel as fallbackBase } from "../../_data/ai";
import type { AboutTexts } from "../../_data/texts";

const pad = (n: number) => String(n).padStart(2, "0");
const v = (o: Record<string, string | number>) => o as React.CSSProperties;

/* ── 5 · 공급자 전환 시뮬레이터 ── */

type Outcome = "idle" | "answered" | "failed" | "skipped";
interface SimState {
  kinds: FailKind[];
  streak: number[];
  off: boolean[];
  outcome: Outcome[];
  run: number;
}
const KIND_ORDER: FailKind[] = ["ok", "expired", "quota", "rate_limit"];
/** 저절로 보내는 간격(ms) — 연속 실패가 쌓여 꺼지는 데까지 볼 수 있게 */
const AUTO_SEND_MS = 2400;
/** 기능마다 공급자 수가 달라도 목록 높이는 가장 긴 기능에 맞춘다 — 탭을 바꿔도 아래가 들썩이지 않게 */
const MAX_PROVIDERS = Math.max(...fallbackBase.features.map((f) => f.providers.length));

const initialSim = (count: number): SimState => ({
  /* 첫 공급자가 요청 속도 제한에 걸린 채로 시작 — 다섯 번 이어 실패하면 꺼지는 데까지가 저절로 보인다 */
  kinds: Array.from({ length: count }, (_, i) => (i === 0 ? "rate_limit" : "ok")),
  streak: Array(count).fill(0),
  off: Array(count).fill(false),
  outcome: Array(count).fill("idle"),
  run: 0,
});

/** 요청 한 번 — 꺼진 곳은 건너뛰고, 실패하면 연속 실패를 세다가 한도에 닿으면 끈다. 성공하면 그 곳의 연속 실패는 0 */
function sendOnce(s: SimState): SimState {
  const fallbackPanel = fallbackBase;
  const streak = [...s.streak];
  const off = [...s.off];
  const outcome: Outcome[] = s.kinds.map(() => "idle");
  for (let i = 0; i < s.kinds.length; i++) {
    if (off[i]) { outcome[i] = "skipped"; continue; }
    const kind = s.kinds[i];
    if (kind === "ok") { outcome[i] = "answered"; streak[i] = 0; break; }
    outcome[i] = "failed";
    streak[i] += 1;
    if (streak[i] >= fallbackPanel.kinds[kind].limit) off[i] = true;
  }
  return { ...s, streak, off, outcome, run: s.run + 1 };
}

/** 공급자 전환 — 공급자 하나가 별 하나. 요청이 지나간 점선은 빛나고, 응답한 별은 강조색으로 커진다 */
function FallbackSim() {
  const { fallbackPanel } = useAboutText().ai;
  const L = useL();
  const [feature, setFeature] = useState(0);
  const providers = fallbackPanel.features[feature].providers;
  const [sim, setSim] = useState<SimState>(() => initialSim(providers.length));
  /* 이 프레임이 지금 프레임인 동안 저절로 요청을 보낸다 — 직접 누르면 그 자리에서 다시 센다(run 이 바뀌므로) */
  const { current: visible } = useFrame();
  useEffect(() => {
    if (!visible || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setSim(sendOnce), AUTO_SEND_MS);
    return () => window.clearTimeout(t);
  }, [visible, sim.run]);

  const pickFeature = (i: number) => {
    setFeature(i);
    setSim(initialSim(fallbackPanel.features[i].providers.length));
  };
  /* 원인을 바꾸면 그 곳의 기록 · 차단을 푼다 — 실제로도 키를 바꾸면 그 공급자의 오류 기록과 차단이 풀린다 */
  const cycleKind = (i: number) =>
    setSim((s) => {
      const kinds = [...s.kinds];
      kinds[i] = KIND_ORDER[(KIND_ORDER.indexOf(kinds[i]) + 1) % KIND_ORDER.length];
      const streak = [...s.streak];
      streak[i] = 0;
      const off = [...s.off];
      off[i] = false;
      return { ...s, kinds, streak, off, outcome: s.outcome.map(() => "idle"), run: s.run + 1 };
    });
  const allFailed = sim.run > 0 && sim.outcome.every((o) => o === "failed" || o === "skipped");

  return (
    <div className={styles.sim}>
      <div className={styles.tabs} role="tablist">
        {fallbackPanel.features.map((f, i) => (
          <Pressable key={f.id} role="tab" aria-selected={i === feature} className={styles.tab} data-on={i === feature || undefined} onClick={() => pickFeature(i)}>
            {L(f.label)}
          </Pressable>
        ))}
      </div>
      <ol className={styles.chain} style={v({ "--n": providers.length })}>
        {providers.map((name, i) => {
          const kind = sim.kinds[i];
          const info = fallbackPanel.kinds[kind];
          const outcome = sim.outcome[i];
          return (
            <li key={`${feature}-${name}`} className={styles.hop} data-lit={(i > 0 && outcome !== "idle") || undefined} style={v({ "--d": i })}>
              <Pressable
                className={styles.node}
                data-kind={kind}
                data-off={sim.off[i] || undefined}
                data-outcome={outcome}
                data-run={sim.run % 2}
                onClick={() => cycleKind(i)}
              >
                <span className={styles.nodeStarBox} aria-hidden>
                  <StarMark className={styles.nodeStar} />
                  {/* 길잡이 별 — 요청이 닿은 곳(응답한 공급자)에 앉는다. 모두 실패하면 마지막 공급자에 */}
                  {(outcome === "answered" || (allFailed && i === providers.length - 1)) && (
                    <span className={styles.guideSpot} data-guide="" data-guide-priority="1" data-guide-fill={outcome === "answered" ? undefined : "var(--text-error)"} />
                  )}
                </span>
                <span className={styles.nodeText}>
                  {/* 배지 · 셋째 줄은 없을 때도 자리를 잡아 둔다 — 누를 때마다 줄 높이가 바뀌어 데모가 흔들리지 않게 */}
                  <span className={styles.nodeName}>
                    {name}
                    <span
                      className={outcome === "skipped" ? styles.badgeSkip : styles.badgeOk}
                      data-hidden={(outcome !== "answered" && outcome !== "skipped") || undefined}
                      aria-hidden={(outcome !== "answered" && outcome !== "skipped") || undefined}
                    >
                      {L(outcome === "skipped" ? fallbackPanel.skipped : fallbackPanel.answered)}
                    </span>
                  </span>
                  <span className={styles.nodeKind}>{sim.off[i] ? L(fallbackPanel.off) : L(info.label)}</span>
                  <span className={styles.nodeMeta} data-hidden={kind === "ok" || undefined} aria-hidden={kind === "ok" || undefined}>
                    {kind === "ok" ? "–" : sim.off[i] ? L(info.retry) : `${sim.streak[i]} / ${info.limit} ${L(fallbackPanel.streak)}`}
                  </span>
                </span>
              </Pressable>
            </li>
          );
        })}
        {/* 빈 자리 — 공급자가 적은 기능도 목록 높이는 같다 */}
        {Array.from({ length: MAX_PROVIDERS - providers.length }, (_, i) => (
          <li key={`ghost-${i}`} className={styles.hopGhost} aria-hidden>
            <span className={styles.node}>
              <span className={styles.nodeStarBox} />
              <span className={styles.nodeText}>
                <span className={styles.nodeName}>
                  –<span className={styles.badgeOk} data-hidden>–</span>
                </span>
                <span className={styles.nodeKind}>–</span>
                <span className={styles.nodeMeta}>–</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
      {/* 두 문장을 한 칸에 겹쳐 두고 하나만 보인다 — 긴 쪽 높이로 자리가 고정된다 */}
      <p className={styles.simNote} aria-live="polite">
        <span data-hidden={allFailed || undefined} aria-hidden={allFailed || undefined}>{L(fallbackPanel.features[feature].note)}</span>
        <strong className={styles.simFail} data-hidden={!allFailed || undefined} aria-hidden={!allFailed || undefined}>
          {L(fallbackPanel.allFailed)}
        </strong>
      </p>
      <div className={styles.simActions}>
        <Button size="sm" onClick={() => setSim(sendOnce)}>{L(fallbackPanel.send)}</Button>
        <Button size="sm" variant="outline" onClick={() => setSim(initialSim(providers.length))}>{L(fallbackPanel.reset)}</Button>
      </div>
    </div>
  );
}

/* ── 장 ── */

/** 기능 다섯 — 설명(왼쪽)과 데모(오른쪽). 모두 같은 틀이라 바꿔도 자리가 들썩이지 않는다 */
const tabsOf = ({ summaryPanel, translatePanel, coverPanel, voicePanel, fallbackPanel }: AboutTexts["ai"]): { key: string; label: L10n; title: L10n; body?: L10n; points: L10n[]; Demo: ComponentType }[] => [
  { key: "summary", label: summaryPanel.label, title: summaryPanel.title, points: summaryPanel.points, Demo: SummaryDemo },
  { key: "translate", label: translatePanel.label, title: translatePanel.title, points: translatePanel.points, Demo: TranslateDemo },
  { key: "cover", label: coverPanel.label, title: coverPanel.title, points: coverPanel.points, Demo: CoverDemo },
  { key: "voice", label: voicePanel.label, title: voicePanel.title, points: voicePanel.points, Demo: SpeechDemo },
  { key: "fallback", label: fallbackPanel.label, title: fallbackPanel.title, body: fallbackPanel.body, points: [fallbackPanel.order], Demo: FallbackSim },
];

/** 표지 별자리 — 별 다섯의 자리(별자리 판 대비 %). 왼쪽 두 줄로 엇갈려 점선이 지그재그로 내려가고, 이름은 별 오른쪽에 */
const MAP: [number, number][] = [
  [6, 8],
  [18, 29],
  [6, 50],
  [18, 71],
  [6, 92],
];

/** AI 장 — 단계 0 은 표지(별자리 목차), 다음 단계부터 기능 하나씩. 넓은 화면은 기능 하나가 한 단계, 좁은 화면은 설명 · 데모 두 단계 */
export function AiChapter() {
  const texts = useAboutText().ai;
  const { aiChapter } = texts;
  const TABS = tabsOf(texts);
  const L = useL();
  const wide = useWide();
  const per = wide ? 1 : 2;
  const { step, setStep, current } = useFrameSteps(1 + TABS.length * per);
  const open = step > 0;
  const pick = open ? Math.floor((step - 1) / per) : 0;
  const pane = wide ? "both" : (step - 1) % 2 ? "demo" : "copy";
  const t = TABS[pick];
  const Demo = t.Demo;

  /* 별로 빨려 들어가기 — 고른 별만 남고 표지가 그 별을 중심으로 갈수록 빨라지며 커져 사라지고, 기능 화면이 같은 별에서 자라 나온다(돌아올 땐 거꾸로).
     별 자리는 표지가 제 크기일 때(닫혀 있을 때) 재어 둔다 — 열려 있으면 표지가 확대돼 있어 잴 수 없다 */
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const origins = useRef<string[]>([]);
  useEffect(() => {
    const intro = introRef.current;
    if (!intro || open) return;
    const measure = () => {
      const ir = intro.getBoundingClientRect();
      if (!ir.width || !ir.height) return;
      origins.current = [...intro.querySelectorAll("[data-ai-star]")].map((el) => {
        const r = el.getBoundingClientRect();
        const x = ((r.left + r.width / 2 - ir.left) / ir.width) * 100;
        const y = ((r.top + r.height / 2 - ir.top) / ir.height) * 100;
        return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
      });
    };
    /* 별이 차례로 떠오르는 등장이 끝난 뒤에 잰다 */
    const tm = window.setTimeout(measure, 1200);
    const ro = new ResizeObserver(measure);
    ro.observe(intro);
    return () => {
      window.clearTimeout(tm);
      ro.disconnect();
    };
  }, [open]);
  /* 바뀌는 그 순간의 스타일 계산에 들어가야 해서 그리기 전에 넣는다 */
  useLayoutEffect(() => {
    const o = origins.current[pick];
    if (o) sectionRef.current?.style.setProperty("--z-origin", o);
  }, [pick, open]);

  return (
    <section id="ai" ref={sectionRef} className={styles.scene} data-live={current || undefined} data-open={open || undefined}>
      {/* 표지 — 장 머리와 다섯 기능의 별자리 */}
      <div ref={introRef} className={styles.intro} aria-hidden={open || undefined} inert={open || undefined}>
        <div className={styles.head}>
          {/* 길잡이 별이 장 머리에 내려앉는 자리 — 표지가 보일 때만 */}
          {!open && <span className={styles.headGuide} data-guide="" aria-hidden />}
          <span className={styles.eyebrow}>{L(aiChapter.eyebrow)}</span>
          <h2 className={styles.headTitle}>{L(aiChapter.title)}</h2>
          <p className={styles.headNote}>{L(aiChapter.note)}</p>
        </div>
        <div className={styles.sky}>
          <svg className={styles.skyLine} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={MAP.map(([x, y]) => `${x},${y}`).join(" ")} />
          </svg>
          <ol className={styles.skyList}>
            {TABS.map((x, i) => (
              <li
                key={x.key}
                className={styles.skyItem}
                data-picked={(open && i === pick) || undefined}
                style={v({ "--x": `${MAP[i][0]}%`, "--y": `${MAP[i][1]}%`, "--i": i })}
              >
                <Pressable className={styles.skyNode} onClick={() => setStep(1 + i * per)}>
                  <svg className={styles.skyStar} viewBox="0 0 100 100" aria-hidden data-ai-star="">
                    <path d={STAR_PATH} />
                  </svg>
                  <span className={styles.skyText}>
                    <span className={styles.skyName}>
                      <span className={styles.skyNum}>{pad(i + 1)}</span> {L(x.label)}
                    </span>
                    <span className={styles.skySub}>{L(x.title)}</span>
                  </span>
                </Pressable>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 기능 화면 — 위 별 줄 · 아래 설명과 데모 */}
      <div className={styles.stage} aria-hidden={!open || undefined} inert={!open || undefined}>
        <div className={styles.bar}>
          <p className={styles.barTitle}>
            <span className={styles.eyebrow}>{L(aiChapter.eyebrow)}</span>
            <span key={t.key} className={styles.barNow}>
              <span className={styles.skyNum}>{pad(pick + 1)}</span> {L(t.label)}
            </span>
          </p>
          {/* 기능 고르기 — 작은 별자리. 지나온 기능은 흰 별, 아직은 희미한 별. 빛나는 별 하나가 지금 자리로 미끄러져 간다 */}
          <nav className={styles.stars} aria-label={L({ ko: "AI 기능", en: "AI features" })}>
            <ol className={styles.starRow}>
              {TABS.map((x, i) => (
                <li key={x.key}>
                  <Pressable
                    className={styles.star}
                    data-on={(open && i === pick) || undefined}
                    data-done={(open && i < pick) || undefined}
                    aria-current={(open && i === pick) || undefined}
                    aria-label={`${pad(i + 1)} ${L(x.label)}`}
                    title={L(x.label)}
                    onClick={() => setStep(1 + i * per)}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden>
                      <path d={STAR_PATH} />
                    </svg>
                  </Pressable>
                </li>
              ))}
            </ol>
            <span className={styles.starGlow} style={v({ "--at": pick })} aria-hidden>
              <svg viewBox="0 0 100 100">
                <path d={STAR_PATH} />
              </svg>
            </span>
          </nav>
        </div>

        <div key={t.key} className={styles.body} role="region" aria-label={L(t.label)} data-pane={pane}>
          <div className={styles.copy}>
            <span className={styles.bigNum} aria-hidden>{pad(pick + 1)}</span>
            <h3 className={styles.title}>
              {/* 길잡이 별 — 기능을 바꾸면 새 제목 앞으로 날아와 앉는다 */}
              <span className={styles.titleGuide} data-guide={current && open && pane !== "demo" ? "" : undefined} data-guide-priority="1" />
              {L(t.title)}
            </h3>
            {t.body && <p className={styles.lead}>{L(t.body)}</p>}
            <ul className={styles.points}>
              {t.points.map((p, i) => (
                <li key={i} style={v({ "--i": i })}>
                  <StarMark className={styles.pointStar} />
                  {L(p)}
                </li>
              ))}
            </ul>
            {/* 좁은 화면 — 다음 단계가 데모라는 표시(눌러도 간다) */}
            {!wide && (
              <Button size="sm" variant="outline" className={styles.tryIt} onClick={() => setStep(step + 1)}>
                {L({ ko: "직접 해 보기", en: "Try it" })} ↓
              </Button>
            )}
          </div>
          {/* 데모는 열려 있을 때만 — 마운트하면 남은 횟수를 묻는다. 좁은 화면의 설명 단계에서도 그리지 않는다.
              데모가 자리보다 크면(낮은 화면) 잘리거나 스크롤되지 않게 조금 줄인다 */}
          {pane !== "copy" && (
            <FitZoom className={styles.demo}>{open && current && <Demo />}</FitZoom>
          )}
        </div>
      </div>
    </section>
  );
}
