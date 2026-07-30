import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSecret } from "@/lib/getSecret";

const UNSPLASH_API = "https://api.unsplash.com";

export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const accessKey = await getSecret("UNSPLASH_ACCESS_KEY");
  if (!accessKey) {
    return jsonError("Unsplash API key not configured", 503);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get(QUERY_PARAM.q);
  const page = searchParams.get(QUERY_PARAM.page) || "1";

  if (!q) return jsonError("Query required", 400);

  const res = await fetch(
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=12&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }
  );

  if (!res.ok) {
    // upstream status passthrough — jsonError 의 typed 범위를 넘어갈 수 있으니 NextResponse 사용
    return NextResponse.json({ error: "Unsplash API error" }, { status: res.status });
  }

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
