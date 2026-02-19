import { create } from "zustand";

interface SoundStore {
  isMuted: boolean;
  toggleMute: () => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  isMuted:
    typeof window !== "undefined"
      ? localStorage.getItem("sound-muted") === "true"
      : false,

  toggleMute: () =>
    set((state) => {
      const next = !state.isMuted;
      localStorage.setItem("sound-muted", String(next));
      return { isMuted: next };
    }),
}));
