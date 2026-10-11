"use client";

/* 녹음 파형 편집기 — 실제 Fish 음성을 클립으로 다룬다. 누르면 커서, 끌면 구간. 잘라내기 · 복사 · 붙여넣기 · 지우기 · 선택만 남기기 · 나누기,
   되돌리기 50단계. 클립 위 번호 띠를 길게 눌러 끌면 순서가 바뀌고, 재생하면 편집한 순서 그대로 소리가 난다(Web Audio 로 조각을 이어 튼다).
   단축키는 편집기에 초점이 있을 때 받는다(Space 재생, ⌘/Ctrl+X C V B Z, Delete, Esc, ←→). 화면 밖으로 나가면 재생을 멈춘다 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { ClipboardPaste, Columns2, Copy, Crop, Pause, Play, Redo2, Scissors, Trash2, Undo2 } from "@/components/icons";
import { StarMark, useL } from "../../features/shared";
import { FISH_SAMPLE, SAMPLES, fill, waveCopy as copy } from "./data";
import { useInView } from "./useInView";
import styles from "./MediaDemos.module.css";

type Clips = number[][];

/** 표본 하나의 길이(초) */
const SAMPLE_SEC = 0.1;
const HISTORY = 50;
/** 클립을 끌기 시작하려고 길게 누르는 시간(ms) */
const LONG_PRESS_MS = 400;
/** 길게 누르는 동안 이만큼(px) 움직이면 구간 고르기로 본다 */
const PRESS_SLOP_PX = 5;

/** 편집기가 트는 실제 음성 — 처음 재생할 때 한 번만 받아 풀어 둔다 */
let sampleBuffer: Promise<AudioBuffer> | null = null;
const loadSample = (context: AudioContext) =>
  (sampleBuffer ??= fetch(FISH_SAMPLE)
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .catch((error: unknown) => {
      sampleBuffer = null;
      throw error;
    }));

/** 이어 붙은 조각들 — 원래 녹음에서 연속인 칸끼리 묶는다([시작 칸, 칸 수]) */
const runsOf = (bins: number[]) =>
  bins.reduce<[number, number][]>((runs, bin) => {
    const last = runs.at(-1);
    if (last && last[0] + last[1] === bin) last[1] += 1;
    else runs.push([bin, 1]);
    return runs;
  }, []);

/** 클립 하나를 다른 자리로 옮긴다(to 는 옮긴 뒤 놓일 순서) */
const moveClip = (clips: Clips, from: number, to: number): Clips => {
  const next = [...clips];
  const [clip] = next.splice(from, 1);
  next.splice(to, 0, clip);
  return next;
};

/** 구간 [a, b) 를 지운 클립들(빈 클립은 빠진다) */
const deleteSpan = (clips: Clips, a: number, b: number): Clips => {
  let at = 0;
  const out: Clips = [];
  for (const clip of clips) {
    const keep = clip.filter((_, i) => at + i < a || at + i >= b);
    at += clip.length;
    if (keep.length) out.push(keep);
  }
  return out;
};

/** 위치 i 에서 클립을 둘로 나눈다(클립 경계면 그대로) */
const splitAt = (clips: Clips, i: number): Clips => {
  let at = 0;
  return clips.flatMap((clip) => {
    const start = at;
    at += clip.length;
    return i > start && i < at ? [clip.slice(0, i - start), clip.slice(i - start)] : [clip];
  });
};

/** 위치 i 에 조각을 새 클립으로 끼운다 */
const insertAt = (clips: Clips, i: number, piece: number[]): Clips => {
  const split = splitAt(clips, i);
  let at = 0;
  const out: Clips = [];
  let placed = false;
  for (const clip of split) {
    if (!placed && at >= i) {
      out.push(piece);
      placed = true;
    }
    out.push(clip);
    at += clip.length;
  }
  if (!placed) out.push(piece);
  return out;
};

type Action = "play" | "cut" | "copy" | "paste" | "remove" | "keep" | "split" | "undo" | "redo";

export default function WaveDemo() {
  const L = useL();
  const [clips, setClips] = useState<Clips>(() => [SAMPLES.map((_, i) => i)]);
  const [past, setPast] = useState<Clips[]>([]);
  const [future, setFuture] = useState<Clips[]>([]);
  const [cursor, setCursor] = useState(0);
  const [span, setSpan] = useState<[number, number] | null>(null);
  const [clipboard, setClipboard] = useState<number[] | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  /* 끌고 있는 클립 — 몇 번째인지, 놓일 순서, 손잡이가 움직인 거리(px), 놓일 자리 선의 위치(px) */
  const [drag, setDrag] = useState<{ from: number; to: number; dx: number; line: number } | null>(null);
  /* 길게 누르는 중인 클립(손을 떼거나 움직이면 풀린다) */
  const [pressing, setPressing] = useState<number | null>(null);
  const press = useRef<{ x: number; timer: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const frame = useRef(0);
  const context = useRef<AudioContext | null>(null);
  const sources = useRef<AudioBufferSourceNode[]>([]);
  /* 재생을 누를 때마다 바뀌는 번호 — 음성을 받는 사이 멈췄으면 늦게 온 음성은 틀지 않는다 */
  const playId = useRef(0);
  const flat = clips.flat();
  const total = flat.length;

  const stop = useCallback(() => {
    playId.current += 1;
    cancelAnimationFrame(frame.current);
    sources.current.forEach((source) => {
      source.onended = null;
      source.stop();
    });
    sources.current = [];
    setPlayhead(null);
  }, []);
  const [box] = useInView<HTMLDivElement>(0.2, (inView) => {
    if (!inView) stop();
  });
  useEffect(
    () => () => {
      stop();
      void context.current?.close();
    },
    [stop],
  );

  const commit = (next: Clips) => {
    stop();
    setPast((now) => [...now, clips].slice(-HISTORY));
    setFuture([]);
    setClips(next);
  };
  /** 손잡이 x 위치에서 놓일 순서와 그 자리 선(클립 가운데를 지나면 그 뒤로) */
  const dropAt = (clientX: number, from: number) => {
    const rect = track.current?.getBoundingClientRect();
    const nodes = [...(track.current?.querySelectorAll<HTMLElement>("[data-clip]") ?? [])];
    if (!rect || !nodes.length) return { to: from, line: 0 };
    /* 끌고 있는 클립은 손을 따라 움직이므로 자리 셈에서 뺀다 */
    let slot = nodes.findIndex((node, i) => {
      if (i === from) return false;
      const r = node.getBoundingClientRect();
      return clientX < r.left + r.width / 2;
    });
    if (slot < 0) slot = nodes.length;
    const edge = slot < nodes.length ? nodes[slot].getBoundingClientRect().left - 2 : rect.right;
    return { to: slot > from ? slot - 1 : slot, line: edge - rect.left };
  };
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setPressing(null);
  };
  /** 클립 끌기 — 창 전체에서 움직임을 받아, 클립이 손을 따라오고 놓은 자리로 옮긴다 */
  const startDrag = (n: number, startX: number) => {
    let latest = { from: n, dx: 0, ...dropAt(startX, n) };
    setDrag(latest);
    const move = (next: PointerEvent) => {
      latest = { from: n, dx: next.clientX - startX, ...dropAt(next.clientX, n) };
      setDrag(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (latest.to !== latest.from) commit(moveClip(clips, latest.from, latest.to));
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const indexAt = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.round(clamp01((clientX - rect.left) / rect.width) * total);
  };

  const actions: Record<Action, () => void> = {
    cut: () => {
      if (!span) return;
      setClipboard(flat.slice(...span));
      commit(deleteSpan(clips, ...span));
      setCursor(span[0]);
      setSpan(null);
    },
    copy: () => {
      if (span) setClipboard(flat.slice(...span));
    },
    paste: () => {
      if (!clipboard) return;
      const at = span ? span[0] : cursor;
      commit(insertAt(span ? deleteSpan(clips, ...span) : clips, at, clipboard));
      setCursor(at + clipboard.length);
      setSpan(null);
    },
    remove: () => {
      if (!span) return;
      commit(deleteSpan(clips, ...span));
      setCursor(span[0]);
      setSpan(null);
    },
    keep: () => {
      if (!span) return;
      commit([flat.slice(...span)]);
      setCursor(0);
      setSpan(null);
    },
    split: () => commit(span ? splitAt(splitAt(clips, span[0]), span[1]) : splitAt(clips, cursor)),
    undo: () => {
      const previous = past.at(-1);
      if (!previous) return;
      stop();
      setPast(past.slice(0, -1));
      setFuture([clips, ...future]);
      setClips(previous);
      setSpan(null);
      setCursor((at) => Math.min(at, previous.flat().length));
    },
    redo: () => {
      const [next, ...rest] = future;
      if (!next) return;
      stop();
      setFuture(rest);
      setPast([...past, clips].slice(-HISTORY));
      setClips(next);
      setSpan(null);
      setCursor((at) => Math.min(at, next.flat().length));
    },
    play: () => {
      if (playhead !== null) return stop();
      const from = span ? span[0] : cursor >= total ? 0 : cursor;
      const to = span ? span[1] : total;
      if (to <= from || typeof AudioContext === "undefined") return;
      const audio = (context.current ??= new AudioContext());
      void audio.resume();
      setFailed(false);
      setPlayhead(from);
      const id = ++playId.current;
      const pieces = runsOf(flat.slice(from, to));
      loadSample(audio)
        .then((buffer) => {
          if (id !== playId.current) return;
          /* 편집한 순서대로 원래 녹음의 조각들을 이어 틀어 준다 */
          let at = audio.currentTime + 0.05;
          const begin = at;
          sources.current = pieces.map(([bin, count]) => {
            const source = audio.createBufferSource();
            source.buffer = buffer;
            source.connect(audio.destination);
            source.start(at, bin * SAMPLE_SEC, count * SAMPLE_SEC);
            at += count * SAMPLE_SEC;
            return source;
          });
          const last = sources.current.at(-1);
          if (last) last.onended = () => stop();
          const tick = () => {
            setPlayhead(from + Math.max(0, audio.currentTime - begin) / SAMPLE_SEC);
            frame.current = requestAnimationFrame(tick);
          };
          frame.current = requestAnimationFrame(tick);
        })
        .catch(() => {
          if (id !== playId.current) return;
          stop();
          setFailed(true);
        });
    },
  };

  const onKey = (event: KeyboardEvent) => {
    /* 도구 단추에 초점이 있을 때 Space 는 그 단추를 누른다 */
    if (event.key === " " && event.target !== event.currentTarget) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    const run = (action: () => void) => {
      event.preventDefault();
      action();
    };
    if (event.key === " ") run(actions.play);
    else if (mod && key === "x") run(actions.cut);
    else if (mod && key === "c") run(actions.copy);
    else if (mod && key === "v") run(actions.paste);
    else if (mod && key === "b") run(actions.split);
    else if (mod && key === "z") run(event.shiftKey ? actions.redo : actions.undo);
    else if (mod && key === "y") run(actions.redo);
    else if (event.key === "Delete" || event.key === "Backspace") run(actions.remove);
    else if (event.key === "Escape") run(() => setSpan(null));
    else if (event.key === "ArrowLeft") run(() => setCursor((at) => Math.max(0, at - 1)));
    else if (event.key === "ArrowRight") run(() => setCursor((at) => Math.min(total, at + 1)));
  };

  type Tool = { label: string; icon: ReactNode; keys: string; run: Action; off: boolean };
  /* 세 묶음 — 재생 | 고치기 | 되돌리기 */
  const groups: Tool[][] = [
    [
      {
        label: playhead !== null ? L(copy.stop) : L(copy.play),
        icon: playhead !== null ? <Pause size={16} /> : <Play size={16} />,
        keys: "Space",
        run: "play",
        off: total === 0,
      },
    ],
    [
      { label: L(copy.cut), icon: <Scissors size={16} />, keys: "⌘X", run: "cut", off: !span },
      { label: L(copy.copy), icon: <Copy size={16} />, keys: "⌘C", run: "copy", off: !span },
      { label: L(copy.paste), icon: <ClipboardPaste size={16} />, keys: "⌘V", run: "paste", off: !clipboard },
      { label: L(copy.remove), icon: <Trash2 size={16} />, keys: "Delete", run: "remove", off: !span },
      { label: L(copy.keep), icon: <Crop size={16} />, keys: "", run: "keep", off: !span },
      { label: L(copy.split), icon: <Columns2 size={16} />, keys: "⌘B", run: "split", off: total === 0 },
    ],
    [
      { label: L(copy.undo), icon: <Undo2 size={16} />, keys: "⌘Z", run: "undo", off: !past.length },
      { label: L(copy.redo), icon: <Redo2 size={16} />, keys: "⇧⌘Z", run: "redo", off: !future.length },
    ],
  ];
  const pct = (at: number) => `${(at / Math.max(1, total)) * 100}%`;
  /* 클립마다 녹음 전체에서 시작하는 위치 */
  const starts = clips.map((_, n) => clips.slice(0, n).reduce((sum, clip) => sum + clip.length, 0));
  const sec = (bins: number) => (bins * SAMPLE_SEC).toFixed(1);

  return (
    <div ref={box} className={styles.tool}>
      {/* 초점이 이 판에 있을 때 단축키를 받는다 */}
      <div className={styles.wave} tabIndex={0} role="application" onKeyDown={onKey} aria-label={L(copy.editor)}>
        <div className={styles.tools} role="toolbar" aria-label={L(copy.toolbar)}>
          {groups.map((group, g) => (
            <div key={g} className={styles.toolGroup}>
              {group.map((tool) => (
                <Button
                  key={tool.run}
                  variant={tool.run === "play" ? "primary" : "ghost"}
                  shape="circle"
                  size={tool.run === "play" ? "md" : "sm"}
                  disabled={tool.off}
                  title={tool.keys ? `${tool.label} (${tool.keys})` : tool.label}
                  aria-label={tool.label}
                  icon={tool.icon}
                  onClick={() => actions[tool.run]()}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          className={styles.track}
          ref={track}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const at = indexAt(event.clientX);
            anchor.current = at;
            setCursor(at);
            setSpan(null);
            /* 클립 위쪽 번호 띠를 움직이지 않고 길게 누르고 있으면 그 클립을 끌어 순서를 바꾼다.
               파형 쪽은 늘 구간 고르기다(누른 채 잠깐 멈췄다 끌어도 구간이 골라지게) */
            const band = (event.target as HTMLElement).closest<HTMLElement>("[data-band]");
            const clip = band?.closest<HTMLElement>("[data-clip]");
            if (clip && clips.length > 1) {
              const n = Number(clip.dataset.clip);
              const x = event.clientX;
              setPressing(n);
              press.current = {
                x,
                timer: window.setTimeout(() => {
                  press.current = null;
                  setPressing(null);
                  anchor.current = null;
                  setSpan(null);
                  startDrag(n, x);
                }, LONG_PRESS_MS),
              };
            }
          }}
          onPointerMove={(event) => {
            if (press.current && Math.abs(event.clientX - press.current.x) > PRESS_SLOP_PX) cancelPress();
            if (anchor.current === null) return;
            const at = indexAt(event.clientX);
            const a = Math.min(anchor.current, at);
            const b = Math.max(anchor.current, at);
            setSpan(b - a > 0 ? [a, b] : null);
          }}
          onPointerUp={() => {
            cancelPress();
            anchor.current = null;
          }}
          onPointerCancel={() => {
            cancelPress();
            anchor.current = null;
          }}
        >
          {clips.map((clip, n) => {
            const start = starts[n];
            return (
              <div
                key={`${n}-${start}`}
                className={styles.clip}
                style={{ flexGrow: clip.length, "--dx": drag?.from === n ? `${drag.dx}px` : "0px" } as CSSProperties}
                data-clip={n}
                data-dragging={drag?.from === n || undefined}
                data-pressing={pressing === n || undefined}
              >
                <span className={styles.clipBand} data-band>
                  <StarMark className={styles.clipStar} />
                  {n + 1}
                </span>
                <span className={styles.bars}>
                  {clip.map((sample, i) => (
                    <i
                      key={i}
                      style={{ "--h": SAMPLES[sample] } as CSSProperties}
                      data-on={(span && start + i >= span[0] && start + i < span[1]) || undefined}
                    />
                  ))}
                </span>
              </div>
            );
          })}
          {total === 0 && <p className={styles.waveEmpty}>{L(copy.empty)}</p>}
          {span && <span className={styles.span} style={{ left: pct(span[0]), width: pct(span[1] - span[0]) }} />}
          <span className={styles.cursor} style={{ left: pct(cursor) }} />
          {playhead !== null && <span className={styles.head} style={{ left: pct(Math.min(playhead, total)) }} />}
          {drag && drag.to !== drag.from && <span className={styles.drop} style={{ left: drag.line }} />}
        </div>
        <p className={styles.meta}>
          <span>{fill(L(copy.length), { sec: sec(total), n: clips.length })}</span>
          <span>{span ? fill(L(copy.picked), { sec: sec(span[1] - span[0]) }) : fill(L(copy.cursor), { sec: sec(cursor) })}</span>
          <span>{fill(L(copy.history), { n: past.length, max: HISTORY })}</span>
        </p>
      </div>
      {failed && (
        <p className={styles.hint} data-error role="alert">
          {L(copy.failed)}
        </p>
      )}
    </div>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
