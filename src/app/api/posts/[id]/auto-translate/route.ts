import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";

type Provider = "gemini" | "google" | "deepl" | "claude";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const LANG_MAP_DEEPL: Record<string, string> = { ko: "KO", en: "EN" };
const LANG_MAP_GOOGLE: Record<string, string> = { ko: "ko", en: "en" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function translateTexts(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  provider: Provider,
): Promise<string[]> {
  switch (provider) {
    case "google": {
      const apiKey = await getSecret("GOOGLE_TRANSLATE_API_KEY");
      if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY not configured");
      const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: texts,
          source: LANG_MAP_GOOGLE[sourceLang],
          target: LANG_MAP_GOOGLE[targetLang],
          format: "text",
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Google Translate API error: ${res.status} ${errBody}`);
      }
      const data = await res.json();
      return (data?.data?.translations ?? []).map((t: { translatedText: string }) => t.translatedText);
    }
    case "deepl": {
      const apiKey = await getSecret("DEEPL_API_KEY");
      if (!apiKey) throw new Error("DEEPL_API_KEY not configured");
      const res = await fetch(DEEPL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: texts,
          source_lang: LANG_MAP_DEEPL[sourceLang],
          target_lang: LANG_MAP_DEEPL[targetLang],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`DeepL API error: ${res.status} ${errBody}`);
      }
      const data = await res.json();
      return (data?.translations ?? []).map((t: { text: string }) => t.text);
    }
    case "claude": {
      const apiKey = await getSecret("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
      const sourceName = sourceLang === "ko" ? "Korean" : "English";
      const targetName = targetLang === "ko" ? "Korean" : "English";
      const prompt = `Translate the following ${texts.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Return ONLY a JSON array of translated strings, in the same order as the input.
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- Do not add explanations or wrapper text.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input texts:
${JSON.stringify(texts, null, 2)}`;
      const res = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Claude API error: ${res.status} ${errBody}`);
      }
      const data = await res.json();
      const rawText = data?.content?.[0]?.text ?? "[]";
      return JSON.parse(rawText);
    }
    default: {
      // gemini
      const apiKey = await getSecret("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
      const sourceName = sourceLang === "ko" ? "Korean" : "English";
      const targetName = targetLang === "ko" ? "Korean" : "English";
      const prompt = `Translate the following ${texts.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Return ONLY a JSON array of translated strings, in the same order as the input.
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- Do not add explanations or wrapper text.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input texts:
${JSON.stringify(texts, null, 2)}`;
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      return JSON.parse(rawText);
    }
  }
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
      const translations = await translateTexts(texts, "en", "ko", provider);
      const [titleKo, contentKo, excerptKo] = translations;
      await admin.from("posts").update({ title: titleKo, content: contentKo, excerpt: excerptKo }).eq("id", id);
      return NextResponse.json({ title: titleKo, content: contentKo, excerpt: excerptKo });
    }

    // ko-en (default)
    if (post.content_en) {
      return NextResponse.json({ title_en: post.title_en, content_en: post.content_en, excerpt_en: post.excerpt_en });
    }
    const texts = [post.title, post.content, post.excerpt].filter(Boolean) as string[];
    const translations = await translateTexts(texts, "ko", "en", provider);
    const [titleEn, contentEn, excerptEn] = translations;
    await admin.from("posts").update({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn }).eq("id", id);
    return NextResponse.json({ title_en: titleEn, content_en: contentEn, excerpt_en: excerptEn });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[auto-translate]", direction, provider, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
