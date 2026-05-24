"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import "katex/dist/katex.min.css";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import Image from "next/image";
import Link from "next/link";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Pencil, ArrowLeft, Globe, User, Users, Link2, Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { Project } from "@/data/projects";
import DetailLayout, { type TocHeading } from "@/components/layout/DetailLayout";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import { extractHeadings, getBentoClass } from "../_utils";
import Button from "@/components/ui/Button";
import dynamic from "next/dynamic";
import AdjacentNav from "@/components/ui/AdjacentNav/AdjacentNav";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
const CommentSection = dynamic(() => import("@/components/comments/CommentSection"), { ssr: false });
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import AISummary from "@/components/ui/AISummary";
import ShareButton from "@/components/ui/ShareButton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Tooltip from "@/components/ui/Tooltip";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLikeToggle } from "@/hooks/useLikeToggle";
import styles from "./WorkDetail.module.css";

interface WorkDetailClientProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function WorkDetailClient({
  project,
  prevProject,
  nextProject,
}: WorkDetailClientProps) {
  const { t, language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const siteConfig = useSiteConfig();
  /* translation 활성 여부는 client context 에서 — server 의 getSecret 제거됨. */
  const translationEnabled = siteConfig?.translation?.enabled !== false;
  const isRichtext = project.contentType === "richtext";
  const [viewLang, setViewLang] = useState<"ko" | "en">(
    !project.content.en ? "ko" : !project.content.ko ? "en" : language === "en" ? "en" : "ko"
  );
  const isAdmin = useIsAuthenticated();
  const { count: likeCount, liked, busy: likeBusy, toggle: handleLikeToggle } = useLikeToggle({
    endpoint: `/api/works/${project.id}/like`,
  });
  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
  const [flippedMembers, setFlippedMembers] = useState<Set<number>>(new Set());
  const [hoveredMemberIdx, setHoveredMemberIdx] = useState<number | null>(null);
  const toggleFlipped = (i: number) => setFlippedMembers((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });
  const [relatedPosts, setRelatedPosts] = useState<{ id: string; title: string; title_en?: string; slug: string; cover_image: string; excerpt: string; category: string; created_at: string }[]>([]);
  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const richtextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/works/${project.id}/related-posts`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setRelatedPosts(d.items); })
      .catch(() => {});
    return () => ac.abort();
  }, [project.id]);

  const contentRaw = project.content[viewLang] || project.content.ko;
  // richtext img에 data-cursor="zoom" 주입 (CursorTrail 이미지 뷰어 힌트)
  const content = isRichtext
    ? contentRaw.replace(/<img\s/g, '<img data-cursor="zoom" ')
    : contentRaw;
  const needsTranslation = viewLang === "en" && !project.content[viewLang];

  useRichtextEnhance(richtextRef, content);

  const headings: TocHeading[] = useMemo(() => {
    const contentHeadings = extractHeadings(content, isRichtext);
    if (project.gallery.length > 0) {
      contentHeadings.push({ id: "gallery", text: "Gallery", level: 2 });
    }
    return contentHeadings;
  }, [content, isRichtext, project.gallery.length]);

  return (
    <>
    <DetailLayout
      backHref="/works"
      backLabel={t("workDetail.back")}
      heroImage={project.image}
      heroAlt={project.title}
      headings={headings}
      header={
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
              {isAdmin && (
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
              <LanguageToggle lang={viewLang} onLangChange={setViewLang} />
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
              project.tech.forEach((t) => {
                const note = project.tech_notes?.[t];
                const text = note
                  ? (viewLang === "en"
                      ? (note.en.trim() || note.ko.trim())
                      : (note.ko.trim() || note.en.trim()))
                  : "";
                if (text) withText.push({ tech: t, text });
                else plain.push(t);
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
                        {plain.map((t) => (
                          <span key={t} className={styles.techNoteTag}>{t}</span>
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
      }
      likeConfig={{ count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }}
      afterContent={
        <>
          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {project.liveUrl && (
              <Button variant="outline" size="lg" href={project.liveUrl} external>
                <Globe size={16} />
                <T k="workDetail.visitSite" tooltip={t("tooltip.visitSite")} />
              </Button>
            )}
            {project.githubUrl && (
              <Button variant="outline" size="sm" href={project.githubUrl} external>
                <GithubIcon size={14} />
                <T ko="GitHub" en="GitHub" tooltip={t("tooltip.github")} />
              </Button>
            )}
          </motion.div>

          {/* Team Members — Credits 영역. content 다음에 표시 (메타 컴팩트화) */}
          {project.teamMembers && project.teamMembers.length > 0 && (() => {
            const members = project.teamMembers;
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
                          {/* 앞면 — image + 이름 + role */}
                          <div className={styles.polaroidFront}>
                            {renderAvatar(m, styles.polaroidAvatar, styles.polaroidAvatarImg, styles.polaroidAvatarInitial)}
                            <div className={styles.polaroidCaption}>
                              <span className={styles.polaroidName}>{getDisplayName(m)}</span>
                              <span className={styles.polaroidRole}>
                                <T ko={m.role.ko} en={m.role.en} />
                              </span>
                            </div>
                          </div>
                          {/* 뒷면 — 이름 + contribs + link/email */}
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
          })()}

          {/* 관련 글 */}
          {relatedPosts.length > 0 && (
            <section className={styles.relatedSection}>
              <div className={styles.relatedHeader}>
                <FileText size={16} />
                <span className={styles.relatedLabel}>{viewLang === "en" ? "Related Posts" : "관련 글"}</span>
              </div>
              <HorizontalCarousel className={styles.relatedGrid}>
                {relatedPosts.map((p, idx) => {
                  const title = viewLang === "en" && p.title_en ? p.title_en : p.title;
                  return (
                    <div
                      key={p.id}
                      onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); navigateWithTransition(`/posts/${p.slug}`, p.cover_image || "", rect); }}
                      className={styles.relatedCard}
                    >
                      <div className={styles.relatedCardImage}>
                        {p.cover_image ? (
                          <Image
                            src={p.cover_image}
                            alt={title}
                            fill
                            sizes="(max-width: 768px) 50vw, 220px"
                            className={styles.relatedCardImg}
                          />
                        ) : (
                          <ImageIcon className={styles.relatedCardPlaceholder} size={32} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className={styles.relatedCardBody}>
                        <div className={styles.relatedCardMeta}>
                          <span className={styles.relatedCardOrder}>#{idx + 1}</span>
                          {p.category && <span className={styles.relatedCardCategory}>{p.category}</span>}
                        </div>
                        <span className={styles.relatedCardTitle}>{title}</span>
                        {p.excerpt && <span className={styles.relatedCardExcerpt}>{p.excerpt}</span>}
                        {p.created_at && (
                          <span className={styles.relatedCardDate}>
                            {new Date(p.created_at).toLocaleDateString(viewLang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </HorizontalCarousel>
            </section>
          )}

          {/* 이전/다음 프로젝트 */}
          <AdjacentNav
            prev={prevProject ? {
              href: `/works/${prevProject.slug || prevProject.id}`,
              title: prevProject.title,
              image: prevProject.image,
            } : null}
            next={nextProject ? {
              href: `/works/${nextProject.slug || nextProject.id}`,
              title: nextProject.title,
              image: nextProject.image,
            } : null}
            prevLabelKey="workDetail.previous"
            nextLabelKey="workDetail.next"
          />

          {/* Comments */}
          <motion.div
            className={styles.commentWrap}
            id="comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <CommentSection commentType="work" targetId={project.id} translationEnabled={translationEnabled} />
          </motion.div>

          <div className={styles.footerNav}>
            <Link href="/works" className={styles.footerLink}>
              <ArrowLeft size={16} className={styles.footerArrow} /> <T k="workDetail.viewAll" />
            </Link>
          </div>
        </>
      }
    >
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

    </DetailLayout>

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
