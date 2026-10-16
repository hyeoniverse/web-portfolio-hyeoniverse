import { requireOwner } from "@/lib/api/requireRole";
import { jsonOk, jsonServerError } from "@/lib/api/response";
import { commentImageDeleteAfter, commentImagePathsIn } from "@/lib/commentImages";
import { commentContentsUsingImages, listCommentImages, sweepCommentImages } from "@/lib/api/commentImages";

/**
 * 라이브러리 › 댓글 이미지 정리(#1455) — 댓글에 쓰이지 않은 댓글 이미지.
 * 자동 정리는 업로드가 하루 한 번 겸해서, 업로드가 없으면 지울 때가 지난 이미지가 남아 있을 수 있다.
 *
 * GET  — { due: 지울 때가 지난 이미지, scheduled: 아직 지울 때가 안 된 이미지(지울 때 순), usedCount }
 * POST — 지금 정리한다(하루 간격을 건너뛴다). { deleted }
 * 하나씩 지우기는 /api/admin/media DELETE 가 한다(댓글에서 쓰는지 서버가 다시 본다).
 */
export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;
  try {
    const [files, contents] = await Promise.all([listCommentImages(), commentContentsUsingImages()]);
    const used = commentImagePathsIn(contents);
    const now = Date.now();
    const unused = files
      .filter((f) => !used.has(f.path))
      .map((f) => ({ ...f, deleteAfter: commentImageDeleteAfter(f.path)?.toISOString() ?? null }))
      .sort((a, b) => (a.deleteAfter ?? "").localeCompare(b.deleteAfter ?? ""));
    const isDue = (d: string | null) => d !== null && Date.parse(d) <= now;
    return jsonOk({
      due: unused.filter((f) => isDue(f.deleteAfter)),
      scheduled: unused.filter((f) => !isDue(f.deleteAfter)),
      usedCount: files.length - unused.length,
    });
  } catch (e) {
    return jsonServerError(e, "GET /api/admin/media/comment-images");
  }
}

export async function POST() {
  const { error } = await requireOwner();
  if (error) return error;
  try {
    return jsonOk({ deleted: (await sweepCommentImages(new Date(), { force: true })) ?? 0 });
  } catch (e) {
    return jsonServerError(e, "POST /api/admin/media/comment-images");
  }
}

export const dynamic = "force-dynamic";
