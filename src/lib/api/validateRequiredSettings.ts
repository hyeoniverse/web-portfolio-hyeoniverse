/* 사이트 설정 필수값 검사 — /api/admin/settings PATCH 에서 사용.
 *
 * UI(설정 화면 validationError·섹션 저장 가드) 와 동일 규칙을 서버에서도 강제한다.
 * 클라이언트를 거치지 않고 API 를 직접 부르면 UI 검증은 아무 역할을 못 하므로,
 * checkAboutErd 와 같은 방식으로 여기서 한 번 더 막는다.
 * DB CHECK(2026_08_02_settings_required.sql) 까지 합쳐 UI·API·DB 3중 검증 (저장소 관례). */

// config 는 { delta, savedDefaults } wrapper 구조 — 실제 값은 delta 안에 있음.
// 읽기 경로(src/lib/getSiteConfig.ts)가 `config.delta ?? config` 로 푸는 것과 같게 맞춘다.
function unwrapDelta(cfg: unknown): Record<string, unknown> {
  if (cfg && typeof cfg === "object") {
    const c = cfg as Record<string, unknown>;
    return ("delta" in c && c.delta && typeof c.delta === "object")
      ? (c.delta as Record<string, unknown>)
      : c;
  }
  return {};
}

/** delta 에서 dot-path 로 값을 꺼낸다. 중간 경로가 없으면 undefined. */
function pick(delta: Record<string, unknown>, path: string): unknown {
  let cur: unknown = delta;
  for (const key of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** 값이 문자열이고 trim 후 비어있으면 true. (undefined = delta 에 없음 = 기본값 유지 → 통과) */
function isBlankString(v: unknown): boolean {
  return typeof v === "string" && v.trim() === "";
}

/* 필수 텍스트 필드 — 기본값이 비어있지 않으므로 "delta 에 존재하면서 빈 문자열"이면 위반.
   (delta 에 없으면 기본값이 유지되어 통과) */
const REQUIRED_TEXT: Array<{ path: string; label: string }> = [
  { path: "metadata.title", label: "사이트 제목" },
  { path: "personal.name", label: "이름" },
  { path: "theme.accentColor", label: "액센트 색상" },
  { path: "theme.lightBg", label: "라이트 배경색" },
  { path: "theme.lightText", label: "라이트 텍스트색" },
  { path: "theme.darkBg", label: "다크 배경색" },
  { path: "theme.darkText", label: "다크 텍스트색" },
];

/* giscus 필드 — 기본값이 "" 라 delta 존재 여부로는 못 잡는다. provider 가 giscus 일 때
   실효값(delta 값 또는 기본 "")이 비어있으면 위반. */
const GISCUS_REQUIRED: Array<{ path: string; label: string }> = [
  { path: "comments.giscus.repo", label: "giscus repo" },
  { path: "comments.giscus.repoId", label: "giscus repoId" },
  { path: "comments.giscus.category", label: "giscus category" },
  { path: "comments.giscus.categoryId", label: "giscus categoryId" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 사이트 설정 필수값 검사 — 통과면 null, 위반이면 사유 문자열 반환.
 *
 * 규칙(빈값 저장 차단):
 * - 사이트 제목 / 이름 / 테마 색상 5종 — 비울 수 없음
 * - 이메일 — 입력했다면 형식이 맞아야 함 (빈 값은 허용)
 * - 댓글 provider 가 giscus 면 repo·repoId·category·categoryId 필수
 * - 멤버(authors) 각 항목의 이름 필수
 */
export function checkRequiredSettings(cfg: unknown): string | null {
  const delta = unwrapDelta(cfg);

  for (const { path, label } of REQUIRED_TEXT) {
    if (isBlankString(pick(delta, path))) return `${label} 을(를) 비워둘 수 없습니다.`;
  }

  const email = pick(delta, "contact.email");
  if (typeof email === "string" && email.trim() && !EMAIL_RE.test(email.trim())) {
    return "이메일 형식이 올바르지 않습니다.";
  }

  // 댓글 provider 실효값 — delta 에 없으면 기본값 "system"
  const provider = pick(delta, "comments.provider") ?? "system";
  if (provider === "giscus") {
    for (const { path, label } of GISCUS_REQUIRED) {
      const v = pick(delta, path) ?? ""; // 기본값 ""
      if (typeof v !== "string" || v.trim() === "") {
        return `${label} 을(를) 입력해야 합니다. (giscus 사용 시 필수)`;
      }
    }
  }

  // 멤버(authors) — delta 에 있으면 각 이름 필수
  const authors = pick(delta, "authors");
  if (Array.isArray(authors)) {
    for (let i = 0; i < authors.length; i++) {
      const a = authors[i];
      const name = a && typeof a === "object" ? (a as Record<string, unknown>).name : undefined;
      if (typeof name !== "string" || name.trim() === "") {
        return `멤버 ${i + 1} 의 이름을 비워둘 수 없습니다.`;
      }
    }
  }

  return null;
}
