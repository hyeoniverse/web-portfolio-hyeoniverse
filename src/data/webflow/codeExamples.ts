import type { CodeExample } from "./types";

export const codeExamples: CodeExample[] = [
  {
    title: "StaggerText Component",
    description: {
      ko: "텍스트에 마우스를 올리면 글자가 왼쪽부터 차례로 **외곽선만 남으며 비워지고**, 마우스를 떼면 **오른쪽부터 역순으로 색이 다시 채워집니다**. 한꺼번에 바뀌는 것이 아니라 글자마다 **0.04초씩 시간차**를 두어 도미노처럼 퍼지는 느낌을 줍니다.",
      en: "When you hover over text, letters **empty out to just outlines** from left to right. When you move away, colors **fill back in reverse order**. Each letter changes with a **0.04-second delay** after the previous one, creating a **domino-like ripple effect**.",
    },
    language: "javascript",
    code: `// 호버: 순방향 (첫 글자 → 마지막)
// 해제: 역방향 (마지막 → 첫 글자), stroke 유지
const forwardDelay = i * 0.04;
const reverseDelay = (totalChars - 1 - i) * 0.04;
const delay = isHovered ? forwardDelay : reverseDelay;

// CSS: step-end로 즉시 전환
.char { transition: color 0.01s step-end; }
.charHovered { color: transparent; -webkit-text-stroke: 1px; }
.charExiting { -webkit-text-stroke: 1px; } // stroke 유지`,
  },
  {
    title: "Magnetic Hover Effect",
    description: {
      ko: "커서를 버튼 근처로 가져가면 버튼이 **자석에 끌리듯 커서 쪽으로 살짝 이동**합니다. 커서와 버튼 중심 사이의 거리에 비례하여 움직이며, 커서가 멀어지면 **탄성 있게 원래 자리로 되돌아갑니다**.",
      en: "Move your cursor near the button and it **slides toward you like a magnet**. The closer the cursor gets, the more the button follows. When you move away, it **bounces back to its original position** with a spring-like motion.",
    },
    language: "javascript",
    code: `const x = useMotionValue(0);
const y = useMotionValue(0);
const springX = useSpring(x, { stiffness: 150, damping: 15 });
const springY = useSpring(y, { stiffness: 150, damping: 15 });

const onMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
  y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
};
const onMouseLeave = () => { x.set(0); y.set(0); };`,
  },
  {
    title: "Infinite Scroll Wrapping",
    description: {
      ko: "프로젝트 카드가 **좌우 어느 방향으로든 끝없이 순환**하는 가로 갤러리입니다. 같은 카드를 여러 세트 복제해 놓고, 스크롤이 끝에 가까워지면 **눈에 보이지 않게 위치를 되감아** 처음으로 돌려놓습니다. 사용자는 끊김 없이 계속 스크롤할 수 있습니다.",
      en: "A horizontal gallery where project cards **loop endlessly in both directions**. The same cards are duplicated in sets, and when you scroll near the edge, the position is **silently reset** so you never reach the end. The result is a **seamless infinite scroll** experience.",
    },
    language: "javascript",
    code: `// 연속된 인트로 간 거리로 한 세트 너비 계산
const introEls = slider.querySelectorAll('.intro');
const oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;

// rAF 루프에서 양방향 래핑
while (scrollX > oneSetWidth * 3) {
  scrollX -= oneSetWidth;
  targetScrollX -= oneSetWidth;
}
while (scrollX < -oneSetWidth * 3) {
  scrollX += oneSetWidth;
  targetScrollX += oneSetWidth;
}`,
  },
  {
    title: "Dynamic Frame Grid",
    description: {
      ko: "3×3 CSS Grid에서 **호버한 셀이 커지고 나머지가 줄어드는** 반응형 레이아웃입니다. `grid-template-rows`와 `grid-template-columns`의 **fr 단위를 동적으로 변경**하여 호버된 행·열에 더 많은 공간을 할당합니다. CSS transition만으로 **부드러운 크기 재분배**가 이루어집니다.",
      en: "A responsive layout where the **hovered cell expands while others shrink** in a 3×3 CSS Grid. By **dynamically changing fr units** of `grid-template-rows` and `grid-template-columns`, more space is allocated to the hovered row and column. Smooth **size redistribution** is achieved with CSS transitions alone.",
    },
    language: "javascript",
    code: `const GRID_SIZE = 12;
const HOVER_SIZE = 6;

const getSizes = (axis) => {
  if (!hovered) return "4fr 4fr 4fr";
  const idx = axis === "row" ? hovered.row : hovered.col;
  const rest = (GRID_SIZE - HOVER_SIZE) / 2;
  return [0, 1, 2]
    .map((i) => (i === idx
      ? \`\${HOVER_SIZE}fr\` : \`\${rest}fr\`))
    .join(" ");
};

// Grid에 적용
style={{
  gridTemplateRows: getSizes("row"),
  gridTemplateColumns: getSizes("col"),
  transition: "grid-template-rows 0.4s ease,
               grid-template-columns 0.4s ease",
}}`,
  },
  {
    title: "3D Scroll Torus (Lissajous Curve)",
    description: {
      ko: "스크롤할 때마다 3D 토러스가 **화면 안에서 끝없이 떠다니는** 효과입니다. X와 Y 축에 **서로 다른 주파수의 사인파**를 적용하여 리사주 곡선을 그리며, 화면 밖으로 나가지 않으면서도 **반복되지 않는 유기적인 궤적**을 만듭니다. Lenis 무한 스크롤의 **누적 거리를 추적**하여 스크롤 방향에 관계없이 연속적으로 움직입니다.",
      en: "A 3D torus that **floats endlessly within the viewport** as you scroll. By applying **sine waves with different frequencies** to the X and Y axes, it traces a Lissajous curve — staying on-screen while creating an **organic, non-repeating trajectory**. It tracks **cumulative Lenis scroll distance** so the torus moves continuously regardless of scroll direction.",
    },
    language: "javascript",
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
  },
];
