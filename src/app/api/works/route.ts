import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkFormData } from "@/types/work";

// GET /api/works — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true"; // admin용

  const supabase = createAdminClient();

  let query = supabase.from("works").select("*", { count: "exact" });

  if (!showAll) {
    query = query.eq("published", true);
  }

  query = query.order("sort_order", { ascending: true });

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ works: data, total: count ?? 0 });
}

// POST /api/works — 새 work 생성 (admin only)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: WorkFormData = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("works")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
