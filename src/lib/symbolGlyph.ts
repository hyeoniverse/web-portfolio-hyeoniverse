/* Turbopack 은 이 패키지의 ESM 빌드로 간다 — 거기엔 default 가 없고 이름 내보내기만 있다.
   (빌드 스크립트 쪽은 Node 의 CJS 해석이라 default 로 받는다. 같은 패키지인데 진입점이 다르다) */
import { parse, type Font } from "opentype.js";
import { SYMBOL_FONT_BASE64 } from "@/config/symbolFont.generated";

/**
 * 로고 기호의 외곽선 — favicon SVG 가 글꼴 없이도 같은 모양을 그리게 한다(#1048).
 *
 * 브라우저는 탭 아이콘을 그릴 때 웹폰트를 받아오지 않는다. 그래서 SVG 에 `font-family` 만
 * 적어 두면 기기에 깔린 글꼴로 대체되고, 페이지와 다른 모양이 된다. 게다가 브랜드 글꼴에는
 * ✦ 같은 기호가 아예 없어서(원본 TTF 의 글리프 인덱스가 0) 페이지 쪽도 대체 글꼴이 그린다.
 *
 * 그래서 기호만 담은 글꼴을 빌드타임에 굳혀 두고(config/symbolFont.generated.ts),
 * 여기서 글자의 외곽선을 뽑아 `<path>` 로 넣는다. 글꼴이 필요 없으니 어디서 그리든 같다.
 * 페이지도 같은 글꼴을 @font-face 로 얹으므로 로고와 탭이 일치한다.
 */

/* 파싱은 한 번만. 실패하면(글꼴이 깨졌거나 파서가 못 읽으면) null 로 굳혀 두고 다시 시도하지 않는다 —
   요청마다 같은 실패를 반복할 이유가 없고, 부르는 쪽은 예전처럼 <text> 로 떨어지면 된다. */
let parsed: Font | null | undefined;

function symbolFont(): Font | null {
  if (parsed !== undefined) return parsed;
  try {
    const bytes = Buffer.from(SYMBOL_FONT_BASE64, "base64");
    parsed = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  } catch {
    parsed = null;
  }
  return parsed;
}

/** 이 글자를 기호 글꼴이 담고 있는가 */
export function hasSymbolGlyph(char: string): boolean {
  const font = symbolFont();
  if (!font || !char) return false;
  try {
    return font.charToGlyphIndex(char) !== 0;
  } catch {
    return false;
  }
}

/**
 * 글자의 외곽선을 (cx, cy) 중심에 놓아 돌려준다. 담고 있지 않은 글자면 null.
 *
 * 중심을 직접 계산하는 이유는 `<text>` 의 text-anchor·dominant-baseline 을 대신해야 해서다.
 * 글꼴이 주는 기준선 기준 좌표를 그대로 쓰면 아이콘이 아래로 치우친다.
 */
export function symbolGlyphPath(char: string, fontSize: number, cx: number, cy: number): string | null {
  const font = symbolFont();
  if (!font || !hasSymbolGlyph(char)) return null;
  try {
    const path = font.getPath(char, 0, 0, fontSize);
    const box = path.getBoundingBox();
    if (!Number.isFinite(box.x1) || !Number.isFinite(box.y1)) return null;
    const dx = cx - (box.x1 + box.x2) / 2;
    const dy = cy - (box.y1 + box.y2) / 2;
    for (const cmd of path.commands) {
      if ("x" in cmd && typeof cmd.x === "number") { cmd.x += dx; cmd.y += dy; }
      if ("x1" in cmd && typeof cmd.x1 === "number") { cmd.x1 += dx; cmd.y1 += dy; }
      if ("x2" in cmd && typeof cmd.x2 === "number") { cmd.x2 += dx; cmd.y2 += dy; }
    }
    const d = path.toPathData(2);
    return d && d !== "" ? d : null;
  } catch {
    return null;
  }
}
