"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import styles from "./Navigation.module.css";

interface MenuItem {
  key: string;
  href: string | null;
  label?: string;
}

interface MobileMenuProps {
  showMenu: boolean;
  menuClipOpen: boolean;
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
  menuMounted,
  pathname,
  isAdminPage,
  menuItems,
  contactEmail,
  onClose,
  onContactOpen,
  onLogout,
}: MobileMenuProps) {
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
      className={`${styles.menuClipWrapper} ${menuClipOpen ? styles.menuClipOpen : ""}`}
    >
      <div
        className={styles.menuBackdrop}
        onClick={onClose}
      />
      <div className={styles.menuDrawer}>
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
            className={styles.menuFooterEmail}
          >
            {contactEmail}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
