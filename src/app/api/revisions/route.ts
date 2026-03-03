import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_REVISIONS = 50;

// GET /api/revisions?entity_type=post&entity_id=xxx&limit=50
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entity_type and entity_id required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("revisions")
    .select("id, entity_type, entity_id, title, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/revisions — 리비전 저장 + 오래된 항목 정리
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entity_type, entity_id, snapshot, title } = body;

  if (!entity_type || !entity_id || !snapshot) {
    return NextResponse.json(
      { error: "entity_type, entity_id, snapshot required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("revisions")
    .insert({ entity_type, entity_id, snapshot, title: title || "" })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 엔티티당 MAX_REVISIONS 초과분 정리
  const { data: overflow } = await admin
    .from("revisions")
    .select("id")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .range(MAX_REVISIONS, MAX_REVISIONS + 1000);

  if (overflow && overflow.length > 0) {
    await admin
      .from("revisions")
      .delete()
      .in(
        "id",
        overflow.map((r) => r.id),
      );
  }

  return NextResponse.json(data);
}
