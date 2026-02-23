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
    // 빈 문자열이 기본값을 덮어쓰지 않도록 방지
    if (typeof val === "string" && val === "" && typeof result[key] === "string" && result[key] !== "") continue;
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

export async function getSiteConfig(): Promise<SiteConfigData> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return structuredClone(siteConfig) as unknown as SiteConfigData;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("config")
      .eq("id", "default")
      .single();

    if (data?.config && Object.keys(data.config).length > 0) {
      return deepMerge(
        structuredClone(siteConfig) as unknown as SiteConfigData,
        data.config
      );
    }
  } catch {
    // DB 연결 실패 시 기본값 사용
  }

  return structuredClone(siteConfig) as unknown as SiteConfigData;
}
