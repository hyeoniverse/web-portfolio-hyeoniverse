/** 관리자 멤버(인증된 사용자) 표현 — API(members)와 UI(MembersList) 공용. (이슈 #334) */

export type MemberRole = "owner" | "admin" | "author" | "member";

export interface Member {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: MemberRole;
  /** 권한 레벨 — owner 는 null(전권). */
  level: number | null;
  /** 로그인 수단 — "github" | "email" ... (OAuth 인증 여부 판별용) */
  providers: string[];
  /** GitHub 프로필 URL (OAuth 로그인 시) — 소셜 링크 자동 추가/불러오기용 */
  githubUrl: string | null;
  authorId: string | null;
  createdAt: string;
  lastSignInAt: string | null;
}

/** 아직 로그인하지 않은(미가입) 초대 — 목록에 "초대됨"으로 표시. */
export interface PendingMember {
  email: string;
  level: number;
  authorId: string | null;
  createdAt: string;
}

export interface MembersResponse {
  members: Member[];
  pendingInvites: PendingMember[];
}
