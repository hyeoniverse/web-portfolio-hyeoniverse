import { describe, it, expect } from "vitest";
import { filterOrphanedKeys, buildDeltaPayload, computeDelta } from "@/lib/settingsDelta";

/**
 * `filterOrphanedKeys` 는 "기본값에 있는 키만 남긴다" 로 동작한다. 그래서 키를 사용자가
 * 만드는 자유 맵(기본값이 `{}`)에 내려가면 통째로 비워 버린다 — 실제로 패널 제목
 * override 가 저장은 되는데 새로고침하면 사라지고 있었다.
 */
describe("filterOrphanedKeys", () => {
  const defaults = {
    about: { panelTitles: {}, contentSource: {}, features: [] as unknown[] },
    media: { limits: { png: 1 } },
    brand: { name: "" },
  };

  it("기본값이 빈 객체인 자유 맵은 그대로 둔다", () => {
    const delta = { about: { panelTitles: { hero: { ko: "인트로" } } } };
    expect(filterOrphanedKeys(delta, defaults).about.panelTitles).toEqual({ hero: { ko: "인트로" } });
  });

  it("기본값에 키가 있는 객체는 계속 걸러 낸다", () => {
    const delta = { media: { limits: { png: 5, gone: 9 } } };
    expect(filterOrphanedKeys(delta, defaults).media.limits).toEqual({ png: 5 });
  });

  it("siteConfig 에서 사라진 최상위 키는 여전히 제거한다", () => {
    const delta = { about: { panelTitles: { a: 1 } }, removedTab: { x: 1 } };
    expect(Object.keys(filterOrphanedKeys(delta, defaults))).toEqual(["about"]);
  });

  it("배열은 통째로 유지한다", () => {
    const delta = { about: { features: [{ title: "a" }] } };
    expect(filterOrphanedKeys(delta, defaults).about.features).toEqual([{ title: "a" }]);
  });
});

/* 저장된 delta 위에 지정한 경로만 덮는다 — 이걸 안 지키면 스크립트나 다른 화면이
   모르는 설정을 같이 써 버린다. */
describe("buildDeltaPayload", () => {
  const defaults = { about: { a: 1, b: 2 }, brand: { name: "" } };

  it("지정한 경로 밖의 저장된 값은 건드리지 않는다", () => {
    const stored = { brand: { name: "keep" }, about: { a: 9 } };
    const next = { about: { a: 9, b: 7 }, brand: { name: "keep" } };
    const { delta } = buildDeltaPayload(stored, next, defaults, ["about.b"]);
    expect(delta).toEqual({ brand: { name: "keep" }, about: { a: 9, b: 7 } });
  });

  it("기본값으로 되돌아온 경로는 delta 에서 뺀다", () => {
    const stored = { about: { a: 9 } };
    const next = { about: { a: 1, b: 2 } };
    const { delta } = buildDeltaPayload(stored, next, defaults, ["about.a"]);
    expect(delta.about).toEqual({});
  });

  it("computeDelta 는 기본값과 같은 키를 빼고 다른 키만 남긴다", () => {
    expect(computeDelta({ about: { a: 1, b: 5 } }, defaults)).toEqual({ about: { b: 5 } });
  });
});
