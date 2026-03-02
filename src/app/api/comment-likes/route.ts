import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";
import { getIp } from "@/utils/getIp";
import { jsonOk, jsonError, jsonServerError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

function toTargetType(commentType: string): string {
  return commentType === "work" ? "work_comment" : "post_comment";
}

// GET /api/comment-likes?comment_type=post&comment_ids=id1,id2,id3
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentType = searchParams.get("comment_type");
    const commentIds = searchParams.get("comment_ids");

    if (!commentType || !commentIds) return jsonError("Missing fields");
    if (commentType !== "post" && commentType !== "work") return jsonError("Invalid comment_type");

    const ids = commentIds.split(",").filter(isValidUUID);
    if (ids.length === 0) return jsonOk({ liked: {} });

    const ip = getIp(request);
    const targetType = toTargetType(commentType);
    const admin = createAdminClient();

    const [{ data: myLikes }, { data: allLikes }] = await Promise.all([
      admin.from("likes").select("target_id").eq("target_type", targetType).in("target_id", ids).eq("ip", ip),
      admin.from("likes").select("target_id").eq("target_type", targetType).in("target_id", ids),
    ]);

    const liked: Record<string, boolean> = {};
    const counts: Record<string, number> = {};
    for (const id of ids) {
      liked[id] = myLikes?.some((row) => row.target_id === id) ?? false;
      counts[id] = allLikes?.filter((row) => row.target_id === id).length ?? 0;
    }

    return jsonOk({ liked, counts });
  } catch (e) {
    console.error("[comment-likes GET]", e);
    return jsonOk({ liked: {} });
  }
}

// POST /api/comment-likes — 댓글 좋아요 토글
export async function POST(request: Request) {
  try {
    const { comment_type, comment_id } = await request.json();

    if (!comment_type || !comment_id) return jsonError("Missing fields");
    if (comment_type !== "post" && comment_type !== "work") return jsonError("Invalid comment_type");
    if (!isValidUUID(comment_id)) return jsonError("Invalid comment_id");

    const ip = getIp(request);
    const targetType = toTargetType(comment_type);
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", comment_id)
      .eq("ip", ip)
      .maybeSingle();

    if (existing) {
      await admin.from("likes").delete().eq("id", existing.id);
    } else {
      await admin.from("likes").insert({ target_type: targetType, target_id: comment_id, ip });
    }

    const { count } = await admin
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", comment_id);

    return jsonOk({ liked: !existing, count: count ?? 0 });
  } catch (e) {
    return jsonServerError(e);
  }
}
