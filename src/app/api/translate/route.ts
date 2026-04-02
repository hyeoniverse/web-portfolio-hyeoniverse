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

  return NextResponse.json({ translation: result.translations[0] });
}
