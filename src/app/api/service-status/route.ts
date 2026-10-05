import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { isDisabled, readHealth } from "@/lib/ai/health";
import type { AiProvider } from "@/lib/ai/providers";

const PROVIDER_KEY_MAP: Record<string, string> = {
  deepl: "DEEPL_API_KEY",
  google: "GOOGLE_TRANSLATE_API_KEY",
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  groq: "GROQ_API_KEY",
  nanobanana: "NANOBANANA_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY",
};

/** 설정 이름 → 상태를 세는 공급자 이름(번역의 google 만 다르다) */
const toAiProvider = (feature: "translation" | "other", p: string): AiProvider =>
  (feature === "translation" && p === "google" ? "google_translate" : p) as AiProvider;

type Chain = { provider?: string; fallback?: { enabled?: boolean; priority?: readonly string[]; excluded?: readonly string[] } } | undefined;

/** 첫 공급자 + (켜져 있으면) fallback 순서 */
function chainOf(cfg: Chain, fallbackDefault: string): string[] {
  const primary = cfg?.provider ?? fallbackDefault;
  const list = [primary];
  if (cfg?.fallback?.enabled) {
    const excl = new Set(cfg.fallback.excluded ?? []);
    for (const p of cfg.fallback.priority ?? []) if (p !== primary && !excl.has(p)) list.push(p);
  }
  return list;
}

/**
 * GET /api/service-status — 번역·AI 요약·AI 커버를 지금 쓸 수 있는지.
 * 예전에는 첫 공급자의 키만 봐서, 첫 공급자 키가 없으면 fallback 이 있어도 기능이 꺼진 것으로 보였다.
 * 이제 순서 안에 키가 있고 꺼져 있지 않은(lib/ai/health) 공급자가 하나라도 있으면 쓸 수 있다고 본다.
 */
export async function GET() {
  const [config, health] = await Promise.all([getSiteConfig(), readHealth()]);

  const usable = async (feature: "translation" | "other", chain: string[]) => {
    for (const p of chain) {
      const key = PROVIDER_KEY_MAP[p];
      if (key && (await getSecret(key)) && !isDisabled(health[toAiProvider(feature, p)])) return true;
    }
    return false;
  };

  const [translate, summary, cover] = await Promise.all([
    usable("translation", chainOf(config?.translation as Chain, "deepl")),
    usable("other", chainOf(config?.aiSummary as Chain, "gemini")),
    usable("other", chainOf(config?.aiCover as Chain, "nanobanana")),
  ]);

  return NextResponse.json({
    translation: config?.translation?.enabled !== false && translate,
    aiSummary: config?.aiSummary?.enabled !== false && summary,
    aiCover: config?.aiCover?.enabled !== false && cover,
  });
}
