"use client";

/* ── 라이브러리 (settings > 라이브러리) ──
   여러 글·프로젝트가 함께 쓰는 자료 — 공유 달력, 투표 결과, 커스텀 이모지, 커버 이미지 기록, 업로드한 파일. 사이트 설정값(siteConfig)이 아니라
   각자 API 로 바로 저장되므로 탭의 저장/되돌리기와 상관없다. 예전엔 달력이 콘텐츠 탭의 서브탭이었고
   커스텀 이모지는 에디터 피커 안에서만 보였다.
   한 페이지에 차례로 놓되, 목록마다 화면에 가까워졌을 때 그리고 불러온다(LazySection). 다섯을 한꺼번에
   불러오면 업로드한 파일이 저장소 전체와 모든 글을 훑느라 탭이 늦게 떴다. */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { LibrarySection } from "../_data/settingsConstants";
import lib from "./Library.module.css";

const SECTIONS: { id: LibrarySection; ko: string; en: string; Manager: ComponentType }[] = [
  { id: "calendars", ko: "달력", en: "Calendars", Manager: dynamic(() => import("./CalendarManager")) },
  { id: "polls", ko: "투표", en: "Polls", Manager: dynamic(() => import("./PollManager")) },
  { id: "emojis", ko: "커스텀 이모지", en: "Custom emojis", Manager: dynamic(() => import("./CustomEmojiManager")) },
  { id: "covers", ko: "커버 이미지 기록", en: "Cover image history", Manager: dynamic(() => import("./CoverHistoryManager")) },
  { id: "files", ko: "업로드한 파일", en: "Uploaded files", Manager: dynamic(() => import("./MediaManager")) },
];

/** 화면 가까이(위아래 600px) 오면 한 번 그린다. 그 전엔 자리만 잡아 둔다(섹션 바로가기가 라벨을 읽는다) */
function LazySection({ id, label, eager, focus, children }: { id: string; label: string; eager: boolean; focus: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(eager || focus);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  /* ?sub=<섹션> 딥링크 — 그린 뒤 그 섹션으로 내린다 */
  useEffect(() => {
    if (!focus) return;
    const raf = requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [focus]);

  return (
    <div ref={ref} id={`library-${id}`} className={shown ? lib.lazy : lib.lazyPending} data-settings-section data-section-label={label}>
      {shown ? children : null}
    </div>
  );
}

export default function LibraryTab({ focus }: { focus?: LibrarySection }) {
  const { language } = useLanguage();
  return (
    <>
      {SECTIONS.map(({ id, ko, en, Manager }, i) => (
        <LazySection key={id} id={id} label={language === "ko" ? ko : en} eager={i === 0} focus={focus === id}>
          <Manager />
        </LazySection>
      ))}
    </>
  );
}
