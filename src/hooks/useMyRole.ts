"use client";

import { useEffect, useState } from "react";
import { PERM, canEditPost, canEditWork, type UserRole } from "@/lib/api/roles";

interface MeResponse {
  email: string | null;
  role: "owner" | "author" | null;
  level: number | null;
  isOwner: boolean;
  authorId: string | null;
}

export interface MyRole {
  /** 아직 확인 전. 이 동안에는 권한이 필요한 조작을 열어 두지 않는다. */
  loading: boolean;
  isOwner: boolean;
  level: number;
  authorId: string | null;
  /** 이 글을 수정·삭제할 수 있는가. 서버의 canEditPost 와 같은 함수를 쓴다. */
  canEditPost: (authorIds: string[] | null | undefined) => boolean;
  /** 이 작업물을 수정할 수 있는가 — 관리자이거나 그 작업물의 팀원. */
  canEditWork: (teamMembers: { author_id?: string }[] | null | undefined) => boolean;
  /** 작업물을 새로 만들거나 지울 수 있는가 — admin 이상. */
  canManageWorks: boolean;
}

/**
 * 로그인한 계정의 권한 — 화면에서 조작을 감추거나 잠그기 위한 것.
 *
 * 서버는 이미 막고 있지만, 누를 수 있는 버튼을 두면 눌러 봐야 안 된다는 걸 알게 된다.
 * 판정에는 서버와 **같은 함수**(lib/api/roles 의 canEditPost)를 쓴다. 화면에서 규칙을 다시
 * 구현하면 두 곳이 갈라지고, 갈라지는 순간 버튼과 실제 권한이 어긋난다.
 *
 * 이것은 표시용이다. 인가는 서버와 RLS 정책이 한다.
 */
export function useMyRole(): MyRole {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MeResponse | null) => { if (alive) setMe(d); })
      .catch(() => { /* 확인 실패 시 권한 없음으로 둔다 */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const role: UserRole = {
    role: me?.role ?? null,
    level: me?.isOwner ? Number.POSITIVE_INFINITY : (me?.level ?? 0),
    authorId: me?.authorId ?? null,
    isOwner: !!me?.isOwner,
  };

  return {
    loading,
    isOwner: role.isOwner,
    level: role.level,
    authorId: role.authorId,
    canEditPost: (authorIds) => !loading && canEditPost(role, authorIds),
    canEditWork: (teamMembers) => !loading && canEditWork(role, teamMembers),
    canManageWorks: !loading && (role.isOwner || role.level >= PERM.ADMIN),
  };
}
