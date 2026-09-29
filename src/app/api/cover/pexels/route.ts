import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { trackedFetch } from "@/lib/ai/health";

const PEXELS_API = "https://api.pexels.com/v1";

interface PexelsPhoto {
  id: number;
  src: { medium: string; large: string; large2x: string };
  photographer: string;
  photographer_url: string;
  url: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
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
    return NextResponse.json({ error: "Pexels API error", code: "COVER_SEARCH_FAILED", failures: [{ provider: "pexels", kind: call.error.kind }] }, { status: call.error.status ?? 502 });
  }
  const res = call.res;

  const data = (await res.json()) as PexelsResponse;
  const totalPages = Math.max(1, Math.ceil(data.total_results / data.per_page));

  return jsonOk({
    results: data.photos.map((p) => ({
      id: String(p.id),
      urls: { small: p.src.medium, regular: p.src.large2x || p.src.large },
      user: { name: p.photographer, links: { html: p.photographer_url } },
      links: { html: p.url },
    })),
    total_pages: totalPages,
  });
}
