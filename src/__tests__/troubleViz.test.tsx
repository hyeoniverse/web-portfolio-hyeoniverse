import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVizParts, type VizPosition } from "@/app/about/_components/TroubleViz";
import { TROUBLE_VIZ_KEYS } from "@/app/about/_components/TroubleViz";

/* 트러블슈팅 시각화는 주제별 파일로 나뉘어 있고 항목 키로만 꺼내 쓴다.
   키가 레지스트리에서 빠지거나 도형이 바뀌면 about 본문의 [[viz]] 자리가 조용히 비므로,
   전체 키 × 전체 위치를 렌더해 마크업을 고정한다. */

const POSITIONS: VizPosition[] = ["definition", "cause", "solution", "insight"];

function render(key: string, pos: VizPosition, lang: "ko" | "en") {
  return getVizParts(key, pos, lang).map((n) => renderToStaticMarkup(<>{n}</>)).join("");
}

describe("getVizParts", () => {
  it("등록된 키가 27개다", () => {
    expect(TROUBLE_VIZ_KEYS).toHaveLength(27);
  });

  it("모든 키가 최소 한 위치에서는 도형을 낸다", () => {
    const empty = TROUBLE_VIZ_KEYS.filter(
      (k) => POSITIONS.every((p) => getVizParts(k, p, "ko").length === 0),
    );
    expect(empty).toEqual([]);
  });

  it("없는 키는 빈 배열", () => {
    expect(getVizParts("no-such-key", "cause", "ko")).toEqual([]);
  });

  it("낱개로 꺼내도 .viz 프레임으로 감싼다", () => {
    const key = TROUBLE_VIZ_KEYS.find(
      (k) => POSITIONS.some((p) => getVizParts(k, p, "ko").length > 0),
    )!;
    const pos = POSITIONS.find((p) => getVizParts(key, p, "ko").length > 0)!;
    expect(render(key, pos, "ko")).toMatch(/class="[^"]*viz/);
  });

  it("ko/en 이 서로 다른 텍스트를 낸다", () => {
    const differ = TROUBLE_VIZ_KEYS.filter((k) =>
      POSITIONS.some((p) => render(k, p, "ko") !== render(k, p, "en")),
    );
    // 전부는 아니어도(도형만 있는 항목이 있다) 상당수는 언어를 탄다
    expect(differ.length).toBeGreaterThan(20);
  });

  it("전체 키 × 위치 마크업 스냅샷", () => {
    const all: Record<string, string> = {};
    for (const k of TROUBLE_VIZ_KEYS) {
      for (const p of POSITIONS) {
        const html = render(k, p, "ko");
        if (html) all[`${k}/${p}`] = html;
      }
    }
    expect(all).toMatchSnapshot();
  });
});
