import { describe, expect, it } from "vitest";
import { addSeriesPosts } from "@/components/works/workEditor/seriesRelatedPosts";

/* 작업물 편집기 — 관련 시리즈를 연결하면 그 시리즈의 글이 관련 글에 더해진다 */
const posts = [
  { id: "a2", series_id: "s1", series_order: 2 },
  { id: "a1", series_id: "s1", series_order: 1 },
  { id: "b1", series_id: "s2", series_order: 1 },
  { id: "x", series_id: null, series_order: 0 },
];

describe("addSeriesPosts", () => {
  it("새로 연결한 시리즈의 글을 시리즈 순서대로 뒤에 더한다", () => {
    expect(addSeriesPosts(["x"], [], ["s1"], posts)).toEqual(["x", "a1", "a2"]);
  });

  it("이미 관련 글인 글은 건너뛰고 자리를 바꾸지 않는다", () => {
    expect(addSeriesPosts(["a2", "x"], [], ["s1"], posts)).toEqual(["a2", "x", "a1"]);
  });

  it("이미 연결돼 있던 시리즈는 다시 더하지 않는다 — 사용자가 뺀 글이 되살아나지 않게", () => {
    expect(addSeriesPosts(["x"], ["s1"], ["s1", "s2"], posts)).toEqual(["x", "b1"]);
  });

  it("시리즈를 빼도 관련 글은 그대로 둔다", () => {
    const ids = ["a1", "a2"];
    expect(addSeriesPosts(ids, ["s1"], [], posts)).toBe(ids);
  });
});
