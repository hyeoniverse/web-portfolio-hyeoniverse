import { SYMBOL_FONT_BASE64 } from "@/config/symbolFont.generated";

/**
 * 로고 기호 글꼴 — favicon 이 외곽선을 뽑는 그 글꼴을 페이지에도 내려준다(#1048).
 *
 * 브랜드 글꼴에는 ✦ 같은 기호가 없어서, 이걸 얹지 않으면 로고의 기호만 기기에 깔린 글꼴이
 * 그린다. 그러면 탭 아이콘(외곽선으로 굳혀 둔 것)과 사이트 로고가 서로 다른 모양이 된다.
 *
 * 내용이 빌드 결과물이라 절대 바뀌지 않는다 — 영구 캐시로 둔다. 실제로 받아 가는 것은
 * @font-face 의 unicode-range 에 걸리는 기호를 쓰는 화면뿐이다.
 */
export const dynamic = "force-static";

export function GET() {
  const bytes = Buffer.from(SYMBOL_FONT_BASE64, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "font/otf",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
