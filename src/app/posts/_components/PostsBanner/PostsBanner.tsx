"use client";

import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Banner from "@/components/ui/Banner/Banner";
import BannerSlide from "../BannerSlide";
import type { BannerStyle } from "../BannerSlide";
import type { Post } from "@/types/post";
import SplitBanner from "./SplitBanner";
import CardsBanner from "./CardsBanner";
import TickerBanner from "./TickerBanner";
import styles from "./PostsBanner.module.css";

interface PostsBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
  /** Design System 등에서 레이아웃을 강제 지정할 때 사용 */
  overrideLayout?: BannerLayout;
}

export type BannerLayout = "fullwidth" | "split" | "cards" | "ticker";

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════════════ */

export default function PostsBanner({ posts, imgErrors, onImgError, overrideLayout }: PostsBannerProps) {
  const siteConfig = useSiteConfig();
  const layout = overrideLayout ?? (siteConfig.posts.bannerLayout ?? "fullwidth") as BannerLayout;

  if (posts.length === 0) return null;

  switch (layout) {
    case "split":
      return <SplitBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    case "cards":
      return <CardsBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    case "ticker":
      return <TickerBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    default:
      return <FullwidthBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
  }
}

/* ── Fullwidth (기존 캐러셀) ── */
function FullwidthBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const siteConfig = useSiteConfig();
  return (
    <div className={styles.fullwidth} data-cursor="stop">
      <Banner
        mode={siteConfig.posts.bannerTransition as "default" | "cylinder"}
        aspectRatio="var(--posts-banner-aspect)"
        minHeight="var(--posts-banner-min-h)"
        maxHeight="var(--posts-banner-max-h)"
        showDots
        showArrows
      >
        {posts.map((post, i) => (
          <BannerSlide
            key={post.id}
            post={post}
            index={i}
            style={siteConfig.posts.bannerStyle as BannerStyle}
            imgError={imgErrors.has(post.id)}
            onImgError={onImgError}
          />
        ))}
      </Banner>
    </div>
  );
}
