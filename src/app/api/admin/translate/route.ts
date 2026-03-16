import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

type Provider = "gemini" | "google" | "deepl" | "claude";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const LANG_MAP_DEEPL: Record<string, string> = { ko: "KO", en: "EN" };
const LANG_MAP_GOOGLE: Record<string, string> = { ko: "ko", en: "en" };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { texts, sourceLang, targetLang } = (await request.json()) as {
    texts: string[];
    sourceLang: "ko" | "en";
    targetLang: "ko" | "en";
  };

  if (!texts?.length || !sourceLang || !targetLang) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const fallbackCfg = config?.translation?.fallback;

  const providerList: Provider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    for (const p of fallbackCfg.priority) {
      if (p !== primary) providerList.push(p as Provider);
    }
  }

  let lastError = "Unknown error";
  for (const provider of providerList) {
    try {
      let translations: string[];
      switch (provider) {
        case "google": translations = await translateWithGoogle(texts, sourceLang, targetLang); break;
        case "deepl":  translations = await translateWithDeepL(texts, sourceLang, targetLang); break;
        case "claude": translations = await translateWithClaude(texts, sourceLang, targetLang); break;
        default:       translations = await translateWithGemini(texts, sourceLang, targetLang); break;
      }
      if (translations.length !== texts.length) {
        lastError = "Translation count mismatch";
        continue;
      }
      return NextResponse.json({ translations });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error("[admin/translate]", provider, lastError);
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}

/* ── Gemini ── */
async function translateWithGemini(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const sourceName = sourceLang === "ko" ? "Korean" : "English";
  const targetName = targetLang === "ko" ? "Korean" : "English";

  const prompt = `Translate the following ${texts.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Return ONLY a JSON array of translated strings, in the same order as the input.
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- Do not add explanations or wrapper text.
- For short labels (1-3 words), keep the translation concise.
- For technical terms (e.g. "Next.js", "GSAP", "Supabase"), keep them as-is.

Input texts:
${JSON.stringify(texts, null, 2)}`;

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

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return JSON.parse(rawText);
}

/* ── Google Cloud Translation ── */
async function translateWithGoogle(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
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

  if (!res.ok) throw new Error(`Google Translate API error: ${res.status}`);

  const data = await res.json();
  const results = data?.data?.translations;
  if (!Array.isArray(results)) throw new Error("Invalid Google Translate response");

  return results.map((t: { translatedText: string }) => t.translatedText);
}

/* ── DeepL ── */
async function translateWithDeepL(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
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

  if (!res.ok) throw new Error(`DeepL API error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data?.translations)) throw new Error("Invalid DeepL response");

  return data.translations.map((t: { text: string }) => t.text);
}

/* ── Claude ── */
async function translateWithClaude(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const sourceName = sourceLang === "ko" ? "Korean" : "English";
  const targetName = targetLang === "ko" ? "Korean" : "English";

  const prompt = `Translate the following ${texts.length} text(s) from ${sourceName} to ${targetName}.

Rules:
- Return ONLY a JSON array of translated strings, in the same order as the input.
- Preserve all formatting: markdown syntax, HTML tags, line breaks, code blocks.
- Do not add explanations or wrapper text.
- For short labels (1-3 words), keep the translation concise.
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
