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
/** 후처리 적용 표식 — React 가 innerHTML 을 다시 세팅하면 사라져서 재적용 신호가 된다 */
const ENHANCED_FLAG = "data-reader-enhanced";

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

  /* t 는 language 가 확정되면 identity 가 바뀐다(LanguageProvider 의 useCallback([language])).
     그걸 deps 에 두면 **내용이 완전히 같은데도** 새 문자열이 나오고, React 가 그걸 다른 값으로 보고
     dangerouslySetInnerHTML 을 통째로 다시 세팅한다 → 그 위에 얹은 후처리(코드바/KaTeX/island)가 전부 소멸.
     실제로 마운트 후 innerHTML 이 4번 전체 재설정되며 특수 블록이 다 깨졌다.
     라벨은 문자열에 구워넣기만 하는 값이라 ref 로 최신값을 읽고 deps 에선 뺀다. */
  const tRef = useRef(t);
  tRef.current = t;

  const processedRichtextHtml = useMemo(() => {
    if (isMarkdown) return "";
    return processRichtextHtml(content, {
      codeScroll: tRef.current("common.codeScroll"),
      codeWrap: tRef.current("common.codeWrap"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t 는 위 주석대로 의도적으로 제외 (tRef 로 읽음)
  }, [isMarkdown, content]);

  /* richtext 후처리 — 수식(KaTeX) / 코드블록 상단 바 / 특수 블록 island(mermaid·다이어그램·달력·플레이그라운드).
     전부 dangerouslySetInnerHTML 로 만든 DOM 위에 얹는 작업이라, React 가 그 DOM 을 다시 세팅하면
     통째로 날아간다. 그래서 "한 번 적용"이 아니라 **컨테이너를 계속 소유**하는 구조로 둔다. */
  useEffect(() => {
    if (isMarkdown) return;
    const el = richtextRef.current;
    if (!el) return;

    let cancelled = false;
    let extrasCleanup: (() => void) | undefined;

    const apply = async () => {
      if (cancelled || !el.isConnected) return;
      const [{ renderMathNodes }, { attachCodeWrapToggle }, { enhanceReaderExtras }] = await Promise.all([
        import("@/components/posts/renderMathNodes"),
        import("@/components/posts/highlightCodeBlocks"),
        import("@/components/posts/enhanceReaderExtras"),
      ]);
      if (cancelled || !el.isConnected) return;

      // 수식 노드([data-math-block]/[data-math-inline])를 KaTeX 로 — 없으면 raw LaTeX 로 깨져 보인다
      renderMathNodes(el);
      attachCodeWrapToggle(el, {
        wrap: tRef.current("common.codeWrap"),
        scroll: tRef.current("common.codeScroll"),
        wrapTitle: tRef.current("common.codeWrapTitle"),
        scrollTitle: tRef.current("common.codeScrollTitle"),
        copy: tRef.current("common.codeCopy"),
        copied: tRef.current("common.codeCopied"),
      });
      extrasCleanup?.();
      extrasCleanup = enhanceReaderExtras(el, {
        viewCode: tRef.current("common.mermaidViewCode"),
        hideCode: tRef.current("common.mermaidHideCode"),
        copyCode: tRef.current("common.codeCopy"),
        copied: tRef.current("common.codeCopied"),
        diagram: tRef.current("common.mermaidDiagram"),
        code: tRef.current("common.mermaidCode"),
        split: tRef.current("common.mermaidSplit"),
      });

      // 재적용 판정용 sentinel — React 가 innerHTML 을 다시 세팅하면 이것도 같이 지워진다.
      if (!el.querySelector(`:scope > [${ENHANCED_FLAG}]`)) {
        const mark = document.createElement("span");
        mark.setAttribute(ENHANCED_FLAG, "");
        mark.hidden = true;
        el.appendChild(mark);
      }
    };

    void apply();

    /* 방어 — React 가 이 컨테이너의 innerHTML 을 다시 세팅하면 위 후처리가 전부 사라진다.
       sentinel 이 없어진 걸 신호로 재적용한다.
       island 의 host.replaceWith 는 sentinel 을 안 건드리므로 우리 변경엔 반응하지 않는다(루프 없음). */
    const mo = new MutationObserver(() => {
      if (cancelled) return;
      if (!el.querySelector(`:scope > [${ENHANCED_FLAG}]`)) void apply();
    });
    mo.observe(el, { childList: true });

    return () => {
      cancelled = true;
      mo.disconnect();
      extrasCleanup?.();
    };
  }, [isMarkdown, processedRichtextHtml]);

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
