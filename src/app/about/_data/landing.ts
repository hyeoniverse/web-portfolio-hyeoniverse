/* About 개편 — 제품 랜딩 구성의 글. 수치 · 사실은 README(한눈에 보기 · 기술 스택 · 빠른 시작)와 LICENSE, 코드에서 확인했다 */
import type { L10n } from "./showcase";

export const heroCta = {
  value: {
    ko: "작업물을 보여 주고, 글을 쓰고, 운영까지 하는 개인 사이트를 한 저장소로.",
    en: "A personal site that shows the work, writes the posts and runs itself — in one repository.",
  } satisfies L10n,
  primary: { ko: "작업물 보기", en: "See the work" } satisfies L10n,
  secondary: { ko: "연락하기", en: "Get in touch" } satisfies L10n,
};

export const trust = {
  eyebrow: { ko: "신뢰", en: "Trust" } satisfies L10n,
  title: { ko: "빠르고, 안전하고, 검사를 통과한다", en: "Fast, safe, and checked" } satisfies L10n,
  items: [
    {
      label: { ko: "성능", en: "Performance" },
      value: "98",
      unit: "Lighthouse",
      points: [
        { ko: "LCP 1.9초", en: "LCP 1.9s" },
        { ko: "초기 번들 449KB", en: "449KB initial bundle" },
      ],
    },
    {
      label: { ko: "보안", en: "Security" },
      value: "4",
      unit: { ko: "단계 권한", en: "role tiers" },
      points: [
        { ko: "RLS 로 DB 가 권한 판정", en: "RLS decides permissions in the database" },
        { ko: "쓰기 요청 Origin 확인(운영 fail-closed)", en: "Origin check on writes (fail-closed in production)" },
        { ko: "로그인 5회 실패 잠금 · 새 기기 메일 승인", en: "Lockout after 5 failures · new-device email approval" },
      ],
    },
    {
      label: { ko: "품질", en: "Quality" },
      value: "1,062",
      unit: { ko: "단위 테스트", en: "unit tests" },
      points: [
        { ko: "Vitest · Playwright 스모크", en: "Vitest · Playwright smoke" },
        { ko: "typecheck · eslint · stylelint · knip 한 번에", en: "typecheck · eslint · stylelint · knip in one run" },
      ],
    },
  ] as { label: L10n; value: string; unit: string | L10n; points: L10n[] }[],
};

export const faq = {
  eyebrow: { ko: "자주 묻는 질문", en: "FAQ" } satisfies L10n,
  items: [
    {
      q: { ko: "어떤 기술로 만들었나요?", en: "What is it built with?" },
      a: {
        ko: "Next.js 16 · React 19 · TypeScript, 백엔드는 Supabase(PostgreSQL · Auth · Storage · RLS)입니다. 애니메이션은 GSAP · Framer Motion · Lenis, 3D 는 Three.js · React Three Fiber, 편집기는 Plate.js 입니다.",
        en: "Next.js 16, React 19 and TypeScript, with Supabase (PostgreSQL, Auth, Storage, RLS). Animation uses GSAP, Framer Motion and Lenis; 3D uses Three.js and React Three Fiber; the editor is Plate.js.",
      },
    },
    {
      q: { ko: "관리자 화면도 볼 수 있나요?", en: "Can I see the admin?" },
      a: {
        ko: "관리자 화면은 로그인한 소유자와 초대받은 멤버만 들어갈 수 있습니다. 대신 이 페이지의 기능 장에서 실제 화면과 데모로 볼 수 있습니다.",
        en: "Only the signed-in owner and invited members can enter it. The features chapter on this page shows the real screens and demos instead.",
      },
    },
    {
      q: { ko: "내 사이트로 가져다 써도 되나요?", en: "Can I use it for my own site?" },
      a: {
        ko: "라이선스는 PolyForm Noncommercial 1.0 이라 비상업적 용도로 쓸 수 있습니다. 돌리려면 Supabase 프로젝트가 필요하고, 설치 순서는 저장소의 docs/supabase-setup.md 에 있습니다.",
        en: "It's licensed under PolyForm Noncommercial 1.0, so non-commercial use is fine. It needs a Supabase project; setup steps are in docs/supabase-setup.md in the repository.",
      },
    },
    {
      q: { ko: "글과 작업물은 어디에 저장되나요?", en: "Where do posts and work live?" },
      a: {
        ko: "Supabase 데이터베이스에 저장되고, content 폴더의 .md 파일과 동기화 스크립트로 오갈 수 있습니다. 작업물은 DB 를 쓸 수 없으면 저장소의 정적 데이터로 대신 보여 줍니다.",
        en: "In the Supabase database, and they sync both ways with .md files in the content folder. If the database is unavailable, works fall back to static data in the repository.",
      },
    },
  ] as { q: L10n; a: L10n }[],
};

export const finalCta = {
  title: { ko: "이제 직접 둘러보세요.", en: "Now take a look around." } satisfies L10n,
  body: {
    ko: "작업물과 글은 실제 페이지에서, 궁금한 점은 메시지로.",
    en: "The work and posts are live — and questions are welcome.",
  } satisfies L10n,
  works: { ko: "작업물 보기", en: "See the work" } satisfies L10n,
  posts: { ko: "글 읽기", en: "Read posts" } satisfies L10n,
  contact: { ko: "연락하기", en: "Get in touch" } satisfies L10n,
};

/** 엔딩 크레딧 — 숫자는 작업 과정 단계(content/about/process)에서 합산 */
export const credits = {
  label: { ko: "엔딩 크레딧", en: "End credits" } satisfies L10n,
  eyebrow: { ko: "The Making of", en: "The Making of" } satisfies L10n,
  title: { ko: "That's a wrap.", en: "That's a wrap." } satisfies L10n,
  chapters: { ko: "장", en: "Chapters" } satisfies L10n,
  tools: { ko: "사용한 도구", en: "Built with" } satisfies L10n,
  record: { ko: "개발 기록", en: "On record" } satisfies L10n,
  days: { ko: "일", en: "days" } satisfies L10n,
  commits: { ko: "커밋", en: "commits" } satisfies L10n,
};
