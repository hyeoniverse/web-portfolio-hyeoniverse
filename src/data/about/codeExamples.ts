import type { CodeExample } from "./types";
import { codeDemoFiles } from "./codeDemoFiles";

export const codeExamples: CodeExample[] = [
  {
    title: "3D Scroll Torus (Lissajous Curve)",
    description: {
      ko: "스크롤할 때마다 3D 토러스가 **화면 안에서 끝없이 떠다니는** 효과입니다. X와 Y 축에 **서로 다른 주파수의 사인파**를 적용하여 리사주 곡선을 그리며, 화면 밖으로 나가지 않으면서도 **반복되지 않는 유기적인 궤적**을 만듭니다. Lenis 무한 스크롤의 **누적 거리를 추적**하여 스크롤 방향에 관계없이 연속적으로 움직입니다.",
      en: "A 3D torus that **floats endlessly within the viewport** as you scroll. By applying **sine waves with different frequencies** to the X and Y axes, it traces a Lissajous curve — staying on-screen while creating an **organic, non-repeating trajectory**. It tracks **cumulative Lenis scroll distance** so the torus moves continuously regardless of scroll direction.",
    },
    language: "tsx",
    code: `// Lenis 누적 스크롤 추적 (무한 스크롤 래핑 감지)
const currentNorm = scroll / limit;
let delta = currentNorm - lastNorm;
if (delta > 0.5) delta -= 1;      // 뒤로 래핑
else if (delta < -0.5) delta += 1; // 앞으로 래핑
cumulativeRef.current += delta;

// 리사주 곡선: X·Y 주파수가 다르면 무한 궤도
const t = getCumulative();
const x = Math.sin(t * 0.7 * Math.PI * 2) * 3.5;
const y = Math.cos(t * 1.1 * Math.PI * 2) * 3.0;
const z = Math.sin(t * 0.4 * Math.PI * 2) * 1.5 - 2;

// 메탈릭 머티리얼 + 환경 반사
<Environment preset="city" />
<meshStandardMaterial
  metalness={1.0} roughness={0.08}
  envMapIntensity={1.5} />`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.scrollTorus,
  },
  {
    title: "Scene Cut Transitions",
    description: {
      ko: "About 가로 스크롤에서 화면 폭을 채우는 패널은 **옆으로 밀리지 않고 화면에 붙잡힌 채** 다음 패널에 덮입니다. 들어오는 패널은 **와이프·원형·아래에서 걷힘·통째로 밀어 올림** 중 하나로 드러나고, 패널이 `data-cut-kind` 로 자기 컷을 고를 수 있습니다. 진행도는 **스크롤 위치 그 자체**라 멈추면 멈추고 되감으면 거꾸로 돌아가며, 처음과 끝을 누른 곡선을 거쳐 기계적으로 보이지 않게 합니다. 위치는 화면 측정값이 아니라 **레이아웃 값(offsetLeft)** 으로 계산해, 여기서 건 transform 이 다음 프레임의 측정에 섞이지 않습니다.",
      en: "In the About horizontal scroll, full-width panels **stay pinned instead of sliding away** and the next panel covers them. The incoming panel appears with a **wipe, iris, rise, or a full slide-up**, and a panel can pick its own cut with `data-cut-kind`. Progress is **the scroll position itself**, so it pauses when you stop and reverses when you scroll back, passed through an eased curve so it never looks mechanical. Positions come from **layout values (offsetLeft)**, not measured rects, so the transform applied here never feeds back into the next frame.",
    },
    demoMode: "live",
    demoKey: "sceneCut",
    language: "typescript",
    code: `// 처음과 끝을 누른 곡선 — 거리에 정비례하면 기계적으로 보인다
const easeCut = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;

const left = trackX + panel.offsetLeft;   // 화면 측정값이 아니라 레이아웃 값
if (left > 0 && left < vw) {
  // 들어오는 중 — 화면 왼쪽에 붙잡고, 남은 거리만큼 덜 드러낸다
  const t = 1 - easeCut(1 - left / vw);   // 1 → 0 으로 줄며 전환이 끝난다
  const kind = panel.dataset.cutKind ?? CUT_KINDS[i % CUT_KINDS.length];
  s.zIndex = "3";
  s.transform = \`translateX(\${-left}px)\`;
  if (kind === "wipe") s.clipPath = \`inset(0 0 0 \${t * vw}px)\`;
  if (kind === "iris") s.clipPath = \`circle(\${(1 - t) * Math.hypot(vw, vh) * 0.55}px at 50% 50%)\`;
  if (kind === "rise") s.clipPath = \`inset(\${t * 100}% 0 0 0)\`;
  if (kind === "slide") s.transform += \` translateY(\${t * vh}px)\`;
} else if (right > 0 && right < vw) {
  // 나가는 중 — 오른쪽 끝을 화면에 붙잡고 작아지며 어두워진다
  const t = easeCut((vw - right) / vw);
  s.zIndex = "2";
  s.transform = \`translateX(\${vw - right}px) scale(\${1 - t * 0.08})\`;
  s.filter = \`brightness(\${1 - t * 0.15})\`;
}`,
  },
  {
    title: "Velocity-Matched Snap (Hermite Curve)",
    description: {
      ko: "장면 전환 도중에 휠을 멈추면 반쯤 걷힌 컷이 화면에 남습니다. 굴리던 방향으로 조금이라도 진행했으면 그쪽으로 **전환을 마저 끝내는데**, 보통의 따라잡기(lerp)로 마치면 끝이 한없이 느려져 흐지부지 끝나고, 새 이징 트윈을 걸면 **이어받는 순간 속도가 튑니다**. 그래서 **지금 속도에서 출발해 도착점에서 멈추는 3차 Hermite 곡선**으로 움직입니다. 출발 속도가 3·거리/시간을 넘으면 지나쳤다 돌아오므로 그 안으로 묶습니다.",
      en: "If the wheel stops mid-transition, a half-open cut is left on screen, so the transition **finishes in the direction you were scrolling**. Finishing with the usual lerp crawls forever at the end, and a fresh eased tween **jerks at the hand-off**. Instead it moves along a **cubic Hermite curve that starts at the current velocity and comes to rest at the target**. A start velocity above 3·distance/time would overshoot and come back, so it is clamped below that.",
    },
    demoMode: "live",
    demoKey: "snap",
    language: "typescript",
    code: `const startSnap = (dest: number) => {
  const from = state.scrollX;
  const dist = dest - from;
  // 지금 속도(px/s) — 따라잡기 한 프레임(60fps 기준) 이동량
  let v = (state.targetScrollX - from) * SCROLL_LERP * 60;
  state.targetScrollX = dest;
  const duration = gsap.utils.clamp(0.45, 1, 0.4 + (Math.abs(dist) / vw) * 0.5);
  if (Math.sign(v) !== Math.sign(dist)) v = 0;   // 반대로 가던 중이면 정지에서 출발
  // 거리 단위 접선 — 3·거리를 넘으면 지나쳤다 돌아온다
  v = Math.sign(dist) * Math.min(Math.abs(v) * duration, Math.abs(dist) * 3);

  const k = { u: 0 };
  snapTween = gsap.to(k, {
    u: 1, duration, ease: "none",
    onUpdate: () => {
      const u = k.u, u2 = u * u, u3 = u2 * u;
      // Hermite: p(u) = h10·v + h01·dist  (끝 속도 0)
      state.scrollX = from + (u3 - 2 * u2 + u) * v + (-2 * u3 + 3 * u2) * dist;
    },
  });
};`,
  },
  {
    title: "Scroll Progress as CSS Variables",
    description: {
      ko: "긴 패널은 항목마다 스크롤 구간이 있습니다. 스크롤 엔진이 트랙을 옮긴 **같은 프레임**에, 지금 구간 안에서 어디쯤인지를 **CSS 변수 세 개**로 내보냅니다. `--item-in` 은 구간 앞 35% 동안 0→1, `--item-out` 은 끝 20% 동안 0→1, `--item-p` 는 구간 전체 0→1 입니다. JS 는 **숫자만 쓰고** 연출은 CSS 가 맡으므로, 패널마다 `calc()` 한 줄로 등장·퇴장·진행 막대·코드가 써 내려가는 마스크를 만듭니다. 값이 바뀔 때만 써서 매 프레임 스타일을 다시 계산하지 않습니다.",
      en: "Long panels give each item its own stretch of scroll. In **the same frame** the scroll engine moves the track, the hook exposes where you are inside the current stretch as **three CSS variables**: `--item-in` goes 0→1 over the first 35%, `--item-out` 0→1 over the last 20%, and `--item-p` 0→1 across the whole stretch. JS **only writes numbers** and CSS owns the motion, so each panel builds its entrance, exit, progress bars and the mask that writes out code with a single `calc()`. Values are written only when they change, so styles aren't recalculated every frame.",
    },
    demoMode: "live",
    demoKey: "scrollVars",
    language: "typescript",
    code: `// usePinnedScroll — 트랙을 옮긴 같은 프레임(HSCROLL_FRAME_EVENT)에 계산
const progress = clamp(0, 1, -rect.left / extraWidth);
const index = Math.min(itemCount - 1, Math.floor(progress * itemCount));
const f = progress * itemCount - index;              // 지금 구간 안의 위치

const itemIn = index === 0 ? 1 : Math.min(1, f / 0.35);
const itemOut = index === itemCount - 1 ? 0 : Math.max(0, (f - 0.8) / 0.2);
const key = \`\${f.toFixed(3)} \${itemIn.toFixed(3)} \${itemOut.toFixed(3)}\`;
if (key !== prevFlow) {                              // 바뀔 때만 쓴다
  prevFlow = key;
  content.style.setProperty("--item-p", Math.min(1, f).toFixed(3));
  content.style.setProperty("--item-in", itemIn.toFixed(3));
  content.style.setProperty("--item-out", itemOut.toFixed(3));
}

/* CSS — 코드가 스크롤만큼 위에서부터 써 내려간다
.codeSinglePaneActive .codeScrollWrap {
  --_w: clamp(0%, calc((0.08 + var(--item-p, 1) * 1.5) * 100%), 100%);
  mask-image: linear-gradient(to bottom, #000 var(--_w), transparent calc(var(--_w) + 8rem));
} */`,
  },
  {
    title: "Horizontal Scroll vs. Lenis Wheel",
    description: {
      ko: "사이트 전체는 Lenis 로 부드럽게 세로 스크롤되고, About·프로필 섹션은 휠을 가로채 가로로 넘깁니다. 그런데 가로로 넘기는 동안 **페이지가 세로로도 같이 밀렸습니다**. 재 보니 휠 한 번에 트랙이 가로로 51px 가는 동안 페이지는 98px 내려갔습니다(#1045). Lenis 는 `preventDefault` 를 보지 않고 window 의 자기 리스너에서 **직접 `scrollTo`** 하기 때문입니다. Lenis 가 물러나는 유일한 신호는 이벤트 경로에 있는 **`data-lenis-prevent-wheel` 표시**라, 가로가 가져갈 휠에만 섹션에 표시를 붙이고, 끝에 닿아 세로로 넘길 휠에는 떼서 이어받기를 남깁니다.",
      en: "The whole site scrolls smoothly with Lenis, and the About and profile sections take over the wheel to move sideways. While moving sideways, **the page also slid down**: one wheel tick moved the track 51px horizontally and the page 98px vertically (#1045). Lenis ignores `preventDefault` and **calls `scrollTo` itself** from its own window listener. The only signal it backs off from is a **`data-lenis-prevent-wheel` marker** on the event path, so the section sets the marker only for wheels it takes, and removes it for wheels at the edge so vertical scrolling can take over.",
    },
    demoMode: "live",
    demoKey: "lenisWheel",
    language: "typescript",
    code: `const handleWheel = (e: WheelEvent) => {
  const aligned = Math.abs(section.getBoundingClientRect().top) <= ALIGN_TOLERANCE_PX;
  // 끝에 닿았고 그 방향으로 더 굴리면 막지 않는다 — Lenis 가 세로로 이어받는다
  const take = aligned && !atHorizontalEdge(e.deltaY);

  // Lenis 는 defaultPrevented 를 보지 않는다. 물러나게 하는 수단은 이 표시뿐이다 —
  // Lenis 가 composedPath 를 훑어 확인하고, 이 리스너가 window 보다 먼저 돌므로 같은 이벤트에 먹는다
  section.toggleAttribute("data-lenis-prevent-wheel", take);
  if (!take) return;

  e.preventDefault();                                // 브라우저 기본 스크롤만 막는다
  state.targetScrollX += clamp(-MAX_WHEEL_DELTA, MAX_WHEEL_DELTA, e.deltaY);
};`,
  },
];
