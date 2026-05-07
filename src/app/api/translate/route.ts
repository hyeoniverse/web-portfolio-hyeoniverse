import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
} from "@/lib/api/translationProviders";

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
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const sourceLang = targetLang === "ko" ? "en" : "ko";
  const providerList = buildProviderList(primary, config?.translation?.fallback);

  const result = await translateWithFallback(
    providerList, [text], sourceLang, targetLang, "[translate]",
  );

  if ("error" in result) {
    const status = result.error.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  // 단건 번역 — 결과가 비어 있으면 (failedIndices 에 0 이 있으면) 502 로 처리
  if (result.failedIndices.includes(0)) {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }

  return NextResponse.json({ translation: result.translations[0] });
}
