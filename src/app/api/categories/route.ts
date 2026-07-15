import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { ensurePostCategory } from "@/lib/api/validateCategory";
import { normalizeCategories } from "@/lib/categoryTree";
import type { BilingualCategory } from "@/types/common";

// GET /api/categories — 카테고리 목록 (공개, 이중언어)
export async function GET() {
  let config = await getSiteConfig();
  let raw = config.posts?.categories ?? [];

  // "기타" 카테고리는 시리즈/글의 기본값으로 사용되므로 항상 존재해야 함 — 없으면 자동 등록
  const hasMisc = (raw as unknown[]).some((item) => {
    if (typeof item === "string") return item === "기타";
    return (item as BilingualCategory).ko === "기타";
  });
  if (!hasMisc) {
    await ensurePostCategory("기타");
    config = await getSiteConfig();
    raw = config.posts?.categories ?? [];
  }

  // 기존 string[] / flat / 2단계 트리 모두 정규화 (children 보존)
  const categories: BilingualCategory[] = normalizeCategories(raw as unknown[]);

  return NextResponse.json(categories);
}
