import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
} from "@/lib/api/translationProviders";

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

  if ("error" in result) {
    return jsonError(result.error, 502);
  }

  // failedIndices: 모든 provider 시도 후에도 번역 못 받은 인덱스 (성공분은 그대로 유지)
  return jsonOk({
    translations: result.translations,
    failedIndices: result.failedIndices,
  });
}
