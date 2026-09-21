"use client";

import { useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { Pencil, ExternalLink, SocialBrandIcon } from "@/components/icons";
import { GithubIcon } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { processRichtextHtml } from "@/utils/processRichtextHtml";
import { formatCount } from "@/utils/format";
import { SITE_TIME_ZONE } from "@/constants";
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
import header from "./PostArticleHeader.module.css";
import body from "./PostArticleBody.module.css";
import footer from "./PostArticleAuthors.module.css";
import AuthorAvatar from "@/components/ui/AuthorAvatar";

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

  // 한국 시간 기준 — 실행 환경의 시간대를 따르면 서버(UTC)가 미리 그린 날짜와 브라우저의 날짜가 갈려 하이드레이션이 깨진다(#927)
  const date = new Date(data.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: SITE_TIME_ZONE,
  });
  const readTime = Math.max(1, Math.ceil(data.displayContent.length / 1000));

  return (
    <>
      <div className={header.metaRow}>
        <div className={header.meta}>
          <span>{date}</span>
          <span className={header.dot}>&middot;</span>
          <span>{readTime} <T k="postDetail.minRead" /></span>
          <span className={header.dot}>&middot;</span>
          <span>{formatCount(data.viewCount)} <T k="postDetail.views" /></span>
          {isAdmin && data.editHref && (
            <>
              <span className={header.metaDivider} />
              <Tooltip content={t("postDetail.editPost")} placement="top" delay={200}>
                <a
                  href={data.editHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--text-tertiary)", textDecoration: "none" }}
                >
                  <Pencil size={13} />
                </a>
              </Tooltip>
            </>
          )}
          {data.viewHref && (
            <>
              <span className={header.metaDivider} />
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
      <h1 className={header.articleTitle}>{data.displayTitle}</h1>
      {data.displayExcerpt && <p className={header.excerpt}>{data.displayExcerpt}</p>}
      <div className={header.tagsShareRow}>
        {data.tags.length > 0 && (
          <div className={header.tags}>
            {data.tags.map((tag) => (
              <Link key={tag} href={`/posts/tags/${encodeURIComponent(tag)}`} className={header.tag}>
                <span className={header.tagHash} aria-hidden>#</span>{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
      {data.authors && data.authors.length > 0 && (
        <div className={header.authorsCompact}>
          {data.authors.map((a) => (
            <a key={a.id} href="#post-authors" className={header.authorChip}>
              <AuthorAvatar
                value={a.avatar}
                name={a.name}
                size={18}
                imgClassName={header.authorChipAvatar}
                initialClassName={header.authorChipAvatarFallback}
                className={header.authorChipAvatarFallback}
              />
              <span className={header.authorChipMeta}>
                <span className={header.authorChipName}>{a.name}</span>
                {a.role && <span className={header.authorChipRole}>{a.role}</span>}
              </span>
            </a>
          ))}
        </div>
      )}
      <div className={header.headerDivider} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * PostArticleBody — DetailLayout 의 children slot 본문.
 * richtext(processRichtextHtml + useRichtextEnhance) / markdown(MarkdownRenderer).
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
  // richtext 는 아래 useRichtextEnhance 가 richtextRef 로 처리.

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
  }, [isMarkdown, content]);

  /* richtext 후처리(수식·코드블록 바·island …) — 작업물 상세와 같은 훅을 쓴다 */
  useRichtextEnhance(richtextRef, processedRichtextHtml, !isMarkdown);

  return (
    <div ref={proseViewerRef}>
      {isMarkdown ? (
        <MarkdownRenderer content={content} className={`${body.prose} prose-content`} />
      ) : (
        <div
          ref={richtextRef}
          className={`${body.prose} prose-content`}
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
    <section id="post-authors" className={footer.authorsFooter}>
      <h2 className={footer.authorsFooterHeading}>
        {language === "en" ? (authors.length > 1 ? "Authors" : "Author") : "작성자"}
      </h2>
      {authors.map((a) => (
        <article key={a.id} className={footer.authorFooterCard}>
          <AuthorAvatar
            value={a.avatar}
            name={a.name}
            size={36}
            imgClassName={footer.authorFooterAvatar}
            initialClassName={footer.authorFooterAvatarFallback}
            className={footer.authorFooterAvatarFallback}
          />
          <div className={footer.authorFooterBody}>
            <div className={footer.authorFooterNameRow}>
              <span className={footer.authorFooterName}>{a.name}</span>
              {a.role && <span className={footer.authorFooterRole}>{a.role}</span>}
            </div>
            {a.bio && <p className={footer.authorFooterBio}>{a.bio}</p>}
            {(a.links.length > 0 || a.email) && (
              <div className={footer.authorFooterLinks}>
                {a.email && (
                  <TextLink external href={`mailto:${a.email}`}>
                    <SocialBrandIcon name="email" className={footer.authorFooterLinkIcon} />
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
                        <img src={l.icon} alt="" className={footer.authorFooterLinkIcon} />
                      ) : brand ? (
                        <SocialBrandIcon name={l.platform} className={footer.authorFooterLinkIcon} />
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
