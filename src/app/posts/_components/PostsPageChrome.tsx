"use client";

import PostsSubnav from "./PostsSubnav";
import PostsBannerSection from "./PostsBannerSection";
import StarLog, { type StarLogVariant } from "./StarLog";
import PageTitle from "@/components/ui/PageTitle";
import T from "@/components/ui/T";
import { History as HistoryIcon } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "../Posts.module.css";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

/** 머리말 별 그림 — 시안 비교 중(constellation · field · chart) */
const STAR_LOG_VARIANT: StarLogVariant = "constellation";

interface PostsPageChromeProps {
  /** history 모드 — 제목/부제가 History 로 바뀌고 배너를 렌더하지 않는다. */
  history?: boolean;
  pinnedPosts?: Post[];
  children: React.ReactNode;
}

/* 글 목록 페이지의 고정 골격 — 페이지 래퍼 · 서브네비 · 제목 · 배너. 필터나 URL 쿼리에 의존하지 않는다.
   본문(PostsClient)은 children 으로 받는다. */
export default function PostsPageChrome({ history = false, pinnedPosts = [], children }: PostsPageChromeProps) {
  const { t } = useLanguage();
  // 설정 posts.showBanner — 켤 때만 고정글 배너를 그린다
  const siteConf = useSiteConfig();
  const showBanner = siteConf.posts.showBanner === true;
  // 블로그 이름 — 설정 posts.blogTitle, 비면 "Log"
  const blogTitle = siteConf.posts.blogTitle?.trim() || "Log";
  return (
    /* data-blog-skin="log" — 글 목록의 개발 로그 스킨(카드 메타 · 태그 · 선을 모노 · 점선으로). 레이아웃은 그대로, History 는 빼 둔다 */
    <div className={`${styles.page} ${history ? styles.historyMode : ""}`} data-blog-skin={history ? undefined : "log"}>
      <PostsSubnav />
      <div className={styles.header}>
        {history ? (
          <>
            <PageTitle icon={<HistoryIcon size={40} strokeWidth={1.6} aria-hidden />}>
              History.
            </PageTitle>
            <p className={styles.subtitle}>{t("postsPage.historySubtitle")}</p>
          </>
        ) : (
          /* 블로그 머리말 — 블로그 이름(큰 제목) · 한 줄 소개. 블로그라는 표시는 로고 옆 Blog 배지가 맡아 여기선 되풀이하지 않는다 */
          <div className={styles.masthead}>
            <StarLog seed={blogTitle} variant={STAR_LOG_VARIANT} />
            {/* 로그 스킨의 프롬프트 줄 — 장식이라 읽지 않는다 */}
            <span className={styles.mastheadPrompt} aria-hidden>
              <b>~/log</b> $ ls -t posts/
            </span>
            <PageTitle className={styles.mastheadTitle}>{blogTitle}</PageTitle>
            <p className={styles.mastheadLead}>
              <T k="postsPage.subtitle" />
            </p>
          </div>
        )}
      </div>
      {!history && showBanner && <PostsBannerSection posts={pinnedPosts} />}
      {children}
    </div>
  );
}
