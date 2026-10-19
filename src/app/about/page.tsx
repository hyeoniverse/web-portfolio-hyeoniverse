import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorks } from "@/lib/getWorks";
import AboutNext, { type LiveInfo } from "./_components/AboutNext";
import { pageMetadata } from "@/lib/seo";
import { siteMetaText } from "@/lib/siteMetaText";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "About", description: await siteMetaText("pageMeta.about"), path: "/about" });
}

export const revalidate = 60;

/* 첫 화면 "살아 있는 정보" — 발행된 글 수 · 최근 글 · 작업물 수. 실패하면 그 칸만 비운다 */
async function getLiveInfo(): Promise<LiveInfo> {
  const admin = createAdminClient();
  const [latest, works] = await Promise.all([
    admin
      .from("posts")
      .select("title, title_en, slug", { count: "exact" })
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(1),
    getWorks().catch(() => []),
  ]);
  const post = latest.data?.[0];
  return {
    postCount: latest.count ?? null,
    workCount: works.length || null,
    latestPost: post ? { title: post.title, titleEn: post.title_en ?? null, slug: post.slug } : null,
  };
}

/* 전역 .content 로 감싸지 않는다 — .content 는 overflow-x: hidden 이라 스크롤 상자가 되어 안쪽의 고정 장면(sticky)이
   붙지 않는다. 가로 넘침은 바깥 main 이 이미 자른다(overflow-x: clip) */
export default async function AboutPage() {
  /* 구조 장의 그래프 · 흐름 · API · ERD 는 코드와 빌드 생성본에서 온다 — 관리자 설정을 읽지 않는다 */
  return <AboutNext live={await getLiveInfo()} />;
}
