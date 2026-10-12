"use client";

import { ShieldCheck, Crown, PenLine, UserRound } from "@/components/icons";
import { RiVerifiedBadgeFill, RiVerifiedBadgeLine } from "react-icons/ri";
import { useLanguage } from "@/providers/LanguageProvider";
import type { MemberRole } from "@/types/member";
import styles from "./MembersList.module.css";

/** 멤버 역할/로그인수단 배지 — MembersList 와 AuthorsEditor 공용. */

const ROLE_META: Record<MemberRole, { labelKey: string; icon: typeof Crown; cls: string }> = {
  owner: { labelKey: "admin.inline.memberBadges.roleOwner", icon: Crown, cls: "roleOwner" },
  admin: { labelKey: "admin.inline.memberBadges.roleAdmin", icon: ShieldCheck, cls: "roleAdmin" },
  author: { labelKey: "admin.inline.memberBadges.roleAuthor", icon: PenLine, cls: "roleAuthor" },
  member: { labelKey: "admin.inline.memberBadges.roleMember", icon: UserRound, cls: "roleMember" },
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const { t } = useLanguage();
  const rm = ROLE_META[role];
  const Icon = rm.icon;
  return (
    <span className={`${styles.role} ${styles[rm.cls]}`}>
      <Icon size={11} strokeWidth={2} />
      {t(rm.labelKey)}
    </span>
  );
}

export function ProviderChips({ providers }: { providers: string[] }) {
  const { t } = useLanguage();
  if (providers.length === 0) return null;
  return (
    <>
      {providers.map((p) =>
        p === "github" ? (
          <span
            key={p}
            className={styles.provider}
            title={t("admin.inline.memberBadges.canSignInWith")}
          >
            {/* 수단 아이콘 대신 체크 배지 — "연결돼 사용 가능" 상태임을 모양으로 말한다.
               라벨도 수단 이름만이 아니라 상태까지 — "OAuth 미연결" 배지와 짝이 되는 문구 */}
            <RiVerifiedBadgeFill size={12} aria-hidden />
            {t("admin.inline.memberBadges.githubLinked")}
          </span>
        ) : (
          <span
            key={p}
            className={styles.provider}
            title={t("admin.inline.memberBadges.canSignInWith2")}
          >
            <RiVerifiedBadgeFill size={12} aria-hidden />
            {t("admin.inline.memberBadges.emailLoginEnabled")}
          </span>
        ),
      )}
    </>
  );
}

/** GitHub OAuth 미연결 배지 — 연결 배지(채운 체크)와 짝이 되는 빈 체크 아이콘.
 *  AuthorsEditor 행과 MemberDetailModal 이 같이 쓴다(전에는 각자 span 을 복붙했다). */
export function ProviderUnlinkedBadge() {
  const { t } = useLanguage();
  return (
    <span
      className={`${styles.role} ${styles.rolePendingBadge}`}
      title={t("admin.inline.memberBadges.hasNeverSignedIn")}
    >
      <RiVerifiedBadgeLine size={12} aria-hidden />
      {t("admin.inline.memberBadges.oauthNotLinked")}
    </span>
  );
}
