import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { trackedFetch } from "@/lib/ai/health";

const PEXELS_API = "https://api.pexels.com/videos";

interface PexelsVideoFile {
  id: number;
  link: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  quality: "hd" | "sd" | "uhd" | "hls" | string;
}

interface PexelsVideo {
  id: number;
  image: string;
  duration: number;
  user: { id: number; name: string; url: string };
  url: string;
  video_files: PexelsVideoFile[];
}

interface PexelsVideosResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

/** 가장 적합한 video file 선택 — mp4 + hd 또는 sd 선호 (intro 영상 용도) */
function pickBestVideoFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const mp4Files = files.filter((f) => f.file_type === "video/mp4");
  const pool = mp4Files.length > 0 ? mp4Files : files;
  // HD 우선, 다음 SD, 다음 UHD (너무 큼)
  const order = ["hd", "sd", "uhd"];
  for (const q of order) {
    const found = pool.find((f) => f.quality === q);
    if (found) return found;
  }
  return pool[0] ?? null;
}

export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const apiKey = await getSecret("PEXELS_API_KEY");
  if (!apiKey) {
    return jsonError("Pexels API key not configured", 503, { code: "PEXELS_KEY_MISSING" });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get(QUERY_PARAM.q);
  const page = searchParams.get(QUERY_PARAM.page) || "1";

  if (!q) return jsonError("Query required", 400);

  /* 여러 번 이어 실패해 꺼 둔 뒤면 부르지 않는다. 결과는 설정 › 서비스의 AI·외부 서비스 상태에 남는다(lib/ai/health) */
  const call = await trackedFetch("pexels",
    `${PEXELS_API}/search?query=${encodeURIComponent(q)}&page=${page}&per_page=12&orientation=landscape`,
    {
      headers: { Authorization: apiKey },
    },
  );
  if (call.disabled) return jsonError("pexels is turned off after repeated failures", 503, { code: "AI_PROVIDERS_DISABLED" });
  if (call.error) {
    // upstream status passthrough — jsonError 의 typed 범위를 넘어갈 수 있으니 NextResponse 사용
    return NextResponse.json({ error: "Pexels videos API error", code: "COVER_SEARCH_FAILED", failures: [{ provider: "pexels", kind: call.error.kind }] }, { status: call.error.status ?? 502 });
  }
  const res = call.res;

  const data = (await res.json()) as PexelsVideosResponse;
  const totalPages = Math.max(1, Math.ceil(data.total_results / data.per_page));

  return jsonOk({
    results: data.videos
      .map((v) => {
        const best = pickBestVideoFile(v.video_files);
        if (!best) return null;
        return {
          id: String(v.id),
          videoUrl: best.link,
          thumbUrl: v.image,
          duration: v.duration,
          width: best.width,
          height: best.height,
          user: { name: v.user.name, links: { html: v.user.url } },
          links: { html: v.url },
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null),
    total_pages: totalPages,
  });
}
