import { createHmac, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { logService } from "@/lib/serviceLog";
import { getIp } from "@/utils/getIp";
import {
  COMMENT_IMAGE_BUCKET,
  COMMENT_IMAGE_MAX_SIDE,
  COMMENT_IMAGE_PREFIX,
  commentImageDeleteAfter,
  commentImagePathsIn,
} from "@/lib/commentImages";

/* 댓글 이미지의 서버 쪽 — 다시 저장 · 하루 개수 · 뒷정리. 값과 순수 함수는 lib/commentImages */

/** 한 장이 품을 수 있는 화소 상한 — 작은 파일이 거대한 그림으로 풀리는 압축 폭탄을 막는다(sharp 기본은 2억 6천만) */
const MAX_INPUT_PIXELS = 40_000_000;
/** 뒷정리 사이 간격 — 업로드가 하루 한 번만 정리를 겸한다 */
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SWEEP_ROW = "comment_image_sweep";
/** 댓글 이미지를 본문에 쓸 수 있는 표 */
const COMMENT_TABLES = ["comments", "work_comments"] as const;

/**
 * 하루 개수를 세는 방문자 키 — 저장 경로(공개 주소)에 들어가므로 원문 IP 가 아니라 HMAC 이고, 날짜를 섞어
 * 날마다 바뀐다(같은 방문자의 이미지를 날짜를 넘어 이어 볼 수 없게). 비밀값은 lib/demo/ip 와 같은 자리를 빌린다.
 */
export function commentImageIpHash(request: Request, day: string): string {
  const secret = process.env.DEMO_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHmac("sha256", secret).update(`comment-image:${day}:${getIp(request)}`).digest("hex").slice(0, 16);
}

/** 그 방문자가 오늘 올린 이미지 수 */
export async function countCommentImages(folder: string): Promise<number> {
  const { data, error } = await createAdminClient().storage.from(COMMENT_IMAGE_BUCKET).list(folder, { limit: 1000 });
  if (error) throw error;
  return (data ?? []).filter((f) => f.id).length;
}

/**
 * 받은 이미지를 webp 로 다시 저장한다 — 사진의 위치 · 기기 같은 EXIF 를 버리고(sharp 는 메타데이터를 옮기지 않는다),
 * 긴 변을 줄이고, 그림이 아닌 파일은 여기서 걸러진다(읽지 못하면 null). 움직이는 GIF · webp 는 움직임을 지킨다.
 */
export async function reencodeCommentImage(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    const animated = (meta.pages ?? 1) > 1;
    let img = sharp(input, { animated, limitInputPixels: MAX_INPUT_PIXELS });
    /* 사진의 회전 정보(EXIF orientation)는 메타데이터와 함께 버려지므로 먼저 화소에 적용한다 */
    if (!animated) img = img.rotate();
    const { data, info } = await img
      .resize({ width: COMMENT_IMAGE_MAX_SIDE, height: COMMENT_IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: animated ? (info.pageHeight ?? info.height) : info.height };
  } catch {
    return null;
  }
}

/** 다시 저장한 이미지를 그 방문자의 오늘 폴더에 올리고 공개 주소를 돌려준다 */
export async function storeCommentImage(folder: string, buffer: Buffer): Promise<string> {
  const storage = createAdminClient().storage.from(COMMENT_IMAGE_BUCKET);
  const path = `${folder}/${randomUUID()}.webp`;
  const { error } = await storage.upload(path, buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

/** 댓글 이미지 파일 하나 — 라이브러리 화면이 쓰는 꼴 */
export interface CommentImageFile { path: string; name: string; size: number; createdAt: string | null; url: string }

/** 댓글 이미지 전부 — comments/<날짜>/<IP 해시>/<파일>. 폴더는 단계마다 한꺼번에 연다 */
export async function listCommentImages(): Promise<CommentImageFile[]> {
  const storage = createAdminClient().storage.from(COMMENT_IMAGE_BUCKET);
  const list = async (folder: string) => {
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error) throw error;
    return data ?? [];
  };
  const days = (await list(COMMENT_IMAGE_PREFIX)).filter((e) => e.id === null && /^\d{4}-\d{2}-\d{2}$/.test(e.name));
  const folders = (await Promise.all(days.map(async (d) =>
    (await list(`${COMMENT_IMAGE_PREFIX}/${d.name}`)).filter((e) => e.id === null).map((h) => `${COMMENT_IMAGE_PREFIX}/${d.name}/${h.name}`),
  ))).flat();
  const files = await Promise.all(folders.map(async (folder) =>
    (await list(folder)).filter((e) => e.id !== null).map((e) => {
      const path = `${folder}/${e.name}`;
      const meta = (e.metadata ?? {}) as { size?: number };
      return { path, name: e.name, size: typeof meta.size === "number" ? meta.size : 0, createdAt: e.created_at ?? null, url: storage.getPublicUrl(path).data.publicUrl };
    }),
  ));
  return files.flat();
}

/** 댓글 이미지를 쓰는 댓글 본문(게시물 · 작업물) — 지우기 전 확인과 라이브러리의 쓰는 곳이 함께 쓴다 */
export async function commentContentsUsingImages(): Promise<string[]> {
  const admin = createAdminClient();
  const results = await Promise.all(
    COMMENT_TABLES.map((table) => admin.from(table).select("content").ilike("content", `%/${COMMENT_IMAGE_BUCKET}/${COMMENT_IMAGE_PREFIX}/%`)),
  );
  return results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []).map((row) => String((row as { content: unknown }).content ?? ""));
  });
}

/** 정리할 수 있는 이미지 — 쓰이지 않고 지울 때(commentImageDeleteAfter)가 지난 것 */
export function dueCommentImages<T extends { path: string }>(files: T[], used: Set<string>, now: Date): T[] {
  return files.filter((f) => {
    const after = commentImageDeleteAfter(f.path);
    return !used.has(f.path) && after !== null && after.getTime() <= now.getTime();
  });
}

/**
 * 올리고 댓글에 쓰지 않은 이미지를 지운다 — 업로드가 응답을 보낸 뒤 하루에 한 번 겸하고, 라이브러리의
 * "지금 정리"는 force 로 간격을 건너뛴다. 지울 때가 지난 이미지만 본다(commentImageDeleteAfter — 올린 지
 * 하루가 안 된 이미지는 아직 댓글을 쓰는 중일 수 있다). Storage 파일은 SQL 로 지울 수 없어 pg_cron 이 아니라 여기서 한다.
 * 지운 개수를 돌려준다(간격 안이라 건너뛰었으면 null).
 */
export async function sweepCommentImages(now = new Date(), { force = false } = {}): Promise<number | null> {
  const admin = createAdminClient();
  if (!force) {
    const { data: row } = await admin.from("site_settings").select("config").eq("id", SWEEP_ROW).maybeSingle();
    const last = Date.parse(String((row?.config as { at?: string } | null)?.at ?? ""));
    if (Number.isFinite(last) && now.getTime() - last < SWEEP_INTERVAL_MS) return null;
  }
  /* 먼저 시각을 적어 둔다 — 동시에 들어온 업로드가 같은 정리를 겹쳐 하지 않게 */
  await admin.from("site_settings").upsert({ id: SWEEP_ROW, config: { at: now.toISOString() }, updated_at: now.toISOString() });

  try {
    const files = await listCommentImages();
    if (files.length === 0) return 0;
    const due = dueCommentImages(files, commentImagePathsIn(await commentContentsUsingImages()), now).map((f) => f.path);
    for (let i = 0; i < due.length; i += 100) {
      const { error } = await admin.storage.from(COMMENT_IMAGE_BUCKET).remove(due.slice(i, i + 100));
      if (error) throw error;
    }
    await logService({ category: "cron", provider: "comment-images", ok: true, units: due.length });
    return due.length;
  } catch (err) {
    await logService({ category: "cron", provider: "comment-images", ok: false, kind: "unknown", message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
