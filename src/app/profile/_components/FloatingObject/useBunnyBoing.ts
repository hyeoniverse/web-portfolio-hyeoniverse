"use client";

import { useCallback, useRef } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useSoundStore } from "@/stores/soundStore";

/**
 * 몽이가 부딪히거나 찔렸을 때의 소리(yo.mp3). profile 과 works 의 몽이가 같이 쓴다.
 *
 * 설정의 "몽이 충돌 소리"가 꺼져 있거나 사이트 소리를 꺼 두었으면 내지 않는다.
 * AudioContext 는 사용자 제스처(클릭·터치) 뒤에만 만들 수 있어서, 첫 소리는 그 뒤에 파일을 받아 둔다.
 */
export function useBunnyBoing(): () => void {
  const enabled = useSiteConfig().profile.bunnyCollisionSound;
  const audioCtx = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  return useCallback(() => {
    if (!enabled) return;
    if (useSoundStore.getState().isMuted) return;
    if (!navigator.userActivation?.hasBeenActive) return;

    if (!audioCtx.current) {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      fetch("/sounds/yo.mp3")
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => { audioBuffer.current = buf; });
    }
    const ctx = audioCtx.current;
    if (ctx.state === "suspended") ctx.resume();
    if (!audioBuffer.current) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = audioBuffer.current;
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }, [enabled]);
}
