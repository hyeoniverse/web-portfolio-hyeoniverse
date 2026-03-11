import { NextResponse } from "next/server";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

const PROVIDER_KEY_MAP: Record<string, string> = {
  deepl: "DEEPL_API_KEY",
  google: "GOOGLE_TRANSLATE_API_KEY",
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

// GET /api/service-status — returns which AI/translate services have API keys configured
export async function GET() {
  const config = await getSiteConfig();
  const translateProvider = config?.translation?.provider ?? "deepl";
  const summaryProvider = config?.aiSummary?.provider ?? "gemini";

  const [translateKey, summaryKey] = await Promise.all([
    getSecret(PROVIDER_KEY_MAP[translateProvider] ?? ""),
    getSecret(PROVIDER_KEY_MAP[summaryProvider] ?? ""),
  ]);

  return NextResponse.json({
    translation: !!translateKey,
    aiSummary: !!summaryKey,
  });
}
