import { getPostBySlug } from "@/lib/posts";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { SITE_ORIGIN } from "@/lib/seo";
import { renderPostCard } from "@/lib/og/postCard";

/* GET /og/posts/<slug> — 커버가 없는 글의 공유 카드 PNG(lib/og/postCard). 공개된 글만.
   글 메타데이터가 주소 끝에 ?v=<수정 시각> 을 붙여, 제목을 고치면 새 주소가 되어 공유 미리보기 캐시도 새로 받는다 */
export const revalidate = 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) return new Response("Not found", { status: 404 });

  const cfg = await getSiteConfig();
  const accent = /^#[0-9a-f]{6}$/i.test(cfg.theme?.accentColor ?? "") ? cfg.theme.accentColor : "#d40063";
  const res = await renderPostCard({
    title: post.title || post.title_en || slug,
    category: post.category || undefined,
    tags: post.tags ?? [],
    date: (post.created_at ?? "").slice(0, 10) || undefined,
    siteName: cfg.metadata.title || "HYEONIVERSE",
    host: new URL(SITE_ORIGIN).host.replace(/^www\./, ""),
    accent,
  });
  res.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return res;
}
