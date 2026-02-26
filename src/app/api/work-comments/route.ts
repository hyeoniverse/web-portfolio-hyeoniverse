import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { getIdentity } from "@/utils/commenterIdentity";
import { notifyAdmin } from "@/lib/adminNotify";
import { isValidUUID, sanitizeContent, validatePassword } from "@/utils/commentValidation";

const SELECT_FIELDS =
  "id, work_id, parent_id, nickname, commenter_hash, content, is_admin, like_count, created_at, updated_at";
const SELECT_FIELDS_SAFE =
  "id, work_id, parent_id, nickname, commenter_hash, content, is_admin, created_at, updated_at";

// GET /api/work-comments?work_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workId = searchParams.get("work_id");

  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  let { data, error } = await admin
    .from("work_comments")
    .select(SELECT_FIELDS)
    .eq("work_id", workId)
    .order("created_at", { ascending: true });

  if (error?.message?.includes("like_count")) {
    ({ data, error } = await admin
      .from("work_comments")
      .select(SELECT_FIELDS_SAFE)
      .eq("work_id", workId)
      .order("created_at", { ascending: true }));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/work-comments
export async function POST(request: Request) {
  const body = await request.json();
  const { work_id, parent_id, commenter_id, password, content } = body;

  if (!work_id || !commenter_id || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidUUID(work_id)) {
    return NextResponse.json({ error: "Invalid work_id" }, { status: 400 });
  }
  if (parent_id && !isValidUUID(parent_id)) {
    return NextResponse.json({ error: "Invalid parent_id" }, { status: 400 });
  }

  const contentResult = sanitizeContent(content);
  if (!contentResult.valid) {
    return NextResponse.json({ error: contentResult.error }, { status: 400 });
  }
  const pwResult = validatePassword(password);
  if (!pwResult.valid) {
    return NextResponse.json({ error: pwResult.error }, { status: 400 });
  }

  const identity = getIdentity(commenter_id, work_id);
  const passwordHash = pwResult.value ? await bcrypt.hash(pwResult.value, 10) : "";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("work_comments")
    .insert({
      work_id,
      parent_id: parent_id || null,
      nickname: `${identity.emoji} ${identity.name}`,
      commenter_hash: identity.hash,
      password_hash: passwordHash,
      content: contentResult.value,
      is_admin: false,
    })
    .select(SELECT_FIELDS_SAFE)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  notifyAdmin({
    type: parent_id ? "reply" : "comment",
    title: parent_id ? "New reply on work" : "New comment on work",
    message: `${identity.emoji} ${identity.name}: ${contentResult.value.slice(0, 200)}`,
    metadata: { work_id, comment_id: data.id, url: `/works/${work_id}` },
  });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/work-comments — 댓글 수정
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, commenter_id, target_id, content, password } = body;

  if (!id || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const patchContent = sanitizeContent(content);
  if (!patchContent.valid) {
    return NextResponse.json({ error: patchContent.error }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: comment } = await admin
    .from("work_comments")
    .select("commenter_hash, password_hash")
    .eq("id", id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // commenter_id 기반 인증
  let authorized = false;
  if (commenter_id && target_id && comment.commenter_hash) {
    const identity = getIdentity(commenter_id, target_id);
    authorized = comment.commenter_hash === identity.hash;
  }

  // password fallback
  if (!authorized && password && comment.password_hash) {
    authorized = await bcrypt.compare(password, comment.password_hash);
  }

  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("work_comments")
    .update({ content: patchContent.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT_FIELDS_SAFE)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
