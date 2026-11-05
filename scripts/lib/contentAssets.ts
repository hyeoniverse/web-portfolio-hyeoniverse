/**
 * 글에 적힌 content/ 의 이미지·영상·문서 주소를 정리한다.
 *
 * md 에 적힌 `/content/works/…` 는 빌드 때 public/content 로 복사돼 Vercel 이 내보내는 주소다(sync-content-assets).
 * - git 에 올라간 파일은 그 주소를 그대로 쓴다. 예전엔 전부 Supabase 저장소로 올렸는데, 본문의 그림 · 영상은
 *   방문자가 저장소에서 바로 받아 가 무료 플랜의 Cached Egress(월 5GB)를 넘겨 프로젝트가 멈췄다(2026-11).
 *   git 에 막 올린 파일은 배포가 끝날 때까지 깨져 보이니, 동기화는 배포 뒤에 돌린다.
 * - git 에 없는 파일만 저장소에 올리고 저장소 주소로 바꾼다 — 배포물에 실리지 않아 다른 길이 없다.
 *   저장 이름에 파일 내용의 해시를 붙여 같은 파일은 다시 올리지 않고, 고친 파일은 새 주소가 된다.
 * - 예전에 올린 저장소 주소(localizeContentAssets)는 로컬에 같은 파일이 있으면 /content/… 로 되돌린다.
 * - 로컬에 없는 경로는 건드리지 않고 경고만 남긴다.
 */
import { execFileSync } from "node:child_process";
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

/** git 에 올라간 content/ 파일(저장소 기준 경로) — git 이 없으면 빈 집합이라 예전처럼 전부 저장소로 올린다 */
let trackedCache: Set<string> | null = null;
function trackedFiles(): Set<string> {
  if (!trackedCache) {
    try {
      trackedCache = new Set(execFileSync("git", ["ls-files", "-z", "content"], { encoding: "utf8" }).split("\0").filter(Boolean));
    } catch {
      trackedCache = new Set();
    }
  }
  return trackedCache;
}

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
    if (trackedFiles().has(path.relative(process.cwd(), local).replace(/\\/g, "/"))) continue;
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

/** 예전에 올린 저장소 주소(…/content-assets/works/a/b-<해시>.jpg) → /content/works/a/b.jpg.
 *  로컬에 같은 이름의 파일이 git 에 올라가 있을 때만 바꾼다. 해시가 달라도(파일을 그 뒤에 고쳤어도) 로컬 것이 최신이다 */
export function localizeContentAssets<T>(supabase: SupabaseClient, value: T): AssetResult<T> {
  const base = supabase.storage.from(BUCKET).getPublicUrl(PREFIX).data.publicUrl;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}/([A-Za-z0-9_\\-./%]+?)-[0-9a-f]{12}(\\.[A-Za-z0-9]+)(?![A-Za-z0-9])`, "g");
  let json = JSON.stringify(value);
  const found = [...new Set(json.match(re) ?? [])];
  const missing: string[] = [];
  let replaced = 0;
  for (const url of found) {
    const [, rest, ext] = url.match(new RegExp(re.source))!;
    const urlPath = `/content/${rest}${ext}`;
    if (!trackedFiles().has(decodeURIComponent(urlPath.slice(1)))) {
      missing.push(url);
      continue;
    }
    json = json.split(url).join(urlPath);
    replaced += 1;
  }
  return { value: replaced ? (JSON.parse(json) as T) : value, replaced, missing };
}
