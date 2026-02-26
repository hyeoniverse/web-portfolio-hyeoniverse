import { create } from "zustand";

type BunnyExpression = "normal" | "surprised" | "happy" | null;

interface ProfileSectionStore {
  activeSection: number;
  setActiveSection: (s: number) => void;
  bunnyExpression: BunnyExpression;
  setBunnyExpression: (e: BunnyExpression) => void;
}

export const useProfileSectionStore = create<ProfileSectionStore>((set) => ({
  activeSection: 0,
  setActiveSection: (s) => set({ activeSection: s }),
  bunnyExpression: null,
  setBunnyExpression: (e) => set({ bunnyExpression: e }),
}));
