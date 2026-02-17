"use client";

import { useCallback, useRef } from "react";
import { createSoundTone } from "@/utils";
import { SOUND_FREQUENCIES } from "@/constants";
import type { SoundType } from "@/types";

interface SoundManager {
  playSound: (soundType: SoundType) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export function useSoundManager(): SoundManager {
  const audioContextRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef(0.3);
  const isMutedRef = useRef(false);

  const typingBufferRef = useRef<AudioBuffer | null>(null);
  const lastTypingPlayTimeRef = useRef(0);
  const TYPING_MIN_INTERVAL = 50;

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      // Typing mp3 로드 (첫 인터랙션 시점)
      fetch("/sounds/typing.mp3")
        .then((res) => res.arrayBuffer())
        .then((data) =>
          audioContextRef.current!.decodeAudioData(data, (buffer) => {
            typingBufferRef.current = buffer;
          })
        );
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (soundType: SoundType) => {
      if (isMutedRef.current) return;

      try {
        const audioContext = initAudioContext();
        const volume = volumeRef.current;

        switch (soundType) {
          case "click":
            createSoundTone(
              audioContext,
              SOUND_FREQUENCIES.CLICK.primary,
              0.1,
              volume,
              "sine"
            );
            setTimeout(
              () =>
                createSoundTone(
                  audioContext,
                  SOUND_FREQUENCIES.CLICK.secondary,
                  0.05,
                  volume,
                  "sine"
                ),
              50
            );
            break;

          case "hover":
            createSoundTone(
              audioContext,
              SOUND_FREQUENCIES.HOVER.primary,
              0.15,
              volume,
              "sine"
            );
            break;

          case "success":
            createSoundTone(
              audioContext,
              SOUND_FREQUENCIES.SUCCESS.c,
              0.1,
              volume,
              "sine"
            );
            setTimeout(
              () =>
                createSoundTone(
                  audioContext,
                  SOUND_FREQUENCIES.SUCCESS.e,
                  0.1,
                  volume,
                  "sine"
                ),
              100
            );
            setTimeout(
              () =>
                createSoundTone(
                  audioContext,
                  SOUND_FREQUENCIES.SUCCESS.g,
                  0.2,
                  volume,
                  "sine"
                ),
              200
            );
            break;

          case "error":
            createSoundTone(
              audioContext,
              SOUND_FREQUENCIES.ERROR.primary,
              0.3,
              volume,
              "sawtooth"
            );
            break;

          case "typing":
            const now = performance.now();
            if (
              audioContext &&
              typingBufferRef.current &&
              now - lastTypingPlayTimeRef.current > TYPING_MIN_INTERVAL
            ) {
              const source = audioContext.createBufferSource();
              source.buffer = typingBufferRef.current;
              source.connect(audioContext.destination);
              source.start(0);
              lastTypingPlayTimeRef.current = now;
            }
            break;
        }
      } catch (error) {
        console.warn("Audio playback failed:", error);
      }
    },
    [initAudioContext]
  );

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
  }, []);

  return {
    playSound,
    setVolume,
    toggleMute,
  };
}
