import { describe, it, expect } from "vitest";
import { generateRandomElements, generateRandomDroplets } from "@/utils/random";

describe("generateRandomElements", () => {
  it("요청한 개수만큼 요소를 생성한다", () => {
    const result = generateRandomElements(5);
    expect(result).toHaveLength(5);
  });

  it("각 요소에 필수 속성이 있다", () => {
    const result = generateRandomElements(1);
    const element = result[0];
    expect(element).toHaveProperty("id", 0);
    expect(element).toHaveProperty("x");
    expect(element).toHaveProperty("y");
    expect(element).toHaveProperty("size");
    expect(element).toHaveProperty("color");
    expect(element).toHaveProperty("speed");
  });

  it("x, y 값이 0~100 범위 내이다", () => {
    const result = generateRandomElements(100);
    result.forEach((el) => {
      expect(el.x).toBeGreaterThanOrEqual(0);
      expect(el.x).toBeLessThan(100);
      expect(el.y).toBeGreaterThanOrEqual(0);
      expect(el.y).toBeLessThan(100);
    });
  });

  it("size 값이 2~6 범위 내이다", () => {
    const result = generateRandomElements(100);
    result.forEach((el) => {
      expect(el.size).toBeGreaterThanOrEqual(2);
      expect(el.size).toBeLessThan(6);
    });
  });

  it("0개 요청 시 빈 배열을 반환한다", () => {
    expect(generateRandomElements(0)).toHaveLength(0);
  });
});

describe("generateRandomDroplets", () => {
  it("요청한 개수만큼 물방울을 생성한다", () => {
    const result = generateRandomDroplets(3);
    expect(result).toHaveLength(3);
  });

  it("각 물방울에 필수 속성이 있다", () => {
    const result = generateRandomDroplets(1);
    const droplet = result[0];
    expect(droplet).toHaveProperty("id", 0);
    expect(droplet).toHaveProperty("x");
    expect(droplet).toHaveProperty("y");
    expect(droplet).toHaveProperty("size");
    expect(droplet).toHaveProperty("opacity");
    expect(droplet).toHaveProperty("speed");
  });

  it("size 값이 10~30 범위 내이다", () => {
    const result = generateRandomDroplets(100);
    result.forEach((d) => {
      expect(d.size).toBeGreaterThanOrEqual(10);
      expect(d.size).toBeLessThan(30);
    });
  });
});
