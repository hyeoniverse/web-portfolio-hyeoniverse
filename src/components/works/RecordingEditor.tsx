"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { AudioLines, Check, ClipboardPaste, Copy, Crop, Pause, Play, Redo2, RotateCcw, Scissors, Trash2, Undo2 } from "@/components/icons";
import { fillTemplate } from "@/utils/format";
import { deleteRange, durationOf, encodeWav, insertAt, peaksOf, silenceBounds, sliceAudio, type RecordedAudio } from "@/lib/micRecorder";
import styles from "./RecordingEditor.module.css";

/**
 * 녹음 다듬기 — 중지한 녹음을 들어 보고 고친 뒤 완료한다(갤러리 작업대의 재생 막대 자리).
 *
 * 파형을 누르면 커서, 끌면 구간을 고른다(Shift+누르기는 커서부터 구간). 고른 구간은 잘라내기·복사·지우기·
 * 선택만 남기기, 붙여넣기는 커서 자리에(구간을 골랐으면 그 구간을 바꿔) 넣는다. 고칠 때마다 되돌리기에 쌓는다.
 * 듣기는 고른 구간만, 아니면 커서부터 끝까지. 단축키: Space 듣기, ⌘/Ctrl+X·C·V·Z(Shift+Z 다시), Delete 지우기,
 * ← → 커서 0.1초, Esc 고르기 풀기.
 * 복사한 조각은 모듈에 두어 다른 장의 녹음에도 붙여 넣을 수 있다.
 */

const shared: { clip: RecordedAudio | null } = { clip: null };

/* 0.0초 단위 */
const clock = (sec: number) => {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

const MAX_UNDO = 50;
/* 이보다 짧게 끌면 고르기가 아니라 누르기로 친다(px) */
const DRAG_PX = 3;

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
  const [audio, setAudio] = useState(take);
  const [past, setPast] = useState<RecordedAudio[]>([]);
  const [future, setFuture] = useState<RecordedAudio[]>([]);
  const [cursor, setCursor] = useState(0);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [clip, setClip] = useState<RecordedAudio | null>(shared.clip);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState<number | null>(null);
  const playRef = useRef<{ el: HTMLAudioElement; url: string; raf: number } | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const duration = durationOf(audio);

  /* 단축키가 바로 듣도록 처음에 편집기로 초점을 옮긴다 */
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);

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
  const apply = (next: RecordedAudio, nextCursor: number, nextSel: [number, number] | null = null) => {
    stopPlay();
    setPast((p) => [...p.slice(-(MAX_UNDO - 1)), audio]);
    setFuture([]);
    setAudio(next);
    setCursor(Math.min(nextCursor, durationOf(next)));
    setSel(nextSel);
  };

  const undo = () => {
    if (!past.length) return;
    stopPlay();
    setFuture((f) => [audio, ...f]);
    setAudio(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSel(null);
    setCursor((c) => Math.min(c, durationOf(past[past.length - 1])));
  };
  const redo = () => {
    if (!future.length) return;
    stopPlay();
    setPast((p) => [...p, audio]);
    setAudio(future[0]);
    setFuture((f) => f.slice(1));
    setSel(null);
    setCursor((c) => Math.min(c, durationOf(future[0])));
  };

  const keep = (c: RecordedAudio) => { shared.clip = c; setClip(c); };
  const copy = () => { if (sel) keep(sliceAudio(audio, sel[0], sel[1])); };
  const cut = () => { if (!sel) return; keep(sliceAudio(audio, sel[0], sel[1])); apply(deleteRange(audio, sel[0], sel[1]), sel[0]); };
  const remove = () => { if (sel) apply(deleteRange(audio, sel[0], sel[1]), sel[0]); };
  const paste = () => {
    if (!clip) return;
    const base = sel ? deleteRange(audio, sel[0], sel[1]) : audio;
    const pos = sel ? sel[0] : cursor;
    const len = durationOf(clip);
    /* 붙인 조각을 골라 둔다 — 어디에 들어갔는지 보이고, 바로 지우거나 옮길 수 있다 */
    apply(insertAt(base, pos, clip), pos, [pos, pos + len]);
  };
  const keepOnly = () => { if (sel) apply(sliceAudio(audio, sel[0], sel[1]), 0); };
  const trimSilence = () => {
    const [s, e] = silenceBounds(audio);
    if (s > 0.01 || e < duration - 0.01) apply(sliceAudio(audio, s, e), Math.max(0, cursor - s));
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

  /* ── 파형 누르기·끌기 ── */
  const timeAt = (clientX: number) => {
    const r = waveRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    stopPlay();
    rootRef.current?.focus({ preventScroll: true });
    const x0 = e.clientX;
    const t0 = e.shiftKey && !sel ? cursor : timeAt(x0);
    if (e.shiftKey) { const t = timeAt(x0); setSel([Math.min(t0, t), Math.max(t0, t)]); return; }
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - x0) < DRAG_PX) return;
      dragging = true;
      const t = timeAt(ev.clientX);
      setSel([Math.min(t0, t), Math.max(t0, t)]);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragging) { setSel(null); setCursor(timeAt(ev.clientX)); }
      else setCursor(Math.min(t0, timeAt(ev.clientX)));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const run = (fn: () => void) => { e.preventDefault(); e.stopPropagation(); fn(); };
    if (e.key === " ") return run(play);
    if (mod && k === "x") return run(cut);
    if (mod && k === "c") return run(copy);
    if (mod && k === "v") return run(paste);
    if (mod && k === "z") return run(e.shiftKey ? redo : undo);
    if (mod && k === "y") return run(redo);
    if (e.key === "Delete" || e.key === "Backspace") return run(remove);
    if (e.key === "Escape" && sel) return run(() => setSel(null));
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") return run(() => { setSel(null); setCursor((c) => Math.max(0, Math.min(duration, c + (e.key === "ArrowLeft" ? -0.1 : 0.1)))); });
  };

  const pct = (sec: number) => `${(sec / Math.max(duration, 0.001)) * 100}%`;
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const key = (k: string) => `${mac ? "⌘" : "Ctrl+"}${k}`;

  return (
    <div ref={rootRef} className={styles.editor} tabIndex={-1} onKeyDown={onKeyDown} aria-label={fillTemplate(tw("narrationRecordReview"), { n: slide })}>
      <div ref={waveRef} className={styles.wave} onPointerDown={onPointerDown}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
        {sel && <span className={styles.sel} style={{ left: pct(sel[0]), width: pct(sel[1] - sel[0]) }} aria-hidden />}
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
          <Tool label={tw("narrationEditCut")} shortcut={key("X")} icon={<Scissors size={14} strokeWidth={2} />} onClick={cut} disabled={!sel} />
          <Tool label={tw("narrationEditCopy")} shortcut={key("C")} icon={<Copy size={14} strokeWidth={2} />} onClick={copy} disabled={!sel} />
          <Tool label={tw("narrationEditPaste")} shortcut={key("V")} icon={<ClipboardPaste size={14} strokeWidth={2} />} onClick={paste} disabled={!clip} />
          <Tool label={tw("narrationEditDelete")} shortcut={"Delete"} icon={<Trash2 size={14} strokeWidth={2} />} onClick={remove} disabled={!sel} />
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
