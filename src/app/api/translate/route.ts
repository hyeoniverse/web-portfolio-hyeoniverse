import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

type Provider = "gemini" | "google" | "deepl" | "claude";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const LANG_MAP_DEEPL: Record<string, string> = { ko: "KO", en: "EN" };
const LANG_MAP_GOOGLE: Record<string, string> = { ko: "ko", en: "en" };

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const MAX_LENGTH = 2000;

async function callProvider(
  provider: Provider,
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  switch (provider) {
    case "google": return translateGoogle(text, sourceLang, targetLang);
    case "gemini": return translateGemini(text, targetLang);
    case "claude": return translateClaude(text, targetLang);
    default:       return translateDeepL(text, sourceLang, targetLang);
  }
}

export async function POST(request: Request) {
  const { text, targetLang } = (await request.json()) as {
    text: string;
    targetLang: "ko" | "en";
  };

  if (!text?.trim() || !targetLang) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const fallbackCfg = config?.translation?.fallback;
  const sourceLang = targetLang === "ko" ? "en" : "ko";

  const providerList: Provider[] = [primary];
  if (fallbackCfg?.enabled && fallbackCfg.priority?.length) {
    const excl = new Set(fallbackCfg.excluded ?? []);
    for (const p of fallbackCfg.priority) {
      if (p !== primary && !excl.has(p)) providerList.push(p as Provider);
    }
  }

  let lastError = "Unknown error";
  for (const provider of providerList) {
    try {
      const translated = await callProvider(provider, text, sourceLang, targetLang);
      if (!translated) { lastError = "Empty translation"; continue; }
      return NextResponse.json({ translation: translated });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error("[translate]", provider, lastError);
    }
  }

  const status = lastError.includes("not configured") ? 503 : 502;
  return NextResponse.json({ error: lastError }, { status });
}

/* ── DeepL ── */
async function translateDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const apiKey = await getSecret("DEEPL_API_KEY");
  if (!apiKey) throw new Error("DEEPL_API_KEY not configured");

  const res = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      source_lang: LANG_MAP_DEEPL[sourceLang],
      target_lang: LANG_MAP_DEEPL[targetLang],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`DeepL API error: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return data?.translations?.[0]?.text ?? "";
}

/* ── Gemini ── */
async function translateGemini(text: string, targetLang: string): Promise<string> {
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const targetName = targetLang === "ko" ? "Korean" : "English";
  const prompt = `Translate the following text to ${targetName}.\nReturn ONLY the translated text, nothing else.\nPreserve line breaks and formatting.\n\nText:\n${text}`;

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

/* ── Claude ── */
async function translateClaude(text: string, targetLang: string): Promise<string> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const targetName = targetLang === "ko" ? "Korean" : "English";
  const prompt = `Translate the following text to ${targetName}.\nReturn ONLY the translated text, nothing else.\nPreserve line breaks and formatting.\n\nText:\n${text}`;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Claude API error: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text?.trim() ?? "";
}

/* ── Google Cloud Translation ── */
async function translateGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const apiKey = await getSecret("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY not configured");

  const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: [text],
      source: LANG_MAP_GOOGLE[sourceLang],
      target: LANG_MAP_GOOGLE[targetLang],
      format: "text",
    }),
  });

  if (!res.ok) throw new Error(`Google Translate API error: ${res.status}`);

  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText ?? "";
}
