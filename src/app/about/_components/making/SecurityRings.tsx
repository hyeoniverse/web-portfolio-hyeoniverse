"use client";

/* 보안 — 겹겹이 막는 고리 그림. 프레지 프레임 한 화면에 그림 · 겹 고르기 · 설명이 다 들어간다.
   가운데 별(데이터)을 겹 고리가 둘러싸고, 바깥(브라우저)에서 안(비밀값)으로 갈수록 깊은 방어다.
   프레임 단계 하나가 한 겹이다 — 휠 한 번이면 요청 빛이 다음 고리로 옮겨 가며 그 겹을 켜고, 옆 설명이 바뀐다.
   좁은 화면은 설명이 길어 한 화면에 다 못 넣으니 단계를 항목 하나씩으로 쪼갠다(빛은 그 항목의 별 위에 앉는다).
   고리나 목록을 누르면 그 겹 단계로 바로 간다. 길잡이 별은 요청 빛 위에 앉는다.
   글자는 실제 크기로 그리려고 viewBox 를 그림의 실제 폭(px)에 맞춘다 — 비율로 늘이면 휴대폰에서 글자가 12px 아래로 준다. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { aboutSecurity } from "@/data/generated/aboutContent";


import { STAR_PATH, StarMark, useL, useWide } from "../features/shared";
import { useFrameSteps } from "../prezi/context";
import fx from "../features/Features.module.css";
import styles from "./SecurityRings.module.css";
import { useAboutText } from "../../_panels/AboutConfig";
/* 고리 · 항목 수와 각도는 코드 기본값 — 관리자는 글만 바꾼다 */
import { securityLayers as securityLayersBase } from "../../_data/security";

const N = securityLayersBase.length;
const byIcon = new Map(aboutSecurity.map((s) => [s.icon, s]));

/** 요청이 각 겹에서 멈추는 자리(도) — 겹 이름(위쪽 가운데)과 항목 자리를 피해 골랐다 */
const STOP_ANGLES = [220, 300, 380, 430, 520];
/** 프레임에 들어올 때 요청이 출발하는 방향 */
const START_ANGLE = 170;
/** 한 겹에서 다음 겹으로 옮겨 가는 시간(ms) — 고리가 한 번 퍼지는 것도 이만큼 기다렸다 시작한다(CSS --_travel 과 같은 값) */
const TRAVEL = 900;
/** 요청 빛 뒤에 끌리는 잔상 — 개수와 시차(ms) */
const GHOSTS = 4;
const GHOST_LAG = 45;
/** 고리 글자를 고리에서 띄우는 거리와 대문자 높이(px) — 글자 크기(12px)에 맞춘 값 */
const TEXT_GAP = 5;
const CAP = 9;
/** 이 폭(px)보다 좁으면 고리 위 항목 이름은 감춘다 — 목록과 설명이 대신한다 */
const ITEM_TEXT_MIN = 420;
/** 고리 사이가 이보다 좁으면(px) 겹 이름은 지금 겹 것만 적는다 — 이름끼리 포개지지 않게 */
const RING_TEXT_GAP = 18;

/** 단계 하나 — 넓은 화면은 겹 하나(item 없음), 좁은 화면은 항목 하나 */
interface Stop {
  layer: number;
  item: number | null;
  angle: number;
}
const LAYER_STOPS: Stop[] = securityLayersBase.map((_, i) => ({ layer: i, item: null, angle: STOP_ANGLES[i] }));
const ITEM_STOPS: Stop[] = securityLayersBase.flatMap((l, i) => l.items.map((it, j) => ({ layer: i, item: j, angle: it.angle })));

/** 본문의 **굵게** · `코드` 만 살린다 */
function Rich({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className={styles.code}>{part.slice(1, -1)}</code>;
    return part;
  });
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const easeInOut = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;
const pad2 = (n: number) => String(n).padStart(2, "0");

function geometry(w: number) {
  const c = w / 2;
  const outer = c - Math.max(CAP + TEXT_GAP + 8, w * 0.04);
  const core = outer * 0.16;
  const step = (outer - core) / N;
  const radii = securityLayersBase.map((_, i) => outer - i * step);
  /* 요청이 출발하는 곳 — 바깥 고리 한 칸 밖 */
  const start = Math.min(c, outer + step);
  return { c, outer, core, step, radii, start };
}
type Geo = ReturnType<typeof geometry>;

const pt = (g: Geo, r: number, deg: number): [number, number] => [g.c + r * Math.cos(rad(deg)), g.c + r * Math.sin(rad(deg))];

/** 고리를 따라 가는 호 — 글자를 얹을 길. to 가 크면 시계 방향 */
function arc(g: Geo, r: number, from: number, to: number) {
  const [x0, y0] = pt(g, r, from);
  const [x1, y1] = pt(g, r, to);
  const sweep = to > from ? 1 : 0;
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** 밤하늘 잔별 — 늘 같은 자리(서버와 브라우저가 같게) */
function makeSky(count: number) {
  let s = 7;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, () => ({ x: rand(), y: rand(), r: 0.5 + rand() * 1.1, d: rand() }));
}

interface Polar {
  r: number;
  a: number;
}

export default function SecurityRings() {
  const { securityText, securityLayers, securityRingsText } = useAboutText().decisions;
  const L = useL();
  const { language } = useLanguage();
  const wide = useWide();
  const stops = wide ? LAYER_STOPS : ITEM_STOPS;
  const { step, setStep, current } = useFrameSteps(stops.length);
  const stop = stops[Math.min(step, stops.length - 1)];
  const lit = stop.layer;

  const boxRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const ghostRefs = useRef<(SVGCircleElement | null)[]>([]);
  const anchorRef = useRef<HTMLSpanElement>(null);
  /* 요청 빛의 지금 자리 — 옮겨 가는 도중에 단계가 또 바뀌면 이 자리에서 이어 간다 */
  const posRef = useRef<Polar | null>(null);

  const [w, setW] = useState(560);
  const g = useMemo(() => geometry(w), [w]);
  const sky = useMemo(() => makeSky(42), []);

  /* 그림 폭 재기 */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const next = Math.round(e.contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 요청 빛 · 잔상 · 길잡이 자리를 한 점으로 옮긴다 — 매 프레임이라 렌더를 거치지 않는다.
     첫 자리를 잡으면 data-ready 를 단다 — 그 전엔 빛과 길잡이 자리가 그림 왼쪽 위 구석에 있어 숨겨 둔다 */
  const place = (p: Polar) => {
    const [x, y] = pt(g, p.r, p.a);
    boxRef.current?.setAttribute("data-ready", "");
    dotRef.current?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const a = anchorRef.current;
    if (a) {
      a.style.left = `${x.toFixed(1)}px`;
      a.style.top = `${y.toFixed(1)}px`;
    }
    return [x, y] as const;
  };

  /* 단계가 바뀌면 — 요청 빛이 지금 자리에서 그 겹(항목)의 멈춤 자리로 고리를 따라 옮겨 간다.
     지금 프레임이 아니면 바깥 출발점에 세워 두었다가, 프레임에 들어오면 바깥에서 첫 겹으로 날아든다 */
  useEffect(() => {
    const box = boxRef.current;
    const outside: Polar = { r: g.start, a: START_ANGLE };
    const target: Polar = { r: g.radii[stop.layer], a: stop.angle };
    const settle = (p: Polar) => {
      posRef.current = p;
      place(p);
      box?.removeAttribute("data-running");
      ghostRefs.current.forEach((el) => {
        el?.setAttribute("cx", "0");
        el?.setAttribute("cy", "0");
      });
    };
    if (!current) {
      settle(outside);
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle(target);
      return;
    }
    const from = posRef.current ?? outside;
    /* 각도는 짧은 쪽으로 돈다 */
    const da = ((((target.a - from.a) % 360) + 540) % 360) - 180;
    const at = (t: number): Polar => {
      const e = easeInOut(Math.min(1, Math.max(0, t / TRAVEL)));
      return { r: from.r + (target.r - from.r) * e, a: from.a + da * e };
    };
    box?.setAttribute("data-running", "");
    let raf = 0;
    let live = from;
    const begin = performance.now();
    const tick = (now: number) => {
      const t = now - begin;
      live = at(t);
      const [x, y] = place(live);
      ghostRefs.current.forEach((el, i) => {
        if (!el) return;
        const gp = at(t - (i + 1) * GHOST_LAG);
        const [gx, gy] = pt(g, gp.r, gp.a);
        el.setAttribute("cx", (gx - x).toFixed(1));
        el.setAttribute("cy", (gy - y).toFixed(1));
      });
      if (t >= TRAVEL + GHOSTS * GHOST_LAG) {
        settle(target);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      posRef.current = live;
    };
    // place 는 g 만 읽는다 — g 가 바뀌면 이 효과도 다시 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, g, stop.layer, stop.angle]);

  /** 그 겹으로 — 좁은 화면이면 그 겹의 첫 항목 단계 */
  const goLayer = (i: number) => setStep(Math.max(0, stops.findIndex((s) => s.layer === i)));

  const ringState = (i: number) => (i === lit ? "now" : i < lit ? "past" : undefined);
  const showItemText = w >= ITEM_TEXT_MIN;
  const ariaLabel = L(securityRingsText.diagram).replace("{layers}", securityLayers.map((l) => L(l.name)).join(", "));

  return (
    <div className={styles.security}>
      <div className={styles.head}>
        <span className={fx.sceneLabel}>{L(securityText.label)}</span>
        <h3 className={styles.title}>{L(securityText.title)}</h3>
      </div>

      <div className={styles.stage}>
        <div className={styles.diagramBox}>
          <div ref={boxRef} className={styles.diagram}>
            <svg className={styles.svg} viewBox={`0 0 ${w} ${w}`} role="img" aria-label={ariaLabel}>
              {/* 잔별 */}
              <g aria-hidden>
                {sky.map((s, i) => (
                  <circle
                    key={i}
                    className={styles.skyStar}
                    cx={(s.x * w).toFixed(1)}
                    cy={(s.y * w).toFixed(1)}
                    r={s.r.toFixed(2)}
                    style={{ "--d": s.d.toFixed(2) } as CSSProperties}
                  />
                ))}
              </g>

              {/* 고리 — 바깥이 0 */}
              {securityLayers.map((layer, i) => {
                const r = g.radii[i];
                const state = ringState(i);
                return (
                  <g key={layer.id} className={styles.ring} data-state={state} aria-hidden>
                    <circle className={styles.ringLine} cx={g.c} cy={g.c} r={r} />
                    {/* 요청이 닿는 순간 한 번 퍼진다 — 단계마다 새로 그려 다시 돈다 */}
                    {state === "now" && current && <circle key={step} className={styles.ringPulse} cx={g.c} cy={g.c} r={r} />}
                    {/* 겹 이름 — 위쪽 가운데 고리 바깥에 */}
                    <path id={`sec-ring-${layer.id}`} d={arc(g, r + TEXT_GAP, -180, 0)} fill="none" />
                    <text className={styles.ringLabel} data-hidden={(state !== "now" && g.step < RING_TEXT_GAP) || undefined}>
                      <textPath href={`#sec-ring-${layer.id}`} startOffset="50%" textAnchor="middle">
                        {pad2(i + 1)} {L(layer.name)}
                      </textPath>
                    </text>
                    {/* 항목 — 고리 위 작은 별, 이름은 별 뒤로 고리를 따라 */}
                    {layer.items.map((it, j) => {
                      const [x, y] = pt(g, r, it.angle);
                      const focus = state === "now" && (stop.item === null || stop.item === j);
                      const size = focus ? 14 : 10;
                      const lower = Math.sin(rad(it.angle)) >= 0;
                      const lead = ((size / 2 + 4) / r) * (180 / Math.PI);
                      const id = `sec-item-${it.icon}`;
                      /* 아래 반쪽은 반시계로 그려야 글자가 바로 선다 — 그러면 글자가 안쪽으로 서니 대문자 높이만큼 더 띄운다 */
                      const d = lower
                        ? arc(g, r + TEXT_GAP + CAP, it.angle - lead, it.angle - lead - 160)
                        : arc(g, r + TEXT_GAP, it.angle + lead, it.angle + lead + 160);
                      return (
                        <g key={it.icon} data-focus={focus || undefined}>
                          <path
                            className={styles.node}
                            d={STAR_PATH}
                            transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${size / 100})`}
                          />
                          {showItemText && (
                            <>
                              <path id={id} d={d} fill="none" />
                              <text className={styles.itemLabel}>
                                <textPath href={`#${id}`}>{L(it.short)}</textPath>
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* 가운데 — 데이터 */}
              <g className={styles.core} aria-hidden>
                <circle className={styles.coreHalo} cx={g.c} cy={g.c} r={g.core * 1.1} />
                <g transform={`translate(${g.c} ${g.c})`}>
                  <g className={styles.coreSpin}>
                    <path
                      className={styles.coreStar}
                      d={STAR_PATH}
                      transform={`scale(${(g.core * 1.5) / 100}) translate(-50 -50)`}
                    />
                  </g>
                </g>
                <text className={styles.coreLabel} x={g.c} y={g.c + g.core * 0.75 + CAP + TEXT_GAP} textAnchor="middle">
                  {L(securityRingsText.core)}
                </text>
              </g>

              {/* 요청 빛 — 잔상은 빛을 기준으로 한 상대 좌표 */}
              <g ref={dotRef} className={styles.request} aria-hidden>
                {Array.from({ length: GHOSTS }, (_, i) => (
                  <circle
                    key={i}
                    ref={(el) => { ghostRefs.current[i] = el; }}
                    className={styles.ghost}
                    r={(3.5 - i * 0.6).toFixed(1)}
                    style={{ "--i": i } as CSSProperties}
                  />
                ))}
                <circle className={styles.requestGlow} r={9} />
                <circle className={styles.requestCore} r={3.5} />
              </g>

              {/* 고리 고르기 — 고리마다 한 칸 두께의 투명한 띠. 키보드는 옆 목록이 맡는다 */}
              <g aria-hidden>
                {securityLayers.map((layer, i) => (
                  <circle
                    key={layer.id}
                    className={styles.hit}
                    cx={g.c}
                    cy={g.c}
                    r={g.radii[i]}
                    strokeWidth={g.step}
                    onClick={() => goLayer(i)}
                  />
                ))}
              </g>
            </svg>
            {/* 길잡이 별이 앉을 자리 — 요청 빛을 따라간다 */}
            <span ref={anchorRef} className={styles.anchor} data-guide="" data-guide-priority="1" data-guide-fill="var(--text-white)" aria-hidden />
          </div>
        </div>

        <div className={styles.side}>
          <div className={styles.list} role="group" aria-label={L(securityRingsText.listLabel)}>
            {securityLayers.map((layer, i) => (
              <Pressable
                key={layer.id}
                className={styles.row}
                aria-label={`${pad2(i + 1)} ${L(layer.name)}`}
                aria-pressed={lit === i}
                data-now={lit === i || undefined}
                data-past={i < lit || undefined}
                onClick={() => goLayer(i)}
              >
                <span className={styles.rowNum}>{pad2(i + 1)}</span>
                <span className={styles.rowName}>{L(layer.name)}</span>
                <span className={styles.rowCount}>
                  {L(layer.items.length === 1 ? securityRingsText.itemOne : securityRingsText.items).replace("{n}", String(layer.items.length))}
                </span>
              </Pressable>
            ))}
          </div>

          {/* 설명 — 단계마다 한 장. 모두 한 칸에 겹쳐 두어 높이가 가장 긴 장에 맞춰 고정되고, 지금 것만 보인다 */}
          <div className={styles.details} aria-live="polite">
            {stops.map((s, k) => {
              const layer = securityLayers[s.layer];
              const on = k === step;
              const items = s.item === null ? layer.items : [layer.items[s.item]];
              return (
                <section
                  key={`${s.layer}-${s.item ?? "all"}`}
                  className={styles.detail}
                  data-on={on || undefined}
                  data-side={k < step ? "past" : k > step ? "next" : undefined}
                  aria-hidden={!on}
                  inert={!on}
                >
                  <header className={styles.detailHead}>
                    <span className={styles.detailNum}>{pad2(s.layer + 1)}</span>
                    <h4 className={styles.detailName}>{L(layer.name)}</h4>
                    {s.item !== null && layer.items.length > 1 && (
                      <span className={styles.detailOf}>
                        {s.item + 1} / {layer.items.length}
                      </span>
                    )}
                    <p className={styles.detailCaption}>{L(layer.caption)}</p>
                  </header>
                  <ul className={styles.items}>
                    {items.map((it, j) => {
                      const sec = byIcon.get(it.icon);
                      if (!sec) return null;
                      const en = language === "en";
                      return (
                        <li key={it.icon} className={styles.item} style={{ "--j": j } as CSSProperties}>
                          <div className={styles.itemHead}>
                            <StarMark className={styles.itemStar} />
                            <h5 className={styles.itemTitle}>{en ? sec.title_en : sec.title_ko}</h5>
                            <span className={styles.scope}>{en ? sec.scope_en : sec.scope_ko}</span>
                          </div>
                          <p className={styles.itemBody}>
                            <Rich text={en ? sec.description_en : sec.description_ko} />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
