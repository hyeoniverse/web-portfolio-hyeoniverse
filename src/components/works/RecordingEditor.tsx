"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { AudioLines, Check, ClipboardPaste, Copy, Crop, Pause, Play, Redo2, RotateCcw, Scissors, SeparatorVertical, Trash2, Undo2 } from "@/components/icons";
import { fillTemplate } from "@/utils/format";
import { durationOf, encodeWav, peaksOf, silenceBounds, sliceAudio, type RecordedAudio } from "@/lib/micRecorder";
import { clipsOf, deleteSpan, insertClip, keepSpan, moveClip, splitAt, type ClipTake } from "@/lib/audioClips";
import styles from "./RecordingEditor.module.css";

/**
 * 녹음 다듬기 — 중지한 녹음을 들어 보고 고친 뒤 완료한다(갤러리 작업대의 재생 막대 자리).
 *
 * - 파형: 누르면 커서, 끌면 구간(Shift+누르기는 커서부터). 고른 구간은 양 끝 손잡이를 끌어 넓히고 좁힌다.
 * - 클립: 커서 자리에서 나누면(⌘/Ctrl+B) 위 클립 줄에 조각으로 보인다. 클립을 누르면 그 클립을 고르고,
 *   끌면 다른 자리로 옮긴다. 붙여 넣은 조각은 제 클립이 된다.
 * - 고른 구간: 잘라내기·복사·지우기·선택만 남기기, 붙여넣기는 커서 자리에(구간을 골랐으면 그 구간을 바꿔).
 * - 고칠 때마다 되돌리기에 쌓는다(소리와 클립 경계를 한 벌로).
 * 단축키는 창 전체에서 듣는다 — 도구 단추를 누르면 그 단추가 꺼지며 초점이 편집기 밖으로 빠지기 때문이다.
 * 입력칸(대본 등)에 초점이 있으면 건드리지 않는다(그 칸의 되돌리기·붙여넣기가 먼저다).
 * 복사한 조각은 모듈에 두어 다른 장의 녹음에도 붙여 넣을 수 있다.
 */

const shared: { clip: RecordedAudio | null } = { clip: null };

/* 0.0초 단위 */
const clock = (sec: number) => {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

const MAX_UNDO = 50;
/* 이보다 짧게 끌면 고르기·옮기기가 아니라 누르기로 친다(px) */
const DRAG_PX = 3;

/* 입력칸에서 친 단축키는 그 칸의 것이다 */
const typingIn = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export interface RecordingEditorProps {
  take: RecordedAudio;
  /** 몇 장의 녹음인지 */
  slide: number;
  tw: (key: string) => string;
  onRetake: () => void;
  onCancel: () => void;
  onDone: (audio: RecordedAudio) => void;
}

/* 편집 도구 단추 — 이름과 단축키를 풍선 도움말로 */
function Tool({ label, shortcut, icon, onClick, disabled }: { label: string; shortcut: string | null; icon: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return <Button variant="ghost" size="sm" shape="circle" onClick={onClick} disabled={disabled} aria-label={label} title={shortcut ? `${label} (${shortcut})` : label} soundDisabled icon={icon} />;
}

export default function RecordingEditor({ take, slide, tw, onRetake, onCancel, onDone }: RecordingEditorProps) {
  const [cur, setCur] = useState<ClipTake>({ audio: take, cuts: [] });
  const [past, setPast] = useState<ClipTake[]>([]);
  const [future, setFuture] = useState<ClipTake[]>([]);
  const [cursor, setCursor] = useState(0);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [clip, setClip] = useState<RecordedAudio | null>(shared.clip);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState<number | null>(null);
  /* 클립을 끄는 중 — 어느 클립을, 어느 자리(0~클립 수)로 */
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const playRef = useRef<{ el: HTMLAudioElement; url: string; raf: number } | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audio = cur.audio;
  const duration = durationOf(audio);
  const clips = clipsOf(cur);

  const stopPlay = useCallback(() => {
    const p = playRef.current;
    if (p) { cancelAnimationFrame(p.raf); p.el.pause(); URL.revokeObjectURL(p.url); playRef.current = null; }
    setPlaying(false);
    setHead(null);
  }, []);
  useEffect(() => stopPlay, [stopPlay]);

  /* 파형 — 칸 폭에 맞춰 다시 그린다. 색은 캔버스의 글자색(CSS). 거의 무음인 칸은 그리지 않는다(점선처럼 보인다) */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      const g = canvas.getContext("2d");
      if (!g) return;
      const bar = 2 * dpr, gap = dpr;
      const count = Math.max(1, Math.floor(canvas.width / (bar + gap)));
      const peaks = peaksOf(audio, count);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = getComputedStyle(canvas).color;
      peaks.forEach((p, i) => {
        if (p < 0.02) return;
        const h = Math.max(2 * dpr, p * canvas.height);
        g.fillRect(i * (bar + gap), (canvas.height - h) / 2, bar, h);
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [audio]);

  /** 고친 녹음을 쓴다 — 앞 녹음은 되돌리기에 쌓는다 */
  const apply = (next: ClipTake, nextCursor: number, nextSel: [number, number] | null = null) => {
    if (next === cur) return;
    stopPlay();
    setPast((p) => [...p.slice(-(MAX_UNDO - 1)), cur]);
    setFuture([]);
    setCur(next);
    setCursor(Math.max(0, Math.min(nextCursor, durationOf(next.audio))));
    setSel(nextSel);
  };

  const restore = (t: ClipTake) => {
    stopPlay();
    setCur(t);
    setSel(null);
    setCursor((c) => Math.min(c, durationOf(t.audio)));
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [cur, ...f]);
    setPast((p) => p.slice(0, -1));
    restore(past[past.length - 1]);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, cur]);
    setFuture((f) => f.slice(1));
    restore(future[0]);
  };

  const keep = (c: RecordedAudio) => { shared.clip = c; setClip(c); };
  const copy = () => { if (sel) keep(sliceAudio(audio, sel[0], sel[1])); };
  const cut = () => { if (!sel) return; keep(sliceAudio(audio, sel[0], sel[1])); apply(deleteSpan(cur, sel[0], sel[1]), sel[0]); };
  const remove = () => { if (sel) apply(deleteSpan(cur, sel[0], sel[1]), sel[0]); };
  const paste = () => {
    if (!clip) return;
    const base = sel ? deleteSpan(cur, sel[0], sel[1]) : cur;
    const pos = sel ? sel[0] : cursor;
    /* 붙인 조각을 골라 둔다 — 어디에 들어갔는지 보이고, 바로 지우거나 옮길 수 있다 */
    apply(insertClip(base, pos, clip), pos, [pos, pos + durationOf(clip)]);
  };
  const keepOnly = () => { if (sel) apply(keepSpan(cur, sel[0], sel[1]), 0); };
  const trimSilence = () => {
    const [s, e] = silenceBounds(audio);
    if (s > 0.01 || e < duration - 0.01) apply(keepSpan(cur, s, e), Math.max(0, cursor - s));
  };
  const split = () => {
    const at = head ?? cursor;
    const next = splitAt(cur, at);
    if (next.cuts.length !== cur.cuts.length) apply(next, at);
  };

  const play = () => {
    if (playing) { stopPlay(); return; }
    const from = sel ? sel[0] : cursor >= duration - 0.05 ? 0 : cursor;
    const to = sel ? sel[1] : duration;
    if (to - from < 0.05) return;
    const url = URL.createObjectURL(new Blob([encodeWav(sliceAudio(audio, from, to)) as BlobPart], { type: "audio/wav" }));
    const el = new Audio(url);
    const p = { el, url, raf: 0 };
    playRef.current = p;
    const tick = () => { if (playRef.current === p) { setHead(from + el.currentTime); p.raf = requestAnimationFrame(tick); } };
    el.onended = () => stopPlay();
    el.play().then(() => { setPlaying(true); p.raf = requestAnimationFrame(tick); }).catch(stopPlay);
  };

  /* ── 단축키 — 창 전체에서. 최신 손잡이를 ref 로 들고 있는다 ── */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (typingIn(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const run = (fn: () => void) => { e.preventDefault(); e.stopPropagation(); fn(); };
      if (e.key === " " && !mod) return run(play);
      if (mod && k === "x") return run(cut);
      if (mod && k === "c") return run(copy);
      if (mod && k === "v") return run(paste);
      if (mod && k === "b") return run(split);
      if (mod && k === "z") return run(e.shiftKey ? redo : undo);
      if (mod && k === "y") return run(redo);
      if (!mod && (e.key === "Delete" || e.key === "Backspace")) return run(remove);
      if (e.key === "Escape" && sel) return run(() => setSel(null));
      if (!mod && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        return run(() => { setSel(null); setCursor((c) => Math.max(0, Math.min(duration, c + (e.key === "ArrowLeft" ? -0.1 : 0.1)))); });
      }
    };
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);

  /* ── 파형: 누르기·끌기, 고른 구간 손잡이 ── */
  const timeAt = (clientX: number) => {
    const r = waveRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  };
  /* 누른 채 움직이는 동안 move, 놓으면 up(움직였는지와 함께) */
  const track = (e: React.PointerEvent, move: (x: number) => void, up: (x: number, moved: boolean) => void) => {
    const x0 = e.clientX;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < DRAG_PX) return;
      moved = true;
      move(ev.clientX);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      up(ev.clientX, moved);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onWaveDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    stopPlay();
    const t0 = timeAt(e.clientX);
    if (e.shiftKey) { const a = sel ? (Math.abs(t0 - sel[0]) < Math.abs(t0 - sel[1]) ? sel[1] : sel[0]) : cursor; setSel([Math.min(a, t0), Math.max(a, t0)]); return; }
    track(e,
      (x) => { const t = timeAt(x); setSel([Math.min(t0, t), Math.max(t0, t)]); },
      (x, moved) => { if (!moved) { setSel(null); setCursor(timeAt(x)); } else setCursor(Math.min(t0, timeAt(x))); });
  };

  /* 고른 구간 양 끝 손잡이 — 반대쪽 끝은 그대로, 끄는 쪽만 따라온다(넘어가면 서로 바뀐다) */
  const onHandleDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !sel) return;
    const side = e.currentTarget.dataset.side === "start" ? 0 : 1;
    e.preventDefault();
    e.stopPropagation();
    stopPlay();
    const fixed = sel[side === 0 ? 1 : 0];
    const resize = (x: number) => { const t = timeAt(x); setSel([Math.min(fixed, t), Math.max(fixed, t)]); };
    track(e, resize, (x, moved) => { if (moved) resize(x); });
  };

  /* ── 클립 줄: 누르면 그 클립을 고르고, 끌면 옮긴다 ── */
  const slotAt = (clientX: number) => {
    const t = timeAt(clientX);
    return clips.reduce((n, [s, e]) => (t > (s + e) / 2 ? n + 1 : n), 0);
  };
  const onClipDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const i = Number(e.currentTarget.dataset.index);
    e.preventDefault();
    stopPlay();
    track(e,
      (x) => setDrag({ from: i, to: slotAt(x) }),
      (x, moved) => {
        setDrag(null);
        if (!moved) { setSel(clips[i]); setCursor(clips[i][0]); return; }
        const to = slotAt(x);
        const next = moveClip(cur, i, to);
        if (next === cur) return;
        /* 옮긴 클립을 골라 둔다 */
        const len = clips[i][1] - clips[i][0];
        const start = clipsOf(next)[to > i ? to - 1 : to][0];
        apply(next, start, [start, start + len]);
      });
  };

  const pct = (sec: number) => `${(sec / Math.max(duration, 0.001)) * 100}%`;
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const key = (k: string) => `${mac ? "⌘" : "Ctrl+"}${k}`;
  const selected = (s: number, e: number) => !!sel && Math.abs(sel[0] - s) < 0.01 && Math.abs(sel[1] - e) < 0.01;
  const dropAt = drag && drag.to !== drag.from && drag.to !== drag.from + 1 ? (drag.to < clips.length ? clips[drag.to][0] : duration) : null;

  return (
    <div className={styles.editor} aria-label={fillTemplate(tw("narrationRecordReview"), { n: slide })}>
      {/* 클립 줄 — 나눈 조각. 누르면 고르고 끌면 옮긴다 */}
      <div className={styles.clips} aria-label={tw("narrationEditClips")}>
        {clips.map(([s, e], i) => (
          <span
            key={`${i}-${s}`}
            className={styles.clip}
            style={{ left: pct(s), width: pct(e - s) }}
            data-on={selected(s, e) ? "" : undefined}
            data-dragging={drag?.from === i ? "" : undefined}
            data-index={i}
            onPointerDown={onClipDown}
            title={`${tw("narrationEditClip")} ${i + 1} · ${clock(s)}–${clock(e)}`}
          >
            {i + 1}
          </span>
        ))}
        {dropAt !== null && <span className={styles.drop} style={{ left: pct(dropAt) }} aria-hidden />}
      </div>
      <div ref={waveRef} className={styles.wave} onPointerDown={onWaveDown}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
        {cur.cuts.map((c) => <span key={c} className={styles.cut} style={{ left: pct(c) }} aria-hidden />)}
        {sel && (
          <span className={styles.sel} style={{ left: pct(sel[0]), width: pct(sel[1] - sel[0]) }}>
            <span className={styles.handle} data-side="start" onPointerDown={onHandleDown} aria-label={tw("narrationEditHandleStart")} />
            <span className={styles.handle} data-side="end" onPointerDown={onHandleDown} aria-label={tw("narrationEditHandleEnd")} />
          </span>
        )}
        {!sel && head === null && <span className={styles.cursor} style={{ left: pct(cursor) }} aria-hidden />}
        {head !== null && <span className={styles.head} style={{ left: pct(head) }} aria-hidden />}
      </div>
      <div className={styles.bar}>
        <Button
          variant="ghost"
          size="sm"
          shape="circle"
          onClick={play}
          aria-label={tw(playing ? "narrationRecordPlayPause" : "narrationRecordPlay")}
          title={`${tw(playing ? "narrationRecordPlayPause" : "narrationRecordPlay")} (Space)`}
          soundDisabled
          icon={playing ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
        />
        <span className={styles.info}>
          <span className={styles.title}>{fillTemplate(tw("narrationRecordReview"), { n: slide })}</span>
          <span className={styles.time}>
            {sel
              ? fillTemplate(tw("narrationEditSelection"), { from: clock(sel[0]), to: clock(sel[1]), len: ((Math.round(sel[1] * 10) - Math.round(sel[0] * 10)) / 10).toFixed(1) })
              : `${clock(head ?? cursor)} / ${clock(duration)}`}
          </span>
          {!sel && <span className={styles.hint}>{tw("narrationEditHint")}</span>}
        </span>
        <span className={styles.tools} role="toolbar" aria-label={tw("narrationEditTools")}>
          <Tool label={tw("narrationEditSplit")} shortcut={key("B")} icon={<SeparatorVertical size={14} strokeWidth={2} />} onClick={split} disabled={false} />
          <Tool label={tw("narrationEditCut")} shortcut={key("X")} icon={<Scissors size={14} strokeWidth={2} />} onClick={cut} disabled={!sel} />
          <Tool label={tw("narrationEditCopy")} shortcut={key("C")} icon={<Copy size={14} strokeWidth={2} />} onClick={copy} disabled={!sel} />
          <Tool label={tw("narrationEditPaste")} shortcut={key("V")} icon={<ClipboardPaste size={14} strokeWidth={2} />} onClick={paste} disabled={!clip} />
          <Tool label={tw("narrationEditDelete")} shortcut="Delete" icon={<Trash2 size={14} strokeWidth={2} />} onClick={remove} disabled={!sel} />
          <Tool label={tw("narrationEditKeepOnly")} shortcut={null} icon={<Crop size={14} strokeWidth={2} />} onClick={keepOnly} disabled={!sel} />
          <Tool label={tw("narrationRecordTrimSilence")} shortcut={null} icon={<AudioLines size={14} strokeWidth={2} />} onClick={trimSilence} disabled={false} />
          <span className={styles.divider} aria-hidden />
          <Tool label={tw("narrationEditUndo")} shortcut={key("Z")} icon={<Undo2 size={14} strokeWidth={2} />} onClick={undo} disabled={!past.length} />
          <Tool label={tw("narrationEditRedo")} shortcut={mac ? "⇧⌘Z" : "Ctrl+Y"} icon={<Redo2 size={14} strokeWidth={2} />} onClick={redo} disabled={!future.length} />
        </span>
        <span className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={() => { stopPlay(); onRetake(); }} soundDisabled icon={<RotateCcw size={14} strokeWidth={2} />}>{tw("narrationRecordRetake")}</Button>
          <Button variant="ghost" size="sm" onClick={() => { stopPlay(); onCancel(); }} soundDisabled>{tw("narrationRecordCancel")}</Button>
          <Button variant="primary" size="sm" onClick={() => { stopPlay(); onDone(audio); }} disabled={duration < 0.3} soundDisabled icon={<Check size={14} strokeWidth={2.25} />}>{tw("narrationRecordDone")}</Button>
        </span>
      </div>
    </div>
  );
}
