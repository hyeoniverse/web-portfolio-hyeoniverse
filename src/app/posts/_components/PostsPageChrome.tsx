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
  const showBanner = useSiteConfig().posts.showBanner === true;
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
          <>
            <PageTitle className={styles.compactTitle} icon={<LayoutGrid size={28} strokeWidth={1.6} aria-hidden />}>
              Posts.
            </PageTitle>
            <p className={styles.subtitle}>
              <T k="postsPage.subtitle" />
            </p>
          </>
        )}
      </div>
      {!history && showBanner && <PostsBannerSection posts={pinnedPosts} />}
      {children}
    </div>
  );
}
