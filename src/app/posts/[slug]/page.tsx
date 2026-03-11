import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPostSlugs } from "@/lib/posts";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";
import PostDetailClient from "./PostDetailClient";

export const revalidate = 300;

const PROVIDER_KEY_MAP: Record<string, string> = {
  deepl: "DEEPL_API_KEY",
  google: "GOOGLE_TRANSLATE_API_KEY",
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

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
  const [post, config] = await Promise.all([getPostBySlug(slug), getSiteConfig()]);
  if (!post) notFound();

  const provider = config?.translation?.provider ?? "deepl";
  const keyName = PROVIDER_KEY_MAP[provider] ?? "";
  const apiKey = keyName ? await getSecret(keyName) : "";
  const translationEnabled = !!apiKey;

  return <PostDetailClient post={post} translationEnabled={translationEnabled} />;
}
