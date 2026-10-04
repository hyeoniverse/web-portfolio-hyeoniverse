"use client";

/* ── 읽기 사전 (settings > 서비스) ──
   슬라이드 음성을 만들 때 대본의 표기(코드·약어)를 읽을 말로 바꾸는 사전(lib/ttsLexicon).
   편집기는 갤러리 음성 편집의 창과 같이 쓴다(LexiconEditor). 바꾸는 즉시 저장되므로
   이 탭은 위쪽의 "탭 저장 / 되돌리기"와 상관없다. */
import { useEffect, useRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import LexiconEditor from "@/components/works/LexiconEditor";
import settings from "../Settings.module.css";
import styles from "./LexiconManager.module.css";

const LEXICON_SECTION_ID = "tts-lexicon";

export default function LexiconManager() {
  const { t } = useLanguage();
  /* 편집 화면의 "설정에서 전체 관리"는 #tts-lexicon 으로 온다 — 탭 내용이 늦게 그려져 브라우저가 스스로 못 찾아가고,
     페이지 스크롤은 Lenis 가 맡아 scrollIntoView 도 먹히지 않는다. 위쪽 섹션이 자리를 잡은 뒤 Lenis 로 옮긴다 */
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useLenis();
  useEffect(() => {
    if (window.location.hash !== `#${LEXICON_SECTION_ID}`) return;
    const id = window.setTimeout(() => { if (ref.current) scrollTo(ref.current, { offset: -120 }); }, 700);
    return () => window.clearTimeout(id);
  }, [scrollTo]);
  return (
    <section ref={ref} id={LEXICON_SECTION_ID} className={`${settings.section} ${settings.sectionWide}`}>
      <div className={styles.wrap}>
        <h2 className={settings.sectionTitle}>{t("admin.settings.lexicon.title")}</h2>
        <p className={settings.sectionHint}>{t("admin.settings.lexicon.hint")}</p>
        <div className={styles.body}>
          <LexiconEditor />
        </div>
      </div>
    </section>
  );
}
