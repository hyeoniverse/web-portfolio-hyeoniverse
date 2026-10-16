"use client";

/* 허브 — 프레지 세계의 가운데. 큰 별자리 지도와 짧은 소개. 별(이름)을 누르면 카메라가 그 별로 날아 들어간다.
   별마다 그 장의 장면들이 작게 들어 있다(PreziStage 가 별 자리에 무리를 놓는다) */
import { useLayoutEffect, useRef } from "react";
import { hero, type L10n } from "../../_data/showcase";
import { useLanguage } from "@/providers/LanguageProvider";
import { LiveRow, type LiveInfo } from "../AboutNext";
import { HeroCta } from "../landing/Landing";
import ChapterMap from "../map/ChapterMap";
import { usePrezi } from "./context";
import type { MapBox } from "./layout";
import { useL, useTouchInput } from "../features/shared";
import styles from "./Prezi.module.css";

const HINT: L10n = {
  ko: "별을 누르면 그 장으로, 아래로 굴리면 처음부터 차례로 날아갑니다.",
  en: "Click a star to jump to its chapter, or scroll to go through them in order.",
};
/* 손가락으로 쓰는 기기 — 누르기 · 쓸어 넘기기 */
const HINT_TOUCH: L10n = {
  ko: "별을 누르면 그 장으로, 위로 쓸어 넘기면 처음부터 차례로 날아갑니다.",
  en: "Tap a star to jump to its chapter, or swipe up to go through them in order.",
};

export default function Hub({ live, map, onIntro }: { live: LiveInfo; map: MapBox; onIntro?: (bottom: number) => void }) {
  const { language, tx } = useLanguage();
  const L = useL();
  const touch = useTouchInput();
  const prezi = usePrezi();
  /* 다른 언어로 볼 때는 영어 조각을 About 글 번역(tx)으로 */
  const lead = language === "ko" ? hero.lead.ko : { before: tx(hero.lead.en.before), accent: tx(hero.lead.en.accent), after: tx(hero.lead.en.after) };
  /* 소개 글의 아래 끝 — 좁은 화면은 지도를 그 아래에 놓는다(글 길이가 언어 · 폭마다 달라 잰다) */
  const introRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = introRef.current;
    if (!el || !onIntro) return;
    const read = () => onIntro(el.offsetTop + el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onIntro]);
  return (
    <div className={styles.hub}>
      <div ref={introRef} className={styles.hubIntro}>
        <LiveRow live={live} />
        <h1 className={styles.hubLead}>
          {lead.before}
          <em>{lead.accent}</em>
          {lead.after}
        </h1>
        <p className={styles.hubHint}>{L(touch ? HINT_TOUCH : HINT)}</p>
        <HeroCta />
      </div>
      <ChapterMap
        className={styles.hubMap}
        geo={map.geo}
        style={{ position: "absolute", left: map.x, top: map.y, width: map.w }}
        onPick={(href) => prezi?.goTo(href)}
      />
    </div>
  );
}
