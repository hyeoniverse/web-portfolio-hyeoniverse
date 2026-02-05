"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================
// Types
// ============================================
export interface FontConfig {
  name: string;
  family: string;
  weight?: number;
  style?: "normal" | "italic";
}

export interface UseFontMorphOptions {
  fonts: FontConfig[];
  autoPlay?: boolean;
  interval?: number;
  initialFontIndex?: number;
}

export interface UseFontMorphResult {
  currentFont: FontConfig;
  currentIndex: number;
  isPlaying: boolean;
  nextFont: () => void;
  prevFont: () => void;
  setFont: (index: number) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  toggleAutoPlay: () => void;
}

// ============================================
// Default Fonts
// ============================================
export const DEFAULT_FONTS: FontConfig[] = [
  { name: "Playfair", family: "var(--font-playfair)", weight: 400 },
  { name: "Bebas", family: "var(--font-bebas)", weight: 400 },
  { name: "Space Grotesk", family: "var(--font-space-grotesk)", weight: 500 },
  { name: "Cormorant", family: "var(--font-cormorant)", weight: 500 },
  { name: "Abril", family: "var(--font-abril)", weight: 400 },
  { name: "Instrument", family: "var(--font-instrument)", weight: 400 },
  { name: "Inter", family: "var(--font-inter)", weight: 700 },
  { name: "JetBrains", family: "var(--font-jetbrains)", weight: 500 },
];

// ============================================
// Hook
// ============================================
export function useFontMorph(options: UseFontMorphOptions): UseFontMorphResult {
  const {
    fonts,
    autoPlay = false,
    interval = 2000,
    initialFontIndex = 0,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(initialFontIndex);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentFont = fonts[currentIndex] || fonts[0];

  const nextFont = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % fonts.length);
  }, [fonts.length]);

  const prevFont = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + fonts.length) % fonts.length);
  }, [fonts.length]);

  const setFont = useCallback(
    (index: number) => {
      if (index >= 0 && index < fonts.length) {
        setCurrentIndex(index);
      }
    },
    [fonts.length]
  );

  const startAutoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const stopAutoPlay = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        nextFont();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, interval, nextFont]);

  return {
    currentFont,
    currentIndex,
    isPlaying,
    nextFont,
    prevFont,
    setFont,
    startAutoPlay,
    stopAutoPlay,
    toggleAutoPlay,
  };
}
