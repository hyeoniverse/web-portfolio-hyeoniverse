import { requireOwner } from "@/lib/api/requireRole";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { findMediaUsage, type MediaSource } from "@/lib/mediaUsage";

/* 라이브러리 › 업로드한 파일 — 두 저장소의 파일과 쓰는 곳.
   posts: 글·프로젝트 본문 이미지·커버·낭독 음성 (posts/ 아래)
   uploads: 사이트 설정 자산 — 로고·아이콘·이모지·배경음·폰트·이력서 (폴더별) */
const BUCKETS = ["posts", "uploads"] as const;
type Bucket = (typeof BUCKETS)[number];
const PAGE = 1000;

type Admin = ReturnType<typeof createAdminClient>;

interface FileRow { bucket: Bucket; path: string; name: string; size: number; mime: string; createdAt: string | null; url: string }

/** 폴더를 한 단계씩 내려가며 파일을 모은다(깊이 2까지 — 지금 쓰는 경로는 모두 폴더/파일 한 단계다) */
async function listBucket(admin: Admin, bucket: Bucket, prefix = "", depth = 0): Promise<FileRow[]> {
  const out: FileRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    for (const e of data ?? []) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) {
        if (depth < 2) out.push(...(await listBucket(admin, bucket, path, depth + 1)));
        continue;
      }
      if (e.name === ".emptyFolderPlaceholder") continue;
      const meta = (e.metadata ?? {}) as { size?: number; mimetype?: string };
      out.push({
        bucket, path, name: e.name,
        size: typeof meta.size === "number" ? meta.size : 0,
        mime: meta.mimetype ?? "",
        createdAt: e.created_at ?? null,
        url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** 파일 주소가 나올 수 있는 곳을 글자로 모은다 — 휴지통 글도 넣는다(복구하면 다시 쓰므로 지우면 안 된다) */
async function usageSources(admin: Admin): Promise<MediaSource[]> {
  const [posts, works, series, settings, emojis, covers] = await Promise.all([
    admin.from("posts").select("*"),
    admin.from("works").select("*"),
    admin.from("series").select("id, title, cover_image"),
    admin.from("site_settings").select("*"),
    admin.from("custom_emojis").select("src"),
    admin.from("cover_image_history").select("url"),
  ]);
  for (const r of [posts, works, series, settings, emojis, covers]) if (r.error) throw r.error;
  type Row = Record<string, unknown>;
  const rows = (r: { data: unknown }) => (r.data ?? []) as Row[];
  return [
    ...rows(posts).map((r) => ({ kind: "post" as const, id: String(r.id), title: String(r.title ?? ""), text: JSON.stringify(r) })),
    ...rows(works).map((r) => ({ kind: "work" as const, id: String(r.id), title: String(r.title ?? ""), text: JSON.stringify(r) })),
    ...rows(series).map((r) => ({ kind: "series" as const, id: String(r.id), title: String(r.title ?? ""), text: JSON.stringify(r) })),
    { kind: "settings" as const, text: JSON.stringify(rows(settings)) },
    { kind: "emoji" as const, text: JSON.stringify(rows(emojis)) },
    { kind: "coverHistory" as const, text: JSON.stringify(rows(covers)) },
  ];
}

// GET /api/admin/media — 파일 목록 + 쓰는 곳 (소유자 전용)
export async function GET() {
  const { error: authError } = await requireOwner();
  if (authError) return authError;
  try {
    const admin = createAdminClient();
    const [files, sources] = await Promise.all([
      Promise.all(BUCKETS.map((b) => listBucket(admin, b))).then((x) => x.flat()),
      usageSources(admin),
    ]);
    const usage = findMediaUsage(files.map((f) => f.path), sources);
    const items = files
      .map((f) => ({ ...f, usage: usage.get(f.path) ?? [] }))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return jsonOk({ items });
  } catch (e) {
    return jsonServerError(e, "GET /api/admin/media");
  }
}

// DELETE /api/admin/media — { bucket, path }. 어디서도 쓰지 않는 파일만 지운다(서버에서 다시 확인)
export async function DELETE(request: Request) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;
  let body: { bucket?: unknown; path?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid JSON", 400); }
  const bucket = BUCKETS.find((b) => b === body.bucket);
  const path = typeof body.path === "string" ? body.path : "";
  if (!bucket || !path || path.includes("..")) return jsonError("Invalid file", 400);
  try {
    const admin = createAdminClient();
    const refs = findMediaUsage([path], await usageSources(admin)).get(path) ?? [];
    if (refs.length) return jsonError("File is in use", 409, { code: "MEDIA_IN_USE", params: { n: refs.length } });
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonServerError(e, "DELETE /api/admin/media");
  }
}
