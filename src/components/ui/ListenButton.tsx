"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AudioLines, FastForward, GripVertical, LocateFixed, Minimize2, Pause, Play, Rewind, Square, Volume2, X } from "@/components/icons";
import { speak, warmUpVoices } from "@/lib/speech";
import { articleSegments, expandTable, segmentIndexOf, type SpeechSegment } from "@/lib/articleSpeech";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { usePopoverRef } from "@/hooks/useTopLayer";
import { fillTemplate } from "@/utils/format";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import styles from "./ListenButton.module.css";

/* 글 읽어 주기 — 상세 헤더, 언어 선택 버튼 왼쪽. 단추는 공용 Button(outline · sm).
   읽을 차례는 lib/articleSpeech 가 블록(조각)으로 나눠 준다. 조각을 하나씩 읽으며:
   - 읽는 조각을 강조하고(data-tts-current), 화면 밖으로 나가면 따라 스크롤한다
   - 글을 선택한 채 누르면 선택한 곳부터, 읽는 중에 문단을 누르면 그 문단부터 읽는다
   - 화면 아래 떠 있는 컨트롤로 이전 · 다음 문단, 일시정지 · 이어 읽기, 빠르기, 멈춤.
     넓은 화면은 손잡이를 잡고 옮길 수 있고(자리를 기억한다), 좁은 화면은 위아래 스크롤 단추 위에 단추 하나로
     접혀 있다가 누르면 펼친다
   일시정지는 그 조각을 멈췄다가 처음부터 다시 읽는다 — Android 는 speechSynthesis.pause 가 멈춤(cancel)이라
   그 자리에서 이어 읽을 수 없어, 모든 기기에서 같은 방식을 쓴다. */

const RATES = [1, 1.25, 1.5, 0.75] as const;
const RATE_KEY = "listen-rate";
const POS_KEY = "listen-bar-pos";
/* 이 폭 이하면 접힌 단추로 — 막대가 본문 · 스크롤 단추를 가리지 않게 */
const COMPACT_QUERY = "(width <= 768px)";
/* 옮긴 막대가 화면 가장자리에 붙지 않게 남기는 여백 */
const EDGE = 8;
const CURRENT = "data-tts-current";

const noop = () => () => {};

type Status = "idle" | "playing" | "paused";

type Pos = { x: number; y: number };

function savedPos(): Pos | null {
  try {
    const v = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as Pos | null;
    return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
  } catch {
    return null;
  }
}

/** 막대가 화면 안에 다 들어오게 자리를 당긴다 */
function clampPos(p: Pos, el: HTMLElement): Pos {
  const r = el.getBoundingClientRect();
  return {
    x: Math.min(Math.max(EDGE, p.x), Math.max(EDGE, window.innerWidth - r.width - EDGE)),
    y: Math.min(Math.max(EDGE, p.y), Math.max(EDGE, window.innerHeight - r.height - EDGE)),
  };
}

const subscribeCompact = (cb: () => void) => {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

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
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT_QUERY).matches, () => false);
  /* 좁은 화면에서 접힌 단추를 펼쳤는지 */
  const [expanded, setExpanded] = useState(false);
  /* 넓은 화면에서 옮겨 둔 자리(왼쪽 위 모서리, px) — 없으면 아래 가운데 */
  const [pos, setPos] = useState<Pos | null>(null);
  const dragRef = useRef<{ dx: number; dy: number; id: number } | null>(null);
  const segmentsRef = useRef<SpeechSegment[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const markedRef = useRef<HTMLElement | null>(null);
  const rateRef = useRef(1);
  /* 지금 읽는(일시정지면 읽을) 조각 — 이전 · 다음을 연달아 눌러도 다시 그리기 전 값이 아니라 이 값에서 한 칸씩 */
  const indexRef = useRef(0);
  /* 떠 있는 컨트롤 — top layer(popover="manual")에 올린다(docs/design-system.md 3.10-1) */
  const barRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = usePopoverRef<HTMLDivElement>(barRef);
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

  /* 읽는 곳으로 — 몇 번째인지(n / N)를 누르면. 화면 안에 있으면 그대로 */
  const goToCurrent = useCallback(() => {
    const el = segmentsRef.current[indexRef.current]?.el;
    if (el) follow(el);
  }, [follow]);

  const halt = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const stop = useCallback(() => {
    halt();
    mark(null);
    setStatus("idle");
    setExpanded(false);
  }, [halt, mark]);

  /* i 번째 조각부터 읽는다 — 끝나면 다음 조각으로 */
  const playFrom = useCallback((i: number) => {
    halt();
    const seg = segmentsRef.current[i];
    if (!seg) { stop(); return; }
    indexRef.current = i;
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
    if (status === "paused") { playFrom(indexRef.current); return; }
    halt();
    setStatus("paused");
  }, [status, playFrom, halt]);

  /* 이전 · 다음 — 일시정지 중이면 자리만 옮긴다 */
  const step = useCallback((d: number) => {
    const next = Math.min(Math.max(0, indexRef.current + d), segmentsRef.current.length - 1);
    if (status === "paused") {
      const seg = segmentsRef.current[next];
      indexRef.current = next;
      setIndex(next);
      if (seg) { mark(seg.el === document.body ? null : seg.el); follow(seg.el); }
      return;
    }
    playFrom(next);
  }, [status, playFrom, mark, follow]);

  const cycleRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(rateRef.current as (typeof RATES)[number]) + 1) % RATES.length];
    rateRef.current = next;
    setRate(next);
    try { localStorage.setItem(RATE_KEY, String(next)); } catch { /* 저장 못 해도 이번 재생에는 쓴다 */ }
    /* 읽는 중이면 지금 조각을 새 빠르기로 다시 */
    if (status === "playing") playFrom(indexRef.current);
  }, [status, playFrom]);

  const active = status !== "idle";

  /* 읽는 중 — 본문 문단을 누르면 그 문단부터, Esc 는 멈춤 */
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      /* 좁은 화면에서 펼친 막대 — 바깥을 누르면 접기만 한다(닫으려고 누른 문단부터 읽기 시작하지 않게) */
      if (compact && expanded) {
        if (target && !barRef.current?.contains(target)) setExpanded(false);
        return;
      }
      if (!target?.closest(".prose-content") || target.closest("a, button, input, textarea, select, [role='button']")) return;
      if (window.getSelection()?.isCollapsed === false) return;
      let i = segmentIndexOf(segmentsRef.current, target);
      /* 크기만 알린 큰 표를 누르면 행으로 펼치고, 누른 행부터 */
      if (i >= 0 && segmentsRef.current[i].collapsedTable) {
        segmentsRef.current = expandTable(segmentsRef.current, i);
        setCount(segmentsRef.current.length);
        i = Math.max(i, segmentIndexOf(segmentsRef.current, target));
      }
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
  }, [active, compact, expanded, playFrom, stop]);

  /* 막대가 뜨면 옮겨 둔 자리를 되살리고, 창 크기가 바뀌면 화면 안으로 당긴다(넓은 화면만) */
  useEffect(() => {
    if (!active || compact) return;
    const el = barRef.current;
    const saved = savedPos();
    if (el && saved) setPos(clampPos(saved, el));
    const onResize = () => setPos((p) => (p && barRef.current ? clampPos(p, barRef.current) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, compact]);

  /* 옮기기 — 단추가 아닌 곳(손잡이 · 상태 글)을 잡고 끈다 */
  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (compact || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const r = e.currentTarget.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [compact]);
  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(clampPos({ x: e.clientX - d.dx, y: e.clientY - d.dy }, e.currentTarget));
  }, []);
  const onDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.id !== e.pointerId) return;
    dragRef.current = null;
    setPos((p) => {
      try { if (p) localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* 저장 못 해도 이번에는 그 자리 */ }
      return p;
    });
  }, []);

  /* 처음 한 번 목소리 목록을 불러 두고, 다른 글로 옮겨 가거나 보던 언어가 바뀌면(title 이 바뀐다) 멈춘다 —
     읽던 조각들은 바뀌기 전 화면의 것이라 */
  useEffect(() => { warmUpVoices(); }, []);
  useEffect(() => () => { stop(); }, [title, stop]);

  if (!supported) return null;

  const speed = fillTemplate(t("readAloud.speed"), { rate });
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        tone={active ? "accent" : "default"}
        icon={active ? <Square size={11} /> : <Volume2 size={13} />}
        className={className}
        onClick={active ? stop : start}
        title={active ? t("readAloud.stopListen") : t("readAloud.listen")}
        aria-pressed={active}
      >
        {active ? "Stop" : "Listen"}
      </Button>
      {active && (
        compact && !expanded ? (
          /* 좁은 화면 — 위아래 스크롤 단추 위에 단추 하나. 누르면 같은 자리에서 위로 펼친다 */
          <div ref={floatingRef} popover="manual" className={styles.compactDock}>
            <Pressable
              type="button"
              className={`${styles.compactToggle}${status === "paused" ? ` ${styles.compactPaused}` : ""}`}
              onClick={() => setExpanded(true)}
              aria-label={t("readAloud.expand")}
              title={`${t("readAloud.expand")} · ${Math.min(index + 1, count)} / ${count}`}
              aria-expanded={false}
              data-clickable="true"
            >
              {status === "paused" ? <Pause size={16} /> : <AudioLines size={16} />}
            </Pressable>
          </div>
        ) : (
          <div
            ref={floatingRef}
            popover="manual"
            className={`${styles.floating}${compact ? ` ${styles.floatingDocked}` : ""}${!compact && pos ? ` ${styles.floatingPlaced}` : ""}`}
            style={!compact && pos ? ({ "--_x": `${pos.x}px`, "--_y": `${pos.y}px` } as React.CSSProperties) : undefined}
            role="group"
            aria-label={t("readAloud.controls")}
            title={t("readAloud.jumpHint")}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            {!compact && (
              <span className={styles.floatingGrip} aria-hidden data-cursor="grab" title={t("readAloud.drag")}>
                <GripVertical size={14} />
              </span>
            )}
            <span className={styles.floatingStatus} aria-live="polite" data-cursor={compact ? undefined : "grab"}>
              <span className={styles.floatingState}>{status === "paused" ? t("readAloud.paused") : t("readAloud.reading")}</span>
              <Pressable type="button" className={styles.floatingCount} onClick={goToCurrent} aria-label={t("readAloud.goToCurrent")} title={t("readAloud.goToCurrent")} data-clickable="true">
                <LocateFixed size={12} aria-hidden />
                {Math.min(index + 1, count)} / {count}
              </Pressable>
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
            {compact && (
              <Pressable type="button" className={styles.floatingBtn} onClick={() => setExpanded(false)} aria-label={t("readAloud.collapse")} title={t("readAloud.collapse")} aria-expanded data-clickable="true">
                <Minimize2 size={14} />
              </Pressable>
            )}
          </div>
        )
      )}
    </>
  );
}
