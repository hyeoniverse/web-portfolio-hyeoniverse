import { create } from "zustand";

/** 음소거 상태 저장 키 — 탭 간 공유 + 새로고침 유지 (storage 이벤트로 다른 탭에 전파).
 *  값: "0" = 소리 켬(unmuted), 그 외/없음 = 음소거. */
export const BGM_MUTED_KEY = "bgm-muted";

function persist(muted: boolean) {
  try {
    localStorage.setItem(BGM_MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* private mode 등 — 무시 */
  }
}

interface SoundStore {
  isMuted: boolean;
  /** 사용자가 토글 — 로컬 상태 + localStorage(다른 탭이 storage 이벤트로 수신) */
  toggleMute: () => void;
  /** 다른 탭에서 온 상태 반영 — localStorage 를 다시 쓰지 않아 이벤트 루프 방지 */
  syncMuted: (muted: boolean) => void;
}

/** 초기값은 항상 음소거(true) — SSR/hydration 일치.
 *  실제 저장값은 useBGM 이 마운트 후 syncMuted 로 반영한다. */
export const useSoundStore = create<SoundStore>((set, get) => ({
  isMuted: true,

  toggleMute: () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    persist(next);
  },

  syncMuted: (muted) => {
    if (get().isMuted !== muted) set({ isMuted: muted });
  },
}));
