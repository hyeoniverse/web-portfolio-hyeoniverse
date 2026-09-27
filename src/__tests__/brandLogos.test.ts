import { describe, it, expect } from "vitest";
import {
  resolveBrandLogos,
  DEFAULT_LOGO_SHORT,
  DEFAULT_LOGO_SHORT_DARK,
  DEFAULT_LOGO_FULL,
  DEFAULT_LOGO_FULL_DARK,
} from "@/lib/brandLogos";

/* 병합된 config 관점의 입력 — 커스텀이 없으면 각 슬롯은 코드 기본(public 경로)이다 */
const defaults = {
  logoShortUrl: DEFAULT_LOGO_SHORT,
  logoShortDarkUrl: DEFAULT_LOGO_SHORT_DARK,
  logoFullUrl: DEFAULT_LOGO_FULL,
  logoFullDarkUrl: DEFAULT_LOGO_FULL_DARK,
};

const MARK = "https://cdn.example/mark.png";
const MARK_DARK = "https://cdn.example/mark-dark.png";
const WORDMARK = "https://cdn.example/wordmark.svg";
const WORDMARK_DARK = "https://cdn.example/wordmark-dark.svg";

describe("resolveBrandLogos", () => {
  it("커스텀이 없으면 각 슬롯이 제 기본을 유지한다", () => {
    const r = resolveBrandLogos(defaults);
    expect(r.short.light).toBe(DEFAULT_LOGO_SHORT);
    expect(r.short.dark).toBe(DEFAULT_LOGO_SHORT_DARK);
    expect(r.full.light).toBe(DEFAULT_LOGO_FULL);
    expect(r.full.dark).toBe(DEFAULT_LOGO_FULL_DARK);
  });

  it("숏만 커스텀이면 로딩(풀)도 그 업로드본을 쓴다", () => {
    const r = resolveBrandLogos({ ...defaults, logoShortUrl: MARK, logoShortDarkUrl: MARK_DARK, logoShortColorDark: "#fff" });
    expect(r.full.light).toBe(MARK);
    expect(r.full.dark).toBe(MARK_DARK);
    // 리컬러 색도 자산을 가져온 슬롯을 따라간다
    expect(r.full.colorDark).toBe("#fff");
    expect(r.short.light).toBe(MARK);
  });

  it("풀만 커스텀이면 favicon·네비(숏)도 그 업로드본을 쓴다", () => {
    const r = resolveBrandLogos({ ...defaults, logoFullUrl: WORDMARK, logoFullDarkUrl: WORDMARK_DARK, logoFullColor: "#111" });
    expect(r.short.light).toBe(WORDMARK);
    expect(r.short.dark).toBe(WORDMARK_DARK);
    expect(r.short.colorLight).toBe("#111");
    expect(r.full.light).toBe(WORDMARK);
  });

  it("둘 다 커스텀이면 각자 것을 쓴다", () => {
    const r = resolveBrandLogos({ ...defaults, logoShortUrl: MARK, logoFullUrl: WORDMARK });
    expect(r.short.light).toBe(MARK);
    expect(r.full.light).toBe(WORDMARK);
  });

  it("다크 변형 하나만 커스텀이어도 그 슬롯은 커스텀으로 친다", () => {
    const r = resolveBrandLogos({ ...defaults, logoFullDarkUrl: WORDMARK_DARK });
    expect(r.short.dark).toBe(WORDMARK_DARK);
    // 커스텀 슬롯의 라이트 변형(기본값)도 같이 넘어간다 — 슬롯 단위 치환
    expect(r.short.light).toBe(DEFAULT_LOGO_FULL);
  });

  it("빈 값(레거시 delta)은 커스텀이 아니다", () => {
    const r = resolveBrandLogos({ ...defaults, logoFullUrl: "", logoFullDarkUrl: "" });
    expect(r.short.light).toBe(DEFAULT_LOGO_SHORT);
    expect(r.full.light).toBe("");
  });
});
