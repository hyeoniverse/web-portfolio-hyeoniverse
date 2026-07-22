/* Code Highlights 왼쪽 데모 — Sandpack(react-ts) 실행용 파일 맵.
 *
 * 원래는 레포 안 React 컴포넌트(CodeDemos)를 index 로 꽂았지만, admin 이 스니펫을
 * 추가·재정렬하면 짝이 어긋나서 스니펫이 자기 데모를 직접 들고 있도록 바꿨다.
 *
 * 제약:
 *  - 앱 CSS 토큰(var(--text-accent) 등)은 iframe 안에서 안 먹으므로 실제 값을 박는다.
 *  - 외부 의존성(framer-motion, three)은 샌드박스 부팅을 느리게 하므로 쓰지 않고
 *    plain React + CSS/canvas 로 같은 동작을 재현한다.
 *  - 사이트 테마 토글은 iframe 이 못 보므로 prefers-color-scheme 으로 대응한다.
 */

const ACCENT = "#d01046";

/** 모든 데모 공통 — 투명 배경 + 중앙 정렬 + 하단 힌트 */
const baseCss = `* { box-sizing: border-box; }
body {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 100vh;
  background: transparent;
  color: #6b6b6b;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
}
.wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
  width: 100%;
  height: 100vh;
  padding-bottom: 1.8rem;
}
.hint {
  position: absolute;
  bottom: 0.25rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #9a9a9a;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0.7;
}
@media (prefers-color-scheme: dark) {
  body { color: #b5b5b5; }
  .hint { color: #7d7d7d; }
}
`;

/* ── 01 StaggerText — 글자별 시간차로 외곽선만 남았다가 역순으로 채워짐 ── */
const staggerText: Record<string, string> = {
  "/App.tsx": `import { useState } from "react";

const TEXT = "Hover Me";
const DELAY = 0.04; // 글자당 시간차(초)

export default function App() {
  const [hovered, setHovered] = useState(false);
  const chars = TEXT.split("");

  return (
    <div className="wrap">
      <div
        className="stagger"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {chars.map((char, i) => {
          // 진입은 첫 글자부터, 해제는 마지막 글자부터 역순
          const delay = hovered ? i * DELAY : (chars.length - 1 - i) * DELAY;
          return (
            <span
              key={i}
              className={hovered ? "char charOut" : "char"}
              style={{ transitionDelay: delay + "s" }}
            >
              {char === " " ? "\\u00A0" : char}
            </span>
          );
        })}
      </div>
      <span className="hint">Hover the text</span>
    </div>
  );
}
`,
  "/styles.css": `${baseCss}
.stagger {
  font-size: clamp(1.5rem, 6vw, 2.5rem);
  font-weight: 600;
  color: ${ACCENT};
  cursor: pointer;
  user-select: none;
}
.char {
  display: inline-block;
  /* step-end 라 시간차만 남고 색은 즉시 전환된다 */
  transition: color 0.01s step-end, -webkit-text-stroke-color 0.01s step-end;
  -webkit-text-stroke: 1px ${ACCENT};
}
.charOut {
  color: transparent;
}
`,
};

/* ── 02 Magnetic — 커서를 스프링으로 따라가는 자기 버튼 ── */
const magnetic: Record<string, string> = {
  "/App.tsx": `import { useEffect, useRef, useState } from "react";

const PULL = 0.4;      // 커서까지 거리의 비율만큼 끌려감
const STIFFNESS = 0.12; // 목표치로 수렴하는 속도

export default function App() {
  const btnRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  // framer-motion 의 useSpring 대신 rAF lerp 로 같은 감쇠를 낸다
  useEffect(() => {
    let raf: number;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * STIFFNESS;
      pos.current.y += (target.current.y - pos.current.y) * STIFFNESS;
      const el = btnRef.current;
      if (el) {
        el.style.transform =
          "translate(" + pos.current.x + "px," + pos.current.y + "px)";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="wrap"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        target.current = {
          x: (e.clientX - (r.left + r.width / 2)) * PULL,
          y: (e.clientY - (r.top + r.height / 2)) * PULL,
        };
        setHovering(true);
      }}
      onMouseLeave={() => {
        target.current = { x: 0, y: 0 };
        setHovering(false);
      }}
    >
      <div ref={btnRef} className={hovering ? "magnet on" : "magnet"}>
        Hover
      </div>
      <span className="hint">Move cursor near the button</span>
    </div>
  );
}
`,
  "/styles.css": `${baseCss}
.magnet {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(60px, 22vw, 90px);
  height: clamp(60px, 22vw, 90px);
  border: 1px solid ${ACCENT}4d;
  border-radius: 50%;
  font-size: 13px;
  pointer-events: none;
  transition: scale 0.25s ease, border-color 0.25s ease;
}
.magnet.on {
  scale: 1.15;
  border-color: ${ACCENT};
}
`,
};

/* ── 03 Infinite Scroll — 같은 세트를 복제해 끊김 없이 순환 ── */
const infiniteScroll: Record<string, string> = {
  "/App.tsx": `const COLORS = ["a", "b", "c", "b", "a", "b", "a", "b", "c", "b", "a", "b"];

export default function App() {
  // 한 세트를 3벌 이어붙여 끝에 닿기 전에 처음으로 되감는다
  const blocks = [...COLORS, ...COLORS, ...COLORS];

  return (
    <div className="wrap marquee">
      <div className="track">
        {blocks.map((tone, i) => (
          <div key={i} className={"block tone-" + tone} />
        ))}
      </div>
      <span className="hint">Hover to pause</span>
    </div>
  );
}
`,
  "/styles.css": `${baseCss}
.marquee { overflow: hidden; }
.track {
  display: flex;
  gap: 8px;
  width: max-content;
  animation: marquee 8s linear infinite;
}
/* 한 세트(1/3) 만큼 밀면 다음 세트가 정확히 같은 자리에 온다 */
@keyframes marquee {
  to { transform: translateX(-33.333%); }
}
.marquee:hover .track { animation-play-state: paused; }
.block {
  flex-shrink: 0;
  width: 40px;
  height: 30px;
  border-radius: 3px;
}
.tone-a { background: ${ACCENT}4d; }
.tone-b { background: #9a9a9a; }
.tone-c { background: ${ACCENT}80; }
`,
};

/* ── 04 Pinned Scroll — 패널은 지나가는데 콘텐츠는 되밀려 제자리인 걸 나란히 보여줌 ── */
const pinnedScroll: Record<string, string> = {
  "/App.tsx": `import { useEffect, useRef, useState } from "react";

const ITEMS = 4;
const CYCLE = 5200; // 한 바퀴(ms)

export default function App() {
  const [p, setP] = useState(0); // 진행도 0~1

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const loop = (now: number) => {
      setP(((now - start) % CYCLE) / CYCLE);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 패널이 왼쪽으로 밀려나는 양 (뷰포트 폭 기준 %)
  const shift = p * 100;
  const index = Math.min(ITEMS - 1, Math.floor(p * ITEMS));

  return (
    <div className="wrap pin-wrap">
      <div className="viewport">
        {/* 패널은 뷰포트보다 넓고, 스크롤만큼 왼쪽으로 지나간다 */}
        <div className="panel" style={{ transform: "translateX(" + -shift + "%)" }}>
          {/* 밀려난 만큼 되밀어 제자리에 고정된 것처럼 보이게 */}
          <div className="content" style={{ transform: "translateX(" + shift + "%)" }}>
            <span className="label">pinned</span>
            <div className="dots">
              {Array.from({ length: ITEMS }, (_, i) => (
                <span key={i} className={i === index ? "dot on" : "dot"} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="meter">
        <span className="mono">progress</span>
        <div className="bar"><div className="fill" style={{ width: p * 100 + "%" }} /></div>
        <span className="mono val">{p.toFixed(2)}</span>
        <span className="mono idx">index {index}</span>
      </div>
      <span className="hint">Panel scrolls past — content stays pinned</span>
    </div>
  );
}
`,
  "/styles.css": `${baseCss}
.pin-wrap {
  justify-content: center;
  gap: 14px;
  padding: 0 16px 1.8rem;
}
/* 화면(뷰포트) 역할 — 이 밖으로 나간 건 안 보인다 */
.viewport {
  position: relative;
  width: 100%;
  max-width: 320px;
  height: 92px;
  border: 1px solid #9a9a9a55;
  border-radius: 6px;
  overflow: hidden;
}
/* 뷰포트보다 넓은 패널 — 실제 About 패널과 같은 구조 */
.panel {
  width: 200%;
  height: 100%;
  background: repeating-linear-gradient(
    90deg, transparent 0 22px, #9a9a9a1f 22px 23px
  );
}
.content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  /* 패널이 200% 라 되밀 때도 같은 기준이 되도록 절반 폭 */
  width: 50%;
  height: 100%;
}
.label {
  padding: 3px 10px;
  border: 1px solid ${ACCENT};
  border-radius: 999px;
  color: ${ACCENT};
  font-size: 11px;
}
.dots { display: flex; gap: 6px; }
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9a9a9a66;
  transition: background 0.2s ease, transform 0.2s ease;
}
.dot.on { background: ${ACCENT}; transform: scale(1.4); }
.meter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}
.mono { font-variant-numeric: tabular-nums; }
.val { color: ${ACCENT}; }
.idx { opacity: 0.7; }
.bar {
  width: 110px;
  height: 4px;
  border-radius: 999px;
  background: #9a9a9a33;
  overflow: hidden;
}
.fill { height: 100%; border-radius: 999px; background: ${ACCENT}; }
`,
};

/* ── 05 Scroll Torus — three.js 없이 canvas 2D 로 토러스를 투영해 회전 ── */
const scrollTorus: Record<string, string> = {
  "/App.tsx": `import { useEffect, useRef } from "react";

const R = 1.0;   // 큰 반지름
const r = 0.42;  // 관 반지름
const RING = 48; // 큰 원 분할
const TUBE = 20; // 관 분할

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    // 토러스 표면 점을 미리 계산 (법선도 같이 — 명암용)
    const pts: { p: [number, number, number]; n: [number, number, number] }[] = [];
    for (let i = 0; i < RING; i++) {
      const u = (i / RING) * Math.PI * 2;
      for (let j = 0; j < TUBE; j++) {
        const v = (j / TUBE) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        const cv = Math.cos(v), sv = Math.sin(v);
        pts.push({
          p: [(R + r * cv) * cu, (R + r * cv) * su, r * sv],
          n: [cv * cu, cv * su, sv],
        });
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = (time: number) => {
      const t = time / 1000;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const ax = t * 0.5, az = t * 0.8;
      const cx = Math.cos(ax), sx = Math.sin(ax);
      const cz = Math.cos(az), sz = Math.sin(az);
      const scale = Math.min(w, h) * 0.32;

      // X축 → Z축 회전 후 원근 투영. 뒤쪽부터 그려 깊이 순서를 맞춘다
      const projected = pts.map(({ p, n }) => {
        const rot = ([x, y, z]: [number, number, number]) => {
          const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
          const x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
          return [x2, y2, z1] as [number, number, number];
        };
        const [x, y, z] = rot(p);
        const nn = rot(n);
        const persp = 3.4 / (3.4 - z);
        return { x: w / 2 + x * scale * persp, y: h / 2 + y * scale * persp, z, n: nn, persp };
      });
      projected.sort((a, b) => a.z - b.z);

      for (const q of projected) {
        // 조명 방향 (0.4, 0.5, 0.77) 과의 내적으로 금속 느낌의 명암
        const lambert = Math.max(0, q.n[0] * 0.4 + q.n[1] * 0.5 + q.n[2] * 0.77);
        const shade = 0.12 + Math.pow(lambert, 2.2) * 0.88;
        const grey = Math.round(70 + shade * 150);
        ctx.fillStyle = "rgb(" + grey + "," + grey + "," + (grey + 6) + ")";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.6 * q.persp, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="wrap">
      <canvas ref={canvasRef} className="torus" />
      <span className="hint">3D Metallic Torus</span>
    </div>
  );
}
`,
  "/styles.css": `${baseCss}
.torus {
  width: 100%;
  height: 100%;
  display: block;
}
`,
};

/** codeExamples 순서와 맞춘 데모 파일 맵 */
export const codeDemoFiles = {
  staggerText,
  magnetic,
  infiniteScroll,
  pinnedScroll,
  scrollTorus,
};
