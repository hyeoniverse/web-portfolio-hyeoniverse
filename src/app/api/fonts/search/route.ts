import { NextRequest, NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";

let fontCache: string[] = [];
let cacheTime = 0;
const TTL = 24 * 60 * 60 * 1000; // 24h

async function getFonts(): Promise<string[]> {
  if (fontCache.length > 0 && Date.now() - cacheTime < TTL) return fontCache;

  const res = await fetch("https://fonts.google.com/metadata/fonts");
  if (!res.ok) return fontCache;

  const text = await res.text();
  const jsonStr = text.startsWith(")]}'")
    ? text.substring(text.indexOf("\n") + 1)
    : text;
  const data = JSON.parse(jsonStr);
  fontCache = (data.familyMetadataList ?? []).map(
    (f: { family: string }) => f.family,
  );
  cacheTime = Date.now();
  return fontCache;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get(QUERY_PARAM.q)?.toLowerCase().trim();
  if (!q || q.length < 2) return NextResponse.json({ fonts: [] });

  const fonts = await getFonts();
  const matches = fonts
    .filter((f) => f.toLowerCase().includes(q))
    .sort((a, b) => {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      if ((al === q) !== (bl === q)) return al === q ? -1 : 1;
      if (al.startsWith(q) !== bl.startsWith(q)) return al.startsWith(q) ? -1 : 1;
      return a.length - b.length;
    })
    .slice(0, 8);

  return NextResponse.json({ fonts: matches });
}
