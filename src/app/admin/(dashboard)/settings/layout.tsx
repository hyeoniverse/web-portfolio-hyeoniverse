import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ControlSizeScope } from "@/components/ui/controlSize";

export const metadata: Metadata = { title: "Settings" };

/* 설정 페이지의 모든 탭 — 단추 · 입력 · 셀렉트 · 세그먼트 · 검색창 · 숫자 입력은 한 높이(사이트 기본 sm), 스위치 · 체크박스는 같은 줄 높이.
   파일마다 size 를 고치다 보면 24 · 28 · 32 가 섞여 줄마다 높이가 들쭉날쭉했다(ui/controlSize) */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <ControlSizeScope size="sm">{children}</ControlSizeScope>;
}
