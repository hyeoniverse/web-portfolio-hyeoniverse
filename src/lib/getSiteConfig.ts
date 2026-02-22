import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>
): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === undefined || val === null) continue;
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Simple in-memory cache (per serverless instance)
let cached: SiteConfigData | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

export async function getSiteConfig(): Promise<SiteConfigData> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) return cached;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("config")
      .eq("id", "default")
      .single();

    if (data?.config && Object.keys(data.config).length > 0) {
      cached = deepMerge(
        structuredClone(siteConfig) as unknown as SiteConfigData,
        data.config
      );
    } else {
      cached = structuredClone(siteConfig) as unknown as SiteConfigData;
    }
  } catch {
    cached = structuredClone(siteConfig) as unknown as SiteConfigData;
  }

  cacheTime = now;
  return cached!;
}

export function invalidateConfigCache() {
  cached = null;
  cacheTime = 0;
}
