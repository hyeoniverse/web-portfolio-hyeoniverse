import { GET as favicon } from "../route";

/** 정해진 주소로 찾는 아이콘(next.config rewrites) — /favicon.ico → ico, /apple-touch-icon.png → apple.
 *  rewrite 로 넘긴 주소의 쿼리는 라우트에 닿지 않아서, 경로로 받아 /api/favicon 의 쿼리로 바꿔 부른다 */
const FILES: Record<string, string> = {
  ico: "variant=light&format=png",
  apple: "variant=light&format=png&size=180",
};

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const query = FILES[(await params).file];
  if (!query) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  url.pathname = "/api/favicon";
  url.search = query;
  return favicon(new Request(url));
}
