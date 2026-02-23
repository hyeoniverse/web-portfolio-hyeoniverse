import { create } from "zustand";

interface SoundStore {
  isMuted: boolean;
  hydrated: boolean;
  toggleMute: () => void;
  hydrate: () => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  // SSR-safe: 항상 false로 시작, hydrate() 호출 후 localStorage 동기화
  isMuted: false,
  hydrated: false,

  toggleMute: () =>
    set((state) => {
      const next = !state.isMuted;
      localStorage.setItem("sound-muted", String(next));
      return { isMuted: next };
    }),

  hydrate: () =>
    set(() => {
      const stored = localStorage.getItem("sound-muted") === "true";
      return { isMuted: stored, hydrated: true };
    }),
}));
