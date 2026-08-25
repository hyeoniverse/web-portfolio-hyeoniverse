import { describe, it, expect } from "vitest";
import { PERM, toPermissionLevel, parsePermissionLevelInput, canEditPost } from "@/lib/api/roles";

/* app_metadata.permission_level 은 owner 만 쓸 수 있지만, 같은 값을 코드와 RLS 정책이
   각각 읽는다. 두 곳이 갈리면 넓은 쪽(정책)이 최종 판정자가 되므로 파싱을 좁혀 둔다. */
describe("toPermissionLevel", () => {
  it("PERM 에 정의된 값은 그대로 통과시킨다", () => {
    expect(toPermissionLevel(PERM.AUTHOR)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(PERM.ADMIN)).toBe(PERM.ADMIN);
  });

  it("소수는 저자로 떨어뜨린다 — SQL 쪽에서 ::int 캐스트가 죽던 값", () => {
    expect(toPermissionLevel(1.5)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(1.9999)).toBe(PERM.AUTHOR);
  });

  it("문자열은 저자로 떨어뜨린다 — SQL 의 '2'::int 는 관리자로 읽던 값", () => {
    expect(toPermissionLevel("2")).toBe(PERM.AUTHOR);
  });

  it("범위 밖 정수는 저자로 떨어뜨린다", () => {
    expect(toPermissionLevel(999)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(-1)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(0)).toBe(PERM.AUTHOR);
  });

  it("없거나 엉뚱한 타입도 저자로 떨어뜨린다", () => {
    expect(toPermissionLevel(undefined)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(null)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(true)).toBe(PERM.AUTHOR);
    expect(toPermissionLevel(NaN)).toBe(PERM.AUTHOR);
  });
});

describe("parsePermissionLevelInput", () => {
  it("허용된 값만 통과시키고 나머지는 null 을 돌려준다", () => {
    expect(parsePermissionLevelInput(1)).toBe(1);
    expect(parsePermissionLevelInput(2)).toBe(2);
    expect(parsePermissionLevelInput(1.5)).toBeNull();
    expect(parsePermissionLevelInput("2")).toBeNull();
    expect(parsePermissionLevelInput(999)).toBeNull();
    expect(parsePermissionLevelInput(undefined)).toBeNull();
  });
});

describe("canEditPost", () => {
  const author = (level: number, authorId: string | null) =>
    ({ role: "author" as const, level, authorId, isOwner: false });

  it("owner 는 모든 글", () => {
    expect(canEditPost({ role: "owner", level: Infinity, authorId: null, isOwner: true }, ["x"])).toBe(true);
  });

  it("admin(레벨 2) 은 남의 글도", () => {
    expect(canEditPost(author(PERM.ADMIN, "me"), ["other"])).toBe(true);
  });

  it("author(레벨 1) 은 본인 글만", () => {
    expect(canEditPost(author(PERM.AUTHOR, "me"), ["me", "other"])).toBe(true);
    expect(canEditPost(author(PERM.AUTHOR, "me"), ["other"])).toBe(false);
    expect(canEditPost(author(PERM.AUTHOR, "me"), null)).toBe(false);
  });

  it("author_id 가 없으면 아무 글도 못 고친다", () => {
    expect(canEditPost(author(PERM.AUTHOR, null), ["other"])).toBe(false);
  });

  it("소수 레벨로 admin 문턱을 넘을 수 없다", () => {
    expect(canEditPost(author(1.99, "me"), ["other"])).toBe(false);
  });

  it("방문자는 못 고친다", () => {
    expect(canEditPost({ role: null, level: 0, authorId: null, isOwner: false }, ["x"])).toBe(false);
  });
});
