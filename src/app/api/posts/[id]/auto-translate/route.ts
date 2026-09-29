import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { clampTitle } from "@/lib/postConstants";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
  translationFailure,
} from "@/lib/api/translationProviders";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/auto-translate?direction=ko-en|en-ko
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") ?? "ko-en";

  const admin = createAdminClient();
  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providerList = buildProviderList(primary, config?.translation?.fallback);

  /* 공개 상세 페이지의 언어 토글이 부르는 경로라 로그인을 요구할 수 없다. 대신 비로그인
     요청에는 공개된 글만 허용한다. 필터가 없던 동안 임의의 id 로 초안을 다룰 수 있었다 —
     en-ko 분기는 본문이 있으면 번역 없이 그대로 돌려줘 초안 전문이 노출됐고,
     ko-en 분기는 번역 결과를 초안에 써 넣었다.
     비로그인 요청은 requireAuth 가 네트워크 호출 없이 즉시 실패하므로 공개 경로의 비용은 그대로다. */
  const access = await requirePostAccess("posts", id);

  let query = admin
    .from("posts")
    .select("title, content, excerpt, title_en, content_en, excerpt_en")
    .eq("id", id);
  if (access.error) query = query.eq("published", true).is("deleted_at", null);

  const { data: post } = await query.single();

  if (!post) {
    return jsonError("Post not found", 404);
  }

  /* 빈 칸은 보내지 않고, 돌아온 순서대로 제자리에 되돌린다. 예전에는 빈 칸을 걸러 낸 뒤 자리 번호로 꺼내
     제목이 비어 있으면 본문 번역이 제목 칸에 들어갔다. 번역이 비어 온 칸(failedIndices)은 쓰지 않는다 */
  const translateFields = async (pairs: [from: string, to: string][], src: "ko" | "en", dst: "ko" | "en", tag: string) => {
    const row = post as Record<string, string | null>;
    const todo = pairs.filter(([from]) => (row[from] ?? "").trim());
    const result = await translateWithFallback(providerList, todo.map(([from]) => row[from] as string), src, dst, tag);
    if ("error" in result) return { error: translationFailure(result.failures) };
    const out: Record<string, string> = {};
    todo.forEach(([, to], i) => {
      if (result.failedIndices.includes(i) || !result.translations[i]) return;
      out[to] = to === "title" || to === "title_en" ? clampTitle(result.translations[i]) : result.translations[i]; // 제목 상한(DB CHECK)
    });
    if (Object.keys(out).length > 0) await admin.from("posts").update(out).eq("id", id);
    return { out };
  };

  if (direction === "en-ko") {
    if (post.content) {
      return NextResponse.json({ title: post.title, content: post.content, excerpt: post.excerpt });
    }
    const r = await translateFields([["title_en", "title"], ["content_en", "content"], ["excerpt_en", "excerpt"]], "en", "ko", "[auto-translate en-ko]");
    if ("error" in r && r.error) return jsonError("Translation failed", r.error.status, { code: r.error.code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : r.error.code });
    const { out } = r as { out: Record<string, string> };
    return NextResponse.json({ title: out.title ?? post.title, content: out.content ?? post.content, excerpt: out.excerpt ?? post.excerpt });
  }

  // ko-en (default)
  if (post.content_en) {
    return NextResponse.json({ title_en: post.title_en, content_en: post.content_en, excerpt_en: post.excerpt_en });
  }
  const r = await translateFields([["title", "title_en"], ["content", "content_en"], ["excerpt", "excerpt_en"]], "ko", "en", "[auto-translate ko-en]");
  if ("error" in r && r.error) return jsonError("Translation failed", r.error.status, { code: r.error.code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : r.error.code });
  const { out } = r as { out: Record<string, string> };
  return NextResponse.json({ title_en: out.title_en ?? post.title_en, content_en: out.content_en ?? post.content_en, excerpt_en: out.excerpt_en ?? post.excerpt_en });
}
