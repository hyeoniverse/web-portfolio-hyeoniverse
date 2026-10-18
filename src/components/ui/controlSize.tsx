"use client";

/**
 * 컨트롤 높이 범위 — 감싼 영역 안의 공용 컨트롤(Button · Select · Input · HighlightInput · SegmentedControl ·
 * SearchCapsule · Pagination)을 한 높이(사이트 기본 md, --control-height-md)로 맞춘다. 각자 넘긴 size 보다 이 범위가 이긴다.
 * 스위치 · 체크박스는 모양을 키우지 않고 차지하는 높이(줄 높이)만 같게 한다.
 *
 * 설정 페이지처럼 줄마다 단추 · 입력 · 셀렉트 · 세그먼트가 섞이는 화면에서, 파일마다 size 를 고치다 보면 빠뜨려
 * 24 · 28 · 32 가 섞였다. 범위 하나로 묶으면 새로 넣는 컨트롤도 따라온다.
 *
 * 안쪽의 작은 조작으로 배치가 짜인 부품(색 선택기 · 날짜 선택기 · 이모지 선택기 · 한 틀 안에 컨트롤을 녹인 막대 등)은
 * <ControlSizeScope size={null}> 로 범위를 푼다 — 포털로 뜬 팝업도 React 트리를 따라 범위를 물려받기 때문이다.
 * 범위 안에서 한 줄만 작게 둘 때(설정 섹션 머리의 기본값 · 되돌리기 · 저장 — 영어 화면 좁은 폭에서 두 줄로 꺾였다)는
 * <ControlSizeScope size="sm"> 로 다시 감싼다.
 */
import { createContext, useContext, type ReactNode } from "react";

type ScopeSize = "md" | "sm" | null;

const ControlSizeContext = createContext<ScopeSize>(null);

export function ControlSizeScope({ size, children }: { size: ScopeSize; children: ReactNode }) {
  return <ControlSizeContext.Provider value={size}>{children}</ControlSizeContext.Provider>;
}

/** 범위가 있으면 그 크기(md · sm), 없으면 넘긴 크기 그대로 */
export function useScopedSize<T extends string>(size: T): T | "md" | "sm" {
  const scoped = useContext(ControlSizeContext);
  return scoped ?? size;
}

/** md 범위 안인지 — 스위치 · 체크박스 · 숫자 입력처럼 size 가 아니라 높이(md)로 맞추는 쪽이 쓴다 */
export function useInControlSizeScope(): boolean {
  return useContext(ControlSizeContext) === "md";
}
