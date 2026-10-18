/**
 * 블로그 레이아웃 확인용 더미 글 시드 — 글 목록 카드 · 사이드바 날짜별 기록 · TIL 잔디가 채워진 모습을 보려고 쓴다.
 *
 * 사용법:
 *   npx tsx scripts/seed-blog-dummy.ts          # 넣기(이미 있는 slug 는 건너뜀)
 *   npx tsx scripts/seed-blog-dummy.ts --dry    # 넣을 글만 출력
 *   npx tsx scripts/seed-blog-dummy.ts --clean  # 이 스크립트가 넣은 글(slug 가 "dummy-" 로 시작)을 모두 지움
 *
 * - 일반 글 24편: 지난 1년에 걸쳐 흩어 두고, 카테고리 · 태그 · 커버 유무 · 고정글 · 조회수를 섞는다.
 * - TIL 48편: 최근 120일에 걸쳐 띄엄띄엄(연속 기록 구간 포함) 두고 "TIL" 태그를 단다.
 * 모든 더미 글은 slug 가 "dummy-" 로 시작하고 "dummy" 태그가 붙어 실제 글과 구분된다.
 *
 * 실행 전 .env.local 에 다음 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const DRY = process.argv.includes("--dry");
const CLEAN = process.argv.includes("--clean");
const DAY = 86_400_000;

const COVERS = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
];

const TOPICS: { title: string; category: string; tags: string[] }[] = [
  { title: "Next.js App Router 에서 서버 컴포넌트와 캐시 다루기", category: "프론트엔드", tags: ["Next.js", "React", "캐시"] },
  { title: "Supabase RLS 정책 설계 회고", category: "회고", tags: ["Supabase", "Postgres"] },
  { title: "CSS 레이어로 디자인 토큰 우선순위 정리하기", category: "프론트엔드", tags: ["CSS", "디자인 시스템"] },
  { title: "Playwright 로 스모크 테스트 돌리기", category: "개발", tags: ["Playwright", "테스트"] },
  { title: "Framer Motion 레이아웃 애니메이션 정리", category: "프론트엔드", tags: ["Framer Motion", "Animation"] },
  { title: "포트폴리오 CMS 를 직접 만든 이유", category: "인사이트", tags: ["CMS", "회고"] },
  { title: "Vercel 배포 파이프라인 손보기", category: "DevOps", tags: ["Vercel", "CI"] },
  { title: "TypeScript 타입 좁히기 패턴 모음", category: "개발", tags: ["TypeScript"] },
  { title: "이분 탐색 문제 풀이 노트", category: "알고리즘", tags: ["알고리즘", "이분탐색"] },
  { title: "HTTP 캐시 헤더 다시 보기", category: "CS", tags: ["HTTP", "캐시"] },
  { title: "주말 카페 작업 기록", category: "일상", tags: ["일상"] },
  { title: "Three.js 로 마스코트 만들기", category: "프론트엔드", tags: ["Three.js", "WebGL"] },
];

const TIL_TOPICS = [
  "브라우저 렌더링 파이프라인", "실행 컨텍스트와 스코프 체인", "트라이 자료구조", "useEffect 의존성 배열 함정",
  "CSS container query", "Postgres 인덱스 기초", "Git rebase vs merge", "이벤트 루프와 마이크로태스크",
  "React key 가 하는 일", "IntersectionObserver 활용", "Shiki 로 코드 하이라이트", "Zod 로 폼 검증",
];

const body = (title: string) => `## ${title}

오늘 정리한 내용입니다. 레이아웃 확인용 더미 글이에요.

- 핵심 개념을 한 줄로 요약하기
- 헷갈렸던 부분과 해결 방법
- 다음에 더 찾아볼 것

\`\`\`ts
const learned = "${title}";
console.log(learned);
\`\`\`
`;

function buildPosts() {
  const now = Date.now();
  const posts: Record<string, unknown>[] = [];
  // 일반 글 — 지난 1년(약 15일 간격 + 흔들기)
  for (let i = 0; i < 24; i++) {
    const topic = TOPICS[i % TOPICS.length];
    const created = new Date(now - (i * 15 + (i % 4)) * DAY - (i % 5) * 3_600_000);
    posts.push({
      title: i >= TOPICS.length ? `${topic.title} (2)` : topic.title,
      slug: `dummy-post-${String(i + 1).padStart(2, "0")}`,
      content_type: "markdown",
      content: body(topic.title),
      excerpt: `${topic.title} — 레이아웃 확인용 더미 요약입니다. 카드에서 두 줄 정도 보이도록 문장을 조금 길게 썼습니다.`,
      cover_image: i % 4 === 3 ? "" : COVERS[i % COVERS.length],
      category: topic.category,
      tags: [...topic.tags, "dummy"],
      is_pinned: i === 1,
      published: true,
      language: "ko",
      view_count: Math.max(3, 400 - i * 13),
      like_count: (i * 7) % 23,
      created_at: created.toISOString(),
    });
  }
  // TIL — 최근 120일. 최근 6일은 매일(연속 기록), 그 전은 2~4일 간격, 가끔 하루 두 편
  let n = 0;
  for (let d = 0; d < 120 && n < 48; ) {
    const count = d % 17 === 0 ? 2 : 1;
    for (let c = 0; c < count && n < 48; c++) {
      const title = TIL_TOPICS[n % TIL_TOPICS.length];
      posts.push({
        title: `TIL — ${title}`,
        slug: `dummy-til-${String(n + 1).padStart(2, "0")}`,
        content_type: "markdown",
        content: body(title),
        excerpt: `${title} 를 짧게 정리했습니다.`,
        cover_image: "",
        category: "CS",
        tags: ["TIL", "dummy"],
        is_pinned: n === 5,
        published: true,
        language: "ko",
        view_count: 10 + (n % 30),
        like_count: n % 5,
        created_at: new Date(now - d * DAY - (c + 1) * 3_600_000).toISOString(),
      });
      n++;
    }
    d += d < 6 ? 1 : 2 + (d % 3);
  }
  return posts;
}

async function main() {
  const posts = buildPosts();
  if (DRY) {
    for (const p of posts) console.log(`${String(p.created_at).slice(0, 10)}  ${p.slug}  ${p.title}`);
    console.log(`\n총 ${posts.length}편 (실제로 넣지 않음)`);
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(".env.local 에 NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    process.exit(1);
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (CLEAN) {
    const { data, error } = await supabase.from("posts").delete().like("slug", "dummy-%").select("slug");
    if (error) throw error;
    console.log(`지움: 더미 글 ${data?.length ?? 0}편`);
    return;
  }

  let ok = 0;
  for (const post of posts) {
    const { error } = await supabase.from("posts").insert(post);
    if (!error) ok++;
    else if (error.code === "23505") console.log(`  skip  ${post.slug} — 이미 있음`);
    else console.error(`  fail  ${post.slug} — ${error.message}`);
  }
  console.log(`\n넣음: ${ok}/${posts.length}편. 지우려면 --clean`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
