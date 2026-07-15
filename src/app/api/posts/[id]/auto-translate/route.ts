import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { data: post } = await admin
    .from("posts")
    .select("title, content, excerpt, title_en, content_en, excerpt_en")
    .eq("id", id)
    .single();

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
