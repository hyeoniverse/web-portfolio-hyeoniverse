"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { isPlainClick } from "@/utils/gestureUtils";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useContactStore } from "@/stores/contactStore";
import styles from "./LandingNav.module.css";

/**
 * 랜딩으로 그리는 작업물 상세의 메뉴 — andreasantonsson.dev 처럼 왼쪽에 이름 · 한 줄 소개, 오른쪽에 글자 링크 셋.
 * 사이트 메뉴(로고 · 언어 · 소리 · 테마 · 서랍)는 그리지 않는다. 화면에 붙지 않고 페이지 맨 위에 놓여 함께 올라간다
 * (붙여 두면 화면 폭 캡처 · 검정 섹션 위에서 글자가 묻혔다).
 */
export default function LandingNav({ name }: { name: string }) {
  const siteConfig = useSiteConfig();
  const { t } = useLanguage();
  const { openForm } = useContactStore();
  const { navigateWithSlide } = usePageTransition();
  /* 메뉴로 떠날 때도 랜딩과 같은 판 전환(오른쪽에서) — 새 탭 클릭은 막지 않는다 */
  const slideTo = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    navigateWithSlide(href, "right");
  };
  const label = (key: string, fallback: string) => {
    const v = t(`navMenu.label.${key}`);
    return v === `navMenu.label.${key}` ? fallback : v;
  };
  return (
    <nav aria-label={t("navMenu.ui.mainMenu")} className={styles.bar}>
      <Link href="/" className={styles.brand} onClick={slideTo("/")}>
        <span className={styles.name}>{name}</span>
        {siteConfig.personal.role && <span className={styles.role}>{siteConfig.personal.role}</span>}
      </Link>
      <ul className={styles.links}>
        <li><Link href="/works" className={styles.link} onClick={slideTo("/works")}>{label("works", "Works")}</Link></li>
        <li><Link href="/about" className={styles.link} onClick={slideTo("/about")}>{label("about", "About")}</Link></li>
        <li>
          <Pressable noTapScale className={`${styles.link} ${styles.linkButton}`} onClick={openForm}>
            {t("navMenu.ui.getInTouch")}
          </Pressable>
        </li>
      </ul>
    </nav>
  );
}
