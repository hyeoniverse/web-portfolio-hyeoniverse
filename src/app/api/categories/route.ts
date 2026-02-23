import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/getSiteConfig";

// GET /api/categories — 카테고리 목록 (공개)
export async function GET() {
  const config = await getSiteConfig();
  const categories = config.posts?.categories ?? [
    "General",
    "Development",
    "Design",
    "Tutorial",
    "Thoughts",
    "Project",
  ];
  return NextResponse.json(categories);
}
