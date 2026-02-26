import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecret } from "@/lib/getSecret";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/auto-translate — 포스트 자동 번역 (ko→en)
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("title, content, excerpt, title_en, content_en, excerpt_en")
    .eq("id", id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // 이미 번역본이 있으면 skip
  if (post.content_en) {
    return NextResponse.json({
      title_en: post.title_en,
      content_en: post.content_en,
      excerpt_en: post.excerpt_en,
    });
  }

  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "Translation not available" }, { status: 503 });
  }

  const textsToTranslate = [post.title, post.content, post.excerpt].filter(Boolean);

  const prompt = `Translate the following ${textsToTranslate.length} text(s) from Korean to English.

Rules:
- Return ONLY a JSON array of translated strings, in the same order as the input.
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- Do not add explanations or wrapper text.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input texts:
${JSON.stringify(textsToTranslate, null, 2)}`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Translation error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const translations: string[] = JSON.parse(rawText);

    const titleEn = translations[0] ?? "";
    const contentEn = translations[1] ?? "";
    const excerptEn = translations[2] ?? "";

    // DB에 저장
    await admin
      .from("posts")
      .update({
        title_en: titleEn,
        content_en: contentEn,
        excerpt_en: excerptEn,
      })
      .eq("id", id);

    return NextResponse.json({
      title_en: titleEn,
      content_en: contentEn,
      excerpt_en: excerptEn,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
