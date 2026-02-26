import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";

export const dynamic = "force-dynamic";

function getIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function toTargetType(commentType: string): string {
  return commentType === "work" ? "work_comment" : "post_comment";
}

// GET /api/comment-likes?comment_type=post&comment_ids=id1,id2,id3
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentType = searchParams.get("comment_type");
    const commentIds = searchParams.get("comment_ids");

    if (!commentType || !commentIds) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (commentType !== "post" && commentType !== "work") {
      return NextResponse.json({ error: "Invalid comment_type" }, { status: 400 });
    }

    const ids = commentIds.split(",").filter(isValidUUID);
    if (ids.length === 0) {
      return NextResponse.json({ liked: {} });
    }

    const ip = getIp(request);
    const targetType = toTargetType(commentType);
    const admin = createAdminClient();

    // 내 좋아요 여부 + 전체 count 병렬 조회
    const [{ data: myLikes }, { data: allLikes }] = await Promise.all([
      admin
        .from("likes")
        .select("target_id")
        .eq("target_type", targetType)
        .in("target_id", ids)
        .eq("ip", ip),
      admin
        .from("likes")
        .select("target_id")
        .eq("target_type", targetType)
        .in("target_id", ids),
    ]);

    const liked: Record<string, boolean> = {};
    const counts: Record<string, number> = {};
    for (const id of ids) {
      liked[id] = myLikes?.some((row) => row.target_id === id) ?? false;
      counts[id] = allLikes?.filter((row) => row.target_id === id).length ?? 0;
    }

    return NextResponse.json({ liked, counts });
  } catch (e) {
    console.error("[comment-likes GET]", e);
    return NextResponse.json({ liked: {} });
  }
}

// POST /api/comment-likes — 댓글 좋아요 토글
export async function POST(request: Request) {
  try {
    const { comment_type, comment_id } = await request.json();

    if (!comment_type || !comment_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (comment_type !== "post" && comment_type !== "work") {
      return NextResponse.json({ error: "Invalid comment_type" }, { status: 400 });
    }
    if (!isValidUUID(comment_id)) {
      return NextResponse.json({ error: "Invalid comment_id" }, { status: 400 });
    }

    const ip = getIp(request);
    const targetType = toTargetType(comment_type);
    const admin = createAdminClient();

    // 기존 좋아요 확인
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
      await admin.from("likes").insert({
        target_type: targetType,
        target_id: comment_id,
        ip,
      });
    }

    // 실시간 count
    const { count } = await admin
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", comment_id);

    return NextResponse.json({ liked: !existing, count: count ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[comment-likes POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
