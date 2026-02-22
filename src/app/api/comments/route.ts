import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

// GET /api/comments?post_id=xxx — 포스트의 댓글 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");

  if (!postId) {
    return NextResponse.json(
      { error: "post_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("comments")
    .select("id, post_id, parent_id, nickname, content, is_admin, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/comments — 댓글 작성
export async function POST(request: Request) {
  const body = await request.json();
  const { post_id, parent_id, nickname, password, content } = body;

  if (!post_id || !nickname || !password || !content) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("comments")
    .insert({
      post_id,
      parent_id: parent_id || null,
      nickname,
      password_hash: passwordHash,
      content,
      is_admin: false,
    })
    .select("id, post_id, parent_id, nickname, content, is_admin, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
