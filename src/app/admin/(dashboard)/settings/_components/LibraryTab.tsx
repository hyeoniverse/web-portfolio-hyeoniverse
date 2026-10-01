"use client";

/* ── 라이브러리 (settings > 라이브러리) ──
   여러 글·프로젝트가 함께 쓰는 자료 — 공유 달력, 투표 결과, 커스텀 이모지, 커버 이미지 기록, 업로드한 파일. 사이트 설정값(siteConfig)이 아니라
   각자 API 로 바로 저장되므로 탭의 저장/되돌리기와 상관없다. 예전엔 달력이 콘텐츠 탭의 서브탭이었고
   커스텀 이모지는 에디터 피커 안에서만 보였다. */
import CalendarManager from "./CalendarManager";
import CustomEmojiManager from "./CustomEmojiManager";
import PollManager from "./PollManager";
import CoverHistoryManager from "./CoverHistoryManager";
import MediaManager from "./MediaManager";

export default function LibraryTab() {
  return (
    <>
      <CalendarManager />
      <PollManager />
      <CustomEmojiManager />
      <CoverHistoryManager />
      <MediaManager />
    </>
  );
}
