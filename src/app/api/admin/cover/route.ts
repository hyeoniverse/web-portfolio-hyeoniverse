import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/api/requireAuth";

/** GET /api/admin/cover — public/cover/videos + public/cover/images 안 모든 미디어 파일 list.
 *  cover picker 전반 (works intro / posts cover / about visualBreak 등) 의 공용 풀.
 *  response: { files: Array<{ url: string; name: string; sizeBytes: number; kind: "video" | "image" }> } */
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"]);

interface CoverFile {
  url: string;
  name: string;
  sizeBytes: number;
  kind: "video" | "image";
}

async function scanDir(
  absDir: string,
  urlPrefix: string,
  validExts: Set<string>,
  kind: "video" | "image",
): Promise<CoverFile[]> {
  try {
    const entries = await readdir(absDir);
    const files: CoverFile[] = [];
    for (const name of entries) {
      const ext = name.split(".").pop()?.toLowerCase();
      if (!ext || !validExts.has(ext)) continue;
      try {
        const s = await stat(join(absDir, name));
        if (!s.isFile()) continue;
        files.push({ url: `${urlPrefix}/${name}`, name, sizeBytes: s.size, kind });
      } catch {
        /* 개별 파일 skip */
      }
    }
    return files;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const cwd = process.cwd();
  try {
    const [videos, images] = await Promise.all([
      scanDir(join(cwd, "public", "cover", "videos"), "/cover/videos", VIDEO_EXTS, "video"),
      scanDir(join(cwd, "public", "cover", "images"), "/cover/images", IMAGE_EXTS, "image"),
    ]);
    videos.sort((a, b) => a.name.localeCompare(b.name));
    images.sort((a, b) => a.name.localeCompare(b.name));
    // 비디오 먼저 (intro 영상이 주 용도), 이미지 뒤
    return NextResponse.json({ files: [...videos, ...images] });
  } catch (e) {
    return jsonServerError(e, "GET /api/admin/cover");
  }
}
