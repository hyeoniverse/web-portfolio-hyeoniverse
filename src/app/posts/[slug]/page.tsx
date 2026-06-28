import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPostSlugs } from "@/lib/posts";
import { highlightRichtextCode } from "@/utils/highlightRichtext";
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

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
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
  const rendered =
    post.content_type !== "markdown" && post.content
      ? { ...post, content: await highlightRichtextCode(post.content) }
      : post;

  return <PostDetailClient post={rendered} />;
}
