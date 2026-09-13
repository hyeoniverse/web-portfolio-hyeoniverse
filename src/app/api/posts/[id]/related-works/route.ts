import { NextResponse } from "next/server";
import { getPostRelatedWorks } from "@/lib/postRelatedWorks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/posts/[id]/related-works — 공개 detail·미리보기용. published=true 만 반환. 글 상세는 서버에서 같은 값을 받는다 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ items: await getPostRelatedWorks(id) });
}
