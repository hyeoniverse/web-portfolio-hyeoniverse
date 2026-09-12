import { PERM } from "@/lib/api/roles";

/**
 * 관리자 화면을 누가 열 수 있는가(#883). proxy(주소로 들어온 작성자를 돌려보냄)와 네비게이션
 * (메뉴 항목·알림 종을 뺌)가 이 표를 함께 본다. 인가는 API 가 따로 하고, 이것은 화면을 권한에 맞춘다.
 */

/** 판정에 쓰는 값 — 서버의 getUserRole 결과와 /api/admin/me 응답 둘 다 이 모양으로 넘긴다 */
export interface AdminAccess {
  isOwner: boolean;
  level: number;
}

/** 관리자(권한 2) 이상만 쓰는 화면. 화면이 부르는 API 가 requireRole(PERM.ADMIN) 이라, 작성자에게는 알림·신고가 빈 목록으로
    보이고 대시보드는 403 을 받은 뒤에야 글 목록으로 넘어간다 */
const ADMIN_ONLY_PAGES = ["/admin", "/admin/notifications", "/admin/reports", "/admin/comments"];

/** 작성자가 관리자 전용 화면으로 들어오면 보낼 곳 */
export const AUTHOR_HOME = "/admin/posts";

/** AdminAuthSync 가 권한이 바뀐 것을 받으면 보내는 이벤트 — 네비게이션이 권한을 다시 확인한다 */
export const ADMIN_ACCESS_CHANGED = "admin-access-changed";

export function canOpenAdminPage(pathname: string, access: AdminAccess): boolean {
  if (access.isOwner || access.level >= PERM.ADMIN) return true;
  // "/admin" 은 대시보드 한 화면이다. 그 아래 경로 전체가 아니다
  return !ADMIN_ONLY_PAGES.some((page) => pathname === page || (page !== "/admin" && pathname.startsWith(`${page}/`)));
}

/** 설정 탭 — 사이트 설정은 소유자만, 그 밖에는 계정 탭만 연다(settings/page.tsx 의 allowedTabs 와 같은 규칙) */
function canOpenSettingsTab(tab: string, access: AdminAccess): boolean {
  return access.isOwner || tab === "account";
}

/** 메뉴 주소(설정 탭 쿼리 포함)를 이 권한으로 열 수 있는가 */
function canOpenAdminHref(href: string, access: AdminAccess): boolean {
  const url = new URL(href, "http://local");
  const tab = url.searchParams.get("tab");
  if (url.pathname === "/admin/settings" && tab && !canOpenSettingsTab(tab, access)) return false;
  return canOpenAdminPage(url.pathname, access);
}

/** 열 수 없는 메뉴 항목과 하위 항목을 뺀다. 권한을 아직 모르면(null) 그대로 둔다 */
export function visibleAdminItems<T extends { href: string | null; children?: { href: string }[] }>(
  items: T[],
  access: AdminAccess | null,
): T[] {
  if (!access) return items;
  return items.flatMap((item) => {
    if (item.href && !canOpenAdminHref(item.href, access)) return [];
    if (!item.children) return [item];
    return [{ ...item, children: item.children.filter((child) => canOpenAdminHref(child.href, access)) }];
  });
}
