import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

/* 조각을 받아 오고 이어 붙이는 데 드는 시간 — 조각 음성은 이미 만들어져 있어 몇 초면 끝난다 */
export const maxDuration = 60;

/** 한 번에 이어 붙일 조각 수 상한 — 600자 조각이면 1만 8천 자쯤이다 */
const MAX_PARTS = 30;
/* 이 경로가 만든 음성 파일만 받는다 — 다른 파일을 지우거나 이어 붙이지 못하게 */
const PART_PATH = /^posts\/narration-[0-9a-f-]+\.mp3$/;


/**
 * POST /api/works/tts/merge — 긴 대본을 조각마다 만든 음성(/api/works/tts)을 한 파일로 잇는다.
 *
 * 편집 화면이 대본을 문장 경계에서 조각으로 나눠(chunkScript) 차례로 만든 뒤 조각 주소들을 보낸다.
 * 이어 붙인 파일을 올리고 조각 파일은 지운다. discard 면 잇지 않고 조각만 지운다(중간에 실패했을 때).
 * 한 번의 긴 요청 대신 조각으로 나누는 것은 TTS 가 길면 느리고 잘 실패해서다(ttsChunks 참고).
 * 한 장의 조각은 같은 제공자로 만들어 형식이 같은 MP3 라, 프레임을 그대로 이어 붙이면 하나의 MP3 가 된다.
 * 조각은 문장 끝에서 끊기고 목소리가 문장 끝에 쉼을 두므로 따로 무음을 끼우지 않는다.
 */
export async function POST(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const urls: unknown[] = Array.isArray(body?.urls) ? body.urls : [];
  const marker = "/object/public/posts/";
  const paths = urls.map((u) => (typeof u === "string" && u.includes(marker) ? u.slice(u.indexOf(marker) + marker.length).split("?")[0] : ""));
  if (paths.length === 0 || paths.length > MAX_PARTS || paths.some((p) => !PART_PATH.test(p))) {
    return jsonError("Invalid narration parts", 400);
  }

  const bucket = createAdminClient().storage.from("posts");
  if (body?.discard === true) {
    await bucket.remove(paths);
    return NextResponse.json({ ok: true });
  }

  const parts: Uint8Array[] = [];
  for (const path of paths) {
    const { data, error } = await bucket.download(path);
    if (error || !data) return jsonServerError(error ?? new Error("download failed"), "POST /api/works/tts/merge");
    parts.push(new Uint8Array(await data.arrayBuffer()));
  }
  const merged = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    merged.set(part, at);
    at += part.length;
  }

  const filePath = `posts/narration-${crypto.randomUUID()}.mp3`;
  const { error } = await bucket.upload(filePath, merged, { contentType: "audio/mpeg", upsert: false });
  if (error) return jsonServerError(error, "POST /api/works/tts/merge");
  await bucket.remove(paths);
  const { data: { publicUrl } } = bucket.getPublicUrl(filePath);
  return NextResponse.json({ url: publicUrl });
}
