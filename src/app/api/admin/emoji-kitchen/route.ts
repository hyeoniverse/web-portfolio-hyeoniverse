import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { isKitchenCode, isKitchenDate, kitchenImageUrl } from "@/lib/emojiKitchen";

/* POST /api/admin/emoji-kitchen — { left, right, date, name }
   Emoji Kitchen 조합 그림을 커스텀 이모지로 들인다. gstatic 그림을 그대로 쓰면 Google 이 주소를 바꾸거나
   지울 때 글 속 이모지가 깨지므로, 받아서 우리 저장소(uploads/emojis)에 128px WebP 로 올린 뒤 기록한다.
   주소는 검사한 코드포인트·날짜로만 서버에서 만든다 — 받은 주소를 그대로 열지 않는다(SSRF 방지). */
const SIZE = 128;
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  let body: { left?: unknown; right?: unknown; date?: unknown; name?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid JSON", 400); }
  const { left, right, date } = body;
  if (!isKitchenCode(left) || !isKitchenCode(right) || !isKitchenDate(date)) return jsonError("Invalid combination", 400);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

  try {
    const res = await fetch(kitchenImageUrl(date, left, right), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return jsonError("Combination image not found", 404);
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return jsonError("Not an image", 502);
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > MAX_BYTES) return jsonError("Image too large", 502);
    const webp = await sharp(input).resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();

    const admin = createAdminClient();
    const path = `emojis/kitchen-${left}_${right}.webp`;
    const { error: upErr } = await admin.storage.from("uploads").upload(path, webp, { contentType: "image/webp", upsert: true });
    if (upErr) throw upErr;
    const src = admin.storage.from("uploads").getPublicUrl(path).data.publicUrl;

    const { data, error } = await supabase
      .from("custom_emojis")
      .insert({ name, src })
      .select("id, name, src, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return jsonServerError(e, "POST /api/admin/emoji-kitchen");
  }
}
