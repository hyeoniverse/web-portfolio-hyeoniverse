import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/getSiteConfig";
import type { BilingualCategory } from "@/types/common";

// GET /api/works-categories — works 카테고리 목록 (공개, 이중언어)
export async function GET() {
  const config = await getSiteConfig();
  const raw = config.works?.categories ?? [];

  // 기존 string[] → { ko, en }[] 자동 정규화
  const categories: BilingualCategory[] = (raw as unknown[]).map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );

  return NextResponse.json(categories);
}
