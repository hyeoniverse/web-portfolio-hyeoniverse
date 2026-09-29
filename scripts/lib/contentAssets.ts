/**
 * content/ 의 로컬 이미지·영상·문서를 Supabase 저장소에 올리고, 글에 적힌 주소를 저장소 주소로 바꾼다.
 *
 * 왜: md 에 적힌 `/content/works/…` 는 빌드 때 public/content 로 복사해야 열리는 주소다(sync-content-assets).
 * content/ 가 git 에 없거나 아직 배포되지 않았으면 dev 에서 동기화한 글이 배포 환경에서 이미지가 깨진다.
 * DB 에 쓰기 전에 파일을 저장소로 올려 두면 git·배포와 상관없이 열린다.
 *
 * - 저장 이름에 파일 내용의 해시를 붙인다 — 같은 파일은 다시 올리지 않고(이미 있으면 그대로 쓴다),
 *   파일을 고치면 새 주소가 되어 CDN 캐시에 옛 그림이 남지 않는다.
 * - 로컬에 없는 경로는 건드리지 않고 경고만 남긴다.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "posts";
const PREFIX = "content-assets";
const ASSET_RE = /\/content\/[A-Za-z0-9_\-./%]+?\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|mov|pdf)(?![A-Za-z0-9])/gi;

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

/** 한 번 실행하는 동안 올린 파일 — 여러 글이 같은 그림을 쓰면 한 번만 올린다 */
const uploaded = new Map<string, string>();

export interface AssetResult<T> {
  value: T;
  /** 바꾼 서로 다른 로컬 경로 수 */
  replaced: number;
  /** 로컬에 없어 그대로 둔 경로 */
  missing: string[];
}

/** 값 안의 모든 문자열에서 /content/… 로컬 주소를 찾는다 */
export function findContentAssets(value: unknown): string[] {
  return [...new Set(JSON.stringify(value).match(ASSET_RE) ?? [])];
}

export async function uploadContentAssets<T>(supabase: SupabaseClient, value: T, { dry = false } = {}): Promise<AssetResult<T>> {
  const found = findContentAssets(value);
  if (found.length === 0) return { value, replaced: 0, missing: [] };

  let json = JSON.stringify(value);
  const missing: string[] = [];
  let replaced = 0;

  for (const urlPath of found) {
    const local = path.join(process.cwd(), decodeURIComponent(urlPath.slice(1)));
    if (!fs.existsSync(local)) {
      missing.push(urlPath);
      continue;
    }
    let publicUrl = uploaded.get(local);
    if (!publicUrl) {
      const buf = fs.readFileSync(local);
      const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
      const ext = path.extname(local).toLowerCase();
      const rel = path.relative(path.join(process.cwd(), "content"), local);
      const key = `${PREFIX}/${path.dirname(rel)}/${path.basename(rel, ext)}-${hash}${ext}`.replace(/\\/g, "/");
      if (!dry) {
        const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
          contentType: MIME[ext] ?? "application/octet-stream",
          cacheControl: "31536000",
          upsert: false,
        });
        /* 같은 해시면 같은 파일 — 이미 있으면 그대로 쓴다 */
        if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`${urlPath} 업로드 실패: ${error.message}`);
      }
      publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      uploaded.set(local, publicUrl);
    }
    json = json.split(urlPath).join(publicUrl);
    replaced += 1;
  }

  return { value: JSON.parse(json) as T, replaced, missing };
}
