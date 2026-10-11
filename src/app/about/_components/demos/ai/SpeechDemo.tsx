"use client";

/* 음성 만들기 — 대본을 고치고 목소리를 골라 보내면 /api/demo/speech 가 실제 음성(mp3)을 만든다.
   만든 음성은 바로 틀고, 재생하는 동안 대본이 읽힌 만큼 채워진다(재생 시간 비율로 어림). */
import { useEffect, useId, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import Textarea from "@/components/ui/Textarea";
import { AudioLines, Pause, Play } from "@/components/icons";
import { useL } from "../../features/shared";
import { common, MAX_CHARS, providerName, SPEECH_SAMPLE, speechCopy as copy } from "./data";
import { blockReason, Chip, LiveInfo, perIpOf, QuotaChip, StatusLine, useSampleText } from "./parts";
import { useDemoApi } from "./useDemoApi";
import styles from "./AiDemos.module.css";

type Voice = "female" | "male";
const MAX = MAX_CHARS.speech;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export default function SpeechDemo() {
  const L = useL();
  const id = useId();
  const [text, setText] = useSampleText(SPEECH_SAMPLE);
  const [voice, setVoice] = useState<Voice>("female");
  const [made, setMade] = useState<{ text: string; provider: string } | null>(null);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const { quota, busy, error, run, fail, clearError } = useDemoApi<{ audio?: string; provider?: string }>("speech");

  /* 떠나면 소리를 멈춘다 */
  useEffect(() => () => { audio.current?.pause(); }, []);

  const player = () => {
    if (audio.current) return audio.current;
    const el = new Audio();
    el.ontimeupdate = () => setTime(el.currentTime);
    el.onloadedmetadata = () => setLength(Number.isFinite(el.duration) ? el.duration : 0);
    el.onplay = () => { setPlaying(true); setAutoplayBlocked(false); };
    el.onpause = () => setPlaying(false);
    el.onended = () => setPlaying(false);
    audio.current = el;
    return el;
  };

  const play = (el: HTMLAudioElement) =>
    el.play().catch(() => setAutoplayBlocked(true));

  const make = async () => {
    const blocked = blockReason(text, MAX, quota);
    if (blocked) return fail(L(blocked));
    audio.current?.pause();
    const data = await run({ text, voice });
    if (!data) return;
    if (typeof data.audio !== "string" || !data.audio) return fail(L(common.failed));
    const el = player();
    el.src = data.audio;
    setTime(0);
    setLength(0);
    setMade({ text, provider: providerName(data.provider) });
    void play(el);
  };

  /* 읽힌 만큼 — 재생 시간 비율로 어림한 글자 수 */
  const chars = made ? [...made.text] : [];
  const read = made && length ? Math.round((time / length) * chars.length) : 0;
  const status = busy
    ? L(copy.busy)
    : autoplayBlocked
      ? L(copy.blocked)
      : made
        ? L(common.madeBy(made.provider || "AI"))
        : L(copy.idle);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <SegmentedControl
          size="sm"
          items={[
            { value: "female", label: L(copy.female) },
            { value: "male", label: L(copy.male) },
          ]}
          value={voice}
          onChange={(v) => { setVoice(v); clearError(); }}
        />
        <div className={styles.chips}>
          {made?.provider && <Chip>{made.provider}</Chip>}
          <QuotaChip quota={quota} kind="speech" />
        </div>
      </div>
      <LiveInfo text={common.live(perIpOf(quota, "speech"), MAX)} />
      <Textarea
        className={styles.fieldSm}
        id={`${id}-script`}
        label={L(copy.label)}
        size="sm"
        rows={3}
        maxHint={MAX}
        value={text}
        disabled={busy}
        onChange={(v) => { setText(v); clearError(); }}
      />
      {/* 자리는 늘 잡아 두고 내용만 바꾼다 — 상태에 따라 아래가 밀리지 않게 */}
      <p className={styles.lyric} aria-label={made?.text} data-empty={!made || undefined}>
        {made ? (
          <>
            <span className={styles.lyricRead}>{chars.slice(0, read).join("")}</span>
            {chars.slice(read).join("")}
          </>
        ) : (
          L(copy.lyric)
        )}
      </p>
      <div className={styles.player} data-empty={!made || undefined}>
        <Button
          variant="outline"
          shape="circle"
          size="sm"
          disabled={!made}
          aria-label={L(playing ? copy.pause : copy.play)}
          icon={playing ? <Pause size={14} /> : <Play size={14} />}
          onClick={() => {
            const el = player();
            if (el.paused) void play(el);
            else el.pause();
          }}
        />
        <div className={styles.seek} role="group" aria-label={L(copy.seek)}>
          <Slider
            min={0}
            max={length || 1}
            step={0.05}
            value={[time]}
            disabled={!made}
            onValueChange={([v]) => {
              const el = player();
              el.currentTime = v;
              setTime(v);
            }}
          />
        </div>
        <span className={styles.clock}>
          {clock(time)} / {clock(length)}
        </span>
      </div>
      <div className={styles.foot}>
        <StatusLine error={error}>{status}</StatusLine>
        <Button
          size="md"
          icon={<AudioLines size={16} />}
          loading={busy}
          disabled={busy || quota?.remaining === 0 || quota?.unavailable}
          onClick={() => void make()}
        >
          {L(copy.run)}
        </Button>
      </div>
    </div>
  );
}
