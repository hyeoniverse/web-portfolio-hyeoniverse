"use client";

import { motion } from "framer-motion";
import { Globe, Users, User, Pencil, ExternalLink } from "@/components/icons";
import "katex/dist/katex.min.css";
import { GithubIcon } from "@/components/icons";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import ShareButton from "@/components/ui/ShareButton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import styles from "./WorkArticleHeader.module.css";
import type { WorkArticleViewProps } from "./workArticleTypes";
import WorkArticleInfoGrid from "./WorkArticleInfoGrid";


/* ────────────────────────────────────────────────────────────
 * WorkArticleHeader — DetailLayout 의 header slot 에 들어가는 영역.
 * meta(#번호/배지/편집/언어토글) · 제목 · 설명 · 액션(Visit/GitHub/Share).
 * 정보 그리드와 AI 요약은 WorkArticleInfoGrid 로 나눴다.
 * detail/preview 가 동일 레이아웃을 공유하기 위한 presentational 컴포넌트.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleHeader({
  project,
  viewLang,
  isAdmin: isAdminProp,
  isPreview,
  viewHref,
  onLangChange,
  relatedPosts,
  relatedSeries,
}: WorkArticleViewProps) {
  const { t } = useLanguage();
  const authed = useIsAuthenticated();
  const isAdmin = isAdminProp ?? authed;

  const handleLangChange = onLangChange ?? (() => {});

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
          {viewHref && (
            <>
              <span className={styles.metaDivider} />
              <Tooltip content={viewLang === "en" ? "Open published project" : "발행된 프로젝트 열기"} placement="top" delay={200}>
                <a
                  href={viewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                >
                  <ExternalLink size={13} />
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
        <T ko={project.title.ko} en={project.title.en} />
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

      <WorkArticleInfoGrid
        project={project}
        viewLang={viewLang}
        relatedPosts={relatedPosts}
        relatedSeries={relatedSeries}
      />
    </>
  );
}
