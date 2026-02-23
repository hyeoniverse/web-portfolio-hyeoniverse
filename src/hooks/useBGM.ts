"use client";

import { useEffect, useRef } from "react";
import { useSoundStore } from "@/stores/soundStore";

const BGM_URL = "/sounds/Louie Zong - Ghost Duet.mp3";
const FADE_IN = 1;
const FADE_OUT = 0.5;
const VOLUME = 0.35;

export function useBGM() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function initAndPlay() {
      if (startedRef.current) return;
      startedRef.current = true;

      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      ctxRef.current = ctx;
      gainRef.current = gain;

      try {
        const res = await fetch(BGM_URL);
        const buf = await res.arrayBuffer();
        if (disposed) { ctx.close(); return; }

        const audioBuffer = await ctx.decodeAudioData(buf);
        if (disposed) { ctx.close(); return; }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(gain);
        source.start(0);

        // fade in
        gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_IN);
      } catch {
        startedRef.current = false;
      }
    }

    function onGesture() {
      const muted = useSoundStore.getState().isMuted;
      if (muted) return;
      document.removeEventListener("click", onGesture);
      initAndPlay();
    }

    document.addEventListener("click", onGesture);

    // zustand subscribe — mute/unmute 반응
    const unsub = useSoundStore.subscribe((state) => {
      const ctx = ctxRef.current;
      const gain = gainRef.current;

      if (state.isMuted) {
        if (ctx && ctx.state === "running" && gain) {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT);
          setTimeout(() => { if (ctx.state === "running") ctx.suspend(); }, FADE_OUT * 1000);
        }
      } else {
        if (ctx && ctx.state === "suspended") {
          ctx.resume().then(() => {
            if (gain) {
              gain.gain.cancelScheduledValues(ctx.currentTime);
              gain.gain.setValueAtTime(0, ctx.currentTime);
              gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_IN);
            }
          });
        } else if (!startedRef.current) {
          initAndPlay();
        }
      }
    });

    return () => {
      disposed = true;
      document.removeEventListener("click", onGesture);
      unsub();
      ctxRef.current?.close();
      ctxRef.current = null;
      gainRef.current = null;
      startedRef.current = false;
    };
  }, []);
}
