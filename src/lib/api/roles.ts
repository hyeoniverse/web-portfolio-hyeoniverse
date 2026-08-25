import type { MemberRole } from "@/types/member";
import type { User } from "@supabase/supabase-js";

/**
 * 역할/권한 모델 (다중 저자 — 이슈 #334 Phase 1).
 *
 * 역할·권한은 Supabase `app_metadata` 에 저장한다. app_metadata 는 **service role(admin) 만**
 * 쓸 수 있어(사용자가 자기 metadata 로 못 올림) 신뢰할 수 있다. (user_metadata 는 사용자가 편집 가능 → 권한 저장 금지)
 *
 * 부트스트랩: 기존 owner 계정은 app_metadata 가 비어 있을 수 있으므로 `OWNER_EMAIL` 환경변수로도 owner 를 인정한다.
 */

type Role = "owner" | "author";

/** 권한 레벨 — 숫자가 클수록 넓은 권한. owner 는 별도(전권).
 *
 *  전체 4단계:
 *    owner   전권 (사이트 설정 · 저자 관리 포함)
 *    admin   모든 글 관리 + 댓글/신고 중재 (사이트 설정 · 저자 관리 제외)
 *    author  자기 글만
 *    visitor 로그인 없음 — 공개 API 만
 */
export const PERM = {
  /** 자기 글만 작성/수정/삭제 (기본) */
  AUTHOR: 1,
  /** 모든 글 작성/수정 + 중재 (사이트 설정·저자 관리 제외) */
  ADMIN: 2,
} as const;

/** PERM 에 정의된 값 전체 — 신뢰할 수 없는 입력을 여기에 대조한다. */
const PERM_LEVELS: readonly number[] = Object.values(PERM);

/**
 * 신뢰할 수 없는 값 → 권한 레벨. PERM 에 정의된 값이 아니면 가장 좁은 권한으로 떨어뜨린다.
 *
 * `typeof === "number"` 만 보면 `1.5`·`999` 같은 값이 그대로 통과한다. 코드에서는 문제가 없지만
 * RLS 정책은 같은 클레임을 `::int` 로 읽어 판정이 갈린다 — 소수는 캐스트 에러로 쿼리가 죽고,
 * 문자열 `"2"` 는 코드가 저자로, SQL 이 관리자로 읽는다. 두 곳이 같은 값을 같게 읽도록 좁힌다.
 */
export function toPermissionLevel(raw: unknown): number {
  return typeof raw === "number" && PERM_LEVELS.includes(raw) ? raw : PERM.AUTHOR;
}

/** 요청 본문의 permission_level 검증. 허용된 값이 아니면 null 을 돌려 호출부가 400 을 내도록 한다. */
export function parsePermissionLevelInput(raw: unknown): number | null {
  return typeof raw === "number" && PERM_LEVELS.includes(raw) ? raw : null;
}

export interface UserRole {
  role: Role | null;
  /** 권한 레벨. owner 는 Infinity. 미인증/역할없음은 0. */
  level: number;
  /** 이 계정이 연결된 site.config author id (posts.author_ids 와 매칭). */
  authorId: string | null;
  isOwner: boolean;
}

const EMPTY: UserRole = { role: null, level: 0, authorId: null, isOwner: false };

/** 인증된 user → 역할 해석. app_metadata + OWNER_EMAIL 부트스트랩. */
export function getUserRole(user: User | null | undefined): UserRole {
  if (!user) return EMPTY;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const authorId = typeof meta.author_id === "string" ? meta.author_id : null;

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = meta.role === "owner" || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);
  if (isOwner) return { role: "owner", level: Number.POSITIVE_INFINITY, authorId, isOwner: true };

  if (meta.role === "author") {
    return { role: "author", level: toPermissionLevel(meta.permission_level), authorId, isOwner: false };
  }
  return { ...EMPTY, authorId };
}

/** 이 역할이 대상 글(author_ids)을 편집할 수 있는가. owner/admin 은 전부, author 는 본인 글만. */
export function canEditPost(role: UserRole, authorIds: string[] | null | undefined): boolean {
  if (role.isOwner || role.level >= PERM.ADMIN) return true;
  if (role.role === "author" && role.authorId) return (authorIds ?? []).includes(role.authorId);
  return false;
}

/**
 * 이 작업물을 수정할 수 있는가.
 *
 * works 에는 posts 의 author_ids 같은 소유권 컬럼이 없다. 대신 팀원 목록에 연결된 저자
 * 프로필로 소유권을 표현한다 — 프로젝트에 팀원으로 올라 있으면 그 작업물의 편집자다.
 * RLS 의 can_edit_work 와 같은 규칙이라 코드와 정책의 판정이 갈리지 않는다.
 *
 * 생성·삭제는 이 함수가 다루지 않는다(관리자 전용).
 */
export function canEditWork(
  role: UserRole,
  teamMembers: { author_id?: string }[] | null | undefined,
): boolean {
  if (role.isOwner || role.level >= PERM.ADMIN) return true;
  if (!role.authorId) return false;
  return (teamMembers ?? []).some((m) => m?.author_id === role.authorId);
}

/** UserRole → 화면에 표시할 등급 배지. members 목록과 context 가 같은 규칙을 쓰게 한다. */
export function toMemberRole(role: UserRole): MemberRole {
  if (role.isOwner) return "owner";
  if (role.level >= PERM.ADMIN) return "admin";
  return role.role === "author" ? "author" : "member";
}
