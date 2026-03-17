import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

const PROVIDER_KEY_MAP: Record<string, string> = {
  deepl: "DEEPL_API_KEY",
  google: "GOOGLE_TRANSLATE_API_KEY",
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  nanobanana: "NANOBANANA_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY",
};

// GET /api/service-status — returns which AI/translate services have API keys configured
export async function GET() {
  const config = await getSiteConfig();
  const translateProvider = config?.translation?.provider ?? "deepl";
  const summaryProvider = config?.aiSummary?.provider ?? "gemini";
  const coverProvider = config?.aiCover?.provider ?? "nanobanana";

  const [translateKey, summaryKey, coverKey] = await Promise.all([
    getSecret(PROVIDER_KEY_MAP[translateProvider] ?? ""),
    getSecret(PROVIDER_KEY_MAP[summaryProvider] ?? ""),
    getSecret(PROVIDER_KEY_MAP[coverProvider] ?? ""),
  ]);

  const translationOn = config?.translation?.enabled !== false;
  const aiSummaryOn = config?.aiSummary?.enabled !== false;
  const aiCoverOn = config?.aiCover?.enabled !== false;

  return NextResponse.json({
    translation: translationOn && !!translateKey,
    aiSummary: aiSummaryOn && !!summaryKey,
    aiCover: aiCoverOn && !!coverKey,
  });
}
