import { describe, expect, it } from "vitest";
import {
  STORAGE_MAX_MB,
  STORAGE_MAX_MB_CEILING,
  resolveStorageMaxMb,
  sizeOptionsFor,
} from "@/lib/uploadFormats";

/* 저장소 한 파일 상한(media.storageMaxMb) — 설정값 해석과 크기 선택지 (#1139) */
describe("resolveStorageMaxMb", () => {
  it("정상 범위의 숫자는 그대로 쓴다", () => {
    expect(resolveStorageMaxMb(500)).toBe(500);
    expect(resolveStorageMaxMb(1)).toBe(1);
    expect(resolveStorageMaxMb(STORAGE_MAX_MB_CEILING)).toBe(STORAGE_MAX_MB_CEILING);
  });

  it("문자열 숫자도 받는다 — 설정 JSON 이 문자열로 저장됐을 수 있다", () => {
    expect(resolveStorageMaxMb("200")).toBe(200);
  });

  it("소수는 내림한다 — 라우트의 바이트 계산과 SQL 쪽 정수 해석이 갈리지 않게", () => {
    expect(resolveStorageMaxMb(50.9)).toBe(50);
  });

  it("숫자가 아니거나 범위 밖이면 기본값(무료 플랜)으로 떨어진다", () => {
    expect(resolveStorageMaxMb(undefined)).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb(null)).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb("abc")).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb(0)).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb(-5)).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb(STORAGE_MAX_MB_CEILING + 1)).toBe(STORAGE_MAX_MB);
    expect(resolveStorageMaxMb(Infinity)).toBe(STORAGE_MAX_MB);
  });
});

describe("sizeOptionsFor", () => {
  it("상한 이하의 눈금만 노출한다", () => {
    const values = sizeOptionsFor(50).map((o) => Number(o.value));
    expect(Math.max(...values)).toBe(50);
    expect(values).not.toContain(100);
  });

  it("상한을 올리면 큰 눈금이 열린다", () => {
    const values = sizeOptionsFor(500).map((o) => Number(o.value));
    expect(values).toContain(100);
    expect(values).toContain(200);
    expect(values).toContain(500);
    expect(values).not.toContain(1024);
  });

  it("눈금에 없는 상한은 선택지로 추가된다 — 상한 자체를 고를 수 있어야 한다", () => {
    const values = sizeOptionsFor(250).map((o) => Number(o.value));
    expect(values).toContain(250);
    expect(Math.max(...values)).toBe(250);
  });
});
