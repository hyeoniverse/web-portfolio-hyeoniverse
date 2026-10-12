"use client";

/* 토큰 별하늘 — 이 사이트의 디자인 토큰 하나가 별 하나(src/data/generated/tokenSky.ts, 빌드 전 CSS 에서 굽는다).
   별은 그 토큰의 생김새로 그린다 — 색은 그 색, 크기는 그 크기의 네모, 여백은 그 여백을 두른 상자, 모서리는 그 둥글기,
   그림자는 그 그림자, 글자는 그 글꼴 · 크기 · 굵기로 쓴 글자, 움직임은 그 길이 · 곡선으로 오가는 점. 값은 var() 로 읽어 테마를 따른다.
   표지(cover)는 무리 넷으로 흩어진 하늘, 다섯 칸은 해당 별들이 하늘에서 빠져나와 정렬된 견본으로 줄을 선다 —
   층은 세 줄, 색은 팔레트 줄, 글자는 묶음 · 크기 순서, 움직임은 길이 · 곡선. 별은 칸 사이를 날아서 옮겨 간다 */
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { tokenSky, type TokenGroup, type TokenKind, type TokenLayer } from "@/data/generated/tokenSky";
import { useL } from "../features/shared";
import type { L10n } from "../../_data/showcase";
import styles from "./TokenSky.module.css";
import { useAboutText } from "../../_panels/AboutConfig";
import { guardRows as guardBase } from "../../_data/design";

/** 하늘 판의 좌표 — 가로 150 · 세로 100(판은 3:2) */
const W = 150;

type Tok = { name: string; layer: TokenLayer; group: TokenGroup; kind: TokenKind; px: number | null; t: number };
/** 별 하나의 자리 — 좌표 · 크기 배율 */
type Spot = { x: number; y: number; s: number };
type Layout = Map<string, Spot>;

/* 이름으로 정해지는 0~1 — 별마다 조금씩 흔들고, 움직이는 차례를 섞는다(그릴 때마다 같다) */
function hash(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const TOKENS: Tok[] = tokenSky.map(([name, layer, group, kind, px]) => ({ name, layer, group, kind, px, t: hash(name, 3) }));
const BY_NAME = new Map(TOKENS.map((t) => [t.name, t]));

const LAYERS: TokenLayer[] = ["raw", "role", "component"];
const LAYER_NAME: Record<TokenLayer, L10n> = {
  raw: { ko: "원시", en: "Raw" },
  role: { ko: "역할", en: "Role" },
  component: { ko: "컴포넌트", en: "Component" },
};

/* ── 표지 — 무리 넷의 해바라기 씨 나선(황금각). 컴포넌트가 가운데, 원시가 바깥 ── */

const CLUSTERS: Record<TokenGroup, { cx: number; cy: number; r: number; name: L10n }> = {
  color: { cx: 44, cy: 50, r: 37, name: { ko: "색", en: "Color" } },
  type: { cx: 108, cy: 28, r: 18, name: { ko: "글자", en: "Type" } },
  form: { cx: 104, cy: 75, r: 21, name: { ko: "간격 · 모양", en: "Space · shape" } },
  motion: { cx: 138, cy: 50, r: 7, name: { ko: "움직임", en: "Motion" } },
};
const GROUPS = Object.keys(CLUSTERS) as TokenGroup[];
const COVER_SCALE = 0.34;

const SKY: Layout = (() => {
  const out: Layout = new Map();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (const g of GROUPS) {
    const { cx, cy, r } = CLUSTERS[g];
    const list = TOKENS.filter((t) => t.group === g).sort((a, b) => LAYERS.indexOf(b.layer) - LAYERS.indexOf(a.layer));
    const j = (r / Math.sqrt(list.length)) * 0.35;
    list.forEach((t, i) => {
      const rad = r * Math.sqrt((i + 0.5) / list.length);
      out.set(t.name, {
        x: cx + Math.cos(i * golden) * rad + (hash(t.name, 1) - 0.5) * j,
        y: cy + Math.sin(i * golden) * rad + (hash(t.name, 2) - 0.5) * j,
        s: COVER_SCALE,
      });
    });
  }
  return out;
})();

/* ── 칸마다 줄 세우기 — 나오지 않는 별은 하늘 자리로 돌아가며 사라진다 ── */

/** 사각 칸에 차례로 — 왼쪽 위부터 cols 칸씩 */
function grid(list: Tok[], x0: number, y0: number, w: number, h: number, cols: number, s: number, out: Layout) {
  const rows = Math.max(1, Math.ceil(list.length / cols));
  const cw = w / cols;
  const ch = h / rows;
  list.forEach((t, i) => out.set(t.name, { x: x0 + cw * ((i % cols) + 0.5), y: y0 + ch * (Math.floor(i / cols) + 0.5), s }));
}

/** 층 — 세 줄. 줄 안은 무리 → CSS 순서(색 · 글자 · 모양 · 움직임이 띠처럼 이어진다) */
function layersLayout(): Layout {
  const out: Layout = new Map();
  const order: TokenGroup[] = ["color", "type", "form", "motion"];
  LAYERS.forEach((l, k) => {
    const list = TOKENS.filter((t) => t.layer === l).sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
    grid(list, 22, 6 + k * 31, 126, 26, Math.ceil(Math.sqrt(list.length * (126 / 26))), 0.4, out);
  });
  return out;
}

/** 색 — 왼쪽 팔레트(원시: 계열마다 한 줄, 밝은 것부터), 오른쪽 역할 · 컴포넌트 색(이름순 — 접두어끼리 모인다) */
function colorLayout(): Layout {
  const out: Layout = new Map();
  const family = (t: Tok) => /^--color-([a-z]+)-\d/.exec(t.name)?.[1] ?? "base";
  const raw = TOKENS.filter((t) => t.group === "color" && t.layer === "raw");
  [...new Set(raw.map(family))].forEach((f, r) => {
    raw.filter((t) => family(t) === f).forEach((t, i) => out.set(t.name, { x: 9 + i * 6.2, y: 10 + r * 8, s: 0.85 }));
  });
  const roles = TOKENS.filter((t) => t.group === "color" && t.layer !== "raw").sort((a, b) => a.name.localeCompare(b.name));
  grid(roles, 82, 8, 66, 88, 12, 0.7, out);
  return out;
}

/** 글자 — 위 묶음(--font-*), 가운데 크기 눈금, 아래 굵기 · 글꼴 · 줄간격 · 자간 */
function typeLayout(): Layout {
  const out: Layout = new Map();
  const of = (k: TokenKind[]) => TOKENS.filter((t) => k.includes(t.kind));
  /* 묶음 · 크기 눈금은 작은 글자부터(크기는 생성기가 1440px 화면 기준으로 계산했다) */
  const bySize = (list: Tok[]) => [...list].sort((a, b) => (a.px ?? 0) - (b.px ?? 0));
  grid(bySize(of(["font"])), 2, 8, 146, 34, 11, 1, out);
  grid(bySize(of(["fontSize"])), 2, 52, 146, 24, 18, 1, out);
  grid(of(["fontWeight", "fontFamily", "lineHeight", "tracking"]), 2, 84, 146, 12, 23, 1, out);
  return out;
}

/** 움직임 — 왼쪽 길이 다섯, 오른쪽 곡선 넷. 오가는 점이 잘 보이게 크게 */
function motionLayout(): Layout {
  const out: Layout = new Map();
  TOKENS.filter((t) => t.kind === "duration").forEach((t, i) => out.set(t.name, { x: 42, y: 20 + i * 16, s: 2 }));
  TOKENS.filter((t) => t.kind === "ease").forEach((t, i) => out.set(t.name, { x: 108, y: 24 + i * 19, s: 2 }));
  return out;
}

const LAYOUTS: Layout[] = [layersLayout(), colorLayout(), typeLayout(), motionLayout(), layersLayout()];

/* ── 짚을 것 — 판의 번호 별과 옆 목록이 같은 번호 ── */

export type SkyMode = "cover" | 0 | 1 | 2 | 3 | 4;

type Pin = { key: string; x: number; y: number; label: ReactNode; sub?: ReactNode; bad?: boolean };

/** 층 칸 — 단추 하나가 세 층을 거친다(_semantic.css 의 --bg-inverse 가 라이트에서 --color-neutral-950 을 가리킨다) */
const CHAIN = ["--color-neutral-950", "--bg-inverse", "--control-height-md"];
const FONT_PINS = ["--font-grotesk-headline-sm", "--font-body-md", "--font-code-sm", "--font-grotesk-micro"];
const MOTION_PINS = ["--duration-base", "--duration-slow", "--ease-standard", "--ease-enter"];
/** 검사 칸 — 손으로 쓴 값. 위에서 떨어지다 해당하는 줄 위에서 막힌다 */
const BAD: { value: string; tool: string; x: number; y: number }[] = [
  { value: "color: #ff4fa0", tool: guardBase[0].tool, x: 40, y: 4 },
  { value: "font-size: 11px", tool: guardBase[1].tool, x: 78, y: 35 },
  { value: "padding: 13px", tool: guardBase[2].tool, x: 112, y: 66 },
  { value: "border-radius: 7px", tool: guardBase[3].tool, x: 138, y: 35 },
];

type Caption = { text: ReactNode; x: number; y: number };

/** 칸마다 판 위 작은 제목 — 줄의 이름 */
function useCaptions(mode: SkyMode): Caption[] {
  const L = useL();
  const count = (l: TokenLayer) => TOKENS.filter((t) => t.layer === l).length;
  if (mode === 0 || mode === 4)
    return LAYERS.map((l, k) => ({ text: <>{L(LAYER_NAME[l])} <b>{count(l)}</b></>, x: 2, y: 19 + k * 31 }));
  if (mode === 1)
    return [
      { text: L({ ko: "팔레트 — 원시", en: "Palette — raw" }), x: 6, y: 3 },
      { text: L({ ko: "역할 · 컴포넌트", en: "Role · component" }), x: 82, y: 3 },
    ];
  if (mode === 2)
    return [
      { text: L({ ko: "글자 묶음 — 크기 · 줄간격 · 굵기 · 글꼴", en: "Bundles — size · leading · weight · family" }), x: 2, y: 3 },
      { text: L({ ko: "크기 눈금", en: "Size scale" }), x: 2, y: 48 },
      { text: L({ ko: "굵기 · 글꼴 · 줄간격 · 자간", en: "Weight · family · leading · tracking" }), x: 2, y: 80 },
    ];
  if (mode === 3)
    return [
      { text: L({ ko: "길이", en: "Durations" }), x: 28, y: 8 },
      { text: L({ ko: "곡선", en: "Curves" }), x: 94, y: 8 },
    ];
  return [];
}

/** 글자 별에 쓰는 글자 */
const GLYPH: Partial<Record<TokenKind, string>> = { font: "가", fontSize: "가", fontWeight: "가", fontFamily: "Aa", tracking: "AVA" };

export default function TokenSky({ mode, live, motionValue }: { mode: SkyMode; live: boolean; motionValue?: (name: string) => string }) {
  const { contrastRows } = useAboutText().design;
  const L = useL();
  const layout = mode === "cover" ? SKY : LAYOUTS[mode];
  const captions = useCaptions(mode);
  const skyRef = useRef<HTMLDivElement>(null);
  /* 돋보기 — 마우스(또는 목록 줄이 가리키는 별) 둘레 반지름 안의 별이 거리에 따라 커진다. 매 프레임 목표 배율로 조금씩 다가가
     (선형 보간) 들어올 때도 빠질 때도 부드럽다. 가장 가까운 별에 이름표를 단다(이름표는 판에 하나) */
  const tipRef = useRef<HTMLSpanElement>(null);
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const kickRef = useRef<() => void>(() => {});
  useEffect(() => {
    const sky = skyRef.current, tip = tipRef.current;
    if (!sky || !tip || !live) return;
    /* 별 자리는 칸이 정해지면 바뀌지 않는다 — 한 번만 읽어 둔다(0~1) */
    const toks = [...sky.querySelectorAll<HTMLElement>("[data-name]:not([data-out])")].map((el) => ({
      el,
      x: parseFloat(el.style.getPropertyValue("--x")) / 100,
      y: parseFloat(el.style.getPropertyValue("--y")) / 100,
      m: 1,
    }));
    let raf = 0;
    let hot: HTMLElement | null = null;
    const frame = () => {
      raf = 0;
      const w = sky.clientWidth, h = sky.clientHeight;
      const R = Math.max(56, w * 0.11);
      const aim = aimRef.current;
      let moving = false, best: HTMLElement | null = null, bestD = Infinity;
      for (const t of toks) {
        let target = 1;
        if (aim) {
          const d = Math.hypot(t.x * w - aim.x, t.y * h - aim.y);
          if (d < R) target = 1 + 1.2 * (1 - d / R) ** 2;
          if (d < bestD) { bestD = d; best = t.el; }
        }
        if (t.m === target) continue;
        /* 배율은 scale 에 바로 — 사용자 정의 속성을 바꾸면 견본 안까지 스타일을 다시 계산한다 */
        t.m = Math.abs(target - t.m) < 0.002 ? target : t.m + (target - t.m) * 0.22;
        t.el.style.scale = t.m === 1 ? "" : t.m.toFixed(3);
        if (t.m !== target) moving = true;
      }
      /* 이름표 — 반지름의 절반 안에 든 가장 가까운 별 */
      const next = best && bestD < R * 0.5 ? best : null;
      if (next !== hot) {
        hot?.removeAttribute("data-hot");
        next?.setAttribute("data-hot", "");
        hot = next;
      }
      if (hot) {
        const sr = sky.getBoundingClientRect();
        const r = (hot.firstElementChild as HTMLElement).getBoundingClientRect();
        tip.textContent = hot.dataset.name ?? "";
        tip.style.left = `${r.left + r.width / 2 - sr.left}px`;
        tip.style.top = `${r.bottom - sr.top}px`;
        tip.setAttribute("data-on", "");
      } else tip.removeAttribute("data-on");
      if (moving || hot) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;
    const move = (e: PointerEvent) => {
      const sr = sky.getBoundingClientRect();
      /* 판이 프레지 카메라로 줄어 있어도 판 안 좌표(레이아웃 px)로 */
      const sx = sky.clientWidth / sr.width, sy = sky.clientHeight / sr.height;
      aimRef.current = { x: (e.clientX - sr.left) * sx, y: (e.clientY - sr.top) * sy };
      kick();
    };
    const leave = () => {
      aimRef.current = null;
      kick();
    };
    sky.addEventListener("pointermove", move);
    sky.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      sky.removeEventListener("pointermove", move);
      sky.removeEventListener("pointerleave", leave);
      hot?.removeAttribute("data-hot");
      tip.removeAttribute("data-on");
    };
  }, [live, mode]);

  /* 글자 별의 크기 상한 — 묶음 · 크기 토큰은 실제 크기로 쓰되(눈금이 200px 까지 있다) 판을 덮지 않게, 그린 높이를 재서 줄인다 */
  useEffect(() => {
    const sky = skyRef.current;
    if (!sky) return;
    for (const el of sky.querySelectorAll<HTMLElement>("[data-cap]")) {
      /* 견본의 글자 높이(offsetHeight 는 scale 이 걸리기 전 크기) */
      const glyph = el.querySelector<HTMLElement>("[data-glyph]");
      if (!glyph) continue;
      const h = glyph.offsetHeight;
      el.style.setProperty("--cap", h > 40 ? String(40 / h) : "1");
    }
    /* 판 폭에 맞춘 배율 — 견본은 px 로 그리므로 좁은 판(모바일)에서는 같이 줄인다. 기준은 판 폭 720px */
    const ro = new ResizeObserver(([e]) => sky.style.setProperty("--k", String(Math.min(1.25, e.contentRect.width / 720))));
    ro.observe(sky);
    return () => ro.disconnect();
  }, [live]);

  const pins: Pin[] = useMemo(() => {
    const of = (n: string, label: ReactNode, sub?: ReactNode): Pin | null => {
      const s = mode === "cover" ? undefined : LAYOUTS[mode].get(n);
      return s ? { key: n, x: s.x, y: s.y, label, sub } : null;
    };
    const list: (Pin | null)[] =
      mode === 0
        ? CHAIN.map((n) => of(n, <code>{n}</code>, L(LAYER_NAME[BY_NAME.get(n)?.layer ?? "raw"])))
        : mode === 1
          ? contrastRows.map((r) => of(r.fg, <code>{r.fg}</code>, `${L(r.what)} · ${r.light} / ${r.dark}`))
          : mode === 2
            ? FONT_PINS.map((n) => of(n, <code>{n}</code>))
            : mode === 3
              ? MOTION_PINS.map((n) => of(n, <code>{n}</code>, motionValue?.(n)))
              : mode === 4
                ? BAD.map((b) => ({ key: b.value, x: b.x, y: b.y, bad: true, label: <code>{b.value}</code>, sub: `✕ ${b.tool}` }))
                : [];
    return list.filter((p): p is Pin => !!p);
  }, [mode, L, motionValue, contrastRows]);
  const pinned = new Set(pins.map((p) => p.key));
  const pinIndex = new Map(pins.map((p, i) => [p.key, i]));
  const pct = (x: number) => (x / W) * 100;
  /* 목록 줄에 올리면 판의 그 별 자리에 돋보기를 댄다 */
  const hot = (name: string, on: boolean) => {
    const sky = skyRef.current;
    const el = sky?.querySelector<HTMLElement>(`[data-name="${CSS.escape(name)}"]`);
    if (!sky || !el) return;
    aimRef.current = on
      ? { x: (parseFloat(el.style.getPropertyValue("--x")) / 100) * sky.clientWidth, y: (parseFloat(el.style.getPropertyValue("--y")) / 100) * sky.clientHeight }
      : null;
    kickRef.current();
  };

  return (
    <div className={styles.wrap} data-mode={mode} data-live={live || undefined} aria-hidden>
      <div className={styles.cell}>
        <div
          ref={skyRef}
          className={styles.sky}
          data-mode={mode}
          data-live={live || undefined}
        >
          {/* 별은 지금 프레임일 때만 그린다 — 옆 프레임(표지 ↔ 다섯 칸)이 같은 별 526개를 또 그리면 화면 밖에서도 비용이 두 배 */}
          {live && TOKENS.map((t) => {
            const s = layout.get(t.name);
            const home = SKY.get(t.name)!;
            const g = GLYPH[t.kind];
            return (
              <span
                key={t.name}
                className={styles.tok}
                data-kind={t.kind}
                data-out={!s || undefined}
                data-pin={pinned.has(t.name) || undefined}
                data-name={t.name}
                data-cap={t.kind === "font" || t.kind === "fontSize" || undefined}
                style={
                  {
                    "--x": pct((s ?? home).x),
                    "--y": (s ?? home).y,
                    "--s": s ? s.s : 0.1,
                    "--t": t.t,
                    "--v": `var(${t.name})`,
                  } as CSSProperties
                }
              >
                {/* 견본 — 번호는 견본 안에서 배율을 되돌린다 */}
                <span className={styles.spec}>
                  {g ? <span className={styles.glyph} data-glyph="">{g}</span> : t.kind === "duration" || t.kind === "ease" || t.kind === "pad" ? <i /> : null}
                  {pinIndex.has(t.name) && (
                    <span
                      className={styles.markAt}
                      data-flip={(mode === 1 && pinIndex.get(t.name)! % 2 === 1) || undefined}
                      style={{ "--i": pinIndex.get(t.name) } as CSSProperties}
                    >
                      <span className={styles.mark}>
                        <span className={styles.num}>{pinIndex.get(t.name)! + 1}</span>
                      </span>
                    </span>
                  )}
                </span>
              </span>
            );
          })}

          {/* 표지 — 무리 이름 */}
          {mode === "cover" &&
            GROUPS.map((g) => (
              <span key={g} className={styles.groupName} style={{ left: `${pct(CLUSTERS[g].cx)}%`, top: `${CLUSTERS[g].cy - CLUSTERS[g].r - 2}%` }}>
                {L(CLUSTERS[g].name)} <b>{TOKENS.filter((t) => t.group === g).length}</b>
              </span>
            ))}

          {/* 칸 — 줄 이름 */}
          {captions.map((c, i) => (
            <span key={`${mode}-${i}`} className={styles.caption} style={{ left: `${pct(c.x)}%`, top: `${c.y}%`, "--i": i } as CSSProperties}>
              {c.text}
            </span>
          ))}

          {/* 검사 칸 — 위에서 떨어진 빨간 ✕ 와 번호 */}
          {pins.map((p, i) =>
            p.bad ? (
              <span key={p.key} className={styles.bad} style={{ left: `${pct(p.x)}%`, top: `${p.y}%`, "--i": i } as CSSProperties}>
                <i className={styles.badStar}>✕</i>
                <span className={styles.num}>{i + 1}</span>
              </span>
            ) : null,
          )}
          <span ref={tipRef} className={styles.tip} />
        </div>
      </div>

      {/* 목록 — 넓은 그릇은 판 오른쪽, 좁으면 아래 */}
      {mode !== "cover" && (
        <div className={styles.side}>
          <ol key={String(mode)} className={styles.callouts}>
            {pins.map((p, i) => (
              <li
                key={p.key}
                className={styles.callout}
                data-bad={p.bad || undefined}
                style={{ "--i": i } as CSSProperties}
                onPointerEnter={() => hot(p.key, true)}
                onPointerLeave={() => hot(p.key, false)}
              >
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.calloutText}>
                  <span className={styles.calloutLabel}>{p.bad ? <s>{p.label}</s> : p.label}</span>
                  {p.sub && <span className={styles.calloutSub}>{p.sub}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
