"use client";

import { UiLabel } from "@/components/posts/BodyLabelsContext";
import { TranslatingRegion } from "@/components/ui/ContentTranslateBanner";
import { motion } from "framer-motion";
import { Globe, Users, User, Pencil, ExternalLink } from "@/components/icons";
import "@/styles/vendor/katex.css";
import { GithubIcon } from "@/components/icons";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLanguage } from "@/providers/LanguageProvider";
import { OWNER_AUTHOR_ID } from "@/utils/resolvePostAuthors";
import { formatCount } from "@/utils/format";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ShareButton from "@/components/ui/ShareButton";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Tooltip from "@/components/ui/Tooltip";
import Pressable from "@/components/ui/Pressable";
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
  onImportEdit,
  viewHref,
  onLangChange,
  relatedPosts,
  relatedSeries,
  langMenu,
  contentLang,
  translating,
}: WorkArticleViewProps) {
  const { t } = useLanguage();
  const authed = useIsAuthenticated();
  const isAdmin = isAdminProp ?? authed;

  const handleLangChange = onLangChange ?? (() => {});
  /* 조회수 — 글 상세 메타 줄과 같은 표기(n 조회). 사이트 밖 자료(저장소)는 세지 않아 없다 */
  const viewCount = project.viewCount !== undefined && (
    <span className={styles.viewCount}>{formatCount(project.viewCount)} <UiLabel name="postViews" /></span>
  );

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
              /* 본인(소유자)은 늘 한 명으로 센다 — 팀원 목록에 소유자 계정으로 이미 들어 있으면 두 번 세지 않는다.
                 예전에는 목록 수에 무조건 1을 더해, 본인 한 명뿐인 작업물이 "팀 · 2"로 보였다 */
              const others = (project.teamMembers ?? []).filter((m) => m.author_id !== OWNER_AUTHOR_ID).length;
              const total = others + 1;
              return others > 0 ? (
                <Badge variant="outline" size="md" uppercase icon={<Users size={11} strokeWidth={1.8} />}>
                  <UiLabel name="workTeamCount" vars={{ n: total }} />
                </Badge>
              ) : (
                <Badge variant="outline" size="md" uppercase icon={<User size={11} strokeWidth={1.8} />}>
                  <UiLabel name="workSolo" />
                </Badge>
              );
            })()}
            {project.nature && (
              <Badge variant="outline" tone="accent" size="md" uppercase lang={contentLang}><T ko={project.nature.ko} en={project.nature.en} /></Badge>
            )}
            {/* 편집 — 배지 바로 오른쪽(구분선 없이). 저장소로 만들어진 화면에는 편집할 행이 없다 — 눌러서 작업물로 들인 뒤 편집 화면으로 간다 */}
            {isAdmin && !isPreview && project.external && onImportEdit && (
              <Tooltip content={t("workDetail.editRepoWork")} placement="top" delay={200}>
                <Pressable
                  onClick={onImportEdit}
                  aria-label={t("workDetail.editRepoWork")}
                  className={styles.metaIconLink}
                >
                  <Pencil size={13} />
                </Pressable>
              </Tooltip>
            )}
            {isAdmin && !isPreview && !project.external && (
              <Tooltip content={t("workDetail.editWork")} placement="top" delay={200}>
                <a
                  href={`/admin/works/${project.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.metaIconLink}
                >
                  <Pencil size={13} />
                </a>
              </Tooltip>
            )}
          </div>
          {/* 조회수 — 넓은 화면은 배지 뒤에 구분선과 함께, 좁은 화면은 언어 전환 줄 왼쪽 끝(아래 metaRight) */}
          {viewCount && (
            <span className={styles.viewCountWide}>
              <span className={styles.metaDivider} />
              {viewCount}
            </span>
          )}
          {viewHref && (
            <>
              <span className={styles.metaDivider} />
              <Tooltip content={viewLang === "en" ? "Open published project" : "발행된 프로젝트 열기"} placement="top" delay={200}>
                <a
                  href={viewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.metaIconLink}
                >
                  <ExternalLink size={13} />
                </a>
              </Tooltip>
            </>
          )}
        </div>
        <div className={styles.metaRight}>
          {viewCount && <span className={styles.viewCountNarrow}>{viewCount}</span>}
          {langMenu}
          <LanguageToggle lang={viewLang} onLangChange={handleLangChange} />
        </div>
      </motion.div>

      {/* ── Title · Description — 번역을 받아 오는 동안 흐리게(TranslatingRegion) ── */}
      <TranslatingRegion active={!!translating}>
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
      </TranslatingRegion>

      {/* ── Header action row — Visit Site / GitHub / Share 묶음 (description 아래, 오른쪽 정렬) ── */}
      <motion.div
        className={styles.headerActions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.5 }}
      >
        {project.liveUrl && (
          <Button variant="outline" size="sm" href={project.liveUrl} external>
            <Globe size={14} />
            <UiLabel name="workVisitSite" tooltip="workVisitSiteTip" />
          </Button>
        )}
        {project.githubUrl && (
          <Button variant="outline" size="sm" href={project.githubUrl} external>
            <GithubIcon size={14} />
            GitHub
          </Button>
        )}
        <ShareButton />
      </motion.div>

      <TranslatingRegion active={!!translating}>
      <WorkArticleInfoGrid
        project={project}
        viewLang={viewLang}
        relatedPosts={relatedPosts}
        relatedSeries={relatedSeries}
        contentLang={contentLang}
      />
      </TranslatingRegion>
    </>
  );
}
