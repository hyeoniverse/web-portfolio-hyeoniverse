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
  const [activeMemberIdx, setActiveMemberIdx] = useState<number | null>(null);
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
                  return teamCount > 0 ? (
                    <span className={`${styles.tag} ${styles.tagTeam}`}>
                      <Users size={11} strokeWidth={1.8} />
                      <T ko={`팀 · ${teamCount}`} en={`Team · ${teamCount}`} />
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
            {/* Tech — 단일 list (chip + 메모 있으면 옆에 KO/EN 설명). Role 보다 위에 표시 */}
            <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
              <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
              <ul className={styles.techNotesList}>
                {project.tech.map((t) => {
                  const note = project.tech_notes?.[t];
                  const text = note
                    ? (viewLang === "en"
                        ? (note.en.trim() || note.ko.trim())
                        : (note.ko.trim() || note.en.trim()))
                    : "";
                  return (
                    <li key={t} className={styles.techNoteItem}>
                      <span className={styles.techNoteTag}>{t}</span>
                      {text && <span className={styles.techNoteText}>{text}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}><T k="workDetail.role" /></span>
              <span className={`${styles.infoValue} ${styles.infoValueMultiline}`}>
                <T ko={project.role.ko} en={project.role.en} />
              </span>
            </div>
            {project.contributions && (() => {
              // viewLang 의 contribs 가 비면 반대 언어 fallback
              const ko = project.contributions.ko ?? {};
              const en = project.contributions.en ?? {};
              const enHas = Object.values(en).some((items) => items.length > 0);
              const koHas = Object.values(ko).some((items) => items.length > 0);
              const map = viewLang === "en" ? (enHas ? en : ko) : (koHas ? ko : en);
              const entries = Object.entries(map).filter(([, items]) => items.length > 0);
              if (entries.length === 0) return null;
              return (
                <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
                  <span className={styles.infoLabel}>
                    <T ko="역할별 작업" en="Contributions" />
                  </span>
                  <div className={styles.ownContribsGroups}>
                    {entries.map(([role, items]) => (
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
                </div>
              );
            })()}
            {project.teamMembers && project.teamMembers.length > 0 && (() => {
              const memberCards = project.teamMembers.map((member, i) => {
                const avatarUrl = deriveTeamMemberAvatar(member);
                const displayName = viewLang === "en" && member.name_en ? member.name_en : member.name;
                const isActive = activeMemberIdx === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.teamMarqueeCard} ${isActive ? styles.teamMarqueeCardActive : ""}`}
                    onClick={() => setActiveMemberIdx(isActive ? null : i)}
                    aria-pressed={isActive}
                  >
                    <div className={styles.teamMarqueeAvatar}>
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayName} className={styles.teamMarqueeAvatarImg} loading="lazy" />
                      ) : (
                        <span className={styles.teamMarqueeAvatarInitial}>{getMemberInitial(displayName)}</span>
                      )}
                    </div>
                    <div className={styles.teamMarqueeInfo}>
                      <span className={styles.teamMarqueeName}>{displayName}</span>
                      <span className={styles.teamMarqueeRole}>
                        <T ko={member.role.ko} en={member.role.en} />
                      </span>
                    </div>
                  </button>
                );
              });

              // active 멤버 detail
              const activeMember = activeMemberIdx !== null ? project.teamMembers[activeMemberIdx] : null;
              let detailNode: React.ReactNode = null;
              if (activeMember) {
                const ko = activeMember.contributions?.ko ?? {};
                const en = activeMember.contributions?.en ?? {};
                const enHas = Object.values(en).some((items) => items.length > 0);
                const koHas = Object.values(ko).some((items) => items.length > 0);
                const contribsMap = viewLang === "en"
                  ? (enHas ? en : ko)
                  : (koHas ? ko : en);
                const contribsEntries = Object.entries(contribsMap).filter(([, items]) => items.length > 0);
                const activeDisplayName = viewLang === "en" && activeMember.name_en ? activeMember.name_en : activeMember.name;
                const memberRoleLabel = viewLang === "en" ? activeMember.role.en : activeMember.role.ko;
                detailNode = (
                  <div className={styles.teamDetailPanel}>
                    <div className={styles.teamDetailHeader}>
                      <span className={styles.teamDetailName}>{activeDisplayName}</span>
                      <span className={styles.teamDetailRole}>
                        <T ko={activeMember.role.ko} en={activeMember.role.en} />
                      </span>
                      {(activeMember.url || activeMember.email) && (
                        <div className={styles.teamDetailLinks}>
                          {activeMember.url && (
                            <a
                              href={activeMember.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.teamDetailLink}
                              title={activeMember.url}
                              aria-label="link"
                            >
                              <Link2 size={14} />
                            </a>
                          )}
                          {activeMember.email && (
                            <a
                              href={`mailto:${activeMember.email}`}
                              className={styles.teamDetailLink}
                              title={activeMember.email}
                              aria-label="email"
                            >
                              <Mail size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {contribsEntries.length > 0 && (
                      <div className={styles.teamDetailContribs}>
                        {contribsEntries.map(([role, items]) => {
                          const showRoleLabel = role !== memberRoleLabel;
                          return (
                            <div key={role} className={styles.teamDetailContribGroup}>
                              {showRoleLabel && (
                                <div className={styles.teamDetailContribRole}>{role}</div>
                              )}
                              <ul className={styles.teamDetailContribList}>
                                {items.map((c, ci) => (
                                  <li key={ci}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
                  <span className={styles.infoLabel}><T k="workDetail.team" /></span>
                  <div className={styles.teamMarquee} aria-label="team members marquee">
                    <div className={styles.teamMarqueeTrack}>
                      {memberCards}
                      {/* 무한 스크롤용 duplicate (aria-hidden) */}
                      {project.teamMembers.map((member, i) => {
                        const avatarUrl = deriveTeamMemberAvatar(member);
                        const displayName = viewLang === "en" && member.name_en ? member.name_en : member.name;
                        const isActive = activeMemberIdx === i;
                        return (
                          <button
                            key={`dup-${i}`}
                            type="button"
                            aria-hidden
                            tabIndex={-1}
                            className={`${styles.teamMarqueeCard} ${isActive ? styles.teamMarqueeCardActive : ""}`}
                            onClick={() => setActiveMemberIdx(isActive ? null : i)}
                          >
                            <div className={styles.teamMarqueeAvatar}>
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="" className={styles.teamMarqueeAvatarImg} loading="lazy" />
                              ) : (
                                <span className={styles.teamMarqueeAvatarInitial}>{getMemberInitial(displayName)}</span>
                              )}
                            </div>
                            <div className={styles.teamMarqueeInfo}>
                              <span className={styles.teamMarqueeName}>{displayName}</span>
                              <span className={styles.teamMarqueeRole}>
                                <T ko={member.role.ko} en={member.role.en} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {detailNode}
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
