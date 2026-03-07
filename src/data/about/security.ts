import type { LocalizedText } from "./types";

export interface SecurityItem {
  layer: string;
  title: LocalizedText;
  description: LocalizedText;
  scope: LocalizedText;
  icon: string;
}

export const securityItems: SecurityItem[] = [
  {
    layer: "SQL Injection",
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
    layer: "XSS",
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
    layer: "Input Validation",
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
    layer: "Authentication",
    title: {
      ko: "이중 인증 시스템",
      en: "Dual Authentication System",
    },
    description: {
      ko: "댓글 수정/삭제에 **이중 인증** 적용 -- 브라우저 UUID 기반 `commenter_hash`(자동)와 **bcrypt**(salt round 10) 비밀번호(수동). 관리자는 **Supabase Auth** 세션으로 별도 인증합니다.",
      en: "Comment edit/delete uses **dual authentication** -- browser UUID-based `commenter_hash` (automatic) and **bcrypt** (salt round 10) password (manual). Admin uses separate **Supabase Auth** session.",
    },
    scope: {
      ko: "댓글 수정/삭제, 관리자",
      en: "Comment edit/delete, Admin",
    },
    icon: "lock",
  },
  {
    layer: "RLS",
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
    layer: "Route Protection",
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
    layer: "Duplication",
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
    layer: "Secrets",
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
