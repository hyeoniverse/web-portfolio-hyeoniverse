import { describe, it, expect } from "vitest";
import {
  fitColumnsForInsert,
  takeFromColumns,
  COLUMN_MIN_PX,
  COLUMN_DEFAULT_PX,
  COLUMN_GROUP_MAX_PX,
  COLUMN_MAX_PX,
} from "../presets";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe("takeFromColumns", () => {
  it("여유에 비례해서 걷는다", () => {
    const { widths, taken } = takeFromColumns([1600, 1600, 1600], 240);
    expect(widths).toEqual([1520, 1520, 1520]);
    expect(taken).toBe(240);
  });

  it("걷은 합이 정확히 need 다 — 내림 잔여까지 배분", () => {
    // 3으로 안 나눠떨어지는 몫: 반올림만 하면 1~2px 어긋난다
    const { widths, taken } = takeFromColumns([300, 500, 700], 101);
    expect(taken).toBe(101);
    expect(sum([300, 500, 700]) - sum(widths)).toBe(101);
  });

  it("어떤 열도 MIN 아래로 안 내려간다", () => {
    const { widths } = takeFromColumns([50, 1000, 45], 900);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(COLUMN_MIN_PX);
  });

  it("전부 MIN 이면 못 걷는다 (taken=0, 무한루프/음수 없음)", () => {
    const { widths, taken } = takeFromColumns([COLUMN_MIN_PX, COLUMN_MIN_PX], 500);
    expect(taken).toBe(0);
    expect(widths).toEqual([COLUMN_MIN_PX, COLUMN_MIN_PX]);
  });

  it("여유보다 많이 요구하면 여유만큼만 걷는다", () => {
    const { widths, taken } = takeFromColumns([100, 100], 10_000);
    expect(taken).toBe(120); // (100-40) * 2
    expect(widths).toEqual([COLUMN_MIN_PX, COLUMN_MIN_PX]);
  });
});

describe("fitColumnsForInsert", () => {
  it("여유가 있으면 기존 열을 건드리지 않는다 (핵심 규칙)", () => {
    const cur = [300, 240, 180];
    const { widths, added } = fitColumnsForInsert(cur);
    expect(widths).toEqual(cur);
    expect(added).toBe(COLUMN_DEFAULT_PX);
  });

  it("상한에 정확히 도달한 상태 — 기존 열을 깎아 총폭을 상한에 묶는다", () => {
    const cur = [1600, 1600, 1600]; // = 4800 = 상한
    expect(sum(cur)).toBe(COLUMN_GROUP_MAX_PX);
    const { widths, added } = fitColumnsForInsert(cur);
    expect(added).toBe(COLUMN_DEFAULT_PX);
    expect(widths).toEqual([1520, 1520, 1520]);
    expect(sum(widths) + added).toBe(COLUMN_GROUP_MAX_PX); // 이게 예전에 4840 이었다
  });

  it("상한 도달 후 반복 추가해도 절대 안 넘는다 (예전엔 매번 +40 씩 샜다)", () => {
    let cols = [1600, 1600, 1600];
    for (let i = 0; i < 9; i++) {
      // 12열 상한까지
      const { widths, added } = fitColumnsForInsert(cols);
      cols = [...widths, added];
      expect(sum(cols)).toBeLessThanOrEqual(COLUMN_GROUP_MAX_PX);
      expect(Math.min(...cols)).toBeGreaterThanOrEqual(COLUMN_MIN_PX);
    }
    expect(cols).toHaveLength(12);
  });

  it("상한 도달 상태에서 추가해도 기존 열이 MIN 아래로 안 죽는다", () => {
    const cols = Array(11).fill(COLUMN_MIN_PX);
    const { widths, added } = fitColumnsForInsert(cols);
    expect(Math.min(...widths, added)).toBeGreaterThanOrEqual(COLUMN_MIN_PX);
  });

  it("새 열 폭은 열 하나 상한도 지킨다", () => {
    const { added } = fitColumnsForInsert([100], 99_999);
    expect(added).toBe(COLUMN_MAX_PX);
  });
});
