import { describe, it, expect } from "vitest";
import { homeWorkSlots } from "@/app/(home)/_sections/WorksSection/WorksSection";

/* 홈 Selected Works — 5×5 격자의 원 자리 11개. 칸 번호 = 줄 × 5 + 칸 */
const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe("홈 작업물 원 자리", () => {
  it("적으면 맨 아래 줄(머리글 양옆)부터 채운다", () => {
    expect(sorted(homeWorkSlots(1))).toEqual([20]);
    expect(sorted(homeWorkSlots(2))).toEqual([20, 24]);
    expect(sorted(homeWorkSlots(4))).toEqual([16, 18, 20, 24]);
  });

  it("아래 줄이 다 차면 한 줄씩 위로 올라가고, 가운데 줄은 양옆부터 채운다", () => {
    expect(sorted(homeWorkSlots(6))).toEqual([10, 14, 16, 18, 20, 24]);
    expect(sorted(homeWorkSlots(7))).toEqual([6, 10, 14, 16, 18, 20, 24]);
  });

  it("한가운데 칸(12)은 맨 나중 — 나머지 열 자리가 다 찬 뒤에만 쓴다", () => {
    expect(homeWorkSlots(10).has(12)).toBe(false);
    expect(sorted(homeWorkSlots(10))).toEqual([0, 4, 6, 8, 10, 14, 16, 18, 20, 24]);
    expect(homeWorkSlots(11).has(12)).toBe(true);
  });

  it("다 차면 11자리 전부 — 예전과 같은 배치다", () => {
    expect(sorted(homeWorkSlots(11))).toEqual([0, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24]);
    expect(homeWorkSlots(20).size).toBe(11);
    expect(homeWorkSlots(0).size).toBe(0);
  });
});
