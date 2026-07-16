import type { User } from "@supabase/supabase-js";

/**
 * 역할/권한 모델 (다중 저자 — 이슈 #334 Phase 1).
 *
 * 역할·권한은 Supabase `app_metadata` 에 저장한다. app_metadata 는 **service role(admin) 만**
 * 쓸 수 있어(사용자가 자기 metadata 로 못 올림) 신뢰할 수 있다. (user_metadata 는 사용자가 편집 가능 → 권한 저장 금지)
 *
 * 부트스트랩: 기존 owner 계정은 app_metadata 가 비어 있을 수 있으므로 `OWNER_EMAIL` 환경변수로도 owner 를 인정한다.
 */

export type Role = "owner" | "author";

/** 권한 레벨 — 숫자가 클수록 넓은 권한. owner 는 별도(전권). */
export const PERM = {
  /** 자기 글만 작성/수정/삭제 (기본) */
  AUTHOR: 1,
  /** 모든 글 작성/수정 (사이트 설정·저자 관리 제외) */
  EDITOR: 2,
} as const;

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

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  const isOwner = meta.role === "owner" || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);
  if (isOwner) return { role: "owner", level: Number.POSITIVE_INFINITY, authorId, isOwner: true };

  if (meta.role === "author") {
    const level = typeof meta.permission_level === "number" ? meta.permission_level : PERM.AUTHOR;
    return { role: "author", level, authorId, isOwner: false };
  }
  return { ...EMPTY, authorId };
}

/** 이 역할이 대상 글(author_ids)을 편집할 수 있는가. owner/editor 는 전부, author 는 본인 글만. */
export function canEditPost(role: UserRole, authorIds: string[] | null | undefined): boolean {
  if (role.isOwner || role.level >= PERM.EDITOR) return true;
  if (role.role === "author" && role.authorId) return (authorIds ?? []).includes(role.authorId);
  return false;
}
