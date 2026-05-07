import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
} from "@/lib/api/translationProviders";

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
  const providerList = buildProviderList(primary, config?.translation?.fallback);

  const result = await translateWithFallback(
    providerList, texts, sourceLang, targetLang, "[admin/translate]",
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // failedIndices: 모든 provider 시도 후에도 번역 못 받은 인덱스 (성공분은 그대로 유지)
  return NextResponse.json({
    translations: result.translations,
    failedIndices: result.failedIndices,
  });
}
