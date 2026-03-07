import { getSiteConfig } from "@/lib/getSiteConfig";

interface BilingualCategory {
  ko: string;
  en: string;
}

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
