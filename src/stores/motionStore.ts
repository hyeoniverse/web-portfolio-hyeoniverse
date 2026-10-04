import { create } from "zustand";

/** 움직임 멈춤 상태 저장 키 — 탭 간 공유 + 새로고침 유지(storage 이벤트로 다른 탭에 전파).
 *  값: "1" = 멈춤, "0" = 움직임, 없음 = 시스템 설정(prefers-reduced-motion)을 따른다. */
export const MOTION_PAUSED_KEY = "motion-paused";

function persist(paused: boolean) {
  try {
    localStorage.setItem(MOTION_PAUSED_KEY, paused ? "1" : "0");
  } catch {
    /* private mode 등 — 무시 */
  }
}

interface MotionStore {
  /** 5초 넘게 저절로 움직이는 것(마퀴 · 반복 애니메이션 · 배경 영상)을 멈춘 상태(3.9-4) */
  isPaused: boolean;
  /** 사용자가 토글 — 로컬 상태 + localStorage(다른 탭이 storage 이벤트로 수신) */
  togglePaused: () => void;
  /** 저장값 · 다른 탭에서 온 상태 반영 — localStorage 를 다시 쓰지 않아 이벤트 루프 방지 */
  syncPaused: (paused: boolean) => void;
}

/** 초기값은 항상 false — SSR/hydration 일치. 실제 값은 useMotionPause 가 마운트 후 syncPaused 로 반영한다. */
export const useMotionStore = create<MotionStore>((set, get) => ({
  isPaused: false,

  togglePaused: () => {
    const next = !get().isPaused;
    set({ isPaused: next });
    persist(next);
  },

  syncPaused: (paused) => {
    if (get().isPaused !== paused) set({ isPaused: paused });
  },
}));

/** 멈춤 상태만 구독한다 — JS 로 도는 것(자동 넘김 · 떠다니기 · 데모 시계)이 3.9-4 를 따를 때 */
export const useMotionPaused = () => useMotionStore((s) => s.isPaused);
