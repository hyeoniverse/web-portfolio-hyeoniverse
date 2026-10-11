/* 보안 — 겹겹이 막는 그림. 본문(제목 · 범위 · 설명)은 data/generated/aboutContent.ts 의 aboutSecurity 를 그대로 쓰고,
   여기엔 겹 나누기 · 그림에 적을 짧은 이름 · 화면 문구만 둔다.
   겹은 바깥(브라우저)에서 안(비밀값)으로 — 공개 요청 하나가 실제로 지나가는 순서다.
   댓글 수정은 id 형식을 먼저 보고(lib/api/commentDetailHandler.ts 의 isValidUUID) 그다음 bcrypt 로 비밀번호를 맞춘다. */
import type { L10n } from "./showcase";

export interface SecLayerItem {
  /** aboutSecurity 항목의 icon — 항목마다 하나뿐이라 열쇠로 쓴다 */
  icon: string;
  /** 고리 위에 적을 짧은 이름 */
  short: L10n;
  /** 고리 위 자리(도, 0 = 오른쪽, 시계 방향). 위쪽 가운데(-90 근처)는 겹 이름 자리라 비운다 */
  angle: number;
}

export interface SecLayer {
  id: string;
  name: L10n;
  /** 이 겹이 하는 일 한 줄 */
  caption: L10n;
  items: SecLayerItem[];
}

export const securityLayers: SecLayer[] = [
  {
    /* 출력 쪽 — JSX 자동 이스케이프, 댓글 마크다운은 DOMPurify(components/comments/CommentMarkdown.tsx) */
    id: "render",
    name: { ko: "렌더링", en: "Rendering" },
    caption: {
      ko: "브라우저에 그릴 때 사용자 입력이 코드로 실행되지 않게 합니다.",
      en: "When it reaches the browser, user input never runs as code.",
    },
    items: [{ icon: "shield", short: { ko: "XSS", en: "XSS" }, angle: 150 }],
  },
  {
    /* 공개 API 첫머리 — utils/commentValidation.ts(isValidUUID · 태그 · 제어문자 제거) */
    id: "input",
    name: { ko: "입력", en: "Input" },
    caption: {
      ko: "API 에 들어온 값의 형식 · 길이 · 허용 목록을 먼저 확인합니다.",
      en: "Values entering the API are checked for format, length and allow-lists first.",
    },
    items: [{ icon: "check", short: { ko: "입력 검증", en: "Validation" }, angle: 30 }],
  },
  {
    /* 댓글은 bcrypt 한 경로, 관리자는 proxy.ts 가드 + admin 레이아웃의 getUser */
    id: "auth",
    name: { ko: "인증 · 경로", en: "Auth · Routes" },
    caption: {
      ko: "누가 보냈는지 확인합니다. 댓글은 비밀번호 한 경로, 관리자는 세션으로 봅니다.",
      en: "Who sent it: comments by one password path, admins by session.",
    },
    items: [
      { icon: "lock", short: { ko: "단일 경로 인증", en: "Single-path auth" }, angle: 200 },
      { icon: "route", short: { ko: "경로 보호", en: "Route guard" }, angle: 330 },
    ],
  },
  {
    /* 서버를 지나 DB 까지 — 파라미터화 쿼리 · RLS · UNIQUE 인덱스(supabase/setup.sql) */
    id: "db",
    name: { ko: "데이터베이스", en: "Database" },
    caption: {
      ko: "서버를 우회해도 DB 가 스스로 막습니다.",
      en: "Even if the server is bypassed, the database refuses on its own.",
    },
    items: [
      { icon: "db", short: { ko: "SQL Injection", en: "SQL Injection" }, angle: 130 },
      { icon: "rows", short: { ko: "RLS", en: "RLS" }, angle: 50 },
      { icon: "fingerprint", short: { ko: "중복 방지", en: "Dedup" }, angle: 205 },
    ],
  },
  {
    /* 가장 안 — 서비스 롤 키 · API 키는 서버에서만(lib/getSecret.ts) */
    id: "secret",
    name: { ko: "비밀값", en: "Secrets" },
    caption: {
      ko: "키는 서버 안에만 둡니다. 브라우저에는 공개용 키만 나갑니다.",
      en: "Keys stay on the server. Only public keys reach the browser.",
    },
    items: [{ icon: "key", short: { ko: "비밀값 관리", en: "Secrets" }, angle: 100 }],
  },
];

export const securityRingsText = {
  /* 그림 설명(스크린 리더) — {layers} 는 겹 이름을 이어 붙여 채운다 */
  diagram: {
    ko: "바깥에서 안으로 겹친 보안 고리: {layers}. 가운데가 데이터입니다.",
    en: "Security rings from outside in: {layers}. The data sits at the center.",
  } satisfies L10n,
  core: { ko: "데이터", en: "Data" } satisfies L10n,
  listLabel: { ko: "보안 겹", en: "Security layers" } satisfies L10n,
  hint: {
    ko: "고리나 목록을 고르면 요청이 그 겹에서 멈춥니다.",
    en: "Pick a ring or a row to stop the request at that layer.",
  } satisfies L10n,
  resume: { ko: "다시 흐르게", en: "Resume" } satisfies L10n,
  /* 겹마다 항목 수 — {n} 을 채운다 */
  items: { ko: "{n}가지", en: "{n} items" } satisfies L10n,
  itemOne: { ko: "{n}가지", en: "{n} item" } satisfies L10n,
};
