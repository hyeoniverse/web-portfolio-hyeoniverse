"use client";

import { useEffect, useRef } from "react";
import { useSoundStore } from "@/stores/soundStore";

const BGM_URL = "/sounds/Louie Zong - Ghost Duet.mp3";
const FADE_IN_MS = 1000;
const FADE_OUT_MS = 500;
const TARGET_VOLUME = 0.35;

/**
 * HTMLAudioElement 기반 BGM 재생.
 * Web Audio API(AudioContext + BufferSource) 대신 브라우저 네이티브 미디어 파이프라인 사용 —
 * 하드웨어 가속 디코딩 + 별도 프로세스 처리로 메인 스레드 부하 최소화.
 */
export function useBGM() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    function fade(to: number, duration: number) {
      cancelAnimationFrame(fadeRafRef.current);
      const audio = audioRef.current;
      if (!audio) return;

      const from = audio.volume;
      const start = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        audio.volume = from + (to - from) * t;

        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(step);
        } else if (to === 0) {
          audio.pause();
        }
      };

      fadeRafRef.current = requestAnimationFrame(step);
    }

    function initAndPlay() {
      if (startedRef.current) return;
      startedRef.current = true;

      const audio = new Audio(BGM_URL);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = "auto";
      audioRef.current = audio;

      audio.play()
        .then(() => {
          if (disposed) { audio.pause(); return; }
          fade(TARGET_VOLUME, FADE_IN_MS);
        })
        .catch(() => {
          startedRef.current = false;
        });
    }

    function onGesture() {
      if (useSoundStore.getState().isMuted) return;
      document.removeEventListener("click", onGesture);
      initAndPlay();
    }

    document.addEventListener("click", onGesture);

    // zustand subscribe — mute/unmute 반응
    const unsub = useSoundStore.subscribe((state) => {
      const audio = audioRef.current;

      if (state.isMuted) {
        if (audio && !audio.paused) {
          fade(0, FADE_OUT_MS);
        }
      } else {
        if (audio && audio.paused) {
          audio.play().then(() => fade(TARGET_VOLUME, FADE_IN_MS));
        } else if (!startedRef.current) {
          initAndPlay();
        }
      }
    });

    return () => {
      disposed = true;
      document.removeEventListener("click", onGesture);
      unsub();
      cancelAnimationFrame(fadeRafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      startedRef.current = false;
    };
  }, []);
}
