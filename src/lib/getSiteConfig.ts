import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLimits } from "@/lib/uploadFormats";
import { OWNER_AUTHOR_ID, withOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";

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

/** 병합 결과에 소유자 저자 프로필을 보장한다. 규칙은 설정 화면과 공유한다. */
function ensureOwnerAuthor(merged: SiteConfigData): void {
  const fallback = (siteConfig.authors as Author[] | undefined)?.find((a) => a.id === OWNER_AUTHOR_ID);
  (merged as { authors: Author[] }).authors = withOwnerAuthor(merged.authors as Author[] | undefined, fallback);
}

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
      // delta 형식: { delta: {...}, savedDefaults: {...} }
      const dbConfig = data.config.delta ?? data.config;
      const merged = deepMerge(
        structuredClone(siteConfig) as unknown as SiteConfigData,
        dbConfig
      );
      // 구 MIME-키 limits 를 확장자 키로 정규화 (마이그레이션) — 업로드 검증이 확장자 기준
      const media = merged.media as { limits?: Record<string, number> } | undefined;
      if (media?.limits) media.limits = normalizeLimits(media.limits);
      ensureOwnerAuthor(merged);
      return merged;
    }
  } catch {
    // DB 연결 실패 시 기본값 사용
  }

  return structuredClone(siteConfig) as unknown as SiteConfigData;
}
