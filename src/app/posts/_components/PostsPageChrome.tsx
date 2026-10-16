"use client";

import PostsSubnav from "./PostsSubnav";
import PostsBannerSection from "./PostsBannerSection";
import PageTitle from "@/components/ui/PageTitle";
import T from "@/components/ui/T";
import { LayoutGrid, History as HistoryIcon } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "../Posts.module.css";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

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
  // 블로그 이름 — 설정 posts.blogTitle, 비면 "<사이트 제목> Log"(HYEONIVERSE → Hyeoniverse Log)
  const siteTitle = siteConf.metadata?.title ?? "";
  const blogTitle = siteConf.posts.blogTitle?.trim()
    || `${siteTitle.charAt(0).toUpperCase()}${siteTitle.slice(1).toLowerCase()} Log`;
  return (
    <div className={`${styles.page} ${history ? styles.historyMode : ""}`}>
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
          /* 블로그 머리말 — [BLOG 눈썹] 블로그 이름(큰 제목) · 한 줄 소개. 포트폴리오의 "Posts." 페이지 제목 대신
             여기가 누구의 블로그인지 먼저 알린다 */
          <div className={styles.masthead}>
            <span className={styles.mastheadEyebrow}>
              <LayoutGrid size={14} strokeWidth={1.8} aria-hidden />
              Blog
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
