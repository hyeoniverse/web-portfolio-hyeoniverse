import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DB(site_settings id='secrets')에서 키를 읽고, 없으면 process.env fallback.
 * 서버 사이드 전용 — API routes / server components에서만 사용.
 */

type SecretsMap = Record<string, string>;

let cache: SecretsMap | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60초

async function loadSecrets(): Promise<SecretsMap> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    cache = {};
    cacheTime = now;
    return cache;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("config")
      .eq("id", "secrets")
      .single();

    cache = (data?.config as SecretsMap) ?? {};
  } catch {
    cache = {};
  }

  cacheTime = now;
  return cache;
}

/** 캐시 무효화 — secrets 저장 후 호출 */
export function invalidateSecretsCache() {
  cache = null;
  cacheTime = 0;
}

/**
 * 서버 사이드에서 시크릿 키를 가져옴.
 * 우선순위: DB(site_settings) → process.env
 */
export async function getSecret(key: string): Promise<string> {
  const secrets = await loadSecrets();
  return secrets[key] || process.env[key] || "";
}

/**
 * 클라이언트에 노출 가능한 NEXT_PUBLIC_* 키만 반환.
 * getSiteConfig에서 호출하여 provider로 전달.
 */
export async function getPublicKeys(): Promise<Record<string, string>> {
  const secrets = await loadSecrets();
  const result: Record<string, string> = {};

  const PUBLIC_KEYS = [
    "NEXT_PUBLIC_FORMSPREE_ID",
    "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  ];

  for (const key of PUBLIC_KEYS) {
    const val = secrets[key] || process.env[key] || "";
    if (val) result[key] = val;
  }

  return result;
}
