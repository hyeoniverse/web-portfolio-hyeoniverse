"use client";

/* 만든 과정 장 — 프레지 프레임 세 장.
   1 작업 과정: 날짜 × 제품의 층 계단 — 휠 한 번에 별이 다음 단계로 계단을 타고 오르고, 아래 설명이 바뀐다
   2 설계 결정: 갈림길 그림(질문 → 선택지 → 고른 길 → 원칙 · 대가). 한 단계에 한 결정
   3 보안: 고리 그림(SecurityRings) — 겹마다 한 단계 */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { aboutProcess, aboutDecisions } from "@/data/generated/aboutContent";
import { makingChapter, processText, decisionsText, processLayers, processLayerOf } from "../../_data/making";
import { decisionExtras } from "../../_data/decisionOptions";
import { StarMark, useL } from "../features/shared";
import { useFrameSteps } from "../prezi/context";
import fx from "../features/Features.module.css";
import styles from "./Making.module.css";

/** 본문의 **굵게** · `코드` 만 살린다 */
function Rich({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className={styles.code}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/** 결정의 한 줄 요지 — keyInsight 에서 굵게 쓴 곳이 든 문장 전체(굵은 조각만 자르면 문장 중간부터 나왔다).
    굵은 곳이 없으면 마지막 문장(맺는 결론) */
function firstBold(md: string): string {
  const plain = (t: string) => t.replace(/\*\*/g, "").replace(/`/g, "").trim();
  const sentences = md
    .split(/\n\s*\n/)
    .flatMap((p) => p.trim().match(/[^.!?。]+[.!?。]?/g) ?? [])
    .map((x) => x.trim())
    .filter(Boolean);
  const hit = sentences.find((x) => x.includes("**")) ?? sentences.at(-1) ?? "";
  return plain(hit);
}

const fmtDate = (d?: string) => (d ?? "").slice(2).replaceAll("-", ".");
const pad2 = (n: number) => String(n).padStart(2, "0");

/* ── 1 · 작업 과정 — 가로는 날짜, 세로는 제품의 층(아래 공개 화면 → 위 성능 · 접근성). 단계마다 그 기간을 주로 다룬 층의 높이에
   선을 긋고, 다음 단계 시작 자리에서 세로로 이어 계단이 된다. 넘길 때마다 별 하나가 계단을 타고 오르며(뒤로는 내려오며) 선을 채운다.
   지나온 길은 강조색으로 남고, 지금 단계는 기둥으로 밝힌다. 아래에 지금 단계 설명 ── */

const DAY = 86_400_000;
const t0 = Date.parse(aboutProcess[0]?.start ?? "");
const t1 = Date.parse(aboutProcess[aboutProcess.length - 1]?.end ?? "");
/** 날짜 → 가로 자리(0~100%) */
const xOf = (t: number) => ((t - t0) / Math.max(DAY, t1 - t0)) * 100;
/** 단계 기간 — 시작 · 끝 가로 자리(%) */
const STAIRS = aboutProcess.map((x) => ({ x0: xOf(Date.parse(x.start ?? "")), x1: xOf(Date.parse(x.end ?? "")) }));

/** 지금 단계 — 번호 · 기간 · 제목 · 대표 수치 · 설명. 그래프 아래 */
function NowPhase({ step, className }: { step: number; className?: string }) {
  const { language } = useLanguage();
  const n = aboutProcess.length;
  const s = aboutProcess[step];
  const title = (x: (typeof aboutProcess)[number]) => (language === "en" ? x.title_en : x.title_ko);
  return (
      <article key={s.step} className={`${styles.now} ${className ?? ""}`}>
        <header className={styles.phaseHead}>
          <span className={styles.phaseStep}>{pad2(step + 1)} / {pad2(n)}</span>
          <span className={styles.phaseDates}>{fmtDate(s.start)} — {fmtDate(s.end)}</span>
        </header>
        <h4 className={styles.phaseTitle}>{title(s)}</h4>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{s.metric}</span>
          <span className={styles.metricLabel}>{language === "en" ? s.metric_label_en : s.metric_label_ko}</span>
        </div>
        <p className={styles.phaseBody}>
          <Rich text={language === "en" ? s.description_en ?? "" : s.description_ko ?? ""} />
        </p>
      </article>
  );
}

/** 달 눈금 — 전체 기간 안의 매월 1일 */
const MONTHS = (() => {
  const out: { x: number; label: string }[] = [];
  const d = new Date(t0);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= t1) {
    out.push({ x: xOf(d.getTime()), label: String(d.getMonth() + 1).padStart(2, "0") });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
})();

function ProcessChart({ step, setStep }: { step: number; setStep: (i: number) => void }) {
  const L = useL();
  const { language } = useLanguage();
  const title = (x: (typeof aboutProcess)[number]) => (language === "en" ? x.title_en : x.title_ko);
  const n = aboutProcess.length;
  /* 세로는 제품의 층(아래 공개 화면 → 위 성능 · 접근성). 단계는 주로 다룬 층의 높이에 놓인다 */
  const laneY = (k: number) => 88 - (k / Math.max(1, processLayers.length - 1)) * 76;
  const yOf = (i: number) => laneY(processLayerOf[aboutProcess[i].step] ?? i);
  /** 선이 끝나는 자리 — 다음 단계가 시작하는 곳까지 이어 그려 계단이 끊기지 않게(마지막은 실제 끝) */
  const endX = (i: number) => (i + 1 < n ? STAIRS[i + 1].x0 : STAIRS[i].x1);
  /* 어디서 왔나 — 바로 앞 단계에서 왔으면 앞으로(채우며 오른다), 바로 다음 단계에서 왔으면 뒤로(걷으며 내려온다), 그 밖(건너뛰기)은 바로 그 자리 */
  const [move, setMove] = useState({ to: step, from: step });
  if (move.to !== step) setMove({ to: step, from: move.to });
  const dir = move.from === step - 1 ? "fwd" : move.from === step + 1 ? "back" : "jump";
  const f = move.from;
  /* 이동하는 별의 세 자리(출발 · 꺾이는 곳 · 도착) */
  /** 바닥(%) — 면 · 기둥이 내려오는 곳 */
  const BASE = 96;
  const gradId = useId();
  /** 계단 아래 면 — 바닥에서 시작해 단계마다 세로로 올라 기간선을 따라가고, upto 단계의 끝에서 바닥으로 닫는다 */
  const areaTo = (upto: number) =>
    `M ${STAIRS[0].x0} ${BASE} ` +
    STAIRS.slice(0, upto + 1).map((c, i) => `L ${c.x0} ${yOf(i)} L ${endX(i)} ${yOf(i)}`).join(" ") +
    ` L ${endX(upto)} ${BASE} Z`;
  const path =
    dir === "back"
      ? { a: [endX(f), yOf(f)], b: [STAIRS[f].x0, yOf(f)], c: [STAIRS[f].x0, yOf(step)] }
      : { a: [STAIRS[step].x0, step > 0 ? yOf(step - 1) : yOf(step)], b: [STAIRS[step].x0, yOf(step)], c: [endX(step), yOf(step)] };
  return (
    <div className={styles.ganttWrap}>
      <div className={styles.gantt} style={{ "--rows": n } as CSSProperties}>
        <div className={styles.ganttAxis} aria-hidden>
          {MONTHS.map((m) => (
            <span key={m.x} style={{ left: `${m.x}%` }}>{m.label}</span>
          ))}
        </div>
        <div className={styles.ganttField}>
          {/* 선 — 기간 선과 단계 사이 이음선(다음 단계 시작 자리에서 곧게 세로로). 지나온 길은 강조색으로 남는다. 0~100 판, 굵기는 화면 픽셀로 */}
          {/* 층 이름(세로 눈금) */}
          {processLayers.map((l, k) => (
            <span key={l.en} className={styles.ganttLane} data-on={processLayerOf[aboutProcess[step].step] === k || undefined} style={{ top: `${laneY(k)}%` }} aria-hidden>
              {L(l)}
            </span>
          ))}
          <svg className={styles.ganttSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className={styles.ganttGradTop} />
                    <stop offset="1" className={styles.ganttGradBottom} />
                  </linearGradient>
                </defs>
                {/* 눈금 — 층마다 가로선, 달마다 세로선 */}
                {processLayers.map((l, k) => (
                  <line key={`l${k}`} className={styles.ganttGrid} x1={0} y1={laneY(k)} x2={100} y2={laneY(k)} />
                ))}
                {MONTHS.map((m) => (
                  <line key={`m${m.x}`} className={styles.ganttGrid} x1={m.x} y1={4} x2={m.x} y2={BASE} />
                ))}
                {/* 계단 아래 면 — 전체는 옅게, 지나온 단계까지는 강조색 그라데이션 */}
                <path className={styles.ganttArea} d={areaTo(n - 1)} />
                {step > 0 && <path className={styles.ganttAreaPast} d={areaTo(step - 1)} fill={`url(#${gradId})`} />}
                {/* 지금 단계 기둥 — 기간선에서 바닥까지 */}
                <rect
                  key={`col${step}`}
                  className={styles.ganttCol}
                  x={STAIRS[step].x0}
                  y={yOf(step)}
                  width={endX(step) - STAIRS[step].x0}
                  height={BASE - yOf(step)}
                  fill={`url(#${gradId})`}
                />
                <line className={styles.ganttBase} x1={0} y1={BASE} x2={100} y2={BASE} />
            </>
            {STAIRS.slice(1).map((c, i) => (
              <line key={`j${i}`} className={styles.ganttJoin} data-past={i + 1 <= step || undefined} x1={c.x0} y1={yOf(i)} x2={c.x0} y2={yOf(i + 1)} />
            ))}
            {STAIRS.map((c, i) => (
              <line key={i} className={styles.ganttSpan} data-on={i === step || undefined} data-past={i < step || undefined} x1={c.x0} y1={yOf(i)} x2={endX(i)} y2={yOf(i)} />
            ))}
            {/* 차오르는 이음선 — 앞으로 올 때만(아래 단계에서 이 단계로 곧게 세로로) */}
            {dir === "fwd" && (
              <line key={`fj${step}`} className={styles.ganttFillJoin} x1={STAIRS[step].x0} y1={yOf(step - 1)} x2={STAIRS[step].x0} y2={yOf(step)} />
            )}
            {/* 걷히는 이음선 — 뒤로 갈 때, 떠나온 단계로 오르던 선 */}
            {dir === "back" && (
              <line key={`bj${step}`} className={styles.ganttFillJoin} data-dir="back" x1={STAIRS[f].x0} y1={yOf(step)} x2={STAIRS[f].x0} y2={yOf(f)} />
            )}
          </svg>
          {/* 지금 단계 기간선 채움 — 앞으로 오면 시작에서 끝으로 늘어나고, 뒤로 · 건너뛰면 처음부터 차 있다 */}
          <span
            key={`fs${step}-${dir}`}
            className={styles.ganttFill}
            data-dir={dir}
            data-first={step === 0 || undefined}
            style={{ left: `${STAIRS[step].x0}%`, top: `${yOf(step)}%`, width: `${endX(step) - STAIRS[step].x0}%` }}
            aria-hidden
          />
          {/* 뒤로 갈 때 — 떠나온 단계의 채움이 끝에서 시작 쪽으로 걷힌다 */}
          {dir === "back" && (
            <span
              key={`bs${step}`}
              className={styles.ganttFill}
              data-dir="retract"
              style={{ left: `${STAIRS[f].x0}%`, top: `${yOf(f)}%`, width: `${endX(f) - STAIRS[f].x0}%` }}
              aria-hidden
            />
          )}
          {/* 이동하는 별 — 차오르는(걷히는) 선의 머리 */}
          <span
            key={`h${step}-${dir}`}
            className={styles.ganttHead}
            data-dir={dir}
            data-first={step === 0 || undefined}
            style={{
              "--ax": `${path.a[0]}%`,
              "--ay": `${path.a[1]}%`,
              "--bx": `${path.b[0]}%`,
              "--by": `${path.b[1]}%`,
              "--cx": `${path.c[0]}%`,
              "--cy": `${path.c[1]}%`,
            } as CSSProperties}
            aria-hidden
          >
            {/* 사이트의 길잡이 별이 이 머리에 올라타 함께 움직인다 */}
            <span className={styles.ganttGuide} data-guide="" data-guide-priority="1" />
          </span>
          <ol className={styles.ganttRows} aria-label={L(processText.label)}>
            {aboutProcess.map((x, i) => (
              <li key={x.step} style={{ top: `${yOf(i)}%`, left: `${STAIRS[i].x0}%`, width: `${Math.max(0.5, endX(i) - STAIRS[i].x0)}%` } as CSSProperties}>
                <Pressable
                  className={styles.ganttRow}
                  data-flip={STAIRS[i].x0 > 55 || undefined}
                  data-on={i === step || undefined}
                  data-past={i < step || undefined}
                  aria-current={i === step ? "step" : undefined}
                  aria-label={`${pad2(i + 1)} ${title(x)} · ${fmtDate(x.start)} — ${fmtDate(x.end)}`}
                  onClick={() => setStep(i)}
                >
                  <span className={styles.ganttName} aria-hidden>
                    <span className={styles.skyNum}>{pad2(i + 1)}</span>
                    <span className={styles.ganttLabel}>{title(x)}</span>
                    {/* 그 단계의 대표 결과 */}
                    <span className={styles.ganttMetric}>{x.metric}</span>
                  </span>
                </Pressable>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <NowPhase step={step} />
    </div>
  );
}

export function Process() {
  const L = useL();
  const n = aboutProcess.length;
  const { step, setStep } = useFrameSteps(n);
  return (
    <div className={styles.process}>
      <div className={styles.processHead}>
        {/* 장 머리 — 장 이름과, 단계 수를 데이터에서 센 제목 */}
        <span className={fx.sceneLabel}>{L(makingChapter.eyebrow)}</span>
        <h3 className={styles.processTitle}>{L(makingTitle)}</h3>
      </div>
      <ProcessChart step={step} setStep={setStep} />
    </div>
  );
}

/* ── 2 · 설계 결정 — 갈림길 그림. 왼쪽 질문에서 선이 검토한 선택지마다 갈라지고, 고른 길만 강조색으로 이어져 오른쪽 결론
   (남은 원칙 · 트레이드오프)에 닿는다. 고르지 않은 갈래는 점선으로 끝나고 끝에 막힌 이유가 붙는다. 위에 결정 번호 줄.
   선은 0~100 판의 꺾인 선(사선 없이) — 세 칸의 가로 자리(BR_*)는 CSS 의 칸 너비와 같게 둔다 ── */

/** 갈림길 판의 가로 자리(%) — 질문 칸 끝 · 갈래 시작 · 선택지 칸 끝 · 결론 칸 시작. Making.module.css .branch 의 칸 너비와 같게 */
const BR_Q = 22;
const BR_O0 = 28;
const BR_O1 = 64;
const BR_R = 70;
/** 별이 길을 긋는 박자 — 장면이 내려앉은 뒤 출발(ms), 나아가는 빠르기(px/ms), 고른 갈래에 머무는 시간(ms) */
const RUN_START = 1500;
const RUN_SPEED = 0.24;
const RUN_REST = 700;
/** 고르지 않은 갈래 끝에서 판정(✕)을 보여 주며 머무는 시간(ms) */
const RUN_THINK = 1000;

type Pt = [number, number];
/** 꺾인 선 위의 거리 d 까지 — 지나온 꼭짓점들과 지금 자리. 점은 % , 거리는 px(판의 가로세로 비가 달라 % 로 재면 빠르기가 들쭉날쭉) */
function walkTo(pts: Pt[], d: number, w: number, h: number): { done: Pt[]; at: Pt; len: number } {
  const px = ([x, y]: Pt): Pt => [(x / 100) * w, (y / 100) * h];
  let left = d;
  let len = 0;
  const done: Pt[] = [pts[0]];
  let at = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = px(pts[i - 1]);
    const [bx, by] = px(pts[i]);
    const seg = Math.hypot(bx - ax, by - ay);
    len += seg;
    if (left >= seg) {
      left -= seg;
      done.push(pts[i]);
      at = pts[i];
    } else if (left > 0) {
      const t = left / seg;
      at = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      done.push(at);
      left = 0;
    }
  }
  return { done, at, len };
}
const toD = (pts: Pt[]) => (pts.length > 1 ? pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ") : "");

export function Decisions() {
  const L = useL();
  const { language, tx } = useLanguage();
  /* 다른 언어로 볼 때는 영어 칸을 About 글 번역(tx)으로 */
  const pick = (v?: { ko: string; en: string }) => (v ? (language === "ko" ? v.ko : tx(v.en || v.ko)) : "");
  const n = aboutDecisions.length;
  const { step, setStep, current } = useFrameSteps(n);
  const d = aboutDecisions[step];
  const extra = decisionExtras[d.id];
  const opts = extra?.options ?? [];
  const yOf = (k: number) => ((k + 0.5) / Math.max(1, opts.length)) * 100;
  const chosen = Math.max(0, opts.findIndex((o) => o.chosen));
  const midQ = (BR_Q + BR_O0) / 2;
  const midR = (BR_O1 + BR_R) / 2;
  /* 고민 과정 — 별이 고르지 않은 갈래부터 하나씩 그어 가 보고(검토 → ✕ 판정 → 선을 거두며 돌아온다), 마지막에 고른 갈래로 가서
     머문 뒤(✓) 갈래 글 위를 건너 결론까지 긋는다. 질문 아래 한 줄이 지금 무엇을 하는지 적는다. 지금 프레임일 때만, 결정이 바뀌면 처음부터.
     선은 별이 지나간 만큼만 그어진다(path 의 d 를 프레임마다 다시 쓴다 — pathLength 대시는 non-scaling-stroke 에서 점선이 된다) */
  const branchRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<SVGPathElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const probeRef = useRef<SVGPathElement>(null);
  const runnerRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const optRefs = useRef<(HTMLLIElement | null)[]>([]);
  const names = opts.map((o) => L(o.name));
  const say = {
    weighing: (k: number) => `${L(decisionsText.weighing)} · ${names[k]}`,
    out: (k: number) => `✕ ${L(decisionsText.ruledOut)} · ${names[k]}`,
    pick: (k: number) => `✓ ${L(decisionsText.picked)} · ${names[k]}`,
  };
  useEffect(() => {
    const box = branchRef.current, head = headRef.current, tail = tailRef.current, probe = probeRef.current;
    const runner = runnerRef.current, status = statusRef.current;
    if (!box || !head || !tail || !probe || !runner || !status || !opts.length) return;
    const li = (k: number) => optRefs.current[k];
    const mark = (k: number, st: string) => {
      const el = li(k);
      if (el) el.dataset.st = st;
    };
    const pathTo = (k: number): Pt[] => [[BR_Q, 50], [midQ, 50], [midQ, yOf(k)], [BR_O0, yOf(k)]];
    const yC = yOf(chosen);
    const P = pathTo(chosen);
    const HOP: Pt[] = [[BR_O0, yC], [BR_O1, yC]];
    const R: Pt[] = [[BR_O1, yC], [midR, yC], [midR, 50], [BR_R, 50]];
    const others = opts.map((_, k) => k).filter((k) => k !== chosen);
    const place = ([x, y]: Pt) => {
      runner.style.left = `${x}%`;
      runner.style.top = `${y}%`;
    };
    /* 긋는 동안은 떠다니는 길잡이 별(GuideStar)을 잠시 감추고, 같은 모양의 별(runnerStar)이 선 머리에 그대로 붙어 간다 —
       길잡이 별은 늦게 따라가는 별이라 선이 앞서고 꺾이는 곳에서 휘었다. 끝나면 길잡이 별이 그 자리에 바로 다시 나타난다 */
    const root = document.documentElement;
    const hold = (on: boolean) => {
      if (on) root.dataset.guideHold = "";
      else delete root.dataset.guideHold;
      box.toggleAttribute("data-drawing", on);
    };
    const finish = () => {
      hold(false);
      probe.setAttribute("d", "");
      head.setAttribute("d", toD(P));
      tail.setAttribute("d", toD(R));
      place(R[R.length - 1]);
      others.forEach((k) => mark(k, "no"));
      mark(chosen, "yes");
      status.textContent = say.pick(chosen);
      box.dataset.run = "done";
    };
    /* 좁은 화면(선을 그리지 않는다) · 움직임 줄이기 · 지금 프레임이 아님 — 다 그어진 채로(판정도 다 붙은 채로) */
    if (!current || matchMedia("(prefers-reduced-motion: reduce)").matches || getComputedStyle(head.ownerSVGElement!).display === "none") {
      finish();
      return;
    }
    /* 판의 레이아웃 크기 — 카메라가 날아오는 동안 getBoundingClientRect 는 줄어든 크기라 빠르기가 틀어진다 */
    const w = box.offsetWidth, h = box.offsetHeight;
    const len = (pts: Pt[]) => walkTo(pts, 0, w, h).len;

    /* 시간표 — 마디마다 길이(ms)와 그 동안 할 일(0 ~ 길이의 경과 ms) */
    type Beat = { ms: number; run: (t: number) => void };
    const beats: Beat[] = [];
    for (const k of others) {
      const pk = pathTo(k), lk = len(pk);
      beats.push({
        ms: lk / RUN_SPEED,
        run: (t) => {
          mark(k, "probe");
          status.textContent = say.weighing(k);
          const r = walkTo(pk, t * RUN_SPEED, w, h);
          probe.setAttribute("d", toD(r.done));
          place(r.at);
        },
      });
      beats.push({
        ms: RUN_THINK,
        run: () => {
          mark(k, "no");
          status.textContent = say.out(k);
          probe.setAttribute("d", toD(pk));
          place(pk[pk.length - 1]);
        },
      });
      /* 거두며 돌아온다 — 빠르게 */
      beats.push({
        ms: lk / (RUN_SPEED * 2),
        run: (t) => {
          const r = walkTo(pk, lk - t * RUN_SPEED * 2, w, h);
          probe.setAttribute("d", toD(r.done));
          place(r.at);
        },
      });
    }
    const lP = len(P), lH = len(HOP), lR = len(R);
    beats.push({
      ms: lP / RUN_SPEED,
      run: (t) => {
        probe.setAttribute("d", "");
        mark(chosen, "probe");
        status.textContent = say.weighing(chosen);
        const r = walkTo(P, t * RUN_SPEED, w, h);
        head.setAttribute("d", toD(r.done));
        place(r.at);
      },
    });
    beats.push({
      ms: RUN_REST,
      run: () => {
        head.setAttribute("d", toD(P));
        place(P[P.length - 1]);
        mark(chosen, "yes");
        status.textContent = say.pick(chosen);
        box.dataset.run = "rest";
      },
    });
    beats.push({
      ms: (lH / RUN_SPEED) * 0.6,
      run: (t) => {
        place(walkTo(HOP, (t / ((lH / RUN_SPEED) * 0.6)) * lH, w, h).at);
        box.dataset.run = "hop";
      },
    });
    beats.push({
      ms: lR / RUN_SPEED,
      run: (t) => {
        const r = walkTo(R, t * RUN_SPEED, w, h);
        tail.setAttribute("d", toD(r.done));
        place(r.at);
      },
    });

    head.setAttribute("d", "");
    tail.setAttribute("d", "");
    probe.setAttribute("d", "");
    opts.forEach((_, k) => li(k)?.removeAttribute("data-st"));
    status.textContent = "";
    place(P[0]);
    box.dataset.run = "go";
    let raf = 0;
    const t0 = performance.now() + RUN_START;
    const tick = (now: number) => {
      let t = now - t0;
      if (t >= 0) {
        if (!box.hasAttribute("data-drawing")) hold(true);
        const b = beats.find((x) => (t < x.ms ? true : ((t -= x.ms), false)));
        if (!b) {
          finish();
          return;
        }
        b.run(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      hold(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 길은 결정(d.id) · 고른 갈래 · 언어(문장)로 정해진다
  }, [current, d.id, chosen, opts.length, language]);
  return (
    <div className={styles.decisions}>
      <div className={styles.decisionsHead}>
        <span className={fx.sceneLabel}>{L(decisionsText.label)}</span>
        <h3 className={styles.blockTitle}>{L(decisionsText.title)}</h3>
      </div>

      {/* 결정 번호 줄 — 별자리처럼 별 여섯이 점선으로 이어지고, 지금 결정까지 선이 채워진다. 누르면 그 결정으로 */}
      <ol className={styles.decIndex} aria-label={L(decisionsText.label)}>
        {aboutDecisions.map((x, i) => (
          <li key={x.id} className={styles.decIndexItem} data-on={i === step || undefined} data-past={i < step || undefined}>
            <Pressable
              className={styles.decIndexRow}
              data-on={i === step || undefined}
              aria-current={i === step ? "step" : undefined}
              aria-label={`${pad2(i + 1)} ${pick(x.title) || pick(x.problem)}`}
              onClick={() => setStep(i)}
            >
              <StarMark className={styles.decIndexStar} />
              <span className={styles.decIndexNum}>{pad2(i + 1)}</span>
            </Pressable>
          </li>
        ))}
      </ol>

      <article key={d.id} className={styles.record}>
        <header className={styles.recordHead}>
          <span className={styles.recordMeta}>
            {pick(d.section)}
            <span className={styles.difficulty} aria-label={`${L(decisionsText.difficulty)} ${d.difficulty ?? 1}/3`}>
              {[1, 2, 3].map((k) => (
                <StarMark key={k} className={`${styles.diffStar} ${k <= (d.difficulty ?? 1) ? styles.diffOn : ""}`} />
              ))}
            </span>
          </span>
          <h4 className={styles.recordTitle}>{pick(d.title) || pick(d.problem)}</h4>
        </header>

        <div ref={branchRef} className={styles.branch} data-run="go" style={{ "--n": opts.length } as CSSProperties}>
          {/* 선 — 질문에서 갈래마다 꺾여 내려가고, 고른 갈래만 결론까지 이어진다 */}
          <svg className={styles.branchSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {opts.map((o, k) =>
              o.chosen ? null : <path key={k} className={styles.branchLine} d={`M ${BR_Q} 50 H ${midQ} V ${yOf(k)} H ${BR_O0}`} />,
            )}
            <path ref={probeRef} className={styles.branchLine} data-probe="" />
            <path ref={headRef} className={styles.branchLine} data-chosen="" />
            <path ref={tailRef} className={styles.branchLine} data-chosen="" />
          </svg>

          {/* 길잡이 별이 앉는 자리 — 별이 긋는 길의 머리(효과에서 자리를 옮긴다) */}
          <span ref={runnerRef} className={styles.branchRunner} data-guide="" data-guide-priority="1" aria-hidden>
            <StarMark className={styles.runnerStar} />
          </span>

          {/* 질문 */}
          <div className={styles.branchQ}>
            <span className={styles.decisionLabel}>{L(decisionsText.problem)}</span>
            <p>{pick(d.problem)}</p>
            {/* 고민 과정 한 줄 — 지금 검토하는 갈래와 판정(효과가 글을 바꾼다) */}
            <p ref={statusRef} className={styles.branchStatus} aria-live="polite" />
            <StarMark className={styles.branchNode} data-at="q" />
          </div>

          {/* 갈래 — 고른 것은 별이 앉고, 고르지 않은 것은 흐리게 */}
          <ul className={styles.branchOpts} aria-label={L(decisionsText.options)}>
            {opts.map((o, k) => (
              <li
                key={o.name.en}
                ref={(el) => {
                  optRefs.current[k] = el;
                }}
                className={styles.branchOpt}
                data-chosen={o.chosen || undefined}
                style={{ "--y": `${yOf(k)}%` } as CSSProperties}>
                <StarMark className={styles.branchNode} data-at="opt" />
                {o.chosen && <span className={styles.branchGuide} data-guide="" data-guide-priority="1" aria-hidden />}
                <span className={styles.optionName}>{L(o.name)}</span>
                <span className={styles.optionNote}>{L(o.note)}</span>
                <span className={styles.optionVerdict}>
                  {o.chosen ? "✓" : "✕"} {L(o.verdict)}
                </span>
              </li>
            ))}
          </ul>

          {/* 결론 — 남은 원칙과 트레이드오프 */}
          <div className={styles.branchR}>
            <StarMark className={styles.branchNode} data-at="r" />
            <blockquote className={styles.decisionInsight}>{firstBold(pick(d.keyInsight))}</blockquote>
            {extra && (
              <p className={styles.branchCost}>
                <span className={styles.decisionLabel}>{L(decisionsText.cost)}</span>
                {L(extra.cost)}
              </p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

/** 장 제목 — 단계 수는 데이터에서 센다 */
const makingTitle = (() => {
  const fill = (t: string) => t.replace("{phases}", String(aboutProcess.length));
  return { ko: fill(makingChapter.title.ko), en: fill(makingChapter.title.en) };
})();
