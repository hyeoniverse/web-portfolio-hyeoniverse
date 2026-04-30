import { getSiteConfig } from "@/lib/getSiteConfig";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { BilingualCategory } from "@/types/common";

/** Get valid post categories (ko/en) */
export async function getPostCategories(): Promise<BilingualCategory[]> {
  const config = await getSiteConfig();
  const raw = config.posts?.categories ?? [];
  return (raw as unknown[]).map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );
}

/** Get valid works categories (ko/en) */
export async function getWorksCategories(): Promise<BilingualCategory[]> {
  const config = await getSiteConfig();
  const raw = config.works?.categories ?? [];
  return (raw as unknown[]).map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );
}

/** Check if a post category value (ko or en) is valid */
export async function isValidPostCategory(category: string): Promise<boolean> {
  if (!category) return false;
  const categories = await getPostCategories();
  return categories.some((c) => c.ko === category || c.en === category);
}

/** Check if a works category pair is valid */
export async function isValidWorksCategory(ko: string, en: string): Promise<boolean> {
  if (!ko && !en) return false;
  const categories = await getWorksCategories();
  return categories.some((c) => c.ko === ko && c.en === en);
}

/** site_settings.config 에 새 카테고리 append (이미 있으면 noop) */
async function appendCategoryToConfig(
  domain: "posts" | "works",
  category: BilingualCategory,
): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  if (!row) return;
  const config = row.config as Record<string, unknown> ?? {};
  const domainCfg = (config[domain] as Record<string, unknown> | undefined) ?? {};
  const rawList = (domainCfg.categories as unknown[]) ?? [];
  const existing: BilingualCategory[] = rawList.map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );
  const exists = existing.some((c) => c.ko === category.ko && c.en === category.en);
  if (exists) return;
  const next = [...existing, category];
  await admin
    .from("site_settings")
    .upsert({
      id: "default",
      config: { ...config, [domain]: { ...domainCfg, categories: next } },
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
