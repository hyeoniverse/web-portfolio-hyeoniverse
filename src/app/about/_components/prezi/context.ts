"use client";

/* 프레지 — 페이지 전체가 하나의 별자리 세계이고, 카메라가 프레임(장면)에서 프레임으로 날아다닌다.
   장면 컴포넌트가 프레지 안에 있는지 · 지금 프레임인지 알 수 있게 하는 맥락 */
import { createContext, useContext, useEffect } from "react";

export interface PreziApi {
  /** 장의 앵커(#features 등)나 프레임 id 로 이동 */
  goTo: (target: string) => void;
  next: () => void;
  prev: () => void;
}

export const PreziContext = createContext<PreziApi | null>(null);
export interface FrameApi {
  /** 지금 카메라가 맞춘 프레임인지 */
  current: boolean;
  /** 프레임 안 단계(프레지의 "애니메이션 단계") — 휠 · 키 한 번이 먼저 이 단계를 넘기고, 끝나면 다음 프레임으로 */
  step: number;
  setSteps: (n: number) => void;
  setStep: (i: number) => void;
  /** 휠 · 키 · 스와이프 한 걸음을 장면이 먼저 받는다 — true 를 돌려주면 그 걸음은 장면이 쓴 것(단계 · 프레임이 안 넘어간다).
      null 이면 해제. 프레임을 떠나면 저절로 풀린다 */
  setIntercept: (fn: ((dir: 1 | -1) => boolean) | null) => void;
}

export const FrameContext = createContext<FrameApi>({ current: true, step: 0, setSteps: () => {}, setStep: () => {}, setIntercept: () => {} });

export const usePrezi = () => useContext(PreziContext);
export const useFrame = () => useContext(FrameContext);

/**
 * 프레임 안 단계 — 장면이 n 단계로 나뉘어 있으면 등록한다. 휠 · ↓ · 스와이프 한 번이 다음 단계로, 마지막 단계에서 한 번 더면
 * 다음 프레임으로 간다. 이전 프레임에서 거꾸로 들어오면 마지막 단계부터 보인다.
 * 돌려주는 step 으로 그 단계의 화면을 그리고, setStep 으로 눌러서 단계를 바꿀 수 있다(점 · 탭 등).
 * 프레지 밖(페이지 스크롤)에서는 step 0 · setStep 은 아무 일도 안 한다 — 그때는 장면이 스스로 상태를 쥔다.
 */
export function useFrameSteps(n: number) {
  const f = useContext(FrameContext);
  const { current, setSteps } = f;
  useEffect(() => {
    if (current) setSteps(n);
  }, [current, n, setSteps]);
  return { step: Math.min(f.step, n - 1), setStep: f.setStep, current };
}

/** 하늘(TimeSky)에 프레지 진행(0~1)을 알리는 이벤트 */
export const PREZI_PROGRESS_EVENT = "prezi-progress";
/** 마지막으로 알린 진행 — 하늘이 나중에 구독해도(날씨를 받아 다시 그릴 때 등) 지금 자리에서 시작하게 */
export const preziState: { p: number | null } = { p: null };
