import { requireOwner } from "@/lib/api/requireRole";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { readHealth, readUsage, resetProviders } from "@/lib/ai/health";
import { AI_PROVIDERS, AI_PROVIDER_INFO, type AiProvider } from "@/lib/ai/providers";

/**
 * GET /api/admin/ai-health — 설정 › 서비스의 AI 상태 패널.
 * 공급자마다 키가 있는지, 이어진 실패와 원인, 꺼졌는지, 이번 달 사용량을 돌려준다.
 * DeepL 은 공급자가 실제 사용량·한도를 알려 주는 API(/v2/usage)가 있어 그 값을 함께 싣는다.
 * 어떤 키가 있는지와 오류 내용 자체가 운영 정보라 비밀 키 화면과 같은 등급(owner)으로 둔다.
 */
export async function GET() {
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const [health, usage, keys] = await Promise.all([
    readHealth(),
    readUsage(),
    Promise.all(AI_PROVIDERS.map(async (p) => {
      const key = AI_PROVIDER_INFO[p].key;
      return [p, key ? !!(await getSecret(key)) : true] as const;
    })),
  ]);

  return jsonOk({
    health,
    usage,
    configured: Object.fromEntries(keys) as Record<AiProvider, boolean>,
    deepl: await deeplUsage(),
  });
}

/** DeepL 이 알려 주는 이번 결제 주기의 사용량 — 키가 없거나 실패하면 null */
async function deeplUsage(): Promise<{ count: number; limit: number } | null> {
  const key = await getSecret("DEEPL_API_KEY");
  if (!key) return null;
  const url = key.endsWith(":fx") ? "https://api-free.deepl.com/v2/usage" : "https://api.deepl.com/v2/usage";
  try {
    const res = await fetch(url, { headers: { Authorization: `DeepL-Auth-Key ${key}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.character_count !== "number" || typeof data?.character_limit !== "number") return null;
    return { count: data.character_count, limit: data.character_limit };
  } catch {
    return null;
  }
}

/** POST /api/admin/ai-health { provider } — 꺼진 공급자를 다시 켠다(오류 기록을 지운다) */
export async function POST(request: Request) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const { provider } = (await request.json().catch(() => ({}))) as { provider?: string };
  if (!provider || !(AI_PROVIDERS as readonly string[]).includes(provider)) return jsonError("Invalid provider", 400);
  await resetProviders([provider as AiProvider]);
  return jsonOk({ success: true });
}
