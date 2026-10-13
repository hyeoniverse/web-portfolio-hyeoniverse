"use client";

import { Fragment, useCallback, useState, type RefObject } from "react";
import { usePopoverRef } from "@/hooks/useTopLayer";
import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import styles from "./Navigation.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { colorTone, type Tone } from "@/lib/navBackdrop";
import SiteLangMenu from "./SiteLangMenu";

interface MenuChild {
  key: string;
  href: string;
  label: string;
}

interface MenuItem {
  key: string;
  href: string;
  label?: string;
  children?: MenuChild[];
}

interface MobileMenuProps {
  showMenu: boolean;
  menuClipOpen: boolean;
  clipWrapperRef: RefObject<HTMLDivElement | null>;
  menuMounted: boolean;
  pathname: string;
  /** 페이지 목록 — 화면(공개 · 관리)마다 다른 목록은 Navigation 이 NAV_SECTIONS 에서 골라 준다 */
  items: MenuItem[];
  /** 건너가는 링크 — 공개 화면은 관리 화면(Admin, 권한이 없으면 null), 관리 화면은 사이트 홈(Home) */
  crossLink: { href: string; label: string } | null;
  contactEmail: string;
  /** 다른 언어로 보기(🌐) — 좁은 화면 내비게이션에는 자리가 없어 서랍 좌상단에 둔다 */
  showSiteLang?: boolean;
  onClose: () => void;
  /** 문의 — 있으면 목록 아래에 Contacts 를 둔다(공개 화면) */
  onContactOpen?: () => void;
  /** 로그아웃 — 로그인했으면 준다. 꼬리 맨 위에 늘 보인다(화면과 상관없이) */
  onLogout?: () => void;
}

export default function MobileMenu({
  showMenu,
  menuClipOpen,
  clipWrapperRef,
  menuMounted,
  pathname,
  items,
  crossLink,
  contactEmail,
  showSiteLang = false,
  onClose,
  onContactOpen,
  onLogout,
}: MobileMenuProps) {
  const { t } = useLanguage();
  /* 메뉴 이름 — 사전(navMenu.label)에 있으면 그것(사이트 번역이 덮는다), 없으면 적힌 이름 */
  const navLabel = (key: string, label?: string) => {
    const v = t(`navMenu.label.${key}`);
    return v === `navMenu.label.${key}` ? label ?? key : v;
  };
  // 이메일 hover phase — CSS animation 제거 후 transition 으로 복귀가 브라우저별로 안 통해서
  // JS 로 phase 관리: idle → rising (hover) → sinking (hover-off) → idle (sink animation 종료)
  const [emailPhase, setEmailPhase] = useState<"idle" | "rising" | "sinking">("idle");
  /* 풀로고 변형은 테마가 아니라 드로어 배경의 실제 밝기로 고른다 — 상단 nav 로고가 밑 배경을 재는 것과 같은
     계산(lib/navBackdrop 의 colorTone)이다. 드로어 배경(--nav-menu-bg)은 테마와 상관없이 어두워서, 테마로 고르면
     라이트 테마에서 어두운 잉크 로고가 묻혔다. 배경색을 바꿔도 따라간다. 재기 전(첫 그림)은 테마를 따른다 */
  const [drawerTone, setDrawerTone] = useState<Tone | null>(null);
  /* 서랍은 top layer — 붙는 순간 띄운다. clipWrapperRef 도 같이 받는다 */
  const popoverRef = usePopoverRef<HTMLDivElement>(clipWrapperRef);
  const measureDrawerTone = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const tone = colorTone(getComputedStyle(el).backgroundColor);
    setDrawerTone((prev) => (prev === tone ? prev : tone));
  }, []);

  if (!menuMounted || !showMenu) return null;

  // 가장 긴 prefix 매칭만 active — 예: /admin/works 일 때 /admin (dashboard) 까지 active 되던 문제 방지
  const activeHref: string | null = (() => {
    const matches = items
      .filter((it) => pathname === it.href || pathname.startsWith(it.href + "/"))
      .map((it) => it.href);
    if (!matches.length) return null;
    return matches.reduce((best, h) => (h.length > best.length ? h : best));
  })();


  return createPortal(
    <div
      ref={popoverRef}
      popover="manual"
      className={`${styles.menuClipWrapper} ${menuClipOpen ? styles.menuClipOpen : ""}`}
    >
      <div
        ref={measureDrawerTone}
        className={styles.menuBackdrop}
        onClick={onClose}
      />
      {/* data-lenis-prevent — 넘칠 때 이 컨테이너가 직접 스크롤되도록 Lenis 휠 가로채기 해제 */}
      <div className={styles.menuDrawer} data-lenis-prevent>
        {/* Header: 풀로고 가운데 */}
        <div className={styles.menuHeader} onClick={onClose}>
          <Logo variant="full" as="link" className={styles.menuLogo} bg={drawerTone ?? undefined} />
          {/* 다른 언어로 보기(🌐) — 좌상단, 오른쪽 위 닫기 단추와 마주 보는 자리. 머리를 누르면 닫히므로
              이 단추와 여기서 연 언어 목록(포털이라도 React 트리로 올라온다)의 탭은 머리까지 보내지 않는다 */}
          {showSiteLang && (
            <span className={styles.menuSiteLangSlot} onClick={(e) => e.stopPropagation()}>
              <SiteLangMenu iconSize={18} />
            </span>
          )}
        </div>

        <nav aria-label={t("navMenu.ui.mobileMenu")} className={styles.menuNav}>
          {items.map((item) => {
            if (item.children?.length) {
              return (
                <Fragment key={item.key}>
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} glith-on-hover ${activeHref === item.href ? styles.menuLinkActive : ""}`}
                    onClick={onClose}
                  >
                    {navLabel(item.key, item.label)}
                  </Link>
                  <div className={styles.menuSubList}>
                    {item.children.map((child) => {
                      const childActive =
                        pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.key}
                          href={child.href}
                          className={`${styles.menuSubLink} glith-on-hover ${childActive ? styles.menuSubLinkActive : ""}`}
                          onClick={onClose}
                        >
                          {navLabel(child.key, child.label)}
                        </Link>
                      );
                    })}
                  </div>
                </Fragment>
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`${styles.menuLink} glith-on-hover ${activeHref === item.href ? styles.menuLinkActive : ""}`}
                onClick={onClose}
              >
                {navLabel(item.key, item.label)}
              </Link>
            );
          })}

        </nav>

        {/* Footer: email */}
        <div className={styles.menuFooter}>
          {/* 페이지가 아닌 자리 — 문의(공개 화면) · 건너가는 링크(관리 화면으로 / 사이트 홈으로) · 로그아웃(로그인했으면).
              목록 끝에 두면 메뉴가 길 때 아래 고정된 이 꼬리에 가려져, 꼬리 맨 위 한 줄에 나란히 둔다 */}
          {(onContactOpen || crossLink || onLogout) && (
            <div className={styles.menuFooterActions}>
              {onContactOpen && (
                <Pressable noTapScale
                  className={`${styles.menuLink} ${styles.menuFooterLink} glith-on-hover`}
                  onClick={() => {
                    onClose();
                    onContactOpen();
                  }}
                >
                  {navLabel("contacts", "Contacts")}
                </Pressable>
              )}
              {crossLink && (
                <Link href={crossLink.href} className={`${styles.menuLink} ${styles.menuFooterLink} glith-on-hover`} onClick={onClose}>
                  {crossLink.label}
                </Link>
              )}
              {onLogout && (
                <Pressable noTapScale
                  className={`${styles.menuLink} ${styles.menuFooterLink} glith-on-hover`}
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                >
                  Logout
                </Pressable>
              )}
            </div>
          )}
          <span className={styles.menuFooterLabel}>Say Hi!</span>
          <a
            href={`mailto:${contactEmail}`}
            className={`${styles.menuFooterEmail} ${
              emailPhase === "rising" ? styles.menuFooterEmailRising :
              emailPhase === "sinking" ? styles.menuFooterEmailSinking : ""
            }`}
            onMouseEnter={() => setEmailPhase("rising")}
            onMouseLeave={() => setEmailPhase((p) => (p === "rising" ? "sinking" : p))}
            onAnimationEnd={(e) => {
              if (e.animationName.toLowerCase().includes("sink")) setEmailPhase("idle");
            }}
          >
            <span className={styles.menuFooterEmailBase}>{contactEmail}</span>
            {/* hover 시 글자 안쪽에서만 accent 가 출렁이며 차오르는 layer 들 */}
            <span aria-hidden="true" className={`${styles.menuFooterEmailFill} ${styles.menuFooterEmailFillBack}`}>{contactEmail}</span>
            <span aria-hidden="true" className={`${styles.menuFooterEmailFill} ${styles.menuFooterEmailFillMid}`}>{contactEmail}</span>
            <span aria-hidden="true" className={`${styles.menuFooterEmailFill} ${styles.menuFooterEmailFillFront}`}>{contactEmail}</span>
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
