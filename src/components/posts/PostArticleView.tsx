"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { SquarePen, ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { processRichtextHtml } from "@/utils/processRichtextHtml";
import { formatCount } from "@/utils/format";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import DateMentionPeek from "@/components/posts/DateMentionPeek";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ShareButton from "@/components/ui/ShareButton";
import Button from "@/components/ui/Button";
import T from "@/components/ui/T";
import TextLink from "@/components/ui/TextLink";
import Tooltip from "@/components/ui/Tooltip";
import type { Author } from "@/types/author";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import styles from "@/app/posts/[slug]/PostDetail.module.css";

/** URL 에서 표시용 도메인 추출 (www. 제거). 실패하면 원본 반환. */
function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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
  /** 발행된 글 보기 href — 미리보기에서 발행 상태면 새창으로 여는 버튼 노출(편집 버튼 자리) */
  viewHref?: string;
  /** 작성자 목록 — 호출부에서 post.author_ids 를 site.config authors 로 해석해 전달. 비면 미표시 */
  authors?: Author[];
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
  const { t, language } = useLanguage();
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
          {data.viewHref && (
            <>
              <span className={styles.metaDivider} />
              <Tooltip content={language === "en" ? "Open published post" : "발행된 글 열기"} placement="top" delay={200}>
                <a
                  href={data.viewHref}
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
              <Link key={tag} href={`/posts/tags/${encodeURIComponent(tag)}`} className={styles.tag}>
                <span className={styles.tagHash} aria-hidden>#</span>{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
      {data.authors && data.authors.length > 0 && (
        <div className={styles.authorsCompact}>
          {data.authors.map((a) => (
            <a key={a.id} href="#post-authors" className={styles.authorChip}>
              {a.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar} alt="" className={styles.authorChipAvatar} loading="lazy" />
              ) : (
                <span className={styles.authorChipAvatarFallback} aria-hidden>
                  {(a.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className={styles.authorChipMeta}>
                <span className={styles.authorChipName}>{a.name}</span>
                {a.role && <span className={styles.authorChipRole}>{a.role}</span>}
              </span>
            </a>
          ))}
        </div>
      )}
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
  const { t, language } = useLanguage();
  const isMarkdown = data.contentType === "markdown";
  const content = data.displayContent;
  const richtextRef = useRef<HTMLDivElement>(null);

  // markdown 코드블록 컨트롤은 MarkdownRenderer 가 자체 ref 로 주입한다(부모 ref 전달 여부와 무관).
  // richtext 는 아래 useEffect 에서 richtextRef 로 처리.

  const processedRichtextHtml = useMemo(() => {
    if (isMarkdown) return "";
    return processRichtextHtml(content, { codeScroll: t("common.codeScroll"), codeWrap: t("common.codeWrap") });
  }, [isMarkdown, content, t]);

  // richtext 전용: 이벤트 위임만 (하이라이트/라벨은 useMemo 에서 HTML 에 포함)
  useEffect(() => {
    if (isMarkdown) return;
    const el = richtextRef.current;
    if (!el) return;
    // 수식 노드([data-math-block]/[data-math-inline])를 KaTeX 로 렌더 — 없으면 raw LaTeX 로 깨져 보임
    import("@/components/posts/renderMathNodes").then(({ renderMathNodes }) => {
      renderMathNodes(el);
    });
    import("@/components/posts/highlightCodeBlocks").then(({ attachCodeWrapToggle }) => {
      attachCodeWrapToggle(el, {
        wrap: t("common.codeWrap"),
        scroll: t("common.codeScroll"),
        wrapTitle: t("common.codeWrapTitle"),
        scrollTitle: t("common.codeScrollTitle"),
        copy: t("common.codeCopy"),
        copied: t("common.codeCopied"),
      });
    });
    let cleanup: (() => void) | undefined;
    import("@/components/posts/enhanceReaderExtras").then(({ enhanceReaderExtras }) => {
      cleanup = enhanceReaderExtras(el, {
        viewCode: t("common.mermaidViewCode"),
        hideCode: t("common.mermaidHideCode"),
        copyCode: t("common.codeCopy"),
        copied: t("common.codeCopied"),
        diagram: t("common.mermaidDiagram"),
        code: t("common.mermaidCode"),
        split: t("common.mermaidSplit"),
      });
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
      {!isMarkdown && <DateMentionPeek containerRef={richtextRef} language={language} />}
    </div>
  );
}

/* 작성자 상세 — 게시물 끝(좋아요 버튼 아래) 슬롯으로 렌더. 헤더 칩의 #post-authors 앵커 대상. */
export function PostArticleAuthors({ authors }: { authors?: Author[] }) {
  const { language } = useLanguage();
  if (!authors || authors.length === 0) return null;
  return (
    <section id="post-authors" className={styles.authorsFooter}>
      <h2 className={styles.authorsFooterHeading}>
        {language === "en" ? (authors.length > 1 ? "Authors" : "Author") : "작성자"}
      </h2>
      {authors.map((a) => (
        <article key={a.id} className={styles.authorFooterCard}>
          {a.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar} alt="" className={styles.authorFooterAvatar} loading="lazy" />
          ) : (
            <span className={styles.authorFooterAvatarFallback} aria-hidden>
              {(a.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className={styles.authorFooterBody}>
            <div className={styles.authorFooterNameRow}>
              <span className={styles.authorFooterName}>{a.name}</span>
              {a.role && <span className={styles.authorFooterRole}>{a.role}</span>}
            </div>
            {a.bio && <p className={styles.authorFooterBio}>{a.bio}</p>}
            {(a.links.length > 0 || a.email) && (
              <div className={styles.authorFooterLinks}>
                {a.email && (
                  <TextLink external href={`mailto:${a.email}`}>
                    <svg viewBox="0 0 24 24" className={styles.authorFooterLinkIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={SOCIAL_ICONS.email.path} /></svg>
                    <span>{a.email}</span>
                  </TextLink>
                )}
                {a.links.map((l, i) => {
                  const brand = SOCIAL_ICONS[l.platform];
                  const label = l.label || brand?.label || hostFromUrl(l.url);
                  return (
                    <TextLink key={`${l.url}-${i}`} external href={l.url}>
                      {l.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.icon} alt="" className={styles.authorFooterLinkIcon} />
                      ) : brand ? (
                        brand.stroke ? (
                          <svg viewBox="0 0 24 24" className={styles.authorFooterLinkIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={brand.path} /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className={styles.authorFooterLinkIcon}><path d={brand.path} fill="currentColor" /></svg>
                        )
                      ) : null}
                      <span>{label}</span>
                    </TextLink>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
