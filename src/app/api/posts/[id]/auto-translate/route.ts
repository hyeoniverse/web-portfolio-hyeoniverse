import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { clampTitle } from "@/lib/postConstants";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
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
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (direction === "en-ko") {
    if (post.content) {
      return NextResponse.json({ title: post.title, content: post.content, excerpt: post.excerpt });
    }
    const texts = [post.title_en, post.content_en, post.excerpt_en].filter(Boolean) as string[];
    const result = await translateWithFallback(providerList, texts, "en", "ko", "[auto-translate en-ko]");
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    const [titleKoRaw, contentKo, excerptKo] = result.translations;
    const titleKo = clampTitle(titleKoRaw); // 생성 제목 상한 초과 방지 (DB CHECK 위반 방지)
    await admin.from("posts").update({ title: titleKo, content: contentKo, excerpt: excerptKo }).eq("id", id);
    return NextResponse.json({ title: titleKo, content: contentKo, excerpt: excerptKo });
  }

  // ko-en (default)
  if (post.content_en) {
    return NextResponse.json({ title_en: post.title_en, content_en: post.content_en, excerpt_en: post.excerpt_en });
  }
  const texts = [post.title, post.content, post.excerpt].filter(Boolean) as string[];
  const result = await translateWithFallback(providerList, texts, "ko", "en", "[auto-translate ko-en]");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  const [titleEnRaw, contentEn, excerptEn] = result.translations;
  const titleEn = clampTitle(titleEnRaw); // 생성 제목 상한 초과 방지
  await admin.from("posts").update({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn }).eq("id", id);
  return NextResponse.json({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn });
}
