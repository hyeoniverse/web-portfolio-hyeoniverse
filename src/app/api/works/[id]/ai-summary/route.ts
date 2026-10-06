import { jsonServerError } from "@/lib/api/response";
import { revalidatePublicWorks } from "@/lib/api/revalidateWorks";
import { handleSummaryRequest } from "@/lib/api/aiSummaryRoute";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/works/[id]/ai-summary — 요청 모양과 처리는 lib/api/aiSummaryRoute 에(posts 와 같다) */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await handleSummaryRequest(request, id, {
      table: "works",
      kind: "work",
      koColumn: "content_ko",
      revalidate: () => revalidatePublicWorks(),
      logPrefix: "works/ai-summary",
    });
  } catch (e) {
    console.error("[works/ai-summary] OUTER ERROR:", e);
    return jsonServerError(e, "POST /api/works/[id]/ai-summary");
  }
}
