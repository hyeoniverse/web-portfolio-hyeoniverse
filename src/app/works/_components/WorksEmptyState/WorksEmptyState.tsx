"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { ArrowRight } from "@/components/icons";
import StarrySky from "./StarrySky";
import styles from "./WorksEmptyState.module.css";

/**
 * 보여줄 것이 하나도 없을 때의 작업물 목록(#1062).
 *
 * 발행한 작업물도, 연결된 GitHub 저장소도 없을 때만 여기까지 온다. 저장소가 있으면 그것이
 * 목록을 채우므로(getWorksProjects) 이 화면은 정말 비어 있을 때의 모습이다.
 *
 * 빈 가로 스크롤만 남겨 두면 고장인지 비어 있는 것인지 알 수 없다. 비어 있다고 말하고,
 * 그 말만 덩그러니 놓이지 않게 배경을 은하수와 별자리로 채운다.
 */
export default function WorksEmptyState() {
  const { t } = useLanguage();

  return (
    <section className={styles.empty}>
      <div className={styles.skyWrap} aria-hidden>
        <StarrySky />
      </div>

      <div className={styles.message}>
        <p className={styles.title}>{t("worksPage.emptyTitle")}</p>
        <p className={styles.sub}>{t("worksPage.emptySub")}</p>
        <Link href="/" className={styles.home}>
          {t("worksPage.backHome")}
          <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
