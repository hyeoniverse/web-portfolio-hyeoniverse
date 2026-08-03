"use client";

import { Fragment, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import styles from "./Navigation.module.css";

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
  contactEmail,
  onClose,
  onContactOpen,
  onLogout,
}: MobileMenuProps) {
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

        <nav className={styles.menuNav}>
          {menuItems.map((item) => {
            if (!item.href) {
              return (
                <button
                  key={item.key}
                  className={`${styles.menuLink} glith-on-hover`}
                  onClick={() => {
                    onClose();
                    if (isAdminPage) {
                      onLogout();
                    } else {
                      onContactOpen();
                    }
                  }}
                >
                  {item.label ?? item.key}
                </button>
              );
            }
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
