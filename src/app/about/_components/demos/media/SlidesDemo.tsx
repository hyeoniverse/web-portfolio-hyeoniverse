"use client";

/* 발표처럼 넘어가는 갤러리 — 가운데 장이 크고 양옆은 원근으로 기운다. 브라우저는 소리 자동 재생을 막으므로 사이트 갤러리처럼
   "음성과 함께 보기 / 음성 없이 보기"를 먼저 묻는다. 화면에 절반 넘게 들어와 있는 동안만 읽고, 한 장을 다 읽으면 다음 장으로,
   마지막 장이 끝나면 멈춘다. 음성이 있는 장은 실제 Fish TTS 파일을, 없는 장은 4초를 쓴다. 끌기 · ←→ · 옆 장 누르기로 넘긴다 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { AudioLines, Captions, Pause, Play, Volume2, VolumeX } from "@/components/icons";
import { useL } from "../../features/shared";
import { SLIDE_H, SLIDE_W, SLIDES, fill, slideMs, slidesCopy as copy } from "./data";
import { useInView } from "./useInView";
import styles from "./MediaDemos.module.css";

/** ask: 소리를 낼지 묻는 중, sound: 소리와 함께, silent: 소리 없이 자막만, stopped: 끝까지 보고 멈춤 */
type SlideMode = "ask" | "sound" | "silent" | "stopped";

/** 끌어서 넘기는 거리(px) */
const SWIPE_PX = 40;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function SlidesDemo() {
  const L = useL();
  const [stage, inView] = useInView<HTMLDivElement>(0.5);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<SlideMode>("ask");
  const [captions, setCaptions] = useState(true);
  /* 브라우저가 소리 재생을 막아 자막만으로 넘어갔는지 */
  const [blocked, setBlocked] = useState(false);
  /* 일시정지 — 음성 · 진행 막대 · 자막이 그 자리에서 멈추고, 다시 누르면 이어서 */
  const [paused, setPaused] = useState(false);
  /* 지금 장을 얼마나 읽었는지(0~1) — 음성이 나오면 그 재생 위치, 아니면 흐른 시간으로 잰다. 자막은 이 값을 따른다 */
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  /* 같은 장을 다시 읽을 때도 진행과 음성이 처음부터 돌게 바꾸는 번호 */
  const [run, setRun] = useState(0);
  const drag = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const lastRun = useRef(-1);
  const slide = SLIDES[current];
  const playing = inView && !paused && (mode === "sound" || mode === "silent");
  /* 소리와 함께일 때 음성 파일이 있는 장은 음성이 끝나야 넘어간다 */
  const voiced = mode === "sound" && !!slide.audio;
  const ms = slideMs(slide);

  const go = (index: number) => {
    setCurrent(clamp(index, 0, SLIDES.length - 1));
    setRun((n) => n + 1);
    setPaused(false);
    setProgress(0);
    elapsed.current = 0;
  };
  const ended = () => {
    if (current === SLIDES.length - 1) setMode("stopped");
    else go(current + 1);
  };
  const endedRef = useRef(ended);
  useEffect(() => {
    endedRef.current = ended;
  });

  /* 소리 내기 — 화면에 보이는 동안만. 장이 바뀌면 처음부터, 화면 밖에 나갔다 오면 멈춘 자리부터 */
  useEffect(() => {
    if (mode !== "sound" || !slide.audio) return;
    const el = (audio.current ??= new Audio());
    if (!el.src.endsWith(slide.audio)) el.src = slide.audio;
    if (lastRun.current !== run) {
      el.currentTime = 0;
      lastRun.current = run;
    }
    el.onended = () => endedRef.current();
    if (inView && !paused) {
      void el.play().catch(() => {
        setBlocked(true);
        setMode("silent");
      });
    } else el.pause();
    return () => el.pause();
  }, [mode, slide, run, inView, paused]);
  useEffect(
    () => () => {
      const el = audio.current;
      if (!el) return;
      el.onended = null;
      el.pause();
      el.removeAttribute("src");
      el.load();
    },
    [],
  );

  /* 읽는 동안 매 프레임 진행을 잰다 — 음성 파일이 나오면 그 재생 위치(일시정지 · 되감기에도 맞는다), 아니면 흐른 시간.
     음성이 없는 장은 시간이 다 차면 다음 장으로 */
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const el = audio.current;
      const fromAudio = voiced && el && el.duration > 0 && !!slide.audio && el.src.endsWith(slide.audio);
      const next = Math.min(1, fromAudio ? el.currentTime / el.duration : elapsed.current / ms);
      setProgress((prev) => (Math.abs(prev - next) > 0.002 || next === 1 ? next : prev));
      if (!voiced && next >= 1) {
        endedRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, voiced, slide, ms]);

  /* 자막은 문장 하나씩 — 문장마다 글자 수 비율로 시작과 길이를 정하고, 진행이 그 문장에 있는 동안 그 문장만 보이며 읽은 낱말이 진해진다 */
  const sentences = slide.script.split(/(?<=[.?!])\s+/).filter(Boolean);
  const total = Math.max(1, sentences.join("").length);
  const lengths = sentences.map((sentence) => sentence.length / total);
  const cues = sentences.map((sentence, i) => ({
    start: lengths.slice(0, i).reduce((sum, length) => sum + length, 0),
    length: lengths[i],
    words: sentence.split(" "),
  }));
  const cue = cues.filter((item) => item.start <= progress).at(-1) ?? cues[0];
  const choose = (next: "sound" | "silent") => {
    setBlocked(false);
    setMode(next);
    go(current);
  };
  const togglePlay = () => {
    if (mode === "stopped") {
      setMode("silent");
      go(0);
    } else setPaused(!paused);
  };
  const source = blocked
    ? L(copy.blocked)
    : slide.audio
      ? fill(L(copy.sourceAudio), { page: slide.page })
      : L(copy.sourceNone);
  const koreanNote = L(copy.koreanNote);

  return (
    <div className={styles.panel}>
      <div
        className={styles.stage}
        ref={stage}
        tabIndex={0}
        role="group"
        aria-roledescription={L(copy.gallery)}
        aria-label={fill(L(copy.slideOf), { n: current + 1, total: SLIDES.length })}
        onKeyDown={(event) => {
          if (event.key === " " && mode !== "ask") {
            event.preventDefault();
            togglePlay();
          }
          if (event.key === "ArrowRight") go(current + 1);
          if (event.key === "ArrowLeft") go(current - 1);
        }}
        onPointerDown={(event) => {
          drag.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (drag.current === null) return;
          const dx = event.clientX - drag.current;
          drag.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(current + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {SLIDES.map((item, i) => {
          const d = i - current;
          return (
            <Pressable
              key={item.src}
              className={styles.slide}
              data-far={Math.abs(d) > 2 || undefined}
              aria-hidden={d !== 0}
              tabIndex={-1}
              noTapScale
              soundDisabled
              style={{ "--d": clamp(d, -2, 2), "--a": Math.min(2, Math.abs(d)), "--r": clamp(d, -1, 1) } as CSSProperties}
              onClick={() => d !== 0 && go(i)}
            >
              <Image
                src={item.src}
                alt={d === 0 ? fill(L(copy.slideOf), { n: i + 1, total: SLIDES.length }) : ""}
                width={SLIDE_W}
                height={SLIDE_H}
                sizes="(width > 768px) 40vw, 80vw"
                draggable={false}
              />
            </Pressable>
          );
        })}
        {mode === "ask" && (
          <div className={styles.ask} onPointerDown={(event) => event.stopPropagation()}>
            <Button variant="primary" size="sm" icon={<Volume2 size={16} />} onClick={() => choose("sound")}>
              {L(copy.withVoice)}
            </Button>
            <Button variant="outline" size="sm" onClick={() => choose("silent")}>
              {L(copy.withoutVoice)}
            </Button>
          </div>
        )}
      </div>

      {/* 자막을 꺼도 자리는 그대로 둔다(켜고 끌 때 아래가 움직이지 않게) */}
      <p
        className={styles.caption}
        key={`c${run}-${current}`}
        data-off={!captions || undefined}
        aria-hidden={!captions || undefined}
        lang="ko"
      >
        {cue ? (
          <span key={cue.start}>
            {cue.words.map((word, i) => (
              <span key={i} className={styles.word} data-read={cue.start + (i / cue.words.length) * cue.length <= progress || undefined}>
                {word}{" "}
              </span>
            ))}
          </span>
        ) : (
          <em className={styles.captionNote}>{L(copy.noScript)}</em>
        )}
      </p>

      <div className={styles.bar}>
        <Button
          variant="outline"
          shape="circle"
          size="xs"
          aria-label={paused || mode === "stopped" ? L(copy.play) : L(copy.pause)}
          title={`${paused || mode === "stopped" ? L(copy.play) : L(copy.pause)} (Space)`}
          disabled={mode === "ask"}
          icon={paused || mode === "stopped" ? <Play size={14} /> : <Pause size={14} />}
          onClick={togglePlay}
        />
        <Button
          variant="outline"
          size="xs"
          active={mode === "sound"}
          aria-pressed={mode === "sound"}
          icon={mode === "sound" ? <Volume2 size={14} /> : <VolumeX size={14} />}
          onClick={() => {
            setBlocked(false);
            if (mode === "stopped") go(0);
            setMode(mode === "sound" ? "silent" : "sound");
          }}
        >
          {L(copy.voice)}
        </Button>
        <Button
          variant="outline"
          size="xs"
          active={captions}
          aria-pressed={captions}
          icon={<Captions size={14} />}
          onClick={() => setCaptions(!captions)}
        >
          {L(copy.captions)}
        </Button>
        <span className={styles.source} data-warn={blocked || undefined}>
          <AudioLines size={14} aria-hidden /> {source}
        </span>
        <span className={styles.count}>
          {current + 1} / {SLIDES.length}
        </span>
      </div>

      <ol className={styles.strip}>
        {SLIDES.map((item, i) => (
          <li key={item.src}>
            <Pressable
              className={styles.thumb}
              aria-label={fill(L(copy.goTo), { n: i + 1 })}
              aria-current={i === current || undefined}
              onClick={() => go(i)}
            >
              <Image src={item.src} alt="" width={SLIDE_W} height={SLIDE_H} sizes="120px" />
              {i === current && <i className={styles.progress} style={{ "--p": progress } as CSSProperties} />}
            </Pressable>
          </li>
        ))}
      </ol>
      {koreanNote && <p className={styles.hint}>{koreanNote}</p>}
    </div>
  );
}
