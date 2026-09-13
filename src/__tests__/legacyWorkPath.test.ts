import { describe, it, expect } from "vitest";
import { legacyWorkTarget, type WorkRef } from "@/lib/legacyWorkPath";

/* 작업물 옛 주소(id·표시 번호)가 가리키는 slug 주소(#909). 상세 레이아웃의 findProjectIndex 와 같은 순서(slug → id → 번호)로 본다. */

const works: WorkRef[] = [
  { id: "e0d04dce-eec7-499c-aa0e-0d012c475a98", slug: "prism-ui", sort_order: 1 },
  { id: "468899cb-4686-404a-92ca-998d6e43dfcd", slug: "syncboard", sort_order: 2 },
  { id: "5f39f6c9-1fe6-4fd4-a721-583c6664a287", slug: null, sort_order: 3 },
  { id: "76228c0f-e947-4c2f-a4f8-f9832b6327d4", slug: "2024", sort_order: 4 },
];

describe("legacyWorkTarget", () => {
  it("id 주소는 그 작업물의 slug 로", () => {
    expect(legacyWorkTarget(works, "468899cb-4686-404a-92ca-998d6e43dfcd")).toBe("syncboard");
  });

  it("표시 번호 주소는 그 자리 작업물의 slug 로 — 0 을 붙이든 안 붙이든", () => {
    expect(legacyWorkTarget(works, "01")).toBe("prism-ui");
    expect(legacyWorkTarget(works, "2")).toBe("syncboard");
  });

  it("이미 slug 주소면 옮기지 않는다 — 숫자처럼 생긴 slug 도", () => {
    expect(legacyWorkTarget(works, "prism-ui")).toBeNull();
    expect(legacyWorkTarget(works, "2024")).toBeNull();
  });

  it("slug 가 없는 작업물은 id 주소가 제 주소다 — 번호로 오면 id 로", () => {
    expect(legacyWorkTarget(works, "5f39f6c9-1fe6-4fd4-a721-583c6664a287")).toBeNull();
    expect(legacyWorkTarget(works, "03")).toBe("5f39f6c9-1fe6-4fd4-a721-583c6664a287");
  });

  it("없는 작업물이면 옮기지 않는다 — 레이아웃이 404 로 답한다", () => {
    expect(legacyWorkTarget(works, "00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(legacyWorkTarget(works, "99")).toBeNull();
  });
});
