"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FastForward, Pause, Play, Rewind, Square, Volume2, X } from "@/components/icons";
import { speak, warmUpVoices } from "@/lib/speech";
import { articleSegments, segmentIndexOf, type SpeechSegment } from "@/lib/articleSpeech";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { usePopoverRef } from "@/hooks/useTopLayer";
import { fillTemplate } from "@/utils/format";
import Pressable from "@/components/ui/Pressable";
import styles from "./ListenButton.module.css";

/* 글 읽어 주기 — 상세 헤더, 언어 선택 버튼 왼쪽. 규격은 ShareButton 의 compact 와 같다.
   읽을 차례는 lib/articleSpeech 가 블록(조각)으로 나눠 준다. 조각을 하나씩 읽으며:
   - 읽는 조각을 강조하고(data-tts-current), 화면 밖으로 나가면 따라 스크롤한다
   - 글을 선택한 채 누르면 선택한 곳부터, 읽는 중에 문단을 누르면 그 문단부터 읽는다
   - 화면 아래 떠 있는 컨트롤로 이전 · 다음 문단, 일시정지 · 이어 읽기, 빠르기, 멈춤
   일시정지는 그 조각을 멈췄다가 처음부터 다시 읽는다 — Android 는 speechSynthesis.pause 가 멈춤(cancel)이라
   그 자리에서 이어 읽을 수 없어, 모든 기기에서 같은 방식을 쓴다. */

const RATES = [1, 1.25, 1.5, 0.75] as const;
const RATE_KEY = "listen-rate";
const CURRENT = "data-tts-current";

const noop = () => () => {};

type Status = "idle" | "playing" | "paused";

function savedRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return (RATES as readonly number[]).includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

export default function ListenButton({ title, className }: { title: string; className?: string }) {
  const { t } = useLanguage();
  const { scrollTo } = useLenis();
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [rate, setRate] = useState(1);
  /* 서버에선 그리지 않고, 음성 합성이 없는 브라우저면 버튼을 숨긴다 */
  const supported = useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);
  const segmentsRef = useRef<SpeechSegment[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const markedRef = useRef<HTMLElement | null>(null);
  const rateRef = useRef(1);
  /* 떠 있는 컨트롤 — top layer(popover="manual")에 올린다(docs/design-system.md 3.10-1) */
  const floatingRef = usePopoverRef<HTMLDivElement>();
  /* 조각을 다 읽으면 다음 조각 — playFrom 이 자기를 부르는 대신 이 ref 로 */
  const nextRef = useRef<(i: number) => void>(() => {});

  const mark = useCallback((el: HTMLElement | null) => {
    markedRef.current?.removeAttribute(CURRENT);
    markedRef.current = el;
    el?.setAttribute(CURRENT, "");
  }, []);

  /* 읽는 조각이 화면 밖이면 따라간다 — 내비게이션 아래 1/4 쯤에 오게 */
  const follow = useCallback((el: HTMLElement) => {
    if (el === document.body) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 96 && r.bottom <= window.innerHeight - 96) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollTo(el, { offset: -Math.round(window.innerHeight * 0.25), immediate: still });
  }, [scrollTo]);

  const halt = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const stop = useCallback(() => {
    halt();
    mark(null);
    setStatus("idle");
  }, [halt, mark]);

  /* i 번째 조각부터 읽는다 — 끝나면 다음 조각으로 */
  const playFrom = useCallback((i: number) => {
    halt();
    const seg = segmentsRef.current[i];
    if (!seg) { stop(); return; }
    setIndex(i);
    mark(seg.el === document.body ? null : seg.el);
    follow(seg.el);
    const handle = speak(seg.text, () => nextRef.current(i + 1), stop, undefined, seg.lang, rateRef.current);
    if (!handle) { stop(); return; }
    stopRef.current = handle;
    setStatus("playing");
  }, [halt, mark, follow, stop]);

  useEffect(() => { nextRef.current = playFrom; }, [playFrom]);

  const start = useCallback(() => {
    const segments = articleSegments(title);
    segmentsRef.current = segments;
    setCount(segments.length);
    rateRef.current = savedRate();
    setRate(rateRef.current);
    /* 글을 선택해 둔 채 누르면 선택한 곳부터 */
    const sel = window.getSelection();
    const from = sel && !sel.isCollapsed ? segmentIndexOf(segments, sel.anchorNode) : -1;
    playFrom(Math.max(0, from));
  }, [title, playFrom]);

  const togglePause = useCallback(() => {
    if (status === "paused") { playFrom(index); return; }
    halt();
    setStatus("paused");
  }, [status, index, playFrom, halt]);

  /* 이전 · 다음 — 일시정지 중이면 자리만 옮긴다 */
  const step = useCallback((d: number) => {
    const next = Math.min(Math.max(0, index + d), segmentsRef.current.length - 1);
    if (status === "paused") {
      const seg = segmentsRef.current[next];
      setIndex(next);
      if (seg) { mark(seg.el === document.body ? null : seg.el); follow(seg.el); }
      return;
    }
    playFrom(next);
  }, [index, status, playFrom, mark, follow]);

  const cycleRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(rateRef.current as (typeof RATES)[number]) + 1) % RATES.length];
    rateRef.current = next;
    setRate(next);
    try { localStorage.setItem(RATE_KEY, String(next)); } catch { /* 저장 못 해도 이번 재생에는 쓴다 */ }
    /* 읽는 중이면 지금 조각을 새 빠르기로 다시 */
    if (status === "playing") playFrom(index);
  }, [status, index, playFrom]);

  const active = status !== "idle";

  /* 읽는 중 — 본문 문단을 누르면 그 문단부터, Esc 는 멈춤 */
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".prose-content") || target.closest("a, button, input, textarea, select, [role='button']")) return;
      if (window.getSelection()?.isCollapsed === false) return;
      const i = segmentIndexOf(segmentsRef.current, target);
      if (i >= 0) playFrom(i);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable='true'], [role='dialog']")) return;
      stop();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, playFrom, stop]);

  /* 처음 한 번 목소리 목록을 불러 두고, 다른 글로 옮겨 가거나 보던 언어가 바뀌면(title 이 바뀐다) 멈춘다 —
     읽던 조각들은 바뀌기 전 화면의 것이라 */
  useEffect(() => { warmUpVoices(); }, []);
  useEffect(() => () => { stop(); }, [title, stop]);

  if (!supported) return null;

  const speed = fillTemplate(t("readAloud.speed"), { rate });
  return (
    <>
      <Pressable
        type="button"
        className={`${styles.compact}${active ? ` ${styles.playing}` : ""}${className ? ` ${className}` : ""}`}
        onClick={active ? stop : start}
        title={active ? t("readAloud.stopListen") : t("readAloud.listen")}
        aria-pressed={active}
        data-clickable="true"
      >
        {active ? <Square size={11} /> : <Volume2 size={13} />}
        <span className={styles.label}>{active ? "Stop" : "Listen"}</span>
      </Pressable>
      {active && (
        <div ref={floatingRef} popover="manual" className={styles.floating} role="group" aria-label={t("readAloud.controls")} title={t("readAloud.jumpHint")}>
          <span className={styles.floatingStatus} aria-live="polite">
            <span className={styles.floatingState}>{status === "paused" ? t("readAloud.paused") : t("readAloud.reading")}</span>
            <span className={styles.floatingCount}>{Math.min(index + 1, count)} / {count}</span>
          </span>
          <Pressable type="button" className={styles.floatingBtn} onClick={() => step(-1)} disabled={index === 0} aria-label={t("readAloud.prev")} title={t("readAloud.prev")} data-clickable="true">
            <Rewind size={14} />
          </Pressable>
          <Pressable type="button" className={`${styles.floatingBtn} ${styles.floatingMain}`} onClick={togglePause} aria-label={status === "paused" ? t("readAloud.resume") : t("readAloud.pause")} title={status === "paused" ? t("readAloud.resume") : t("readAloud.pause")} data-clickable="true">
            {status === "paused" ? <Play size={14} /> : <Pause size={14} />}
          </Pressable>
          <Pressable type="button" className={styles.floatingBtn} onClick={() => step(1)} disabled={index >= count - 1} aria-label={t("readAloud.next")} title={t("readAloud.next")} data-clickable="true">
            <FastForward size={14} />
          </Pressable>
          <Pressable type="button" className={`${styles.floatingBtn} ${styles.floatingRate}`} onClick={cycleRate} aria-label={speed} title={speed} data-clickable="true">
            {rate}×
          </Pressable>
          <Pressable type="button" className={styles.floatingBtn} onClick={stop} aria-label={t("readAloud.stop")} title={t("readAloud.stop")} data-clickable="true">
            <X size={14} />
          </Pressable>
        </div>
      )}
    </>
  );
}
