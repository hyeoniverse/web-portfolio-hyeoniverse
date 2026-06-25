"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Globe, Users, User, Pencil, Link2, Mail } from "lucide-react";
import "katex/dist/katex.min.css";
import { GithubIcon } from "@/components/icons";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import Button from "@/components/ui/Button";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import AISummary from "@/components/ui/AISummary";
import ShareButton from "@/components/ui/ShareButton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import { getBentoClass } from "@/app/works/_utils";
import styles from "@/app/works/[slug]/WorkDetail.module.css";

export interface WorkArticleViewProps {
  project: Project;
  viewLang: "ko" | "en";
  /** 미리보기 모드 — 저장된 DB 레코드가 필요한 요소(좋아요/댓글 등)는 호출부에서 제외 */
  isPreview?: boolean;
  /** 어드민 여부 — 편집 링크 노출. 미리보기에선 보통 미사용 */
  isAdmin?: boolean;
  onLangChange?: (l: "ko" | "en") => void;
}

/* ────────────────────────────────────────────────────────────
 * WorkArticleHeader — DetailLayout 의 header slot 에 들어가는 영역.
 * meta(#번호/배지/편집/언어토글) · 제목 · 설명 · 액션(Visit/GitHub/Share) · info grid · AISummary.
 * detail/preview 가 동일 레이아웃을 공유하기 위한 presentational 컴포넌트.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleHeader({
  project,
  viewLang,
  isAdmin: isAdminProp,
  isPreview,
  onLangChange,
}: WorkArticleViewProps) {
  const { t } = useLanguage();
  const siteConfig = useSiteConfig();
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  const authed = useIsAuthenticated();
  const isAdmin = isAdminProp ?? authed;

  const handleLangChange = onLangChange ?? (() => {});
  const needsTranslation = viewLang === "en" && !project.content[viewLang];

  return (
    <>
      {/* ── Meta header ── */}
      <motion.div
        className={styles.meta}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className={styles.metaLeft}>
          <span className={styles.projectNumber}>#{project.number}</span>
          {/* 팀/개인 + 성격 배지는 한 묶음 (좁은 gap) — metaLeft 의 lg gap 영향 안 받게 */}
          <div className={styles.tagGroup}>
            {(() => {
              const teamCount = project.teamMembers?.length ?? 0;
              // 본인 포함 = teamCount + 1
              return teamCount > 0 ? (
                <span className={`${styles.tag} ${styles.tagTeam}`}>
                  <Users size={11} strokeWidth={1.8} />
                  <T ko={`팀 · ${teamCount + 1}`} en={`Team · ${teamCount + 1}`} />
                </span>
              ) : (
                <span className={`${styles.tag} ${styles.tagSolo}`}>
                  <User size={11} strokeWidth={1.8} />
                  <T ko="개인" en="Solo" />
                </span>
              );
            })()}
            {project.nature && (
              <span className={`${styles.tag} ${styles.tagNature}`}><T ko={project.nature.ko} en={project.nature.en} /></span>
            )}
          </div>
          {isAdmin && !isPreview && (
            <>
              <span className={styles.metaDivider} />
              <Tooltip content={t("workDetail.editWork")} placement="top" delay={200}>
                <a
                  href={`/admin/works/${project.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                >
                  <Pencil size={13} />
                </a>
              </Tooltip>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LanguageToggle lang={viewLang} onLangChange={handleLangChange} />
        </div>
      </motion.div>

      {/* ── Title ── */}
      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {project.title}
      </motion.h1>

      {/* ── Description ── */}
      <motion.p
        className={styles.description}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <T ko={project.description.ko} en={project.description.en} />
      </motion.p>

      {/* ── Header action row — Visit Site / GitHub / Share 묶음 (description 아래, 오른쪽 정렬) ── */}
      <motion.div
        className={styles.headerActions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.5 }}
      >
        {project.liveUrl && (
          <Button variant="outline" size="xs" href={project.liveUrl} external>
            <Globe size={14} />
            <T k="workDetail.visitSite" tooltip={t("tooltip.visitSite")} />
          </Button>
        )}
        {project.githubUrl && (
          <Button variant="outline" size="xs" href={project.githubUrl} external>
            <GithubIcon size={14} />
            GitHub
          </Button>
        )}
        <ShareButton />
      </motion.div>

      {/* ── Info grid ── */}
      <motion.div
        className={styles.infoGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
      >
        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}>Year</span>
          <span className={styles.infoValue}>{project.year}</span>
        </div>
        {(() => {
          const catsKo = project.categories?.ko ?? (project.category.ko ? [project.category.ko] : []);
          const catsEn = project.categories?.en ?? (project.category.en ? [project.category.en] : []);
          if (catsKo.length === 0) return null;
          return (
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}><T k="workDetail.category" /></span>
              <span className={styles.infoValue}>
                <T
                  ko={catsKo.join(", ")}
                  en={catsKo.map((k, i) => catsEn[i] || k).join(", ")}
                />
              </span>
            </div>
          );
        })()}
        {/* Tech — 설명 있는 것 위에 한 줄씩 (chip + text), 없는 것 아래에 wrap 으로 한 묶음 */}
        {(() => {
          const withText: Array<{ tech: string; text: string }> = [];
          const plain: string[] = [];
          project.tech.forEach((tech) => {
            const note = project.tech_notes?.[tech];
            const text = note
              ? (viewLang === "en"
                  ? (note.en.trim() || note.ko.trim())
                  : (note.ko.trim() || note.en.trim()))
              : "";
            if (text) withText.push({ tech, text });
            else plain.push(tech);
          });
          return (
            <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
              <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
              <div className={styles.techSection}>
                {withText.length > 0 && (
                  <ul className={styles.techNotesList}>
                    {withText.map(({ tech, text }) => (
                      <li key={tech} className={styles.techNoteItem}>
                        <span className={styles.techNoteTag}>{tech}</span>
                        <span className={styles.techNoteText}>{text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {plain.length > 0 && (
                  <div className={styles.techPlainGroup}>
                    {plain.map((tech) => (
                      <span key={tech} className={styles.techNoteTag}>{tech}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* Role + Contributions 통합 — items 있는 role 은 grid col, 없는 role 은 · 으로 한 줄 */}
        {(() => {
          const ko = project.contributions?.ko ?? {};
          const en = project.contributions?.en ?? {};
          const enHas = Object.keys(en).length > 0;
          const koHas = Object.keys(ko).length > 0;
          const map = viewLang === "en" ? (enHas ? en : ko) : (koHas ? ko : en);
          const entries = Object.entries(map);
          const withItems = entries.filter(([, items]) => items.length > 0);
          const plainRoles = entries.filter(([, items]) => items.length === 0).map(([role]) => role);
          return (
            <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
              <span className={styles.infoLabel}><T k="workDetail.role" /></span>
              <div className={styles.ownContribsWrap}>
                {entries.length === 0 ? (
                  // contributions 아예 없으면 project.role 단독 표시
                  <div className={styles.ownContribsPlain}>
                    <span className={styles.ownContribsRoleChip}>
                      <T ko={project.role.ko} en={project.role.en} />
                    </span>
                  </div>
                ) : (
                  <>
                    {withItems.length > 0 && (
                      <div className={styles.ownContribsGrid}>
                        {withItems.map(([role, items]) => (
                          <div key={role} className={styles.teamContribsGroup}>
                            <div className={styles.teamContribsRoleLabel}>{role}</div>
                            <ul className={styles.teamContribs}>
                              {items.map((c, ci) => (
                                <li key={ci}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {plainRoles.length > 0 && (
                      <div className={styles.ownContribsPlain}>
                        {plainRoles.map((role, i) => (
                          <span key={role} className={styles.ownContribsRoleChip}>
                            {i > 0 && <span className={styles.ownContribsSep} aria-hidden> · </span>}
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </motion.div>

      {needsTranslation && translationEnabled && (
        <div className={styles.translateBanner}>
          <p className={styles.translateMessage}>
            <T k="workDetail.noTranslationEn" />
          </p>
        </div>
      )}

      <AISummary
        summaryKo={project.summary?.ko ?? ""}
        summaryEn={project.summary?.en ?? ""}
        lang={viewLang}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * WorkArticleBody — DetailLayout 의 children slot.
 * 본문(richtext/markdown) · 갤러리 + ImageViewer.
 * richtext enhance / gallery viewer 등 인터랙션은 모두 내부 보유.
 * 팀 멤버 carousel 은 full-width afterContent slot 으로 분리됨 → WorkArticleTeam.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleBody({ project, viewLang }: WorkArticleViewProps) {
  const isRichtext = project.contentType === "richtext";

  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const richtextRef = useRef<HTMLDivElement>(null);

  const contentRaw = project.content[viewLang] || project.content.ko;
  // richtext img에 data-cursor="zoom" 주입 (CursorTrail 이미지 뷰어 힌트)
  const content = isRichtext
    ? contentRaw.replace(/<img\s/g, '<img data-cursor="zoom" ')
    : contentRaw;

  useRichtextEnhance(richtextRef, content);

  // mermaid 다이어그램 + in-content TOC 렌더 (richtext 만)
  useEffect(() => {
    if (!isRichtext) return;
    const el = richtextRef.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    import("@/components/posts/enhanceReaderExtras").then(({ enhanceReaderExtras }) => {
      cleanup = enhanceReaderExtras(el);
    });
    return () => cleanup?.();
  }, [isRichtext, content]);

  return (
    <>
      {/* Content */}
      {content && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div ref={proseRef}>
            {isRichtext ? (
              <div ref={richtextRef} className={styles.sectionProse} dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <MarkdownRenderer content={content} className={styles.sectionProse} />
            )}
          </div>
        </motion.div>
      )}

      {/* Gallery — TOC anchor 와 동일한 본문 영역 안 */}
      {project.gallery.length > 0 && (
        <motion.div
          id="gallery"
          className={styles.gallery}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          {project.gallery.map((src, i) => {
            const count = project.gallery.length;
            const bentoClass = getBentoClass(i, count, styles);
            return (
              <div
                key={i}
                className={`${styles.galleryItem} ${bentoClass ?? ""}`}
                onClick={() => setGalleryViewer({ open: true, index: i })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setGalleryViewer({ open: true, index: i }); }}
                data-cursor="zoom"
              >
                <ProgressiveImage
                  src={src}
                  alt={`${project.title} ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={styles.galleryImage}
                />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Gallery ImageViewer */}
      <ImageViewer
        images={project.gallery}
        index={galleryViewer.index}
        open={galleryViewer.open}
        onClose={() => setGalleryViewer({ open: false, index: 0 })}
        title={project.title}
      />

      {/* Prose ImageViewer */}
      <ImageViewer
        images={proseViewer.images}
        index={proseViewer.index}
        open={proseViewer.open}
        onClose={closeProseViewer}
        title={project.title}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * WorkArticleTeam — DetailLayout 의 afterContent slot (full-width).
 * 팀 멤버 폴라로이드 flip carousel. 본인(siteConfig.personal) + project.teamMembers.
 * flip 상태 / hover 등 인터랙션은 모두 내부 보유.
 * 좁은 본문 컬럼이 아닌 전체 페이지 폭에서 렌더되도록 children 에서 분리됨.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleTeam({ project, viewLang }: WorkArticleViewProps) {
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
    /* siteConfig.personal 에는 영문 이름 별도 필드가 없어 undefined.
       union 으로 ProjectTeamMember 와 합쳐질 때 name_en?: string 시그니처 일치시키기 위해 명시. */
    name_en: undefined as string | undefined,
    role: { ko: project.role.ko, en: project.role.en },
    url: githubLink?.url || undefined,
    email: siteConfig?.contact?.email || undefined,
    avatar_url: personal.profileImage || undefined,
    contributions: project.contributions,
  } : null;
  const teamArr = project.teamMembers ?? [];
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
                              aria-label="link"
                            >
                              <Link2 size={13} />
                            </a>
                          )}
                          {m.email && (
                            <a
                              href={`mailto:${m.email}`}
                              className={styles.teamLinkIcon}
                              title={m.email}
                              aria-label="email"
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
