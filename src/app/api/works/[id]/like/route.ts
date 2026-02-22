import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// GET /api/works/[id]/like — 좋아요 수 + liked 여부
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ip = getIp(request);
  const admin = createAdminClient();

  const [{ count }, { data: myLike }] = await Promise.all([
    admin
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", "work")
      .eq("target_id", id),
    admin
      .from("likes")
      .select("id")
      .eq("target_type", "work")
      .eq("target_id", id)
      .eq("ip", ip)
      .maybeSingle(),
  ]);

  return NextResponse.json({ count: count ?? 0, liked: !!myLike });
}

// POST /api/works/[id]/like — 토글 (좋아요 / 취소)
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ip = getIp(request);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("likes")
    .select("id")
    .eq("target_type", "work")
    .eq("target_id", id)
    .eq("ip", ip)
    .maybeSingle();

  if (existing) {
    await admin.from("likes").delete().eq("id", existing.id);
  } else {
    await admin.from("likes").insert({ target_type: "work", target_id: id, ip });
  }

  const { count } = await admin
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("target_type", "work")
    .eq("target_id", id);

  return NextResponse.json({ count: count ?? 0, liked: !existing });
}
