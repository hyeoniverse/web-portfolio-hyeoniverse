"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollDrawScene.module.css";

/** 길 위에 남길 별가루 개수. */
const SPARK_COUNT = 34;
/** 별 하나가 다 피어나는 데 걸리는 진행도. 짧을수록 톡톡 터지듯 핀다. */
const BLOOM_SPAN = 0.045;
/** 이만큼 지나가면 갓 핀 색에서 가라앉은 색으로 다 바랜다. */
const FADE_SPAN = 0.32;
/** 띠 높이(px). CSS 의 .wrap 높이와 같아야 한다.
    선로는 아래에 붙여 두고 나머지는 연기가 오를 자리다 — 130 으로 뒀더니 굴뚝 위 여유가
    40px 뿐이라 연기가 오르지 못하고 옆으로 뭉개진 막대가 됐다. */
const BAND_H = 230;
/** 기울기를 잴 때 앞뒤로 얼마나 떨어진 점을 볼지(진행도). 너무 좁으면 값이 떨린다. */
const TANGENT_EPS = 0.004;
/** 연기 한 알이 나오는 간격(ms). 스크롤과 무관하게 계속 뿜는다.
    촘촘하게 뿜으면 알갱이가 겹쳐 시커먼 덩어리가 된다 — 띄엄띄엄 내보내고 크게 부풀린다. */
const PUFF_EVERY = 88;
/** 한 알이 사라지기까지(ms). */
const PUFF_LIFE = 2600;
/** 동시에 떠 있을 수 있는 알 수. */
const PUFF_MAX = 90;
/** 뒤에 달리는 객차 수. */
const CARS = 3;
/** 칸 사이 간격(px, 선로 길이 기준). 차체 폭 + 연결기. */
const CAR_GAP = 50;
/** 굴뚝 입구 — 기차 좌표계 기준. */
const STACK = { x: 17.5, y: -39 };

/** 4각 별 — 사이트 로고와 같은 결. 중심 기준 반지름 1 로 그려 두고 크기는 scale 로 준다. */
const SPARK_PATH =
  "M0 -1 C0 -0.42 0.42 0 1 0 C0.42 0 0 0.42 0 1 C0 0.42 -0.42 0 -1 0 C-0.42 0 0 -0.42 0 -1 Z";

interface Spark {
  x: number;
  y: number;
  /** 이 지점을 지나는 시점(0~1). */
  t: number;
  size: number;
  tilt: number;
  /** 반짝임의 시작 위상 — 별마다 달라야 한꺼번에 깜빡이지 않는다. */
  phase: number;
}

/**
 * 가로 스크롤 전체에 걸쳐 이어지는 배경 연출.
 *
 * 화면 아래 띠를 따라 기차가 스크롤을 따라 달리고, 지나간 자리마다 별가루가 핀다.
 * 선이 곧 선로다 — 가로로 미끄러지는 페이지에 달리는 것을 얹으면 방향이 그대로 읽힌다.
 *
 * 앞장서는 것을 캐릭터로 그리지 않는 이유가 있다. 이 페이지에는 이미 몽이(3D)가 커서를 따라
 * 화면 전체를 돌아다닌다. 같은 생물을 작게 한 번 더 그리면 마스코트가 둘로 보이고, 둘이
 * 각각 커서와 스크롤이라는 다른 법칙으로 움직여 규칙이 없어 보인다. 여기서는 위치 표시만 한다 —
 * 몽이가 흘리는 별가루는 BunnyStardust 가 따로 맡는다.
 * 갓 핀 것은 accent 색으로 또렷하고, 멀어질수록 가라앉아 흔적으로 남는다.
 * 앞으로 밀면 피고 뒤로 밀면 도로 오므라든다 — 스크롤 위치가 곧 장면의 시간이다.
 *
 * 트랙 밖(화면 고정)에 깔린다. 한 패널 안에 두면 그 패널이 지나가는 동안만 보이는데,
 * 첫 패널부터 끝까지 계속 보여야 하기 때문이다. 자리는 화면 아래 띠로 한정한다 —
 * 전면에 깔면 글자와 겹쳐서 못 읽는다(창틀 그림을 깔아 봤다가 물렀다).
 *
 * 진행도는 세트의 첫 패널(`data-set-anchor`)이 화면 왼쪽에서 얼마나 멀어졌는지로 잰다.
 * 트랙의 transform 을 직접 읽지 않는 이유는 무한 스크롤 때문이다 — 한 바퀴 돌 때마다
 * 훅이 좌표를 되감으므로 그 값은 기준이 못 된다. 기준점은 콘텐츠와 같이 움직이니 어긋나지 않는다.
 *
 * 좌표는 픽셀 그대로 쓴다(viewBox 를 실제 폭에 맞춘다). `preserveAspectRatio="none"` 으로
 * 늘리면 길은 맞아도 별이 타원으로 찌그러진다.
 */
export default function ScrollDrawScene({
  trackRef,
  infinite,
  className,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** 무한 스크롤이면 한 세트마다 다시 핀다. */
  infinite: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const carRefs = useRef<(SVGGElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 굴뚝 입구의 화면 좌표 — 스크롤 루프가 찍고 연기 루프가 읽는다. */
  const stackRef = useRef({ x: -1, y: -1 });
  const sparkRefs = useRef<(SVGGElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);

  /* 폭이 바뀌면 길과 별 자리를 다시 잡는다. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setWidth(wrap.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /* 길이 그려진 뒤에야 그 위의 점을 딸 수 있다(getPointAtLength). */
  useEffect(() => {
    const route = routeRef.current;
    if (!route || width === 0) return;
    const total = route.getTotalLength();
    const next: Spark[] = [];
    for (let i = 0; i < SPARK_COUNT; i++) {
      const t = (i + 0.5) / SPARK_COUNT;
      const p = route.getPointAtLength(t * total);
      /* 선로 둘레에 흩는다. 아래로만 내렸더니 한 줄로 늘어서 규칙이 보였고, 위아래로
         똑같이 크게 흩었더니 공중에 뜬 것처럼 보였다. 아래쪽으로 살짝 기울인 채
         주기가 다른 두 파형을 겹쳐 규칙이 안 읽히게 한다.
         무작위 대신 i 로 만들어, 다시 그려도 자리가 같다. */
      const jitter = 3 + Math.sin(i * 2.399) * 9 + Math.sin(i * 5.137) * 5;
      next.push({
        x: p.x,
        /* 선로를 따라가는 간격도 조금씩 어긋나게 — 고르게 놓으면 눈금처럼 보인다. */
        y: p.y + jitter,
        t: clamp(t + Math.sin(i * 3.71) * 0.006, 0, 1),
        size: 3.2 + Math.abs(Math.sin(i * 1.7)) * 4.4,
        tilt: (i * 47) % 360,
        phase: (i * 1.37) % (Math.PI * 2),
      });
    }
    setSparks(next);
  }, [width]);

  useEffect(() => {
    const track = trackRef.current;
    const route = routeRef.current;
    if (!track || !route || sparks.length === 0) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = route.getTotalLength();

    const paint = (progress: number, now: number) => {
      const head = headRef.current;
      if (head) {
        /* 칸마다 선로 위 자기 지점에 놓는다. 한 덩어리로 묶어 돌리면 곡선에서 뒤칸이
           선로를 벗어난다 — 실제 열차처럼 칸마다 그 자리의 기울기를 따른다. */
        const step = CAR_GAP / total;
        const placeAt = (el: SVGGElement, raw: number) => {
          const at = clamp(raw, 0, 1);
          const p = route.getPointAtLength(at * total);
          const a = route.getPointAtLength(clamp(at - TANGENT_EPS, 0, 1) * total);
          const b = route.getPointAtLength(clamp(at + TANGENT_EPS, 0, 1) * total);
          const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          el.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${deg})`);
          return { p, deg };
        };
        for (let j = 0; j < CARS; j++) {
          const el = carRefs.current[j];
          if (!el) continue;
          const raw = progress - (j + 1) * step;
          placeAt(el, raw);
          /* 아직 출발 지점 뒤에 있는 칸은 감춘다 — 안 그러면 시작할 때 왼쪽 끝에 겹쳐 쌓인다. */
          el.style.opacity = raw < 0 ? "0" : "1";
        }
        const { p, deg } = placeAt(head, progress);

        /* 굴뚝 입구의 화면 좌표만 남긴다 — 연기는 아래 캔버스 루프가 따로 그린다.
           기차 좌표계의 점을 기차의 기울기만큼 돌려서 화면 좌표로 옮긴다. */
        const rad = (deg * Math.PI) / 180;
        stackRef.current = {
          x: p.x + STACK.x * Math.cos(rad) - STACK.y * Math.sin(rad),
          y: p.y + STACK.x * Math.sin(rad) + STACK.y * Math.cos(rad),
        };
      }
      for (let i = 0; i < sparks.length; i++) {
        const el = sparkRefs.current[i];
        if (!el) continue;
        const s = sparks[i];
        const bloom = clamp((progress - s.t) / BLOOM_SPAN, 0, 1);
        /* 피어날 때 살짝 넘쳤다가 제자리로 — 톡 하고 터지는 느낌 */
        const overshoot = 1 + Math.sin(bloom * Math.PI) * 0.35;
        /* 반짝임 — 두 겹이다. 잔떨림이 늘 흐르고, 그 위에 이따금 확 밝아지는 순간이 온다.
           사인 하나로 은은하게만 흔들었더니 값은 변하는데 눈에는 안 띄었다 — 별이 작고
           색이 옅어서, 밝기가 완만히 오르내리는 정도로는 정지한 것처럼 보인다.
           별마다 위상이 달라 한꺼번에 깜빡이지 않는다.
           스크롤을 멈춰도 살아 있어야 하므로 여기만 시간으로 돈다(연기와 같은 이유). */
        const shimmer = 0.62 + 0.38 * Math.sin(now / 290 + s.phase);
        /* 10 제곱 — 대부분은 0 이고 꼭대기 근처에서만 확 솟는다. 그게 "반짝" 이다. */
        const flash = Math.pow(Math.max(0, Math.sin(now / 880 + s.phase * 2.3)), 10);
        const twinkle = Math.min(1, shimmer + flash * 0.55);
        el.setAttribute(
          "transform",
          `translate(${s.x} ${s.y}) rotate(${s.tilt + flash * 26}) scale(${bloom * overshoot * s.size * (0.8 + twinkle * 0.28 + flash * 0.4)})`,
        );
        el.style.opacity = String(bloom * twinkle);
        /* 갓 핀 것은 또렷하게, 멀어질수록 가라앉는다. */
        el.style.setProperty("--_age", String(clamp((progress - s.t) / FADE_SPAN, 0, 1)));
      }
    };

    if (reduce) { paint(1, 0); return; }

    let raf = 0;
    const tick = (now: number) => {
      const anchors = [...track.querySelectorAll<HTMLElement>("[data-set-anchor]")];
      if (anchors.length > 0) {
        const lefts = anchors.map((a) => a.getBoundingClientRect().left);
        /* 지금 보고 있는 세트 = 화면 왼쪽을 이미 지난 기준점 중 가장 가까운 것.
           아직 아무것도 안 지났으면(맨 처음) 첫 기준점을 쓴다. */
        const passed = lefts.filter((l) => l <= 0);
        const base = passed.length ? Math.max(...passed) : Math.min(...lefts);
        /* 한 바퀴 길이 — 무한이면 기준점 사이 거리, 아니면 트랙에서 스크롤 가능한 거리. */
        const span = infinite && lefts.length > 1
          ? Math.abs(lefts[1] - lefts[0])
          : Math.max(1, track.scrollWidth - window.innerWidth);
        paint(clamp(-base / span, 0, 1), now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trackRef, infinite, sparks]);

  /* ── 연기 ─────────────────────────────────────────────────────────────
     스크롤과 상관없이 계속 뿜는다. 기차가 멈춰도 굴뚝에서는 연기가 난다 —
     스크롤에 묶으면 멈추는 순간 연기까지 얼어붙어 그림이 죽는다.
     굴뚝 자리만 스크롤 루프에서 받아 쓴다.

     알갱이는 미리 구워 둔 얼룩 한 장을 크기·투명도만 바꿔 겹쳐 그린다. 알마다
     그라디언트를 새로 만들면 프레임마다 수십 번 만들게 된다. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(BAND_H * dpr);
    ctx.scale(dpr, dpr);

    /* 얼룩 한 장 — 가운데가 진하고 가장자리로 갈수록 사라진다.
       색은 테마에 따라 달라지므로 실제 계산값을 읽어 굽는다. */
    let sprite = document.createElement("canvas");
    const bakeSprite = () => {
      const R = 64;
      const c = document.createElement("canvas");
      c.width = c.height = R * 2;
      const g = c.getContext("2d");
      if (!g) return;
      const [r, g2, b2] = toRgb(getComputedStyle(canvas).color);
      const withAlpha = (a: number) => `rgba(${r},${g2},${b2},${a})`;
      const grad = g.createRadialGradient(R, R, 0, R, R, R);
      /* 가운데도 꽉 채우지 않는다 — 심지가 진하면 알갱이 하나하나가 점으로 보인다. */
      grad.addColorStop(0, withAlpha(0.5));
      grad.addColorStop(0.5, withAlpha(0.16));
      grad.addColorStop(1, withAlpha(0));
      g.fillStyle = grad;
      g.fillRect(0, 0, R * 2, R * 2);
      sprite = c;
    };
    bakeSprite();
    /* 테마가 바뀌면 색을 다시 굽는다. */
    const themeWatch = new MutationObserver(bakeSprite);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    interface Puff { x: number; y: number; vx: number; vy: number; born: number; life: number; seed: number; r0: number }
    const puffs: Puff[] = [];
    let lastEmit = 0;
    let prev = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      const stack = stackRef.current;

      if (stack.x >= 0 && now - lastEmit > PUFF_EVERY && puffs.length < PUFF_MAX) {
        lastEmit = now;
        puffs.push({
          x: stack.x + (Math.random() - 0.5) * 7,
          y: stack.y,
          /* 뒤로 밀리며 오른다 — 달리는 기차가 남기고 가는 모양 */
          vx: -6 - Math.random() * 9,
          vy: -26 - Math.random() * 16,
          born: now,
          life: PUFF_LIFE * (0.7 + Math.random() * 0.6),
          seed: Math.random() * 100,
          r0: 4 + Math.random() * 3,
        });
      }

      ctx.clearRect(0, 0, width, BAND_H);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i];
        const age = (now - q.born) / q.life;
        if (age >= 1) { puffs.splice(i, 1); continue; }
        /* 오를수록 느려지고 옆으로 흔들린다 — 곧게 오르면 연기가 아니라 막대가 된다. */
        q.x += (q.vx + Math.sin(now / 620 + q.seed) * 9) * dt;
        q.y += q.vy * dt;
        q.vy *= 1 - dt * 0.22;
        const r = q.r0 + age * age * 34;
        /* 처음엔 빠르게 진해지고 오래 남으며 흩어진다. */
        /* 옅게. 알갱이가 수십 개 겹치므로 하나가 진하면 통째로 시커먼 덩어리가 된다. */
        ctx.globalAlpha = Math.min(1, age * 8) * (1 - age) * (1 - age) * 0.34;
        ctx.drawImage(sprite, q.x - r, q.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); themeWatch.disconnect(); };
  }, [width]);

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`} aria-hidden>
      {/* 연기는 캔버스로 그린다. SVG 원 몇 개로는 뭉게뭉게가 안 나온다 —
          알갱이 수십 개를 부드러운 얼룩으로 겹쳐야 연기처럼 보인다. */}
      <canvas ref={canvasRef} className={styles.smoke} />
      {width > 0 && (
        <svg className={styles.scene} viewBox={`0 0 ${width} ${BAND_H}`} fill="none" focusable="false">
          {/* 길 — 빛이 지나는 자리. 아주 옅게 깔아 두기만 한다. */}
          <path ref={routeRef} className={styles.route} d={routeD(width)} />
          {sparks.map((s, i) => (
            <g key={i} ref={(el) => { sparkRefs.current[i] = el; }} className={styles.spark}>
              <path d={SPARK_PATH} />
            </g>
          ))}
          {/* 토끼 — 발끝이 원점이라 길 위에 그대로 선다. 오른쪽(진행 방향)을 본다. */}
          {/* 객차 — 기관차보다 먼저 그려 기관차가 앞에 오게 한다. */}
          {Array.from({ length: CARS }, (_, j) => (
            <g key={j} ref={(el) => { carRefs.current[j] = el; }} className={styles.train}>
              <rect x="-20" y="-12.5" width="40" height="4.5" rx="1.6" />
              <rect x="-18" y="-30" width="36" height="18" rx="3.4" />
              <rect x="-20" y="-33.4" width="40" height="3.8" rx="1.6" />
              <rect className={styles.trainWindow} x="-13.5" y="-26.5" width="7.5" height="7.5" rx="1.6" />
              <rect className={styles.trainWindow} x="-3.5" y="-26.5" width="7.5" height="7.5" rx="1.6" />
              <rect className={styles.trainWindow} x="6.5" y="-26.5" width="7.5" height="7.5" rx="1.6" />
              {/* 연결기 — 앞칸으로 뻗는다 */}
              <rect x="19" y="-11.5" width="9" height="2.6" rx="1.3" />
              <circle cx="-11" cy="-5" r="4.6" />
              <circle className={styles.trainWindow} cx="-11" cy="-5" r="1.5" />
              <circle cx="11" cy="-5" r="4.6" />
              <circle className={styles.trainWindow} cx="11" cy="-5" r="1.5" />
            </g>
          ))}

          {/* 기관차 — 바퀴 밑이 원점이라 선로 위에 그대로 선다. 오른쪽(진행 방향)을 본다.
              캐릭터를 그리지 않는 이유는 위 주석 참고. */}
          <g ref={headRef} className={styles.train}>
            {/* 차대 */}
            <rect x="-24" y="-12.5" width="48" height="4.5" rx="1.6" />
            {/* 보일러 — 앞 끝은 둥근 연통 앞판 */}
            <rect x="-4" y="-26" width="25" height="14" rx="7" />
            <circle cx="20.5" cy="-19" r="7.2" />
            {/* 증기 돔 */}
            <path d="M2 -26 a4.2 4.2 0 0 1 8.4 0 z" />
            {/* 굴뚝 — 대롱 하나에 위쪽이 벌어진 갓. 뒤집기 같은 잔재주 없이 그대로 그린다. */}
            <rect x="14.8" y="-35.5" width="5.4" height="10" rx="1.2" />
            <rect x="12.6" y="-38.4" width="9.8" height="3.6" rx="1.5" />
            {/* 운전실 */}
            <rect x="-24" y="-33" width="20" height="21" rx="2.6" />
            <rect x="-26" y="-35.5" width="24" height="3.4" rx="1.5" />
            <rect className={styles.trainWindow} x="-20.5" y="-29" width="9.5" height="8" rx="1.8" />
            {/* 연결봉 — 바퀴를 잇는 가는 막대. 없으면 바퀴가 따로 노는 원 세 개로 보인다 */}
            <rect x="-11" y="-7.6" width="27" height="2" rx="1" />
            {/* 바퀴 — 뒤 큰 동륜 + 앞 작은 바퀴 둘 */}
            <circle cx="-11" cy="-6.6" r="6.6" />
            <circle className={styles.trainWindow} cx="-11" cy="-6.6" r="2.2" />
            <circle cx="6" cy="-4.6" r="4.6" />
            <circle className={styles.trainWindow} cx="6" cy="-4.6" r="1.5" />
            <circle cx="16" cy="-4.6" r="4.6" />
            <circle className={styles.trainWindow} cx="16" cy="-4.6" r="1.5" />
            {/* 앞등 */}
            <circle className={styles.trainLamp} cx="22.4" cy="-19" r="2.6" />
          </g>
        </svg>
      )}
    </div>
  );
}

/** 화면 폭에 맞춰 늘어나는 완만한 길. 마루·골 높이는 띠 안에 고정한다. */
function routeD(w: number): string {
  /* 선로는 띠 아래쪽에 붙인다 — 위쪽은 연기 몫이다. */
  const y = BAND_H - 52;
  const a = 16;
  return [
    `M0 ${y}`,
    `C${w * 0.12} ${y - a}, ${w * 0.2} ${y + a}, ${w * 0.32} ${y}`,
    `S${w * 0.52} ${y - a * 1.4}, ${w * 0.64} ${y}`,
    `S${w * 0.84} ${y + a}, ${w} ${y - a * 0.5}`,
  ].join(" ");
}

/**
 * 어떤 표기의 색이든 rgb 세 값으로 바꾼다.
 *
 * 이 사이트의 색은 oklch 로 나온다. canvas 의 색 파서는 그걸 통째로는 받아 주지만,
 * 문자열을 쪼개 alpha 만 갈아 끼울 수는 없다. 실제로 `rgba(...)` 를 가정한 정규식이
 * oklch 에 안 걸려서, 그라디언트 세 정거장이 모두 같은 불투명 색이 됐다 —
 * 연기가 뭉게뭉게가 아니라 시커먼 덩어리로 나온 원인이다.
 * 1×1 캔버스에 한 번 칠하고 읽어 오면 표기와 상관없이 정확한 값을 얻는다.
 */
function toRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [120, 120, 120];
  g.fillStyle = color;
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
