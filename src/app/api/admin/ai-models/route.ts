import { requireOwner } from "@/lib/api/requireRole";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { DEFAULT_AI_MODELS, NANOBANANA_MODELS, listHfImageModels, resolveHfLatest, type AiModelProvider } from "@/lib/ai/models";

/**
 * GET /api/admin/ai-models?provider=gemini|openai|claude|huggingface|nanobanana — 그 키로 지금 부를 수 있는 모델 목록.
 * 설정 › 서비스의 모델 고르기가 쓴다(직접 적지 않고 고른다). 목록 API 는 크레딧이 없어도 대개 응답한다.
 * 글 공급자는 글 생성 모델만 남긴다 — 임베딩 · 음성 · 그림 · 모더레이션은 뺀다. 키가 없거나 공급자가 거절하면 그 이유를 돌려준다.
 * Hugging Face 는 키 없이도 Hub 공개 목록(지금 돌릴 수 있는 text-to-image, 인기순)을 주고 "latest" 가 가리키는 모델을 resolved 로 알린다.
 * NanoBanana 는 목록 API 가 없다 — 엔드포인트 셋이 곧 모델이라 고정 목록.
 */
const KEY: Record<AiModelProvider, string> = {
  gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", claude: "ANTHROPIC_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY", nanobanana: "NANOBANANA_API_KEY",
};

const NOT_TEXT = /embed|tts|audio|whisper|realtime|image|dall-e|moderation|transcribe|search|computer-use|aqa|imagen|veo|vision-only/i;

async function listModels(provider: Exclude<AiModelProvider, "huggingface" | "nanobanana">, key: string): Promise<string[]> {
  if (provider === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (data.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  }
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: { id: string }[] };
    return (data.data ?? []).map((m) => m.id).filter((id) => /^(gpt|o\d|chatgpt)/.test(id));
  }
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => m.id);
}

export async function GET(request: Request) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;
  const provider = new URL(request.url).searchParams.get("provider") as AiModelProvider | null;
  if (!provider || !(provider in DEFAULT_AI_MODELS)) return jsonError("Unknown provider", 400);
  if (provider === "nanobanana") return jsonOk({ provider, models: NANOBANANA_MODELS, defaultModel: DEFAULT_AI_MODELS[provider] });
  if (provider === "huggingface") {
    const models = await listHfImageModels();
    return jsonOk({ provider, models, defaultModel: DEFAULT_AI_MODELS[provider], resolved: await resolveHfLatest(), reason: models.length ? undefined : "failed" });
  }
  const key = await getSecret(KEY[provider]);
  if (!key) return jsonOk({ provider, models: [], reason: "nokey" });
  try {
    const models = [...new Set(await listModels(provider, key))].filter((m) => !NOT_TEXT.test(m)).sort();
    return jsonOk({ provider, models, defaultModel: DEFAULT_AI_MODELS[provider] });
  } catch (e) {
    return jsonOk({ provider, models: [], defaultModel: DEFAULT_AI_MODELS[provider], reason: e instanceof Error ? e.message : "failed" });
  }
}
