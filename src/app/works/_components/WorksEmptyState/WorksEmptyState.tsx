"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { ArrowRight } from "@/components/icons";
import CylinderLayout from "../layouts/CylinderLayout";
import StarrySky, { Constellations } from "./StarrySky";
import PetalDrift from "./PetalDrift";
import styles from "./WorksEmptyState.module.css";

/**
 * 보여줄 것이 하나도 없을 때의 작업물 목록(#1062).
 *
 * 발행한 작업물도, 연결된 GitHub 저장소도 없을 때만 여기까지 온다. 저장소가 있으면 그것이
 * 목록을 채우므로(getWorksProjects) 이 화면은 정말 비어 있을 때의 모습이다.
 *
 * 빈 가로 스크롤만 남겨 두면 고장인지 비어 있는 것인지 알 수 없다. 비어 있다고 말하고,
 * 그 말만 덩그러니 놓이지 않게 배경을 채운다. 배경은 테마에 따라 둘이다 — 어두운 쪽은 은하수와
 * 별자리가 있는 플라네타리움 돔, 밝은 쪽은 꽃잎이 내려오는 봄날이다. 밝은 바탕에 별을 뿌리면
 * 종이에 찍은 점으로 보여 하늘이 되지 않는다.
 *
 * 가운데에는 원통 배치를 작업물 0개로 그린다. 판과 인트로 글자는 그리지 않는다 — 보여줄 것이
 * 없는데 첫 칸만 덩그러니 띄울 이유가 없다. 몽이는 남긴다. 아무도 없는 화면은 고장 난 것처럼
 * 보인다.
 */
export default function WorksEmptyState() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  /* 문구는 설정에서 고칠 수 있다. 비워 두면 번역 파일의 기본 문장을 쓴다 —
     설정을 건드리지 않은 사이트도 빈 화면에 할 말이 있어야 한다 */
  const works = useSiteConfig().works as unknown as Record<string, string | undefined>;
  const pick = (key: string, fallback: string) =>
    (language === "ko" ? works[`${key}_ko`] || works[key] : works[key] || works[`${key}_ko`]) || fallback;

  return (
    <section className={styles.empty}>
      <div className={styles.skyWrap} aria-hidden>
        {theme === "dark" ? (
          <>
            <StarrySky />
            {/* 별자리는 하늘 그림과 따로 앉는다 — 한 그림에 두면 잘려 나간다 */}
            <Constellations />
          </>
        ) : (
          <PetalDrift />
        )}
      </div>

      {/* 작업물 0개 — 판도 인트로 글자도 그리지 않고 몽이만 남긴다. 누를 것이 없으니 전환도 없다 */}
      <div className={styles.stage}>
        <CylinderLayout projects={[]} onProjectClick={() => {}} bare />
      </div>

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
