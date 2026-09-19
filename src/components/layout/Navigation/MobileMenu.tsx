"use client";

import { Fragment, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import styles from "./Navigation.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

interface MenuChild {
  key: string;
  href: string;
  label: string;
}

interface MenuItem {
  key: string;
  href: string | null;
  label?: string;
  children?: MenuChild[];
}

interface MobileMenuProps {
  showMenu: boolean;
  menuClipOpen: boolean;
  clipWrapperRef: RefObject<HTMLDivElement | null>;
  menuMounted: boolean;
  pathname: string;
  isAdminPage: boolean;
  menuItems: MenuItem[];
  /** 관리 화면으로 들어가는 자리 — 권한이 없거나 이미 관리 화면이면 null */
  adminHref?: string | null;
  contactEmail: string;
  onClose: () => void;
  onContactOpen: () => void;
  onLogout: () => void;
}

export default function MobileMenu({
  showMenu,
  menuClipOpen,
  clipWrapperRef,
  menuMounted,
  pathname,
  isAdminPage,
  menuItems,
  adminHref,
  contactEmail,
  onClose,
  onContactOpen,
  onLogout,
}: MobileMenuProps) {
  const { language } = useLanguage();
  // 이메일 hover phase — CSS animation 제거 후 transition 으로 복귀가 브라우저별로 안 통해서
  // JS 로 phase 관리: idle → rising (hover) → sinking (hover-off) → idle (sink animation 종료)
  const [emailPhase, setEmailPhase] = useState<"idle" | "rising" | "sinking">("idle");

  if (!menuMounted || !showMenu) return null;

  // 가장 긴 prefix 매칭만 active — 예: /admin/works 일 때 /admin (dashboard) 까지 active 되던 문제 방지
  const activeHref: string | null = (() => {
    const matches = menuItems
      .filter((it) => it.href && (pathname === it.href || pathname.startsWith(it.href + "/")))
      .map((it) => it.href as string);
    if (!matches.length) return null;
    return matches.reduce((best, h) => (h.length > best.length ? h : best));
  })();

  /* 페이지 링크와 행동을 가른다 — 목록에는 페이지만 남기고, href 가 없는 항목(문의·로그아웃)은
     아래 묶음이 맡는다 */
  const linkItems = menuItems.filter((item): item is MenuItem & { href: string } => !!item.href);
  const actionItem = menuItems.find((item) => !item.href);

  return createPortal(
    <div
      ref={clipWrapperRef}
      className={`${styles.menuClipWrapper} ${menuClipOpen ? styles.menuClipOpen : ""}`}
    >
      <div
        className={styles.menuBackdrop}
        onClick={onClose}
      />
      {/* data-lenis-prevent — 넘칠 때 이 컨테이너가 직접 스크롤되도록 Lenis 휠 가로채기 해제 */}
      <div className={styles.menuDrawer} data-lenis-prevent>
        {/* Header: 풀로고 가운데 */}
        <div className={styles.menuHeader} onClick={onClose}>
          <Logo variant="full" as="link" className={styles.menuLogo} />
        </div>

        <nav aria-label={language === "ko" ? "모바일 메뉴" : "Mobile menu"} className={styles.menuNav}>
          {linkItems.map((item) => {
            if (item.children?.length) {
              return (
                <Fragment key={item.key}>
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} glith-on-hover ${activeHref === item.href ? styles.menuLinkActive : ""}`}
                    onClick={onClose}
                  >
                    {item.label ?? item.key}
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
                          {child.label}
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
                {item.label ?? item.key}
              </Link>
            );
          })}

          {/* 페이지가 아닌 자리 — 문의(관리 화면에서는 로그아웃)와 관리 화면. 위 목록은 사이트의
              페이지고 이 둘은 행동이라, 줄 하나로 끊어 같은 층에 나란히 둔다 */}
          {(actionItem || adminHref) && (
            <div className={styles.menuAside}>
              {actionItem && (
                <Pressable noTapScale
                  className={`${styles.menuLink} ${styles.menuAsideAction} glith-on-hover`}
                  onClick={() => {
                    onClose();
                    if (isAdminPage) {
                      onLogout();
                    } else {
                      onContactOpen();
                    }
                  }}
                >
                  {actionItem.label ?? actionItem.key}
                </Pressable>
              )}
              {adminHref && (
                <Link href={adminHref} className={`${styles.menuLink} ${styles.menuAsideAdmin} glith-on-hover`} onClick={onClose}>
                  Admin
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Footer: email */}
        <div className={styles.menuFooter}>
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
