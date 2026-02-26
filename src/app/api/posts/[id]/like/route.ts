import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// GET /api/posts/[id]/like — 좋아요 수 + liked 여부
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const ip = getIp(request);
  const admin = createAdminClient();

  const [{ count }, { data: myLike }] = await Promise.all([
    admin
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", "post")
      .eq("target_id", id),
    admin
      .from("likes")
      .select("id")
      .eq("target_type", "post")
      .eq("target_id", id)
      .eq("ip", ip)
      .maybeSingle(),
  ]);

  return NextResponse.json({ count: count ?? 0, liked: !!myLike });
}

// POST /api/posts/[id]/like — 토글 (좋아요 / 취소)
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const ip = getIp(request);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("likes")
    .select("id")
    .eq("target_type", "post")
    .eq("target_id", id)
    .eq("ip", ip)
    .maybeSingle();

  if (existing) {
    await admin.from("likes").delete().eq("id", existing.id);
  } else {
    await admin.from("likes").insert({ target_type: "post", target_id: id, ip });
  }

  const { count } = await admin
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("target_type", "post")
    .eq("target_id", id);

  const newCount = count ?? 0;
  await admin.from("posts").update({ like_count: newCount }).eq("id", id);

  return NextResponse.json({ count: newCount, liked: !existing });
}
