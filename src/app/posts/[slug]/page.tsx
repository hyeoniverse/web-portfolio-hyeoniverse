import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPostSlugs } from "@/lib/posts";
import { highlightRichtextCode } from "@/utils/highlightRichtext";
import { getPostRelatedWorks } from "@/lib/postRelatedWorks";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { pageMetadata, ogImageOf, jsonLd, postCardImagePath, canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import PostDetailClient from "./PostDetailClient";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return pageMetadata({
    title: post.title || post.title_en,
    description: post.excerpt || post.excerpt_en || undefined,
    path: `/posts/${encodeURIComponent(post.slug)}`,
    image: post.cover_image,
    // 커버가 없으면 제목으로 그린 카드(app/og/posts/[slug]) — 사이트 기본 그림보다 글마다 알아볼 수 있게
    fallbackImage: { url: postCardImagePath(post.slug, post.updated_at), alt: post.title || post.title_en },
    type: "article",
    publishedTime: post.created_at,
    modifiedTime: post.updated_at,
  });
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* getSiteConfig + getSecret 호출 제거 — root layout 의 SiteConfigProvider 에 이미 있음.
   * translationEnabled 는 client 에서 useSiteConfig() 로 직접 읽음. */
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  // 코드블록 신택스 하이라이팅 — richtext 는 서버에서 Shiki 로 미리 칠해 내려보냄
  // (markdown 은 MarkdownRenderer 가 클라에서 hljs 처리). 클라 번들엔 하이라이터 미포함.
  const [content, relatedWorks, cfg] = await Promise.all([
    post.content_type !== "markdown" && post.content ? highlightRichtextCode(post.content) : post.content,
    // 관련 작업물은 본문 위에 그려져, 브라우저에서 늦게 받으면 본문을 밀어낸다(#917)
    getPostRelatedWorks(post.id),
    getSiteConfig(),
  ]);

  /* 검색 결과의 글 정보(작성일 · 수정일 · 그림) — BlogPosting */
  const url = canonicalUrl(`/posts/${encodeURIComponent(post.slug)}`);
  const cover = ogImageOf(post.cover_image);
  const structured = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title || post.title_en,
    description: post.excerpt || post.excerpt_en || undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    image: new URL(cover ?? postCardImagePath(post.slug, post.updated_at), SITE_ORIGIN).href,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: cfg.metadata.author, url: SITE_ORIGIN },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <PostDetailClient post={{ ...post, content }} relatedWorks={relatedWorks} />
    </>
  );
}
