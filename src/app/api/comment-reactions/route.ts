import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";
import { getIp } from "@/utils/getIp";
import { isReactionEmoji } from "@/utils/commentReactions";
import { jsonOk, jsonError, jsonServerError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** IP + UA 조합으로 reactor 식별 (좋아요의 IP 방식과 동일 취지 — 해시로 저장) */
function getReactorHash(request: Request): string {
  const ip = getIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 32);
}

// GET /api/comment-reactions?comment_type=post&comment_ids=id1,id2,id3
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentType = searchParams.get("comment_type");
    const commentIds = searchParams.get("comment_ids");

    if (!commentType || !commentIds) return jsonError("Missing fields");
    if (commentType !== "post" && commentType !== "work") return jsonError("Invalid comment_type");

    const ids = commentIds.split(",").filter(isValidUUID);
    if (ids.length === 0) return jsonOk({ counts: {}, mine: {} });

    const reactorHash = getReactorHash(request);
    const admin = createAdminClient();

    const { data: rows } = await admin
      .from("comment_reactions")
      .select("comment_id, emoji, reactor_hash")
      .eq("comment_type", commentType)
      .in("comment_id", ids);

    // counts: { [commentId]: { [emoji]: number } }, mine: { [commentId]: string[] }
    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string[]> = {};
    for (const row of rows ?? []) {
      const bucket = (counts[row.comment_id] ??= {});
      bucket[row.emoji] = (bucket[row.emoji] ?? 0) + 1;
      if (row.reactor_hash === reactorHash) (mine[row.comment_id] ??= []).push(row.emoji);
    }

    return jsonOk({ counts, mine });
  } catch (e) {
    console.error("[comment-reactions GET]", e);
    return jsonOk({ counts: {}, mine: {} });
  }
}

// POST /api/comment-reactions — 반응 토글 (있으면 취소, 없으면 추가)
export async function POST(request: Request) {
  try {
    const { comment_type, comment_id, emoji } = await request.json();

    if (!comment_type || !comment_id || !emoji) return jsonError("Missing fields");
    if (comment_type !== "post" && comment_type !== "work") return jsonError("Invalid comment_type");
    if (!isValidUUID(comment_id)) return jsonError("Invalid comment_id");
    if (!isReactionEmoji(emoji)) return jsonError("Invalid emoji");

    const reactorHash = getReactorHash(request);
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("comment_reactions")
      .select("id")
      .eq("comment_type", comment_type)
      .eq("comment_id", comment_id)
      .eq("emoji", emoji)
      .eq("reactor_hash", reactorHash)
      .maybeSingle();

    if (existing) {
      await admin.from("comment_reactions").delete().eq("id", existing.id);
    } else {
      await admin
        .from("comment_reactions")
        .insert({ comment_type, comment_id, emoji, reactor_hash: reactorHash });
    }

    // 해당 댓글 최신 집계 + 내 반응 재조회 (낙관적 업데이트 확정)
    const { data: rows } = await admin
      .from("comment_reactions")
      .select("emoji, reactor_hash")
      .eq("comment_type", comment_type)
      .eq("comment_id", comment_id);

    const counts: Record<string, number> = {};
    const mine: string[] = [];
    for (const row of rows ?? []) {
      counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
      if (row.reactor_hash === reactorHash) mine.push(row.emoji);
    }

    return jsonOk({ counts, mine });
  } catch (e) {
    return jsonServerError(e, "POST /api/comment-reactions");
  }
}
