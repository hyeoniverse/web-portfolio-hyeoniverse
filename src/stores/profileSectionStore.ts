import { create } from "zustand";

interface ProfileSectionStore {
  activeSection: number;
  setActiveSection: (s: number) => void;
}

export const useProfileSectionStore = create<ProfileSectionStore>((set) => ({
  activeSection: 0,
  setActiveSection: (s) => set({ activeSection: s }),
}));
