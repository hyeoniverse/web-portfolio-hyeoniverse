"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Post } from "@/types/post";
import type { SiteConfigData } from "@/config/site.config";
import { SiteConfigProvider, useSiteConfig } from "@/providers/SiteConfigProvider";
import PostCard from "@/app/posts/_components/PostCard/PostCard";
import T from "@/components/ui/T";
import styles from "./PostsAppearancePreview.module.css";

/* 배너는 무겁다(슬라이더 · 레이아웃 넷) — 미리보기를 펼칠 때만 받는다 */
const PostsBanner = dynamic(() => import("@/app/posts/_components/PostsBanner/PostsBanner"), {
  ssr: false,
  loading: () => <div className={styles.bannerLoading} />,
});

/**
 * 설정 › 콘텐츠의 미리보기 — 고르는 중인(아직 저장하지 않은) 값으로 실제 글 몇 편을 실제 컴포넌트로 그린다.
 * 사이트 설정 문맥을 고르는 값으로 덮어(SiteConfigProvider) 배너 · 카드가 그 값을 읽게 한다. 미리보기 안을 눌러도 글로 넘어가지 않는다
 */

let samplePromise: Promise<Post[]> | null = null;
/** 최근 공개 글 셋 — 미리보기 둘이 한 번만 받는다 */
function useSamplePosts(): Post[] {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    samplePromise ??= fetch("/api/posts?limit=3")
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d: { posts?: Post[] }) => d.posts ?? [])
      .catch(() => []);
    let alive = true;
    void samplePromise.then((p) => { if (alive) setPosts(p); });
    return () => { alive = false; };
  }, []);
  return posts;
}

/** 고르는 중인 글 목록 설정으로 사이트 설정을 덮는다 */
function DraftPosts({ posts, children }: { posts: Partial<SiteConfigData["posts"]>; children: ReactNode }) {
  const live = useSiteConfig();
  return (
    <SiteConfigProvider initialConfig={{ ...live, posts: { ...live.posts, ...posts } }} publicKeys={live.publicKeys}>
      {children}
    </SiteConfigProvider>
  );
}

/** 미리보기 안의 클릭은 막는다 — 슬라이더 단추 · 점은 그대로 */
function stopNavigation(e: React.MouseEvent) {
  const t = e.target as HTMLElement;
  if (t.closest("button") || t.closest("[class*=Dot]") || t.closest("[class*=Arrow]")) return;
  e.preventDefault();
  e.stopPropagation();
}

/** 배너 미리보기 — 고른 레이아웃 · 스타일 · 전환 효과 */
export function BannerPreview({ draft }: { draft: Partial<SiteConfigData["posts"]> }) {
  const posts = useSamplePosts();
  if (posts.length === 0) return null;
  return (
    <div className={styles.frame}>
      <span className={styles.caption}><T k="admin.inline.contentTab.previewLabel" /></span>
      <div className={styles.banner} onClickCapture={stopNavigation}>
        <DraftPosts posts={draft}>
          <PostsBanner posts={posts} imgErrors={new Set()} onImgError={() => {}} />
        </DraftPosts>
      </div>
    </div>
  );
}

/** 커버가 없을 때 — 두 가지를 나란히 실제 카드로. 누르면 그것을 고른다 */
export function CoverFallbackPreview({ value, onSelect }: { value: string; onSelect: (v: "gradient" | "og") => void }) {
  const posts = useSamplePosts();
  const sample = posts[0];
  if (!sample) return null;
  const noCover: Post = { ...sample, cover_image: "", is_pinned: false };
  return (
    /* 고르기 칸 — 안에 실제 카드(링크 포함)를 그려서 단추로 감싸지 않고 radio 역할의 칸으로 둔다. 카드는 inert 라 누르거나 초점이 가지 않는다 */
    <div className={styles.choices} role="radiogroup">
      {(["gradient", "og"] as const).map((v) => (
        <div
          key={v}
          role="radio"
          aria-checked={value === v}
          tabIndex={0}
          className={`${styles.choice} ${value === v ? styles.choiceOn : ""}`}
          onClick={() => onSelect(v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(v); } }}
        >
          <span className={styles.choiceCard} inert>
            <DraftPosts posts={{ coverFallback: v }}>
              <PostCard post={noCover} layout="grid" />
            </DraftPosts>
          </span>
          <span className={styles.choiceLabel}>
            <T k={v === "gradient" ? "admin.inline.contentTab.coverFallbackGradient" : "admin.inline.contentTab.coverFallbackOg"} />
          </span>
        </div>
      ))}
    </div>
  );
}
