"use client";

import { Mail, ShieldCheck, Crown, PenLine, UserRound } from "@/components/icons";
import { SiGithub } from "react-icons/si";
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
          <span key={p} className={`${styles.provider} ${styles.providerGithub}`} title="GitHub OAuth">
            <SiGithub size={12} />
            GitHub
          </span>
        ) : (
          <span key={p} className={styles.provider} title={language === "ko" ? "이메일 로그인" : "Email login"}>
            <Mail size={12} />
            {language === "ko" ? "이메일" : "Email"}
          </span>
        ),
      )}
    </>
  );
}
