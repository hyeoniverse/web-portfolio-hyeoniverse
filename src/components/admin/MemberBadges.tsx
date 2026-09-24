"use client";

import { ShieldCheck, Crown, PenLine, UserRound } from "@/components/icons";
import { RiVerifiedBadgeFill, RiVerifiedBadgeLine } from "react-icons/ri";
import { useLanguage } from "@/providers/LanguageProvider";
import type { MemberRole } from "@/types/member";
import styles from "./MembersList.module.css";

/** 멤버 역할/로그인수단 배지 — MembersList 와 AuthorsEditor 공용. */

const ROLE_META: Record<MemberRole, { ko: string; en: string; icon: typeof Crown; cls: string }> = {
  owner: { ko: "소유자", en: "Owner", icon: Crown, cls: "roleOwner" },
  admin: { ko: "관리자", en: "Admin", icon: ShieldCheck, cls: "roleAdmin" },
  author: { ko: "작성자", en: "Author", icon: PenLine, cls: "roleAuthor" },
  member: { ko: "멤버", en: "Member", icon: UserRound, cls: "roleMember" },
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const { language } = useLanguage();
  const rm = ROLE_META[role];
  const Icon = rm.icon;
  return (
    <span className={`${styles.role} ${styles[rm.cls]}`}>
      <Icon size={11} strokeWidth={2} />
      {language === "ko" ? rm.ko : rm.en}
    </span>
  );
}

export function ProviderChips({ providers }: { providers: string[] }) {
  const { language } = useLanguage();
  if (providers.length === 0) return null;
  return (
    <>
      {providers.map((p) =>
        p === "github" ? (
          <span
            key={p}
            className={styles.provider}
            title={language === "ko" ? "GitHub 계정으로 로그인할 수 있습니다." : "Can sign in with GitHub."}
          >
            {/* 수단 아이콘 대신 체크 배지 — "연결돼 사용 가능" 상태임을 모양으로 말한다.
               라벨도 수단 이름만이 아니라 상태까지 — "OAuth 미연결" 배지와 짝이 되는 문구 */}
            <RiVerifiedBadgeFill size={12} aria-hidden />
            {language === "ko" ? "GitHub 연결됨" : "GitHub linked"}
          </span>
        ) : (
          <span
            key={p}
            className={styles.provider}
            title={language === "ko" ? "이메일과 비밀번호로 로그인할 수 있습니다." : "Can sign in with email and password."}
          >
            <RiVerifiedBadgeFill size={12} aria-hidden />
            {language === "ko" ? "이메일 로그인 가능" : "Email login enabled"}
          </span>
        ),
      )}
    </>
  );
}

/** GitHub OAuth 미연결 배지 — 연결 배지(채운 체크)와 짝이 되는 빈 체크 아이콘.
 *  AuthorsEditor 행과 MemberDetailModal 이 같이 쓴다(전에는 각자 span 을 복붙했다). */
export function ProviderUnlinkedBadge() {
  const { language } = useLanguage();
  return (
    <span
      className={`${styles.role} ${styles.rolePendingBadge}`}
      title={language === "ko" ? "GitHub 계정으로 로그인한 적이 없습니다." : "Has never signed in with GitHub."}
    >
      <RiVerifiedBadgeLine size={12} aria-hidden />
      {language === "ko" ? "OAuth 미연결" : "OAuth not linked"}
    </span>
  );
}
