import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";
import { trackedFetch } from "@/lib/ai/health";

const UNSPLASH_API = "https://api.unsplash.com";

export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) {
    return jsonError("Unsplash API key not configured", 503, { code: "UNSPLASH_KEY_MISSING" });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get(QUERY_PARAM.q);
  const page = searchParams.get(QUERY_PARAM.page) || "1";

  if (!q) return jsonError("Query required", 400);

  /* 여러 번 이어 실패해 꺼 둔 뒤면 부르지 않는다. 결과는 설정 › 서비스의 AI·외부 서비스 상태에 남는다(lib/ai/health) */
  const call = await trackedFetch("unsplash",
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=12&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }
  );
  if (call.disabled) return jsonError("unsplash is turned off after repeated failures", 503, { code: "AI_PROVIDERS_DISABLED" });
  if (call.error) {
    // upstream status passthrough — jsonError 의 typed 범위를 넘어갈 수 있으니 NextResponse 사용
    return NextResponse.json({ error: "Unsplash API error", code: "COVER_SEARCH_FAILED", failures: [{ provider: "unsplash", kind: call.error.kind }] }, { status: call.error.status ?? 502 });
  }
  const res = call.res;

  const data = await res.json();

  return jsonOk({
    results: data.results.map(
      (photo: {
        id: string;
        urls: { small: string; regular: string };
        user: { name: string; links: { html: string } };
        links: { download_location: string };
      }) => ({
        id: photo.id,
        urls: { small: photo.urls.small, regular: photo.urls.regular },
        user: { name: photo.user.name, links: { html: photo.user.links.html } },
        links: { download_location: photo.links.download_location },
      })
    ),
    total_pages: data.total_pages,
  });
}
