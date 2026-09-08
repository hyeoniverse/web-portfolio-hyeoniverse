import { getSiteConfig } from "@/lib/getSiteConfig";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { BilingualCategory } from "@/types/common";
import {
  normalizeCategories,
  flattenCategories,
  expandCategoryValues,
} from "@/lib/categoryTree";

/** Get valid post categories (2단계 트리 — 대분류 children 보유) */
async function getPostCategories(): Promise<BilingualCategory[]> {
  const config = await getSiteConfig();
  const raw = config.posts?.categories ?? [];
  return normalizeCategories(raw as unknown[]);
}

/**
 * 여러 카테고리(멀티선택)를 매칭 대상 문자열 집합으로 확장 (OR / 합집합).
 * config 는 한 번만 읽고 각 카테고리를 확장해 union. posts·series 필터 공용.
 */
export async function expandPostCategoryFilters(categoriesInput: string[]): Promise<string[]> {
  const list = categoriesInput.map((c) => c.trim()).filter(Boolean);
  if (list.length === 0) return [];
  const categories = await getPostCategories();
  const out = new Set<string>();
  for (const c of list) {
    for (const v of expandCategoryValues(categories, c)) out.add(v);
  }
  return [...out];
}

/** Get valid works categories (ko/en) */
async function getWorksCategories(): Promise<BilingualCategory[]> {
  const config = await getSiteConfig();
  const raw = config.works?.categories ?? [];
  return (raw as unknown[]).map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );
}

/** Check if a post category value (ko or en) is valid — 대분류/소분류 어느 쪽이든 매칭 */
async function isValidPostCategory(category: string): Promise<boolean> {
  if (!category) return false;
  const categories = await getPostCategories();
  return flattenCategories(categories).some(
    (c) => c.ko === category || c.en === category,
  );
}

/** Check if a works category pair is valid */
async function isValidWorksCategory(ko: string, en: string): Promise<boolean> {
  if (!ko && !en) return false;
  const categories = await getWorksCategories();
  return categories.some((c) => c.ko === ko && c.en === en);
}

/** site_settings.config 에 새 카테고리 append (이미 있으면 noop) */
async function appendCategoryToConfig(
  domain: "posts" | "works",
  category: BilingualCategory,
): Promise<void> {
  // dedup + seed 는 "병합된 전체 목록"(getSiteConfig) 기준 — delta 만 보면 base seed 를 못 봐서
  // (a) 이미 있는 값을 중복 추가하거나 (b) 전체 배열을 덮어써(deepMerge 는 배열 통째 교체) seed 를 유실.
  const cfg = await getSiteConfig();
  const mergedRaw = (domain === "posts" ? cfg.posts?.categories : cfg.works?.categories) ?? [];
  const existing = normalizeCategories(mergedRaw as unknown[]);
  const exists = flattenCategories(existing).some(
    (c) => c.ko === category.ko && c.en === category.en,
  );
  if (exists) return;
  const next = [...existing, category]; // 자동 등록 카테고리는 최상위(leaf)로

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  const rootConfig = (row?.config as Record<string, unknown>) ?? {};
  // getSiteConfig 는 config.delta ?? config 를 읽으므로 write 도 같은 위치에 해야 반영됨.
  const isWrapped = !!rootConfig.delta && typeof rootConfig.delta === "object";
  const target = (isWrapped ? rootConfig.delta : rootConfig) as Record<string, unknown>;
  const domainCfg = (target[domain] as Record<string, unknown> | undefined) ?? {};
  const nextTarget = { ...target, [domain]: { ...domainCfg, categories: next } };
  const nextConfig = isWrapped ? { ...rootConfig, delta: nextTarget } : nextTarget;
  await admin
    .from("site_settings")
    .upsert({
      id: "default",
      config: nextConfig,
      updated_at: new Date().toISOString(),
    });
  revalidatePath("/", "layout");
}

/** works 카테고리 — 기존 목록에 없으면 자동으로 등록 */
export async function ensureWorksCategory(ko: string, en: string): Promise<void> {
  if (!ko && !en) return;
  const exists = await isValidWorksCategory(ko, en);
  if (exists) return;
  await appendCategoryToConfig("works", { ko: ko || en, en: en || ko });
}

/** posts 카테고리 — 기존 목록에 없으면 자동으로 등록 (단일 string) */
export async function ensurePostCategory(category: string): Promise<void> {
  if (!category) return;
  const exists = await isValidPostCategory(category);
  if (exists) return;
  await appendCategoryToConfig("posts", { ko: category, en: category });
}
