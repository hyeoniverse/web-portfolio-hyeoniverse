"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import MagneticWrapper from "./MagneticWrapper";
import styles from "./Navigation.module.css";

interface MenuItem {
  key: string;
  href: string | null;
  label?: string;
}

interface MobileMenuProps {
  isOpen: boolean;
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
  isOpen: _isOpen,
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

  return createPortal(
    <div
      className={`${styles.menuClipWrapper} ${menuClipOpen ? styles.menuClipOpen : ""}`}
    >
      <div
        className={styles.menuBackdrop}
        onClick={onClose}
      />
      <div className={styles.menuDrawer}>
        {/* Header: logo center */}
        <div className={styles.menuHeader} onClick={onClose}>
          <Logo variant="full" as="link" className={styles.menuLogo} />
        </div>

        {/* Close button — nav 햄버거와 동일한 우상단 위치 + magnetic */}
        <MagneticWrapper strength={0.5} radius={50} className={styles.menuCloseBtn}>
          <button
            className={styles.menuCloseBtnInner}
            onClick={onClose}
            aria-label="Close menu"
          >
            <span className={styles.menuCloseDots}>
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
              <span className={styles.menuCloseDot} />
            </span>
          </button>
        </MagneticWrapper>

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
                className={`${styles.menuLink} glith-on-hover ${pathname === item.href || pathname.startsWith(item.href + "/") ? styles.menuLinkActive : ""}`}
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
