"use client";

import { useEffect, useRef } from "react";
import { useSoundStore, BGM_MUTED_KEY } from "@/stores/soundStore";

const FADE_IN_MS = 1000;
const FADE_OUT_MS = 500;
const TARGET_VOLUME = 0.35;
/** 탭 간 단일 재생 소유권 락 이름 (navigator.locks) */
const PLAYBACK_LOCK = "bgm-playback";

/**
 * HTMLAudioElement 기반 BGM 재생.
 * Web Audio API(AudioContext + BufferSource) 대신 브라우저 네이티브 미디어 파이프라인 사용 —
 * 하드웨어 가속 디코딩 + 별도 프로세스 처리로 메인 스레드 부하 최소화.
 *
 * 탭 간 조율:
 *  - 음소거 상태는 localStorage(BGM_MUTED_KEY) + storage 이벤트로 모든 탭이 공유.
 *  - 실제 재생은 navigator.locks 로 한 탭만 소유 → 여러 탭에서 열어도 BGM 이 겹치지 않는다.
 *    소유 탭이 음소거하거나 닫히면 대기 중인 다른 탭이 자동으로 재생을 인계받는다.
 */
export function useBGM(bgmUrl?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!bgmUrl) return;

    let disposed = false;
    // 사용자 제스처(클릭) 이후에만 오디오 재생 시도 — 브라우저 autoplay 정책
    let gestureReady = false;

    // ── 재생 소유권 (navigator.locks) — 한 번에 한 탭만 락을 쥐고 그 동안만 소리를 낸다 ──
    const supportsLocks =
      typeof navigator !== "undefined" && "locks" in navigator;
    let ownershipAbort: AbortController | null = null;
    let releaseOwnership: (() => void) | null = null;

    function fade(to: number, duration: number) {
      cancelAnimationFrame(fadeRafRef.current);
      const audio = audioRef.current;
      if (!audio) return;

      // 백그라운드(hidden) 탭은 브라우저가 requestAnimationFrame 을 얼려 fade step 이 안 돈다.
      // 그러면 다른 탭의 음소거·재생 인계가 이 탭이 보일 때까지 반영되지 않으므로,
      // 숨겨진 탭에서는 페이드를 건너뛰고 볼륨/정지를 즉시 적용한다. (보이는 탭은 아래 rAF 로 부드럽게)
      if (document.hidden) {
        audio.volume = to;
        if (to === 0) audio.pause();
        return;
      }

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

      const audio = new Audio(bgmUrl);
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

    // 소유권을 쥔 상태에서만 호출 — 실제 재생 시작/재개
    function playNow() {
      const audio = audioRef.current;
      if (!startedRef.current) {
        initAndPlay();
        return;
      }
      if (audio && audio.paused) {
        audio.play().then(() => fade(TARGET_VOLUME, FADE_IN_MS)).catch(() => {});
      }
    }

    // 락 요청(큐 대기) → 획득하면 이 탭이 소유자. 다른 탭은 그 동안 대기(무음).
    function acquireOwnership() {
      if (!supportsLocks) {
        // 락 미지원(구형 브라우저) — 조율 없이 재생 (기존 동작)
        playNow();
        return;
      }
      if (ownershipAbort) return; // 이미 요청/보유 중
      ownershipAbort = new AbortController();
      navigator.locks
        .request(
          PLAYBACK_LOCK,
          { signal: ownershipAbort.signal },
          () =>
            // 이 promise 가 resolve 될 때까지 락을 쥔다 (탭이 닫히면 브라우저가 자동 해제)
            new Promise<void>((release) => {
              releaseOwnership = release;
              // 획득 시점에 이미 음소거됐거나 dispose 됐으면 즉시 반납
              if (disposed || useSoundStore.getState().isMuted) {
                releaseOwnership = null;
                release();
                return;
              }
              playNow();
            }),
        )
        .catch(() => {
          /* abort() 로 취소되면 여기로 — 정상 */
        });
    }

    // 소유권 반납 — 쥔 락 해제 + 큐 대기 중이면 취소. 다른 탭이 인계 가능해진다.
    function releaseOwnershipNow() {
      if (releaseOwnership) {
        releaseOwnership();
        releaseOwnership = null;
      }
      if (ownershipAbort) {
        ownershipAbort.abort();
        ownershipAbort = null;
      }
    }

    function pauseAudio() {
      const audio = audioRef.current;
      if (audio && !audio.paused) fade(0, FADE_OUT_MS);
    }

    function onGesture() {
      gestureReady = true;
      document.removeEventListener("click", onGesture);
      if (!useSoundStore.getState().isMuted) acquireOwnership();
    }
    document.addEventListener("click", onGesture);

    // 마운트 시 저장된(다른 탭이 켜둔) 상태 상속
    try {
      if (localStorage.getItem(BGM_MUTED_KEY) === "0") {
        useSoundStore.getState().syncMuted(false);
      }
    } catch {
      /* 무시 */
    }

    // 다른 탭의 음소거 토글 → storage 이벤트로 동기화
    function onStorage(e: StorageEvent) {
      if (e.key !== BGM_MUTED_KEY) return;
      useSoundStore.getState().syncMuted(e.newValue !== "0");
    }
    window.addEventListener("storage", onStorage);

    // store 구독 — mute/unmute 반응 (내 탭 토글 + 다른 탭 sync 둘 다)
    const unsub = useSoundStore.subscribe((state) => {
      if (state.isMuted) {
        pauseAudio();
        releaseOwnershipNow(); // 소유권 반납 → 대기 탭이 인계
      } else if (gestureReady) {
        acquireOwnership();
      }
    });

    return () => {
      disposed = true;
      document.removeEventListener("click", onGesture);
      window.removeEventListener("storage", onStorage);
      unsub();
      releaseOwnershipNow();
      cancelAnimationFrame(fadeRafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      startedRef.current = false;
    };
  }, [bgmUrl]);
}
