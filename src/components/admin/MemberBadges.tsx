"use client";

import { ShieldCheck, Crown, PenLine, UserRound } from "@/components/icons";
import { RiVerifiedBadgeFill, RiVerifiedBadgeLine } from "react-icons/ri";
import { useLanguage } from "@/providers/LanguageProvider";
import type { MemberRole } from "@/types/member";
import Badge, { type BadgeTone, type BadgeVariant } from "@/components/ui/Badge";

/** 멤버 역할/로그인수단 배지 — MembersList 와 AuthorsEditor 공용. */

const ROLE_META: Record<MemberRole, { labelKey: string; icon: typeof Crown; variant: BadgeVariant; tone: BadgeTone }> = {
  owner: { labelKey: "admin.inline.memberBadges.roleOwner", icon: Crown, variant: "soft", tone: "accent" },
  admin: { labelKey: "admin.inline.memberBadges.roleAdmin", icon: ShieldCheck, variant: "soft", tone: "neutral" },
  author: { labelKey: "admin.inline.memberBadges.roleAuthor", icon: PenLine, variant: "outline", tone: "neutral" },
  member: { labelKey: "admin.inline.memberBadges.roleMember", icon: UserRound, variant: "outline", tone: "neutral" },
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const { t } = useLanguage();
  const rm = ROLE_META[role];
  const Icon = rm.icon;
  return (
    <Badge variant={rm.variant} tone={rm.tone} uppercase icon={<Icon size={11} strokeWidth={2} />}>
      {t(rm.labelKey)}
    </Badge>
  );
}

export function ProviderChips({ providers }: { providers: string[] }) {
  const { t } = useLanguage();
  if (providers.length === 0) return null;
  return (
    <>
      {providers.map((p) =>
        p === "github" ? (
          <Badge key={p} tone="success" uppercase icon={<RiVerifiedBadgeFill size={12} />} title={t("admin.inline.memberBadges.githubLoginTip")}>
            {/* 수단 아이콘 대신 체크 배지 — "연결돼 사용 가능" 상태임을 모양으로 말한다.
               라벨도 수단 이름만이 아니라 상태까지 — "OAuth 미연결" 배지와 짝이 되는 문구 */}
            {t("admin.inline.memberBadges.githubLinked")}
          </Badge>
        ) : (
          <Badge key={p} tone="success" uppercase icon={<RiVerifiedBadgeFill size={12} />} title={t("admin.inline.memberBadges.emailLoginTip")}>
            {t("admin.inline.memberBadges.emailLoginEnabled")}
          </Badge>
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
    <Badge icon={<RiVerifiedBadgeLine size={12} />} title={t("admin.inline.memberBadges.githubNeverSignedInTip")}>
      {t("admin.inline.memberBadges.oauthNotLinked")}
    </Badge>
  );
}
