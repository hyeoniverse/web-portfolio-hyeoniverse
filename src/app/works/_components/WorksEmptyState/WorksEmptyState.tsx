"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { ArrowRight } from "@/components/icons";
import CylinderLayout from "../layouts/CylinderLayout";
import StarrySky, { Constellations } from "./StarrySky";
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
 * 가운데에는 원통 배치를 작업물 0개로 그린다 — 그러면 그 배치의 첫 칸(몽이가 있는 검붉은 인트로
 * 패널)만 남는다. 패널을 따로 만들지 않는 건 그것이 3D 판·몽이·DOM 오버레이가 맞물린 것이라,
 * 흉내 내면 곧 원본과 달라지기 때문이다. 작업물이 없다고 사이트의 첫 얼굴까지 사라질 이유는 없다.
 */
export default function WorksEmptyState() {
  const { t, language } = useLanguage();
  const rootRef = useRef<HTMLElement>(null);
  /* 3D 판이 펴지며 옅어지는 정도 — 씬은 매 프레임 이 값을 읽는다. 글자는 CSS 변수로 같이 사라지고,
     몽이는 어느 쪽도 건드리지 않아 그대로 남는다(#1062) */
  const panelFadeRef = useRef(0);

  /* 스크롤하면 패널이 배경으로 녹아든다(#1062).
     인트로 칸만 있는 화면에서는 원통을 굴리지 않는다(frozen). 그러면 글자와 몽이가 제자리에 남고,
     휠·끌기의 양은 이 화면이 받아 0~1 로 환산해 판이 펴지는 정도로 쓴다.
     상태가 아니라 CSS 변수와 ref 로 쓴다 — 휠은 초당 수십 번 오므로 다시 그리면 3D 가 같이 버벅인다. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let progress = 0;
    let frame = 0;
    const write = () => {
      frame = 0;
      el.style.setProperty("--dissolve", progress.toFixed(3));
      panelFadeRef.current = progress;
    };
    /* 어느 쪽으로 굴려도 앞으로 간다 — 이 화면에는 내려갈 곳이 없어서 "아래로 굴리면 진행,
       위로 굴리면 되감기" 는 어느 쪽이 맞는지 알 수 없다. 움직인 양만 센다.
       한 화면 높이쯤 굴리면 판이 다 펴진다 */
    const advance = (delta: number) => {
      progress = Math.min(1, progress + Math.abs(delta) / (window.innerHeight * 0.9));
      if (!frame) frame = requestAnimationFrame(write);
    };

    const onWheel = (event: WheelEvent) => advance(event.deltaY);
    let lastTouchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => { lastTouchY = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y === undefined || lastTouchY === null) return;
      advance(lastTouchY - y);
      lastTouchY = y;
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  /* 문구는 설정에서 고칠 수 있다. 비워 두면 번역 파일의 기본 문장을 쓴다 —
     설정을 건드리지 않은 사이트도 빈 화면에 할 말이 있어야 한다 */
  const works = useSiteConfig().works as unknown as Record<string, string | undefined>;
  const pick = (key: string, fallback: string) =>
    (language === "ko" ? works[`${key}_ko`] || works[key] : works[key] || works[`${key}_ko`]) || fallback;

  return (
    <section ref={rootRef} className={styles.empty}>
      <div className={styles.skyWrap} aria-hidden>
        <StarrySky />
        {/* 별자리는 하늘 그림과 따로 앉는다 — 한 그림에 두면 잘려 나간다 */}
        <Constellations />
      </div>

      {/* 작업물 0개 — 원통에는 인트로 칸만 남는다. 누를 작업물이 없으니 전환도 없다 */}
      <div className={styles.stage}>
        <CylinderLayout projects={[]} onProjectClick={() => {}} bare panelFadeRef={panelFadeRef} />
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
