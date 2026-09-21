"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { speak, warmUpVoices } from "@/lib/speech";
import { pcmToWav } from "@/lib/wav";
import type { GalleryNotes } from "@/data/projects";

/* 음성도 대본도 없는 장은 이만큼 보여 주고 넘어간다 */
const SILENT_SLIDE_MS = 4000;
/* 갤러리를 "보고 있다"고 칠 만큼 화면에 들어온 비율 */
const VIEW_RATIO = 0.5;

/* ── 켜 둘지 — 방문자가 끄면 그 브라우저에 기억한다(기본은 켜짐).
   저장소를 못 쓰는 창(사생활 보호 등)에서도 이번 방문 동안은 끈 상태가 가도록 메모리에도 둔다 ── */
const PREF_KEY = "gallery.narration";
let prefMemory: boolean | null = null;
const prefListeners = new Set<() => void>();

function readPref(): boolean {
  if (prefMemory !== null) return prefMemory;
  try { return localStorage.getItem(PREF_KEY) !== "off"; } catch { return true; }
}

function writePref(on: boolean) {
  prefMemory = on;
  try {
    if (on) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, "off");
  } catch { /* 메모리 값으로 버틴다 */ }
  prefListeners.forEach((l) => l());
}

/* "음성 없이 보기" — 이번 방문 동안만 끈다(사이트 안에서 다른 작업물로 옮겨 가도 조용하고, 새로고침하면 다시 묻는다) */
function declineForVisit() {
  prefMemory = false;
  prefListeners.forEach((l) => l());
}

function subscribePref(cb: () => void) {
  prefListeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === PREF_KEY) { prefMemory = null; cb(); } };
  window.addEventListener("storage", onStorage);
  return () => { prefListeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

/* 무음(10ms) — 소리를 틀 수 있는지 떠보고(probeSound), 누르는 동작 안에서 오디오 요소를 허락받는 데(unlockSound) 쓴다 */
let silentUrl: string | null = null;
function silentClip(): string {
  silentUrl ??= URL.createObjectURL(new Blob([pcmToWav(new Uint8Array(160), 8000) as BlobPart], { type: "audio/wav" }));
  return silentUrl;
}

/* 지금 소리를 틀 수 있는지 — 무음을 실제로 틀어 본다. 막히면(NotAllowedError) false.
   "이 페이지에서 누른 적 있는지"(navigator.userActivation) 로 가늠하면 틀린다 — 주소를 직접 연 창에서도
   true 가 나오는 경우가 있어, 덮개 없이 소리 없는 재생을 시작하고 장만 넘어갔다 */
function probeSound(audio: HTMLAudioElement): Promise<boolean> {
  audio.src = silentClip();
  return audio.play().then(() => true, (e: unknown) => (e as Error)?.name !== "NotAllowedError");
}

/* 누르는 동작 안에서 부른다 — 사파리는 누르는 동작 안에서 틀어 본 오디오 요소·음성만 나중에 코드로 틀게 해 준다.
   재생은 화면이 다시 그린 뒤(effect)에 시작하므로 그때는 이미 동작 밖이다 */
function unlockSound(audio: HTMLAudioElement) {
  if (audio.paused) {
    audio.src = silentClip();
    audio.play().catch(() => {});
  }
  if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
}


/**
 * 갤러리를 음성과 함께 넘겨 본다 — 그 장의 음성이 끝날 때마다 다음 장으로 간다.
 *
 * 기본은 켜짐이고, 갤러리가 화면에 들어오면(절반 이상 보이면) 그때 첫 장부터 읽는다. 화면에서 벗어나면 멈추고,
 * 다시 들어오면 이어 읽는다(음성 파일은 멈춘 자리부터, 브라우저 음성은 그 장 처음부터). 확대 뷰어를 연 동안처럼
 * 갤러리가 가려진 때도(hold) 같다.
 * 브라우저가 소리를 막은 방문(주소를 직접 열거나 새로고침)이면 갤러리가 들어올 때 waiting 이 켜진다 — 갤러리가
 * 첫 장 위에 "음성과 함께 보기(play)"와 "음성 없이 보기(decline)"를 띄워 방문자가 고르게 한다.
 * 저절로 시작하는 건 한 번뿐이다. 끝까지 읽었으면 다시 들어와도 읽지 않고, 갤러리를 만질 때(옆 장·띠를 누르거나
 * 끌어 넘기거나 화살표 키) 그 장부터 읽는다(engage).
 * 방문자가 음성 단추로 끄면(toggle) 그 브라우저에서는 계속 꺼져 있고, 단추로 다시 켤 수 있다.
 *
 * 장마다 음성 파일(TTS·녹음)이 있으면 그것을, 없으면 대본을 브라우저 음성으로 읽는다. 둘 다 없으면 잠시
 * 보여 주고 넘어간다. 재생 중에 사람이 장을 옮기면 그 장의 음성부터 다시 시작한다. 마지막 장이 끝나면 멈춘다.
 * 오디오 요소는 하나를 돌려 쓴다 — 누른 동작으로 재생 허락을 받은 요소라 다음 장도 막히지 않는다.
 */
export function useGalleryNarration({
  images,
  notes,
  index,
  goTo,
  hold = false,
  viewRef,
}: {
  images: string[];
  notes: GalleryNotes | undefined;
  index: number;
  goTo: (index: number) => void;
  /** 읽기를 잠시 멈춘다 — 띠를 끄는 동안(손을 떼면 그 장부터), 확대 뷰어로 가려진 동안(닫으면 이어서) */
  hold?: boolean;
  /** 이 요소(갤러리 무대)가 화면에 들어와 있을 때만 읽는다 */
  viewRef: RefObject<HTMLElement | null>;
}) {
  const enabled = useSyncExternalStore(subscribePref, readPref, () => true);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /* 시작했거나 방문자가 고른 적이 있는지 — 들어와서 저절로 시작하는 건 한 번뿐이다 */
  const startedRef = useRef(false);
  /* 소리가 막혀 방문자의 선택을 기다리는 중 */
  const [waiting, setWaiting] = useState(false);
  /* 갤러리가 화면에 들어와 있는지 */
  const [inView, setInView] = useState(false);
  /* 가려져서 멈춘 음성 파일의 자리 — 다시 보이면 그 장의 그 자리부터 잇는다 */
  const resumeRef = useRef<{ index: number; src: string; time: number } | null>(null);
  const hasNarration = !!notes && images.some((url) => notes[url]?.audio || notes[url]?.script?.trim());

  useEffect(() => { if (hasNarration) warmUpVoices(); }, [hasNarration]);

  useEffect(() => {
    const el = viewRef.current;
    if (!hasNarration || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= VIEW_RATIO),
      { threshold: [0, VIEW_RATIO] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNarration, viewRef]);
  /* 화면 판정을 못 하는 환경(IntersectionObserver 없음)은 늘 보이는 것으로 친다 */
  const visible = inView || typeof IntersectionObserver === "undefined";

  /* 지금 장의 음성 — 문자열로 꺼내 둔다. 작업물 객체를 그대로 의존하면, 화면이 다시 그릴 때마다 새 객체가
     와서(미리보기는 그릴 때마다 작업물을 새로 만든다) 음성이 처음부터 다시 시작해 끝나지 못했다 */
  const note = notes?.[images[index]];
  const audioSrc = note?.audio ?? "";
  const script = note?.script?.trim() ?? "";
  const isLast = index >= images.length - 1;

  useEffect(() => {
    if (!playing || hold || !visible) return;
    let cancelled = false;
    let timer: number | undefined;
    let stopSpeech: (() => void) | null = null;
    const advance = () => {
      if (cancelled) return;
      if (!isLast) goTo(index + 1);
      else setPlaying(false);
    };
    /* 브라우저가 소리를 막았다 — 멈추고 방문자에게 묻는다 */
    const blocked = () => {
      if (cancelled) return;
      setPlaying(false);
      setWaiting(true);
    };
    if (audioSrc) {
      const audio = audioRef.current ?? (audioRef.current = new Audio());
      const resume = resumeRef.current;
      resumeRef.current = null;
      audio.src = audioSrc;
      if (resume && resume.index === index && resume.src === audioSrc) audio.currentTime = resume.time;
      audio.onended = advance;
      audio.onerror = () => { timer = window.setTimeout(advance, SILENT_SLIDE_MS); };
      /* 막힌 것만 묻는다 — 파일이 깨진 것(onerror)은 잠시 보여 주고 넘어간다 */
      audio.play().catch((e: unknown) => { if ((e as Error)?.name === "NotAllowedError") blocked(); });
    } else if (script) {
      stopSpeech = speak(script, advance, blocked);
      if (!stopSpeech) timer = window.setTimeout(advance, SILENT_SLIDE_MS);
    } else {
      timer = window.setTimeout(advance, SILENT_SLIDE_MS);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const audio = audioRef.current;
      /* 끝나기 전에 멈췄으면 자리를 적어 둔다 — 같은 장으로 다시 오면(가렸다 보임) 거기서 잇는다.
         다른 장으로 옮겼다 돌아오면 장 번호가 달라 처음부터 읽는다 */
      if (audioSrc && audio && !audio.ended && audio.currentTime > 0) {
        resumeRef.current = { index, src: audioSrc, time: audio.currentTime };
      }
      audio?.pause();
      stopSpeech?.();
    };
  }, [playing, hold, visible, index, audioSrc, script, isLast, goTo]);

  /** 누르는 동작 안에서 부른다 — 오디오 요소와 음성 합성을 그 동작으로 허락받아 둔다(사파리) */
  const unlock = useCallback(() => {
    unlockSound(audioRef.current ?? (audioRef.current = new Audio()));
  }, []);

  /* 갤러리가 처음 보일 때 읽는다 — 먼저 무음으로 떠보고, 막혔으면 방문자에게 묻는다(waiting) */
  useEffect(() => {
    if (!hasNarration || !enabled || !visible || startedRef.current) return;
    let cancelled = false;
    probeSound(audioRef.current ?? (audioRef.current = new Audio())).then((ok) => {
      if (cancelled || startedRef.current) return;
      if (!ok) { setWaiting(true); return; }
      startedRef.current = true;
      setPlaying(true);
    });
    return () => { cancelled = true; };
  }, [hasNarration, enabled, visible]);

  /* 화면을 떠나면 소리도 멈춘다 */
  useEffect(() => () => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /** 지금 장부터 읽는다 — 누르는 동작 안에서 부른다(그 동작이 소리 허락이 된다) */
  const play = useCallback(() => {
    unlock();
    startedRef.current = true;
    setWaiting(false);
    writePref(true);
    setPlaying(true);
  }, [unlock]);

  /** 음성 없이 보기 — 이번 방문 동안은 읽지도, 저절로 넘기지도 않는다 */
  const decline = useCallback(() => {
    startedRef.current = true;
    setWaiting(false);
    setPlaying(false);
    declineForVisit();
  }, []);

  /** 방문자가 갤러리를 만졌다 — 켜 둔 상태면 지금 장부터 읽는다 */
  const engage = useCallback(() => {
    if (hasNarration && enabled) play();
  }, [hasNarration, enabled, play]);

  /** 음성 단추 — 읽는 중이면 끄고(기억한다), 아니면 켜고 바로 읽는다 */
  const toggle = useCallback(() => {
    if (!playing) { play(); return; }
    setPlaying(false);
    writePref(false);
  }, [playing, play]);

  const stop = useCallback(() => setPlaying(false), []);

  return { hasNarration, enabled, playing, waiting: waiting && enabled && !playing, engage, play, decline, toggle, stop };
}
