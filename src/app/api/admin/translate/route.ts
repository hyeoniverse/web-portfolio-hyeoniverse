import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
  translationFailure,
} from "@/lib/api/translationProviders";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { texts, sourceLang, targetLang } = (await request.json()) as {
    texts: string[];
    sourceLang: "ko" | "en";
    targetLang: "ko" | "en";
  };

  if (!texts?.length || !sourceLang || !targetLang) {
    return jsonError("Missing required fields", 400);
  }

  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providerList = buildProviderList(primary, config?.translation?.fallback);

  const result = await translateWithFallback(
    providerList, texts, sourceLang, targetLang, "[admin/translate]",
  );

  /* failures — 공급자마다의 실패 원인. 편집 화면이 토스트로 알린다(뒤 공급자로 성공했어도) */
  if ("error" in result) {
    const { code } = translationFailure(result.failures);
    return NextResponse.json({ error: result.error, code, failures: result.failures }, { status: 502 });
  }

  // failedIndices: 모든 provider 시도 후에도 번역 못 받은 인덱스 (성공분은 그대로 유지)
  return jsonOk({
    translations: result.translations,
    failedIndices: result.failedIndices,
    failures: result.failures,
  });
}
