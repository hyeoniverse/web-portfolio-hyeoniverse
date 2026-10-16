"use client";

import PostsSubnav from "./PostsSubnav";
import PostsBannerSection from "./PostsBannerSection";
import MastheadMong from "./MastheadMong";
import BlogProfile from "./BlogProfile";
import PageTitle from "@/components/ui/PageTitle";
import T from "@/components/ui/T";
import { History as HistoryIcon } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "../Posts.module.css";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

interface PostsPageChromeProps {
  /** history 모드 — 제목/부제가 History 로 바뀌고 배너를 렌더하지 않는다. */
  history?: boolean;
  pinnedPosts?: Post[];
  /** 블로그 주인 띠의 글 · 태그 · 시리즈 수 — 있으면 머리말 위에 프로필 띠를 그린다 */
  counts?: { posts: number; tags: number; series: number };
  children: React.ReactNode;
}

/* 글 목록 페이지의 고정 골격 — 페이지 래퍼 · 서브네비 · 제목 · 배너. 필터나 URL 쿼리에 의존하지 않는다.
   본문(PostsClient)은 children 으로 받는다. */
export default function PostsPageChrome({ history = false, pinnedPosts = [], counts, children }: PostsPageChromeProps) {
  const { t } = useLanguage();
  // 설정 posts.showBanner — 켤 때만 고정글 배너를 그린다
  const siteConf = useSiteConfig();
  const showBanner = siteConf.posts.showBanner === true;
  // 블로그 이름 — 설정 posts.blogTitle, 비면 "Log"
  const blogTitle = siteConf.posts.blogTitle?.trim() || "Log";
  return (
    /* 별밭 · 로그 스킨은 posts/layout.tsx 가 블로그 전체에 깐다 */
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
          /* 블로그 머리말 — 블로그 이름(큰 제목) · 한 줄 소개. 블로그라는 표시는 로고 옆 Blog 배지가 맡아 여기선 되풀이하지 않는다 */
          <div className={styles.masthead}>
            {/* 머리말 오른쪽 — 출렁이는 격자 위의 몽이(포인터를 따라 기울고, 누르면 표정이 바뀐다) */}
            <MastheadMong className={styles.mastheadArt} gridClassName={styles.mastheadGrid} mongClassName={styles.mastheadMong} />
            {/* 로그 스킨의 프롬프트 줄 — 장식이라 읽지 않는다 */}
            <span className={styles.mastheadPrompt} aria-hidden>
              <b>~/log</b> $ ls -t posts/
            </span>
            <PageTitle className={styles.mastheadTitle}>{blogTitle}</PageTitle>
            <p className={styles.mastheadLead}>
              <T k="postsPage.subtitle" />
            </p>
            {/* 블로그 주인 — 머리말 소개 아래 한 줄(넓은 화면은 오른쪽 몽이 그림 왼쪽까지) */}
            {counts && (
              <BlogProfile
                inMasthead
                stats={[
                  { label: t("postsPage.statPosts"), value: counts.posts },
                  { label: t("postsPage.statTags"), value: counts.tags },
                  { label: t("postsPage.statSeries"), value: counts.series },
                ]}
              />
            )}
          </div>
        )}
      </div>
      {!history && showBanner && <PostsBannerSection posts={pinnedPosts} />}
      {children}
    </div>
  );
}
