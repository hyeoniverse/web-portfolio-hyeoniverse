import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/utils/safeNextPath";

describe("safeNextPath", () => {
  it("같은 출처 경로는 쿼리 · 해시까지 그대로", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/admin/posts?tab=a#x")).toBe("/admin/posts?tab=a#x");
  });

  it("다른 출처로 풀리는 값은 거절", () => {
    for (const raw of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(raw)).toBeNull();
    }
  });
});
