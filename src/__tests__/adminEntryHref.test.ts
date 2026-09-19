import { describe, it, expect } from "vitest";
import { adminEntryHref, AUTHOR_HOME } from "@/lib/adminAccess";
import { PERM } from "@/lib/api/roles";

/* 관리 화면으로 들어가는 자리(#1074). 보일지는 로그인 여부가 정하고(상단바·모바일 메뉴),
   이 함수는 갈 곳만 고른다 — 대시보드를 못 여는 계정은 글 목록에서 시작한다. */

describe("관리 화면 들어가는 자리", () => {
  it("소유자는 대시보드로", () => {
    expect(adminEntryHref({ isOwner: true, level: Number.POSITIVE_INFINITY })).toBe("/admin");
  });

  it("관리자도 대시보드로", () => {
    expect(adminEntryHref({ isOwner: false, level: PERM.ADMIN })).toBe("/admin");
  });

  it("작성자는 대시보드를 못 여니 글 목록으로", () => {
    expect(adminEntryHref({ isOwner: false, level: PERM.AUTHOR })).toBe(AUTHOR_HOME);
  });

  it("권한이 없는 계정도 글 목록으로 — 대시보드로 보내면 proxy 가 되돌린다", () => {
    expect(adminEntryHref({ isOwner: false, level: 0 })).toBe(AUTHOR_HOME);
  });

  it("권한을 아직 모르면 대시보드로 두고, 못 열면 proxy 가 옮긴다", () => {
    expect(adminEntryHref(null)).toBe("/admin");
  });
});
