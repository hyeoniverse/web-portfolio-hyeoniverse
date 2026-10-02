import { GET as favicon } from "../../../route";

/** 버전이 경로에 든 아이콘 주소 — /api/favicon/v/<버전>/light.png · dark.svg · apple.png.
 *  버전을 쿼리(?v=)가 아니라 경로에 둔다. 사파리는 쿼리만 바뀐 아이콘 주소를 다시 받지 않는 것으로 보여서다
 *  (설정을 바꿔 ?v= 가 매번 달라져도 첫 변경 뒤로는 탭 아이콘이 그대로였다). 버전 자체는 그리기에 쓰지 않는다 */
export async function GET(request: Request, { params }: { params: Promise<{ ver: string; file: string }> }) {
  const { file } = await params;
  const m = /^(light|dark)\.(png|svg)$/.exec(file);
  const query = file === "apple.png"
    ? "variant=light&format=png&size=180"
    : m ? `variant=${m[1]}${m[2] === "png" ? "&format=png" : ""}` : null;
  if (!query) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  url.pathname = "/api/favicon";
  url.search = query;
  const res = await favicon(new Request(url));
  if (!res.ok || res.headers.has("X-Favicon-Fallback")) return res; // 실패 · 대체 그림은 오래 들고 있지 않는다
  /* 버전이 주소에 들어 있어 한 주소의 내용은 바뀌지 않는다(설정이 바뀌면 주소가 바뀐다). 그래서 브라우저도 CDN 도
     오래 들고 있게 둔다 — 설정을 바꾼 뒤 첫 요청만 함수가 돌고(설정 조회 · 이미지 변환), 나머지는 CDN 이 내준다.
     배포하면 Vercel CDN 캐시는 비워지므로 그리는 코드가 바뀌어도 남지 않는다 */
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("CDN-Cache-Control", "public, s-maxage=31536000");
  return new Response(res.body, { status: res.status, headers });
}
