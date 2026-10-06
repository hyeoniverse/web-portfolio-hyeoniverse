import { revalidatePath } from "next/cache";
import { jsonServerError } from "@/lib/api/response";
import { handleSummaryRequest } from "@/lib/api/aiSummaryRoute";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/posts/[id]/ai-summary — 요청 모양과 처리는 lib/api/aiSummaryRoute 에(works 와 같다) */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await handleSummaryRequest(request, id, {
      table: "posts",
      kind: "post",
      koColumn: "content",
      /* 저장 뒤 공개 캐시를 비운다 — 안 비우면 ISR 때문에 새 요약이 한참 뒤에야 보인다 */
      revalidate: (row) => { revalidatePath("/posts"); if (row.slug) revalidatePath(`/posts/${row.slug}`); },
      logPrefix: "posts/ai-summary",
    });
  } catch (e) {
    console.error("[posts/ai-summary] OUTER ERROR:", e);
    return jsonServerError(e, "POST /api/posts/[id]/ai-summary");
  }
}
