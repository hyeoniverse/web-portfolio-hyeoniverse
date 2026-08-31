import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join, relative, sep } from "path";
import { requireAuth } from "@/lib/api/requireAuth";

/**
 * GET /api/admin/project-images — repo 안에 커밋돼 있는 이미지 목록
 *
 * 지금까지 이미지 선택기의 탭은 프리셋 · Unsplash · Pexels · AI · 기록뿐이라,
 * **이 저장소에 이미 들어 있는 이미지를 고를 길이 없었다.** 스크린샷 100여 장이
 * `public/images/screenshots/` 에 있는데 About 편집기에서 쓰려면 경로를 손으로 적어야 했다.
 *
 * `/api/admin/cover` 와 나누는 이유
 *   저쪽은 `public/cover/` 한 겹만 훑는다. 커버용으로 따로 올려 두는 자리라 성격이 다르고,
 *   여기는 git 에 커밋된 프로젝트 자산이다. 한 응답에 섞으면 어느 게 어느 쪽인지 사라진다.
 *
 * 빌드 때 매니페스트를 만드는 방법도 있었지만, 목록이 필요한 곳이 관리자 화면 하나뿐이고
 * 파일이 100여 개라 그 자리에서 훑는 편이 단순하다. 생성 파일을 커밋해 두고 이미지가
 * 바뀔 때마다 같이 갱신하는 손도 없다.
 *
 * response: { groups: Array<{ dir: string; files: Array<{ url, name, sizeBytes }> }> }
 */

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"]);

/* 훑는 자리. content/ 는 빌드가 public/content/ 로 복사해 둔 것이라
   md 옆에 둔 이미지도 여기서 같이 고를 수 있다. */
const ROOTS = ["images", "content"];

/** 목록이 끝없이 길어지지 않게 — 넘으면 잘라내고 알린다(조용히 자르지 않는다). */
const MAX_FILES = 500;

interface ProjectImage {
  url: string;
  name: string;
  sizeBytes: number;
}

async function walk(absDir: string, publicRoot: string, out: ProjectImage[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    /* 점으로 시작하는 것은 .DS_Store 처럼 자산이 아니다. */
    if (entry.name.startsWith(".")) continue;
    const full = join(absDir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, publicRoot, out);
      continue;
    }
    const ext = entry.name.split(".").pop()?.toLowerCase();
    if (!ext || !IMAGE_EXTS.has(ext)) continue;
    try {
      const s = await stat(full);
      if (!s.isFile()) continue;
      out.push({
        url: `/${relative(publicRoot, full).split(sep).join("/")}`,
        name: entry.name,
        sizeBytes: s.size,
      });
    } catch {
      /* 개별 파일 skip */
    }
  }
}

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const publicRoot = join(process.cwd(), "public");
  const files: ProjectImage[] = [];
  try {
    for (const root of ROOTS) await walk(join(publicRoot, root), publicRoot, files);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  /* 폴더로 묶는다 — 100장이 한 덩어리로 쏟아지면 고를 수가 없다. */
  const byDir = new Map<string, ProjectImage[]>();
  for (const file of files) {
    const dir = file.url.slice(1, file.url.lastIndexOf("/"));
    const bucket = byDir.get(dir);
    if (bucket) bucket.push(file);
    else byDir.set(dir, [file]);
  }

  const groups = [...byDir.entries()]
    .map(([dir, list]) => ({ dir, files: list.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.dir.localeCompare(b.dir));

  return NextResponse.json({ groups, truncated: files.length >= MAX_FILES });
}
