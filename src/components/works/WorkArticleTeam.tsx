"use client";

import { useState } from "react";
import { Users, Link2, Mail } from "@/components/icons";
import "katex/dist/katex.min.css";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Author } from "@/types/author";
import { OWNER_AUTHOR_ID } from "@/utils/resolvePostAuthors";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import T from "@/components/ui/T";
import styles from "./WorkArticleTeam.module.css";
import type { WorkArticleViewProps } from "./workArticleTypes";

/* ────────────────────────────────────────────────────────────
 * WorkArticleTeam — DetailLayout 의 afterContent slot (full-width).
 * 팀 멤버 폴라로이드 flip carousel. 본인(siteConfig.personal) + project.teamMembers.
 * flip 상태 / hover 등 인터랙션은 모두 내부 보유.
 * 좁은 본문 컬럼이 아닌 전체 페이지 폭에서 렌더되도록 children 에서 분리됨.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleTeam({ project, viewLang }: WorkArticleViewProps) {
  const { t } = useLanguage();
  const siteConfig = useSiteConfig();

  const [flippedMembers, setFlippedMembers] = useState<Set<number>>(new Set());
  const [hoveredMemberIdx, setHoveredMemberIdx] = useState<number | null>(null);
  const toggleFlipped = (i: number) => setFlippedMembers((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  // 팀 멤버 — 본인(siteConfig.personal) + project.teamMembers
  const personal = siteConfig?.personal;
  const githubLink = siteConfig?.socialLinks?.find((l) => l.platform === "github");
  const ownerMember = personal ? {
    name: personal.name,
    /* siteConfig.personal 에는 영문 이름이 없어 소유자 멤버 프로필(설정 > 계정)의 영어 이름을 쓴다 */
    name_en: ((siteConfig?.authors ?? []) as Author[]).find((a) => a.id === OWNER_AUTHOR_ID)?.name_en?.trim() || undefined,
    role: { ko: project.role.ko, en: project.role.en },
    url: githubLink?.url || undefined,
    email: siteConfig?.contact?.email || undefined,
    avatar_url: personal.profileImage || undefined,
    contributions: project.contributions,
  } : null;
  /* 사이트 멤버에 연결된 팀원은 비어 있는 칸을 지금의 멤버 프로필로 채운다 — 연결할 때 한 번 복사한 값만 있으면
     프로필에서 영어 이름·사진을 고쳐도 작업물에는 반영되지 않았다. 적어 둔 값이 있으면 그 값이 먼저다 */
  const authors = (siteConfig?.authors ?? []) as Author[];
  const teamArr = (project.teamMembers ?? []).map((m) => {
    const prof = m.author_id ? authors.find((a) => a.id === m.author_id) : undefined;
    if (!prof) return m;
    const profUrl = prof.links?.find((l) => l.platform === "github")?.url || prof.links?.[0]?.url;
    /* 프로필 사진은 이모지·아이콘일 수도 있다 — 팀원 카드는 그림 주소만 그리므로 주소일 때만 */
    const av = prof.avatar ?? "";
    const profAvatar = /^(https?:)?\/\//.test(av) || av.startsWith("/") ? av : undefined;
    return {
      ...m,
      name_en: m.name_en || prof.name_en?.trim() || undefined,
      url: m.url || profUrl || undefined,
      email: m.email || prof.email || undefined,
      avatar_url: m.avatar_url || profAvatar,
    };
  });
  const members = ownerMember ? [ownerMember, ...teamArr] : teamArr;

  const getContribsEntries = (m: typeof members[number]) => {
    const ko = m.contributions?.ko ?? {};
    const en = m.contributions?.en ?? {};
    const enHas = Object.values(en).some((items) => items.length > 0);
    const koHas = Object.values(ko).some((items) => items.length > 0);
    const map = viewLang === "en" ? (enHas ? en : ko) : (koHas ? ko : en);
    return Object.entries(map).filter(([, items]) => items.length > 0);
  };
  const getDisplayName = (m: typeof members[number]) =>
    viewLang === "en" && m.name_en ? m.name_en : m.name;
  const renderContribs = (m: typeof members[number], wrapperClass: string, groupClass: string, roleClass: string, listClass: string) => {
    const entries = getContribsEntries(m);
    if (entries.length === 0) return null;
    return (
      <div className={wrapperClass}>
        {entries.map(([role, items]) => (
          <div key={role} className={groupClass}>
            <div className={roleClass}>{role}</div>
            <ul className={listClass}>
              {items.map((c, ci) => <li key={ci}>{c}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  };
  const renderAvatar = (m: typeof members[number], wrapperClass: string, imgClass: string, initialClass: string) => {
    const avatarUrl = deriveTeamMemberAvatar(m);
    const name = getDisplayName(m);
    return (
      <div className={wrapperClass}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className={imgClass} loading="lazy" />
        ) : (
          <span className={initialClass}>{getMemberInitial(name)}</span>
        )}
      </div>
    );
  };

  if (members.length === 0) return null;

  return (
    <section className={styles.teamCreditsSection}>
      <div className={styles.teamCreditsHeader}>
        <Users size={16} />
        <span className={styles.teamCreditsLabel}><T k="workDetail.team" /></span>
      </div>
      <HorizontalCarousel className={styles.polaroidCarousel}>
        {members.map((m, i) => {
          const isFlipped = flippedMembers.has(i);
          const isHovered = hoveredMemberIdx === i;
          const hasContribs = getContribsEntries(m).length > 0;
          const hasLinks = !!(m.url || m.email);
          const hasBack = hasContribs || hasLinks;
          const showBack = hasBack && (isFlipped || isHovered);
          return (
            <article
              key={i}
              className={`${styles.polaroidCard} ${showBack ? styles.polaroidCardShowBack : ""}`}
              data-cursor={hasBack ? "big" : undefined}
              onClick={hasBack ? () => {
                toggleFlipped(i);
                setHoveredMemberIdx(null);
              } : undefined}
              onMouseEnter={hasBack ? () => setHoveredMemberIdx(i) : undefined}
              onMouseLeave={hasBack ? () => setHoveredMemberIdx(null) : undefined}
              role={hasBack ? "button" : undefined}
              tabIndex={hasBack ? 0 : undefined}
              onKeyDown={hasBack ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleFlipped(i);
                  setHoveredMemberIdx(null);
                }
              } : undefined}
              aria-pressed={hasBack ? isFlipped : undefined}
            >
              <div className={styles.polaroidCardInner}>
                <div className={styles.polaroidFront}>
                  {renderAvatar(m, styles.polaroidAvatar, styles.polaroidAvatarImg, styles.polaroidAvatarInitial)}
                  <div className={styles.polaroidCaption}>
                    <span className={styles.polaroidName}>{getDisplayName(m)}</span>
                    <span className={styles.polaroidRole}>
                      <T ko={m.role.ko} en={m.role.en} />
                    </span>
                  </div>
                </div>
                {hasBack && (
                  <div className={styles.polaroidBack}>
                    <div className={styles.polaroidBackHeader}>
                      <span className={styles.polaroidBackName}>{getDisplayName(m)}</span>
                      {(m.url || m.email) && (
                        <div
                          className={styles.polaroidBackLinks}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {m.url && (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.teamLinkIcon}
                              title={m.url}
                              aria-label={fillTemplate(t("workDetail.memberLink"), { name: getDisplayName(m) })}
                            >
                              <Link2 size={13} />
                            </a>
                          )}
                          {m.email && (
                            <a
                              href={`mailto:${m.email}`}
                              className={styles.teamLinkIcon}
                              title={m.email}
                              aria-label={fillTemplate(t("workDetail.memberEmail"), { name: getDisplayName(m) })}
                            >
                              <Mail size={13} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {hasContribs ? (
                      renderContribs(
                        m,
                        styles.polaroidBackContribs,
                        styles.polaroidBackContribGroup,
                        styles.polaroidBackContribRole,
                        styles.polaroidBackContribList,
                      )
                    ) : (
                      <div className={styles.polaroidBackContribs}>
                        <div className={styles.polaroidBackContribGroup}>
                          <div className={styles.polaroidBackContribRole}>
                            <T ko={m.role.ko} en={m.role.en} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
