"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Post } from "@/types/post";
import type { SiteConfigData } from "@/config/site.config";
import { SiteConfigProvider, useSiteConfig } from "@/providers/SiteConfigProvider";
import PostsGrid, { type PostsLayout } from "@/app/posts/_components/PostsGrid/PostsGrid";
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

/* 넓은 화면(1200px)에서 그린 그대로를 칸 폭에 맞춰 줄여 보여 준다 — 좁은 칸에서 그리면 배너 최소 높이(360px) · 목록 열 수가
   실제와 달라 크고 어색했다 */
const STAGE_WIDTH = 1200;

function ScaledStage({ children, deps }: { children: ReactNode; deps: unknown }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0.4, height: 0 });
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    const measure = () => {
      const scale = viewport.clientWidth / STAGE_WIDTH;
      setBox({ scale, height: stage.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [deps]);
  return (
    <div className={styles.frame}>
      <span className={styles.caption}><T k="admin.inline.contentTab.previewLabel" /></span>
      <div ref={viewportRef} className={styles.viewport} style={{ height: box.height || undefined }} onClickCapture={stopNavigation}>
        <div ref={stageRef} className={styles.stage} style={{ width: STAGE_WIDTH, transform: `scale(${box.scale})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 배너 미리보기 — 고른 레이아웃 · 스타일 · 전환 효과 */
export function BannerPreview({ draft }: { draft: Partial<SiteConfigData["posts"]> }) {
  const posts = useSamplePosts();
  if (posts.length === 0) return null;
  return (
    <ScaledStage deps={posts.length}>
      <DraftPosts posts={draft}>
        <PostsBanner posts={posts} imgErrors={new Set()} onImgError={() => {}} />
      </DraftPosts>
    </ScaledStage>
  );
}

const noop = () => {};
const monthKey = (p: Post) => (p.created_at ?? "").slice(0, 7);
const monthLabel = (p: Post) => (p.created_at ?? "").slice(0, 7).replace("-", ". ");

/** 목록 미리보기 — 고른 목록 배치 · 커버가 없을 때 방식으로 최근 글 셋 */
export function ListPreview({ layout, coverFallback }: { layout: string; coverFallback: string }) {
  const posts = useSamplePosts();
  if (posts.length === 0) return null;
  return (
    <ScaledStage deps={`${posts.length}-${layout}`}>
      <DraftPosts posts={{ layout: layout as SiteConfigData["posts"]["layout"], coverFallback: coverFallback as SiteConfigData["posts"]["coverFallback"] }}>
        <PostsGrid
          posts={posts}
          loading={false}
          perPage={posts.length}
          activeSeries={null}
          postsLayout={layout as PostsLayout}
          popularIds={new Set()}
          imgErrors={new Set()}
          onImgError={noop}
          monthKey={monthKey}
          monthLabel={monthLabel}
        />
      </DraftPosts>
    </ScaledStage>
  );
}
