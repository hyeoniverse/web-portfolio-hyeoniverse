import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UNSPLASH_API = "https://api.unsplash.com";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Unsplash API key not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const res = await fetch(
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=12&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Unsplash API error" },
      { status: res.status }
    );
  }

  const data = await res.json();

  return NextResponse.json({
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
