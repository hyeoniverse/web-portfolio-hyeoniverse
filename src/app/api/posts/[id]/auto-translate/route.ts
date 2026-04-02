import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { type Provider, translateWithProvider } from "@/lib/api/translationProviders";

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
  const provider: Provider = (config?.translation?.provider as Provider) ?? "deepl";

  const { data: post } = await admin
    .from("posts")
    .select("title, content, excerpt, title_en, content_en, excerpt_en")
    .eq("id", id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  try {
    if (direction === "en-ko") {
      if (post.content) {
        return NextResponse.json({ title: post.title, content: post.content, excerpt: post.excerpt });
      }
      const texts = [post.title_en, post.content_en, post.excerpt_en].filter(Boolean) as string[];
      const translations = await translateWithProvider(provider, texts, "en", "ko");
      const [titleKo, contentKo, excerptKo] = translations;
      await admin.from("posts").update({ title: titleKo, content: contentKo, excerpt: excerptKo }).eq("id", id);
      return NextResponse.json({ title: titleKo, content: contentKo, excerpt: excerptKo });
    }

    // ko-en (default)
    if (post.content_en) {
      return NextResponse.json({ title_en: post.title_en, content_en: post.content_en, excerpt_en: post.excerpt_en });
    }
    const texts = [post.title, post.content, post.excerpt].filter(Boolean) as string[];
    const translations = await translateWithProvider(provider, texts, "ko", "en");
    const [titleEn, contentEn, excerptEn] = translations;
    await admin.from("posts").update({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn }).eq("id", id);
    return NextResponse.json({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[auto-translate]", direction, provider, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
