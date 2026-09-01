import type { LocalizedText } from "./types";

export interface SecurityItem {
  title: LocalizedText;
  description: LocalizedText;
  scope: LocalizedText;
  icon: string;
}

export const securityItems: SecurityItem[] = [
  {
    title: {
      ko: "SQL Injection 방지",
      en: "SQL Injection Prevention",
    },
    description: {
      ko: "모든 DB 쿼리에 Supabase **파라미터화 쿼리**(prepared statements)를 사용합니다. 사용자 입력이 쿼리 문자열에 직접 삽입되지 않아 SQL Injection 공격을 원천 차단합니다.",
      en: "All database queries use Supabase **parameterized queries** (prepared statements). User input is never directly interpolated into query strings, blocking SQL injection attacks at the source.",
    },
    scope: {
      ko: "모든 DB 쿼리",
      en: "All DB queries",
    },
    icon: "db",
  },
  {
    title: {
      ko: "XSS 방지",
      en: "XSS Prevention",
    },
    description: {
      ko: "React JSX가 모든 사용자 입력을 **자동 이스케이프**합니다. `dangerouslySetInnerHTML`을 사용하지 않으며, 서버 측에서 **HTML 태그 스트리핑**과 **제어문자 제거**를 추가로 적용합니다.",
      en: "React JSX **auto-escapes** all user input. No `dangerouslySetInnerHTML` is used. Server-side **HTML tag stripping** and **control character removal** provide additional defense.",
    },
    scope: {
      ko: "모든 사용자 입력 렌더링",
      en: "All user input rendering",
    },
    icon: "shield",
  },
  {
    title: {
      ko: "입력 검증",
      en: "Input Validation",
    },
    description: {
      ko: "모든 공개 API 엔드포인트에서 **UUID 포맷 검증**, **길이 제한**(content 2000자, password 72B, email 254자, nickname 50자), **이메일 포맷 검증**, **enum 타입 검증**, **카테고리 화이트리스트 검증**을 수행합니다.",
      en: "All public API endpoints enforce **UUID format validation**, **length limits** (content 2000 chars, password 72B, email 254 chars, nickname 50 chars), **email format validation**, **enum type checks**, and **category whitelist validation**.",
    },
    scope: {
      ko: "모든 공개 API",
      en: "All public APIs",
    },
    icon: "check",
  },
  {
    title: {
      ko: "단일 경로 인증",
      en: "Single-path Authentication",
    },
    description: {
      ko: "익명 댓글의 수정/삭제는 **bcrypt**(salt round 10) 비밀번호 **한 경로로만** 인증합니다. 브라우저 UUID 기반 `commenter_hash` 로도 통과시키던 경로는 제거했습니다. 31비트 비암호 해시라 위변조가 가능했고, 아바타 표시를 위해 공개 응답에 포함되는 값이기 때문입니다. 관리자는 **Supabase Auth** 세션으로 인증합니다.",
      en: "Editing or deleting an anonymous comment authenticates through **one path only**: a **bcrypt** (salt round 10) password. The path that also accepted a browser UUID-based `commenter_hash` was removed, because that value is a 31-bit non-cryptographic hash and is returned in the public response so avatars can be drawn. Admins authenticate with a **Supabase Auth** session.",
    },
    scope: {
      ko: "댓글 수정/삭제, 관리자",
      en: "Comment edit/delete, Admin",
    },
    icon: "lock",
  },
  {
    title: {
      ko: "역할 기반 인가 + 소유자 부트스트랩",
      en: "Role-based Authorization + Owner Bootstrap",
    },
    description: {
      ko: "역할(소유자/편집자/저자)은 **`app_metadata`(service_role 전용)** 에만 저장해 클라이언트가 자기 권한을 못 올립니다. `requireOwner()`/`requireRole()` 가 매 요청 재조회하고, GitHub OAuth 는 인증만 하므로 `/auth/callback` 에서 초대 여부를 재검사합니다. **소유자는 `OWNER_EMAIL` 로 부트스트랩 후 첫 로그인 시 DB 에 1회 못박고(claim-and-close)**, `OWNER_EMAIL` 미설정 시엔 계정을 삭제하지 않아 배포 초기 자기 락아웃을 막습니다.",
      en: "Roles (owner/editor/author) live only in **`app_metadata` (service_role only)** so a client can't elevate itself. `requireOwner()`/`requireRole()` re-read them every request, and since GitHub OAuth only authenticates, `/auth/callback` re-checks the invite. **The owner is bootstrapped from `OWNER_EMAIL` then pinned in the DB on first login (claim-and-close)**; when `OWNER_EMAIL` is unset the account is kept, preventing self-lockout during initial deployment.",
    },
    scope: {
      ko: "멤버 관리, 관리자 API",
      en: "Member management, admin API",
    },
    icon: "crown",
  },
  {
    title: {
      ko: "Row Level Security",
      en: "Row Level Security",
    },
    description: {
      ko: "Supabase **RLS 정책**으로 테이블별 접근 권한을 DB 레벨에서 제어합니다. 서버 API를 우회하더라도 인증되지 않은 데이터 접근이 불가능합니다.",
      en: "Supabase **RLS policies** control table-level access at the database layer. Unauthorized data access is impossible even if server APIs are bypassed.",
    },
    scope: {
      ko: "모든 테이블",
      en: "All tables",
    },
    icon: "rows",
  },
  {
    title: {
      ko: "경로 보호",
      en: "Route Protection",
    },
    description: {
      ko: "Layout 레벨에서 **Supabase Auth 세션**을 확인합니다. 미인증 시 접근 거부 페이지로 리다이렉트되며, 로그인 URL을 외부에 노출하지 않습니다.",
      en: "**Supabase Auth session** is verified at the layout level. Unauthenticated requests redirect to an access denied page. Login URL is not exposed externally.",
    },
    scope: {
      ko: "/admin/* 전체",
      en: "All /admin/* routes",
    },
    icon: "route",
  },
  {
    title: {
      ko: "중복 방지",
      en: "Duplication Prevention",
    },
    description: {
      ko: "좋아요·방문자 통계에 **IP 기반 UNIQUE 제약조건**을 적용합니다. `UNIQUE(target_type, target_id, ip)` 하나로 모든 엔티티의 중복을 DB 레벨에서 차단합니다.",
      en: "**IP-based UNIQUE constraints** prevent duplicate likes and visit counts. A single `UNIQUE(target_type, target_id, ip)` blocks all entity duplicates at the DB level.",
    },
    scope: {
      ko: "좋아요, 방문자 통계",
      en: "Likes, visit stats",
    },
    icon: "fingerprint",
  },
  {
    title: {
      ko: "시크릿 관리",
      en: "Secrets Management",
    },
    description: {
      ko: "API 키는 DB `site_settings`에 **암호화 저장**되며, `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 접근 가능합니다. 클라이언트에 노출되는 키는 `NEXT_PUBLIC_` 접두사만 허용합니다.",
      en: "API keys are stored **encrypted** in DB `site_settings`. `SUPABASE_SERVICE_ROLE_KEY` is accessible only server-side. Only `NEXT_PUBLIC_` prefixed keys are exposed to the client.",
    },
    scope: {
      ko: "환경변수, API 키",
      en: "Env vars, API keys",
    },
    icon: "key",
  },
];
