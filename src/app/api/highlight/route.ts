import { NextResponse } from "next/server";
import { highlightRichtextCode } from "@/utils/highlightRichtext";

// preview(관리자 미리보기)용 코드블록 하이라이트 — Shiki 는 서버에만 둔다(클라 wasm 번들 회피).
// detail 과 동일한 util 을 써서 결과가 정확히 일치.
export async function POST(req: Request) {
  try {
    const { html } = (await req.json()) as { html?: unknown };
    if (typeof html !== "string" || !html) {
      return NextResponse.json({ html: typeof html === "string" ? html : "" });
    }
    const highlighted = await highlightRichtextCode(html);
    return NextResponse.json({ html: highlighted });
  } catch {
    return NextResponse.json({ html: "" }, { status: 400 });
  }
}
