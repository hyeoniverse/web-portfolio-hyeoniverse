/**
 * @ffmpeg/ffmpeg 의 ESM 파일 → public/vendor/ffmpeg 복사(dev · build 앞에서 돈다).
 *
 * 왜 복사하나
 *   Next 16.4 의 Turbopack 은 이 패키지의 `new Worker(new URL(classWorkerURL, import.meta.url))`(주소가 변수)를
 *   해석하지 못해 빌드 오류를 낸다(#1503). 그래서 번들에 넣지 않고 같은 출처의 정적 파일로 두고,
 *   lib/videoCompress 가 번들러가 건드리지 않는 동적 import 로 불러온다. 워커도 같은 폴더의 worker.js 를 쓴다
 *   (다른 출처면 브라우저가 module 워커를 막는다).
 *   판은 package-lock 이 정한 설치본 그대로 — 패키지를 올리면 다음 dev · build 가 새 파일로 바꾼다.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const from = join("node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const to = join("public", "vendor", "ffmpeg");

if (!existsSync(from)) {
  console.warn("[copy-ffmpeg] @ffmpeg/ffmpeg 가 설치돼 있지 않아 건너뜁니다");
  process.exit(0);
}
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
const files = readdirSync(from).filter((f) => f.endsWith(".js"));
for (const f of files) cpSync(join(from, f), join(to, f));
console.log(`[copy-ffmpeg] ${files.length} files → ${to}`);
