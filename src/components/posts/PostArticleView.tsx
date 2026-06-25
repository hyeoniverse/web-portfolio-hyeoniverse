"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import "katex/dist/katex.min.css";
import { SquarePen } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { processRichtextHtml } from "@/utils/processRichtextHtml";
import { formatCount } from "@/utils/format";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ShareButton from "@/components/ui/ShareButton";
import Button from "@/components/ui/Button";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

/**
 * detail(공개 글 상세)·preview(미리보기)가 공유하는 정규화 데이터.
 * 양쪽 호출부에서 displayTitle/displayContent/displayExcerpt 를 미리 해석해 넘긴다 —
 * 두 페이지의 ko/en fallback 로직이 동일하므로 컴포넌트는 표시값만 받는다.
 */
export interface PostArticleData {
  /** 언어 해석이 끝난 제목 */
  displayTitle: string;
  /** 언어 해석이 끝난 본문 (richtext HTML 원본 / markdown 원본) */
  displayContent: string;
  /** 언어 해석이 끝난 요약 */
  displayExcerpt: string;
  contentType: "markdown" | "richtext";
  tags: string[];
  viewCount: number;
  /** ISO timestamp — 작성일 */
  createdAt: string;
  githubUrl?: string;
  /** admin 편집 링크 href. 없으면 편집 아이콘 미노출 */
  editHref?: string;
}

export interface PostArticleViewProps {
  data: PostArticleData;
  viewLang: "ko" | "en";
  /** 미리보기 모드 — 저장된 DB 레코드가 필요한 요소는 호출부에서 제외 */
  isPreview?: boolean;
  /** 어드민 여부 — editHref 와 함께 있을 때 편집 아이콘 노출 */
  isAdmin?: boolean;
  onLangChange?: (l: "ko" | "en") => void;
  /** header 의 액션 영역(언어토글 왼쪽)에 끼워 넣을 추가 노드 — preview 의 휴지통 버튼 등 */
  headerActionsLeft?: ReactNode;
}

/* ────────────────────────────────────────────────────────────
 * PostArticleHeader — DetailLayout 의 header slot.
 * metaRow(날짜·읽기시간·조회수·편집 / Github·Share·언어토글) · 제목 · 요약 · 태그 · divider.
 * detail/preview 가 동일 레이아웃을 공유하기 위한 presentational 컴포넌트.
 * ──────────────────────────────────────────────────────────── */
export function PostArticleHeader({
  data,
  viewLang,
  isAdmin: isAdminProp,
  onLangChange,
  headerActionsLeft,
}: PostArticleViewProps) {
  const { t } = useLanguage();
  const authed = useIsAuthenticated();
  const isAdmin = isAdminProp ?? authed;
  const handleLangChange = onLangChange ?? (() => {});

  const date = new Date(data.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const readTime = Math.max(1, Math.ceil(data.displayContent.length / 1000));

  return (
    <>
      <div className={styles.metaRow}>
        <div className={styles.meta}>
          <span>{date}</span>
          <span className={styles.dot}>&middot;</span>
          <span>{readTime} <T k="postDetail.minRead" /></span>
          <span className={styles.dot}>&middot;</span>
          <span>{formatCount(data.viewCount)} <T k="postDetail.views" /></span>
          {isAdmin && data.editHref && (
            <>
              <span className={styles.metaDivider} />
              <Tooltip content={t("postDetail.editPost")} placement="top" delay={200}>
                <a
                  href={data.editHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                >
                  <SquarePen size={13} />
                </a>
              </Tooltip>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {headerActionsLeft}
          {data.githubUrl && (
            <Button variant="outline" size="xs" href={data.githubUrl} external>
              <GithubIcon size={14} />
              GitHub
            </Button>
          )}
          <ShareButton />
          <LanguageToggle lang={viewLang} onLangChange={handleLangChange} />
        </div>
      </div>
      <h1 className={styles.articleTitle}>{data.displayTitle}</h1>
      {data.displayExcerpt && <p className={styles.excerpt}>{data.displayExcerpt}</p>}
      <div className={styles.tagsShareRow}>
        {data.tags.length > 0 && (
          <div className={styles.tags}>
            {data.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.headerDivider} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * PostArticleBody — DetailLayout 의 children slot 본문.
 * richtext(processRichtextHtml + attachCodeWrapToggle/enhanceReaderExtras) / markdown(MarkdownRenderer).
 * detail 의 prose 영역과 동일한 마크업·이벤트 위임을 그대로 보유.
 * proseViewerRef 는 호출부(ImageViewer 연결)에서 관리하므로 ref 로 받는다.
 * ──────────────────────────────────────────────────────────── */
export function PostArticleBody({
  data,
  proseViewerRef,
}: {
  data: PostArticleData;
  /** prose 컨테이너 ref — 호출부의 useProseImageViewer 와 연결 */
  proseViewerRef?: React.Ref<HTMLDivElement>;
  /** 미리보기 모드 — 현재 본문 렌더는 동일하나 API 일관성 위해 허용 */
  isPreview?: boolean;
}) {
  const { t } = useLanguage();
  const isMarkdown = data.contentType === "markdown";
  const content = data.displayContent;
  const richtextRef = useRef<HTMLDivElement>(null);

  // markdown: proseViewerRef 로 이벤트 위임 (MarkdownRenderer 가 이미 하이라이트)
  useRichtextEnhance(isMarkdown ? (proseViewerRef as React.RefObject<HTMLDivElement> | undefined) ?? { current: null } : { current: null }, content);

  const processedRichtextHtml = useMemo(() => {
    if (isMarkdown) return "";
    return processRichtextHtml(content, { codeScroll: t("common.codeScroll"), codeWrap: t("common.codeWrap") });
  }, [isMarkdown, content, t]);

  // richtext 전용: 이벤트 위임만 (하이라이트/라벨은 useMemo 에서 HTML 에 포함)
  useEffect(() => {
    if (isMarkdown) return;
    const el = richtextRef.current;
    if (!el) return;
    import("@/components/posts/highlightCodeBlocks").then(({ attachCodeWrapToggle }) => {
      attachCodeWrapToggle(el, {
        wrap: t("common.codeWrap"),
        scroll: t("common.codeScroll"),
        wrapTitle: t("common.codeWrapTitle"),
        scrollTitle: t("common.codeScrollTitle"),
      });
    });
    let cleanup: (() => void) | undefined;
    import("@/components/posts/enhanceReaderExtras").then(({ enhanceReaderExtras }) => {
      cleanup = enhanceReaderExtras(el);
    });
    return () => cleanup?.();
  }, [isMarkdown, content, t, processedRichtextHtml]);

  return (
    <div ref={proseViewerRef}>
      {isMarkdown ? (
        <MarkdownRenderer content={content} className={styles.prose} />
      ) : (
        <div
          ref={richtextRef}
          className={styles.prose}
          dangerouslySetInnerHTML={{ __html: processedRichtextHtml }}
        />
      )}
    </div>
  );
}
