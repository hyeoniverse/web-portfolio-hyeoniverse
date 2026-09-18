"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { ArrowRight } from "@/components/icons";
import CylinderIntroPanel from "../layouts/cylinder/CylinderIntroPanel";
import StarrySky from "./StarrySky";
import styles from "./WorksEmptyState.module.css";

/**
 * 보여줄 것이 하나도 없을 때의 작업물 목록(#1062).
 *
 * 발행한 작업물도, 연결된 GitHub 저장소도 없을 때만 여기까지 온다. 저장소가 있으면 그것이
 * 목록을 채우므로(getWorksProjects) 이 화면은 정말 비어 있을 때의 모습이다.
 *
 * 빈 가로 스크롤만 남겨 두면 고장인지 비어 있는 것인지 알 수 없다. 비어 있다고 말하고,
 * 그 말만 덩그러니 놓이지 않게 배경을 은하수와 별자리로 채운다. 하늘은 천천히 흐르고 포인터를
 * 따라 층마다 다르게 밀린다(StarrySky).
 *
 * 가운데에는 원통 배치의 첫 인트로 패널을 그대로 쓴다 — 작업물이 없다고 사이트의 첫 얼굴까지
 * 사라질 이유가 없고, 그 패널의 문구(라벨·제목·한 줄)는 이미 설정에서 고칠 수 있다.
 */
export default function WorksEmptyState() {
  const { t, language } = useLanguage();
  /* 문구는 설정에서 고칠 수 있다. 비워 두면 번역 파일의 기본 문장을 쓴다 —
     설정을 건드리지 않은 사이트도 빈 화면에 할 말이 있어야 한다 */
  const works = useSiteConfig().works as unknown as Record<string, string | undefined>;
  const pick = (key: string, fallback: string) =>
    (language === "ko" ? works[`${key}_ko`] || works[key] : works[key] || works[`${key}_ko`]) || fallback;

  return (
    <section className={styles.empty}>
      <div className={styles.skyWrap} aria-hidden>
        <StarrySky />
      </div>

      {/* 원통 배치의 첫 패널 — 생김새·자리 그대로. 화면 가운데에 고정된다 */}
      <CylinderIntroPanel standalone />

      <div className={styles.message}>
        <p className={styles.title}>{pick("emptyTitle", t("worksPage.emptyTitle"))}</p>
        <p className={styles.sub}>{pick("emptySub", t("worksPage.emptySub"))}</p>
        <Link href="/" className={styles.home}>
          {t("worksPage.backHome")}
          <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
