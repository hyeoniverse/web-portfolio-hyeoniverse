import { create } from "zustand";

interface SoundStore {
  isMuted: boolean;
  toggleMute: () => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  isMuted: true,

  toggleMute: () =>
    set((state) => ({ isMuted: !state.isMuted })),
}));
