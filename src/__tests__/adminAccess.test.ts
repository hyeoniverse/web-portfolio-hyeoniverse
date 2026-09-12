import { describe, it, expect } from "vitest";
import { canOpenAdminPage, visibleAdminItems, type AdminAccess } from "@/lib/adminAccess";
import { adminNavItems, adminMenuItems } from "@/components/layout/Navigation/navigationData";

/* 관리자 화면을 누가 여는가(#883). 대시보드·알림·신고·댓글 관리는 API 가 관리자 이상만 허용하고,
   설정의 사이트 탭은 소유자만 연다. 메뉴는 실제 메뉴 데이터로 거른 결과를 본다. */

const OWNER: AdminAccess = { isOwner: true, level: Number.POSITIVE_INFINITY };
const ADMIN: AdminAccess = { isOwner: false, level: 2 };
const AUTHOR: AdminAccess = { isOwner: false, level: 1 };

const keys = (items: { key: string }[]) => items.map((i) => i.key);
const settingsTabs = (items: { key: string; children?: { key: string }[] }[]) =>
  keys(items.find((i) => i.key === "admin-settings")?.children ?? []);

describe("canOpenAdminPage", () => {
  it("작성자는 대시보드·알림·신고·댓글 관리를 열지 못한다", () => {
    for (const path of ["/admin", "/admin/notifications", "/admin/notifications/abc", "/admin/reports", "/admin/comments"]) {
      expect(canOpenAdminPage(path, AUTHOR), path).toBe(false);
    }
  });

  it("작성자도 글·작업물·설정은 연다 — /admin 은 대시보드 한 화면만 막는다", () => {
    for (const path of ["/admin/posts", "/admin/posts/p1/edit", "/admin/works", "/admin/works/new", "/admin/settings"]) {
      expect(canOpenAdminPage(path, AUTHOR), path).toBe(true);
    }
  });

  it("관리자와 소유자는 모두 연다", () => {
    for (const access of [ADMIN, OWNER]) {
      expect(canOpenAdminPage("/admin", access)).toBe(true);
      expect(canOpenAdminPage("/admin/reports", access)).toBe(true);
    }
  });
});

describe("visibleAdminItems", () => {
  it("권한을 모르면 메뉴를 그대로 둔다", () => {
    expect(visibleAdminItems(adminNavItems, null)).toBe(adminNavItems);
  });

  it("소유자는 모든 항목과 설정 탭을 본다", () => {
    expect(visibleAdminItems(adminMenuItems, OWNER)).toEqual(adminMenuItems);
  });

  it("관리자는 설정에서 계정 탭만 본다", () => {
    const nav = visibleAdminItems(adminNavItems, ADMIN);
    expect(keys(nav)).toEqual(["admin-dashboard", "admin-settings", "admin-works", "admin-posts"]);
    expect(settingsTabs(nav)).toEqual(["settings-account"]);
    expect(keys(visibleAdminItems(adminMenuItems, ADMIN))).toContain("admin-notifications");
  });

  it("작성자는 대시보드·알림·신고가 빠지고 설정은 계정 탭만 본다", () => {
    const nav = visibleAdminItems(adminNavItems, AUTHOR);
    expect(keys(nav)).toEqual(["admin-settings", "admin-works", "admin-posts"]);
    expect(settingsTabs(nav)).toEqual(["settings-account"]);
    expect(keys(visibleAdminItems(adminMenuItems, AUTHOR))).toEqual(["admin-settings", "admin-works", "admin-posts", "logout"]);
  });
});
