import { describe, expect, it } from "vitest";
import { isAdminApiRoute, isAdminRoute, passThroughOnBlogHost } from "@/lib/siteHosts";
import { navSectionOf } from "@/components/layout/navSection";

/* 관리 화면 경로 판정 — 접두어만 보면 슬러그가 admin 으로 시작하는 블로그 글(blog.hyeoniverse.com/admin-two-factor-totp)이
   관리 화면으로 잡혀 로그인으로 보내졌다 */
describe("isAdminRoute", () => {
  it("/admin 과 그 아래만", () => {
    expect(isAdminRoute("/admin")).toBe(true);
    expect(isAdminRoute("/admin/posts")).toBe(true);
    expect(isAdminRoute("/admin-two-factor-totp")).toBe(false);
    expect(isAdminRoute("/administrator")).toBe(false);
    expect(isAdminRoute("/posts/admin")).toBe(false);
  });

  it("관리 API 도 같은 규칙", () => {
    expect(isAdminApiRoute("/api/admin")).toBe(true);
    expect(isAdminApiRoute("/api/admin/auth/mfa")).toBe(true);
    expect(isAdminApiRoute("/api/admins")).toBe(false);
  });

  it("블로그 주소의 admin 으로 시작하는 글은 블로그 글로 그린다", () => {
    expect(passThroughOnBlogHost("/admin-two-factor-totp")).toBe(false);
    expect(passThroughOnBlogHost("/admin/posts")).toBe(true);
    expect(passThroughOnBlogHost("/api/posts")).toBe(true);
  });

  it("화면 구역", () => {
    expect(navSectionOf("/admin-two-factor-totp")).toBe("site");
    expect(navSectionOf("/admin/settings")).toBe("admin");
  });
});
