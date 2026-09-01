/**
 * hover 했을 때 튀어오를 말들.
 *
 * 본문에서 실제로 쓰이는 표현만 넣는다. 사전이 넓어질수록 한 문단에서 걸리는 게 많아지고,
 * 다 강조되면 아무것도 강조되지 않은 것과 같다. 한 행에서 실제로 반응하는 개수는
 * `HoverEmphasis` 가 따로 제한한다.
 */

/** 고유명사 — 기술·도구 이름. 본문에 나오는 표기 그대로 적는다. */
const TECH = [
  "Next.js", "React", "TypeScript", "JavaScript", "GSAP", "ScrollTrigger",
  "Framer Motion", "Three.js", "Lottie", "Tailwind", "CSS Modules", "App Router",
  "next/image", "requestAnimationFrame", "useSpring", "useTransform", "clamp()",
  "Node.js", "Express", "PostgreSQL", "MongoDB", "Prisma", "GraphQL",
  "Apollo Client", "RESTful API", "REST API", "Vercel", "Docker", "Figma",
  "Webflow", "VS Code", "Git", "JWT", "SSR", "ORM", "XSS", "SQL Injection", "UI/UX",
];

/** 한국어 본문에서 고를 말. 조사는 붙여 두지 않는다 — 어간까지만 강조하면 자연스럽다. */
const CONCEPT_KO = [
  "가로 스크롤", "무한 루프", "프론트엔드", "백엔드", "풀스택", "포트폴리오",
  "컴포넌트", "재사용", "최적화", "인터랙션", "애니메이션", "반응형", "리팩토링",
  "프로토타입", "미들웨어", "유지보수", "라우팅", "스키마", "스크롤", "인증",
  "웹 개발", "팀 프로젝트", "유니온 타입", "인터페이스", "레이아웃", "제네릭",
  "배포", "설계", "성능", "보안", "테마", "쿼리", "접근성",
];

/** 영어 본문에서 고를 말. 복수형(-s)까지 같이 잡는다. */
const CONCEPT_EN = [
  "horizontal scroll", "infinite scroll", "full-stack", "frontend", "backend",
  "portfolio", "component", "reusable", "optimization", "interaction", "animation",
  "responsive", "refactoring", "prototype", "middleware", "routing", "schema",
  "web development", "team project", "union type", "interface", "layout", "generic",
  "scroll", "auth", "deployed", "performance", "security", "theme", "query", "accessibility",
];

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * 두 번째 캡처가 강조할 말이다.
 *
 * 앞뒤를 `\b` 로 막지 않는다 — 한글에는 낱말 경계가 없어서 `\b` 가 엉뚱한 데서 끊긴다.
 * 대신 영숫자가 바로 붙어 있지 않을 때만 잡는다. 그래서 `Git` 은 `GitHub` 에 걸리지 않고,
 * `포트폴리오를` 은 조사를 뺀 어간까지만 잡힌다.
 *
 * 뒤는 전방탐색이라 자리를 안 먹지만 앞은 한 글자를 먹는다. 먹는 건 말 **앞** 글자라
 * 나란히 붙은 두 말 사이의 구분자는 그대로 남는다 — `React + TypeScript` 처럼.
 *
 * 긴 것부터 늘어놓아야 한다. 정규식은 같은 자리에서 먼저 적힌 쪽을 고르므로,
 * 짧은 게 앞서면 `next/image` 가 `Next` 에서 잘린다.
 */
export const EMPHASIS_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${[
    ...[...TECH, ...CONCEPT_KO].sort((a, b) => b.length - a.length).map(escape),
    ...[...CONCEPT_EN].sort((a, b) => b.length - a.length).map((t) => `${escape(t)}s?`),
  ].join("|")})(?![A-Za-z0-9])`,
  "gi",
);
