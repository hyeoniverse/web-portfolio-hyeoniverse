import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

type Provider = "gemini" | "google" | "deepl";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const LANG_MAP_DEEPL: Record<string, string> = { ko: "KO", en: "EN" };
const LANG_MAP_GOOGLE: Record<string, string> = { ko: "ko", en: "en" };

const MAX_LENGTH = 2000;

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
  const provider: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const sourceLang = targetLang === "ko" ? "en" : "ko";

  try {
    let translated: string;

    switch (provider) {
      case "google":
        translated = await translateGoogle(text, sourceLang, targetLang);
        break;
      case "gemini":
        translated = await translateGemini(text, targetLang);
        break;
      default:
        translated = await translateDeepL(text, sourceLang, targetLang);
        break;
    }

    if (!translated) {
      return NextResponse.json({ error: "Empty translation" }, { status: 502 });
    }

    return NextResponse.json({ translation: translated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[translate]", provider, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
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
