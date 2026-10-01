"use client";

/* ── 라이브러리 (settings > 라이브러리) ──
   여러 글·프로젝트가 함께 쓰는 자료 — 공유 달력, 투표 결과, 커스텀 이모지, 커버 이미지 기록, 업로드한 파일. 사이트 설정값(siteConfig)이 아니라
   각자 API 로 바로 저장되므로 탭의 저장/되돌리기와 상관없다. 예전엔 달력이 콘텐츠 탭의 서브탭이었고
   커스텀 이모지는 에디터 피커 안에서만 보였다.
   다섯 목록을 한꺼번에 띄우면 저장소 전체와 모든 글을 동시에 훑느라 탭이 한참 늦게 떴다 —
   하위탭으로 나눠 보고 있는 목록만 그리고 불러온다. */
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LibrarySubTab } from "../_data/settingsConstants";

const MANAGERS: Record<LibrarySubTab, ComponentType> = {
  calendars: dynamic(() => import("./CalendarManager")),
  polls: dynamic(() => import("./PollManager")),
  emojis: dynamic(() => import("./CustomEmojiManager")),
  covers: dynamic(() => import("./CoverHistoryManager")),
  files: dynamic(() => import("./MediaManager")),
};

export default function LibraryTab({ sub }: { sub: LibrarySubTab }) {
  const Manager = MANAGERS[sub];
  return <Manager />;
}
