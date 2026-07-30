"use client";

import { create } from "zustand";

interface CircleRevealState {
  isTransitioning: boolean;
  circleData: {
    centerX: number;
    centerY: number;
    size: number;
    image: string;
  } | null;
  startTransition: (data: {
    centerX: number;
    centerY: number;
    size: number;
    image: string;
  }) => void;
  endTransition: () => void;
}

export const usePageTransition = create<CircleRevealState>((set) => ({
  isTransitioning: false,
  circleData: null,
  startTransition: (data) => set({ isTransitioning: true, circleData: data }),
  endTransition: () => set({ isTransitioning: false, circleData: null }),
}));
