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
  return favicon(new Request(url));
}
