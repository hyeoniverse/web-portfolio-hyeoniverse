"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import HelpButton from "@/components/ui/HelpButton";
import Pressable from "@/components/ui/Pressable";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import Checkbox from "@/components/ui/Checkbox";
import Popover from "@/components/ui/Popover";
import { AlignLeft, AudioLines, BookOpen, ChevronDown, ExternalLink, File, Images, FastForward, Rewind, ChevronLeft, ChevronRight, ClipboardPaste, History, Pause, Play, Sparkles, Trash2, Upload, Volume2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { fillTemplate } from "@/utils/format";
import { errorText } from "@/lib/apiError";
import { sendAction, tryRequest } from "@/lib/sendAction";
import { isTtsVoice, parseVoice, voiceLabel, voiceParts, voicesFor, type TtsProvider, type TtsVoice, type VoiceLang } from "@/lib/ttsVoices";
import { chunkScript } from "@/lib/ttsChunks";
import { planScripts, splitScriptSections } from "@/lib/splitScripts";
import { displayScript } from "@/lib/ttsLexicon";
import { captionCues } from "@/lib/captionCues";
import LoadingDots from "@/components/ui/LoadingDots";
import LexiconEditor from "./LexiconEditor";
import { pushNarrationHistory, readNarrationHistory, removeNarrationHistory, subscribeNarrationHistory, type NarrationHistoryEntry } from "@/lib/narrationHistory";
import type { GalleryNote, GalleryNotes } from "@/data/projects";
import styles from "./GalleryNarrationEditor.module.css";

/**
 * 갤러리 장마다의 음성 — 편집 화면의 갤러리 섹션 안에서 고친다(따로 긴 목록도, 팝업도 두지 않는다).
 *
 * - 갤러리는 작업대다. 아래 가로 썸네일 줄(편집 화면이 그린다)에 음성 표시(NarrationBadge)가 붙고,
 *   위(GalleryNarrationPanel)에서 고른 장을 크게 보며 긴 대본을 쓴다 — 미리 듣기·음성 만들기·녹음 올리기·지우기.
 *   위 칸은 높이가 정해져 있어 대본이 길어도 페이지 길이가 그대로다(대본은 입력칸 안에서 스크롤).
 * - 조작 막대의 목소리 고르기와 "n장 음성 만들기" — 대본은 있는데 음성이 없거나 대본이 바뀐 장을 한꺼번에 만든다.
 *
 * 대본은 PPTX 를 올릴 때 발표자 노트로 채워진다(WorkEditor 의 ingestFiles).
 * 긴 대본은 조각으로 나눠 만든 뒤 이어 붙인다(ttsChunks · /api/works/tts/merge). 음성 파일은 선택이다 —
 * 없으면 읽는 화면에서 방문자의 브라우저가 대본을 읽는다. 한 장에 음성 파일은 하나다 — 녹음을 올리면 만든 음성을 대신한다.
 * 값은 그림 주소를 열쇠로 한 gallery_notes 에 둔다. 비동기로 음성을 만드는 동안 다른 장을 고쳐도
 * 섞이지 않게 부모의 update(주소, 바꿀 값)가 폼 최신값 위에 덧쓴다.
 */

type Update = (url: string, patch: Partial<GalleryNote>) => void;

/** 음성 만들기·녹음 올리기 — 칸마다의 창과 한꺼번에 만들기가 목소리·진행 상태를 같이 쓰도록 편집 화면에서 한 번 부른다.
 *  lang 은 편집 언어(KO/EN) — 대본·음성이 그 언어 칸에 있고, 목소리도 언어마다 따로 고른다(Fish 는 언어마다 화자가 다르다) */
export function useNarrationActions({ gallery, notes, update, tw, lang }: {
  gallery: string[];
  notes: GalleryNotes;
  update: Update;
  tw: (key: string) => string;
  lang: VoiceLang;
}) {
  const { t } = useLanguage();
  /* 처음 목소리 — 설정 › 서비스 › 슬라이드 음성의 기본 제공자에서 그 언어의 첫 목소리 */
  const defaultProvider = useSiteConfig().tts?.provider;
  const firstVoice = (l: VoiceLang) => voicesFor(l).find((v) => v.startsWith(`${defaultProvider}:`)) ?? voicesFor(l)[0];
  const [voices, setVoices] = useState<Record<VoiceLang, TtsVoice>>(() => ({ ko: firstVoice("ko"), en: firstVoice("en") }));
  const voice = voices[lang];
  const setVoice = useCallback((v: TtsVoice) => setVoices((prev) => ({ ...prev, [lang]: v })), [lang]);
  /* 음성을 만드는 중인 장과 진행(조각 몇 개 중 몇 개) */
  const [busy, setBusy] = useState<ReadonlyMap<string, { done: number; total: number }>>(new Map());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  /* 갤러리 아래에 크게 열어 둔 장 — 주소로 들고 있는다(차례를 바꿔도 같은 장이 열려 있게) */
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  /* 지금 펼친 장 — 음성을 다 만든 시점(비동기 뒤)에 그 장을 아직 보고 있는지 알려고 */
  const openUrlRef = useRef<string | null>(null);
  useEffect(() => { openUrlRef.current = openUrl; }, [openUrl]);
  /* 연 뒤 대본 입력칸으로 커서를 옮길지 — 썸네일·‹ › 를 누르면 옮기고, 목록에서 ↑↓ 로 옮길 때는 목록에 둔다
     (입력칸으로 가 버리면 다음 ↑↓ 가 글 안의 커서 이동이 된다). 바뀔 때마다 새 값이라 같은 장을 다시 눌러도 옮긴다 */
  const [focusTick, setFocusTick] = useState(0);

  /* 한 번 만든 묶음을 돌려 쓴다 — 편집 화면의 갤러리 섹션은 useMemo 로 묶여 있어, 그릴 때마다 새 묶음이 오면
     제목 한 글자를 칠 때마다 갤러리 전체를 다시 그린다 */
  return useMemo(() => {
    const setRowBusy = (url: string, progress: { done: number; total: number } | null) =>
      setBusy((prev) => {
        const next = new Map(prev);
        if (progress) next.set(url, progress); else next.delete(url);
        return next;
      });

    const post = (path: string, payload: unknown) => tryRequest(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    /* 지금 음성을 이력에 남긴다 — 바꾸거나 지우기 전에. 이력 기능 전에 만든 음성도 이렇게 들어온다 */
    const rememberCurrent = (url: string) => {
      const cur = notes[url];
      if (!cur?.audio || readNarrationHistory(url).some((e) => e.audio === cur.audio)) return;
      pushNarrationHistory(url, { audio: cur.audio, voice: cur.audioVoice, source: cur.audioSource, script: cur.audioScript, at: Date.now() - 1 });
    };

    /**
     * 대본으로 음성을 만든다. 만든 음성 주소를, 실패하면 그 오류를 돌려준다(여럿 만들기가 실패에서 멈추려고).
     * 긴 대본은 문장 경계에서 조각으로 나눠 차례로 만들고 서버가 한 파일로 잇는다. 중간에 실패하면 만든 조각은 지운다.
     * 서버는 고른 목소리로 만들고, 그 제공자가 실패하면 다른 제공자의 같은 성별로 넘어가 실제로 쓴 목소리를 알려 준다.
     * 뒤 조각은 첫 조각의 제공자로만 만든다 — 한 장 안에서 목소리가 바뀌거나 이어 붙일 수 없는 형식이 섞이지 않게.
     * 뒤 조각이 실패하면 그 제공자를 빼고 처음부터 다시 만든다. 고른 목소리와 다르게 만들어졌으면 알린다
     */
    const generate = async (url: string, script: string) => {
      const chunks = chunkScript(script);
      const parts: string[] = [];
      const discard = () => {
        if (parts.length > 0) void post("/api/works/tts/merge", { urls: parts.splice(0), discard: true });
      };
      const fail = (err: Error) => {
        discard();
        setRowBusy(url, null);
        return err;
      };
      const skip: TtsProvider[] = [];
      let used: TtsVoice = voice;
      let skipped = "";
      for (;;) {
        let provider: TtsProvider | undefined;
        let retry = false;
        setRowBusy(url, { done: 0, total: chunks.length });
        for (const chunk of chunks) {
          const res = await post("/api/works/tts", provider ? { text: chunk, voice, lang, provider } : { text: chunk, voice, lang, skip });
          if (!(res instanceof Response)) {
            /* 첫 조각이 실패했으면 서버가 남은 제공자를 다 해 본 것이다 */
            if (!provider) return fail(res);
            discard();
            skip.push(provider);
            retry = true;
            break;
          }
          const data = await res.json().catch(() => ({}));
          if (!data?.url) return fail(new Error("no url"));
          if (!provider) {
            provider = data.provider as TtsProvider;
            if (isTtsVoice(data.voice)) used = data.voice;
            if (typeof data.skipped === "string") skipped = data.skipped;
          }
          parts.push(data.url);
          setRowBusy(url, { done: parts.length, total: chunks.length });
        }
        if (!retry) break;
      }
      let audio = parts[0];
      if (parts.length > 1) {
        const res = await post("/api/works/tts/merge", { urls: parts });
        if (!(res instanceof Response)) return fail(res);
        const data = await res.json().catch(() => ({}));
        if (!data?.url) return fail(new Error("no url"));
        audio = data.url;
      }
      setRowBusy(url, null);
      rememberCurrent(url);
      pushNarrationHistory(url, { audio, voice: used, source: "tts", script, at: Date.now() });
      update(url, { audio, audioSource: "tts", audioScript: script, audioVoice: used });
      if (parseVoice(used).provider !== parseVoice(voice).provider) {
        showToast(fillTemplate(tw("narrationFallback"), { from: voiceLabel(voice, tw), to: voiceLabel(used, tw), reason: skipped || "-" }), "info", 6000);
      }
      return audio;
    };

    const generateOne = async (url: string) => {
      const res = await generate(url, notes[url]?.script?.trim() ?? "");
      if (res instanceof Error) showToast(errorText(res, t, tw("narrationFailed")), "error");
      /* 한 장을 만들었으면 바로 들려준다 — 만드는 동안 다른 장으로 옮겼으면 들려주지 않는다(장을 옮기면 멈추는 규칙과 같게).
         처음 연 장(openUrl 없음)은 목록의 첫 장이다 */
      else if ((openUrlRef.current ?? gallery[0]) === url) togglePreview(res);
    };

    /* 한꺼번에 만들 장 — 대본이 있는 장 전부. 대본이 그대로여도(목소리를 바꿨을 때 등) 다시 만든다. 녹음한 장은 뺀다 */
    const targets = gallery.filter((url) => notes[url]?.script?.trim() && notes[url]?.audioSource !== "recorded");

    /** 대본이 있는 장을 모두 만든다(이미 음성이 있어도 다시) */
    /** 여러 장을 차례로 만든다 — replace 면 이미 음성이 있는 장도 새로 만들고, 아니면 음성이 없는 장만 */
    const generateAll = async ({ replace = true }: { replace?: boolean } = {}) => {
      const todo = targets.filter((u) => replace || !notes[u]?.audio);
      if (bulk || todo.length === 0) return;
      setBulk({ done: 0, total: todo.length });
      let done = 0;
      for (const url of todo) {
        const err = await generate(url, notes[url]?.script?.trim() ?? "");
        if (err instanceof Error) {
          /* 실패하면 멈춘다 — 같은 원인으로 남은 장도 실패할 가능성이 크고, 남은 장은 읽는 화면에서 브라우저가 읽는다 */
          showToast(errorText(err, t, tw("narrationFailed")), "error");
          break;
        }
        done++;
        setBulk({ done, total: todo.length });
      }
      setBulk(null);
      if (done > 0) showToast(fillTemplate(tw("narrationDone"), { n: done }), "success");
    };

    const uploadRecording = (url: string) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        setRowBusy(url, { done: 0, total: 1 });
        const form = new FormData();
        form.append("file", file);
        const res = await sendAction("/api/upload", { method: "POST", body: form }, t, t("admin.common.uploadFailed"));
        setRowBusy(url, null);
        if (!res) return;
        const data = await res.json().catch(() => ({}));
        if (data?.url) {
          rememberCurrent(url);
          pushNarrationHistory(url, { audio: data.url, source: "recorded", at: Date.now() });
          update(url, { audio: data.url, audioSource: "recorded", audioScript: undefined, audioVoice: undefined });
        }
      };
      input.click();
    };

    const clearAudio = (url: string) => {
      rememberCurrent(url);
      update(url, { audio: undefined, audioSource: undefined, audioScript: undefined, audioVoice: undefined });
    };

    /** 이력의 음성을 이 장의 음성으로 되돌린다 */
    const restoreHistory = (url: string, entry: NarrationHistoryEntry) => {
      rememberCurrent(url);
      update(url, { audio: entry.audio, audioSource: entry.source ?? "tts", audioScript: entry.script, audioVoice: entry.voice });
    };

    /** 나눈 대본을 1장부터 차례로 넣는다. overwrite 가 아니면 이미 대본이 있는 장은 그대로 둔다. 넣은 장 수를 돌려준다 */
    /** 정해진 장(1부터)에 대본을 넣는다. overwrite 가 아니면 이미 대본이 있는 장은 그대로 둔다. 넣은 장 수를 돌려준다 */
    const pasteScripts = (items: { slide: number; text: string }[], overwrite: boolean) => {
      let n = 0;
      items.forEach(({ slide, text }) => {
        const url = gallery[slide - 1];
        if (!url || (!overwrite && notes[url]?.script?.trim())) return;
        update(url, { script: text });
        n++;
      });
      return n;
    };

    /* 열어 둔 장이 갤러리에서 빠졌으면 닫힌 것으로 친다 */
    const openIndex = openUrl ? gallery.indexOf(openUrl) : -1;

    return {
      voice, setVoice, lang, busy, bulk, targets, generateOne, generateAll, uploadRecording, clearAudio, restoreHistory, pasteScripts, update, notes,
      openUrl, openIndex, focusTick,
      open: (url: string | null, focusScript = true) => {
        setOpenUrl(url);
        if (focusScript) setFocusTick((n) => n + 1);
      },
    };
  }, [gallery, notes, update, tw, t, voice, setVoice, lang, busy, bulk, openUrl, focusTick]);
}

export type NarrationActions = ReturnType<typeof useNarrationActions>;

/* 입력칸에서 친 Ctrl+A 가 갤러리의 "모두 고르기"로 올라가지 않게 — 대본 안 전체 선택이어야 한다 */
function stopSelectAll(e: React.KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") e.stopPropagation();
}

/* ── 미리 듣기 — 한 번에 한 장만. 다른 장을 누르면 앞의 것은 멈춘다.
   멈춰도 불러 둔 음성과 자리는 남겨 둔다 — 다시 누르면 그 자리부터, 재생 막대는 멈춘 자리를 보여 준다 ── */
let previewAudio: HTMLAudioElement | null = null;
/** 불러 둔 음성 주소(멈춰 있어도) */
let previewUrl: string | null = null;
let previewPlaying = false;
type PreviewTime = { url: string | null; time: number; duration: number };
const IDLE_TIME: PreviewTime = { url: null, time: 0, duration: 0 };
let previewTime: PreviewTime = IDLE_TIME;
const previewListeners = new Set<() => void>();
const notifyPreview = () => previewListeners.forEach((l) => l());

function emitPreview() {
  const a = previewAudio;
  previewTime = { url: previewUrl, time: a?.currentTime ?? 0, duration: a && Number.isFinite(a.duration) ? a.duration : 0 };
  notifyPreview();
}

function loadPreview(url: string) {
  previewAudio?.pause();
  const audio = new Audio(url);
  previewAudio = audio;
  previewUrl = url;
  previewPlaying = false;
  const mine = (fn: () => void) => () => { if (previewAudio === audio) fn(); };
  audio.onplay = mine(() => { previewPlaying = true; emitPreview(); });
  audio.onpause = mine(() => { previewPlaying = false; emitPreview(); });
  audio.onended = mine(() => { previewPlaying = false; emitPreview(); });
  audio.ontimeupdate = mine(emitPreview);
  audio.onloadedmetadata = mine(emitPreview);
  return audio;
}

function playPreview(audio: HTMLAudioElement) {
  audio.play().catch(() => { previewPlaying = false; emitPreview(); });
}

function togglePreview(url: string) {
  if (previewUrl === url && previewAudio) {
    if (previewPlaying) previewAudio.pause();
    else playPreview(previewAudio);
    return;
  }
  playPreview(loadPreview(url));
  emitPreview();
}

/** 재생 자리를 옮기고 그 자리부터 들려준다 */
function seekPreview(url: string, time: number, play = true) {
  const audio = previewUrl === url && previewAudio ? previewAudio : loadPreview(url);
  const go = () => {
    audio.currentTime = Math.max(0, Number.isFinite(audio.duration) ? Math.min(time, audio.duration) : time);
    emitPreview();
    if (play && !previewPlaying) playPreview(audio);
  };
  if (audio.readyState >= 1) go();
  else audio.addEventListener("loadedmetadata", go, { once: true });
}

function pausePreview() {
  previewAudio?.pause();
}

function subscribePreview(cb: () => void) {
  previewListeners.add(cb);
  return () => { previewListeners.delete(cb); };
}

/** 지금 재생 중인 음성 주소(멈춰 있으면 null) */
function usePreviewUrl() {
  return useSyncExternalStore(subscribePreview, () => (previewPlaying ? previewUrl : null), () => null);
}

function usePreviewTime() {
  return useSyncExternalStore(subscribePreview, () => previewTime, () => IDLE_TIME);
}

/** 아직 불러오지 않은 음성의 길이 — 재생 막대가 처음부터 전체 길이를 보이도록 머리만 읽는다 */
function useAudioDuration(url: string | undefined) {
  const [meta, setMeta] = useState<{ url: string; duration: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setMeta({ url, duration: a.duration }); };
    a.src = url;
    return () => { a.onloadedmetadata = null; a.src = ""; };
  }, [url]);
  return meta && meta.url === url ? meta.duration : 0;
}

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ── 가사 보기 — 재생하는 동안 대본 입력칸 자리에 문장을 한 줄씩 보여 주고, 지금 읽는 줄을 글자 단위로
   강조색으로 채워 간다(자막과 같은 글자 수 비율, captionCues). 단어를 누르면 그 단어부터 재생한다.
   일시정지하면 입력칸으로 돌아온다 ── */
/** 강조를 소리보다 이만큼 앞당긴다(초). 0.15 로 두었더니 소리보다 빨랐다 — 매 프레임 읽으므로 앞당기지 않는다 */
const LYRIC_LEAD_SEC = 0;

function LyricsView({ audio, script, tw }: { audio: string; script: string; tw: (key: string) => string }) {
  const pt = usePreviewTime();
  /* [표기|읽을 말] 은 가사에 표기만 */
  const cues = useMemo(() => captionCues(displayScript(script)), [script]);
  const boxRef = useRef<HTMLDivElement>(null);
  /* 재생 자리를 화면을 그릴 때마다 오디오에서 직접 읽는다 — timeupdate 는 0.25초쯤마다라 강조가 끊기며 늦었다 */
  const [frameTime, setFrameTime] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (previewUrl === audio && previewAudio) setFrameTime(previewAudio.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audio]);
  const time = pt.url === audio ? Math.max(frameTime, 0) : 0;
  const progress = pt.url === audio && pt.duration ? Math.min(1, (time + LYRIC_LEAD_SEC) / pt.duration) : 0;
  let current = 0;
  cues.forEach((c, i) => { if (c.start <= progress) current = i; });
  const end = cues[current + 1]?.start ?? 1;
  const within = cues.length ? Math.min(1, Math.max(0, (progress - cues[current].start) / Math.max(0.0001, end - cues[current].start))) : 0;

  /* 지금 줄을 칸 가운데로 — 페이지는 움직이지 않게 칸 안에서만 굴린다 */
  useEffect(() => {
    const box = boxRef.current;
    const line = box?.querySelector<HTMLElement>(`[data-line="${current}"]`);
    if (!box || !line) return;
    box.scrollTo({ top: line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2, behavior: "smooth" });
  }, [current]);

  /* 단어를 누르면 그 단어부터 — 그 문장 구간 안에서 단어 앞 글자 수 비율만큼 들어간 자리(강조와 같은 계산) */
  const seekTo = (cueIndex: number, charIndex: number) => {
    const cue = cues[cueIndex];
    if (!cue || !pt.duration) return;
    const cueEnd = cues[cueIndex + 1]?.start ?? 1;
    const ratio = cue.text.length ? charIndex / cue.text.length : 0;
    seekPreview(audio, (cue.start + (cueEnd - cue.start) * ratio) * pt.duration);
  };

  return (
    <div ref={boxRef} className={styles.lyrics} aria-label={tw("narrationLyrics")}>
      {cues.map((c, i) => {
        const state = i < current ? "past" : i === current ? "now" : "next";
        const filled = i === current ? Math.round(c.text.length * within) : 0;
        /* 띄어쓰기로 나눈 단어 — 빈칸은 누를 수 없는 글자로 둔다. 지금 줄은 글자마다 강조를 칠한다 */
        let at = 0;
        const parts = c.text.split(/(\s+)/).filter(Boolean).map((part) => {
          const start = at;
          at += part.length;
          return { part, start, space: /^\s+$/.test(part) };
        });
        return (
          <div key={i} className={styles.lyricLine} data-line={i} data-state={state}>
            {parts.map(({ part, start, space }) =>
              space ? (
                <span key={start}>{part}</span>
              ) : (
                <Pressable key={start} className={styles.lyricWord} onClick={() => seekTo(i, start)} noTapScale soundDisabled>
                  {state === "now"
                    ? [...part].map((ch, j) => <span key={j} data-on={start + j < filled ? "" : undefined}>{ch}</span>)
                    : part}
                </Pressable>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 앞뒤로 건너뛰는 폭(초) */
const SKIP_SEC = 5;

/* 재생 막대 — 이 장의 음성을 재생·일시정지하고, 5초씩 건너뛰고, 들을 자리를 고른다.
   막대를 끌거나 누르면 그 자리부터 재생하고, 건너뛰기는 재생 중이면 이어서·멈춰 있으면 자리만 옮긴다 */
function PreviewSeek({ audio, tw }: { audio: string | undefined; tw: (key: string) => string }) {
  const pt = usePreviewTime();
  const listening = usePreviewUrl() === audio && !!audio;
  const loaded = useAudioDuration(audio);
  const active = !!audio && pt.url === audio;
  const duration = active && pt.duration ? pt.duration : loaded;
  const time = active ? Math.min(pt.time, duration || pt.time) : 0;
  const skip = (delta: number) => { if (audio) seekPreview(audio, time + delta, false); };

  return (
    <span className={styles.seek} aria-label={tw("narrationSeek")}>
      <span className={styles.seekButtons}>
        <Button variant="ghost" size="sm" shape="circle" onClick={() => skip(-SKIP_SEC)} disabled={!audio || !duration} aria-label={tw("narrationBack5")} title={tw("narrationBack5")} soundDisabled icon={<Rewind size={14} strokeWidth={2} />} />
        <Button
          variant="ghost"
          size="sm"
          shape="circle"
          onClick={() => { if (audio) togglePreview(audio); }}
          disabled={!audio}
          aria-label={tw(listening ? "narrationPause" : "narrationListen")}
          aria-pressed={listening}
          title={tw(listening ? "narrationPause" : "narrationListen")}
          soundDisabled
          icon={listening ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
        />
        <Button variant="ghost" size="sm" shape="circle" onClick={() => skip(SKIP_SEC)} disabled={!audio || !duration} aria-label={tw("narrationForward5")} title={tw("narrationForward5")} soundDisabled icon={<FastForward size={14} strokeWidth={2} />} />
      </span>
      <Slider className={styles.seekSlider} value={[time]} min={0} max={duration || 1} step={0.1} disabled={!audio || !duration} onValueChange={([v]) => { if (audio) seekPreview(audio, v); }} />
      <span className={styles.seekTime}>{clock(time)} / {clock(duration)}</span>
    </span>
  );
}

/* 이 장의 음성 상태 한 줄 — 늘 한 줄 자리를 차지한다(비어 있어도). 안내가 새 줄로 생기면 둘레 높이가 들썩인다 */
function StatusLine({ note, progress, tw }: { note: GalleryNote | undefined; progress: { done: number; total: number } | undefined; tw: (key: string) => string }) {
  const script = note?.script ?? "";
  const stale = note?.audioSource === "tts" && !!note.audio && note.audioScript !== script;
  const text = progress
    ? (progress.total > 1 ? fillTemplate(tw("narrationWorkingN"), progress) : tw("narrationWorking"))
    : stale
      ? tw("narrationStaleShort")
      : note?.audio
        ? (note.audioSource === "recorded"
          ? tw("narrationSourceRecorded")
          : isTtsVoice(note.audioVoice) ? `${tw("narrationSourceTts")} · ${voiceLabel(note.audioVoice, tw)}` : tw("narrationSourceTts"))
        : script.trim() ? tw("narrationBrowserShort") : "";
  return (
    <span className={styles.status} data-audio={note?.audio ? "" : undefined} data-stale={stale ? "" : undefined} title={text || undefined}>
      {text}
    </span>
  );
}

/* ── 음성 이력 — 이 장에서 만들거나 올린 음성(이 브라우저에만 남긴다, lib/narrationHistory) ── */
const HISTORY_MODAL_ID = "narration-history";

function useSlideHistory(url: string) {
  return useSyncExternalStore(subscribeNarrationHistory, () => readNarrationHistory(url), () => readNarrationHistory(""));
}

function HistoryDialog({ url, actions, tw }: { url: string; actions: NarrationActions; tw: (key: string) => string }) {
  const { language } = useLanguage();
  const { closeModal } = useModalStore();
  const history = useSlideHistory(url);
  const current = actions.notes[url]?.audio;
  const playing = usePreviewUrl();
  const when = (at: number) => new Date(at).toLocaleString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const label = (e: NarrationHistoryEntry) =>
    e.source === "recorded" ? tw("narrationHistoryRecorded") : isTtsVoice(e.voice) ? voiceLabel(e.voice, tw) : tw("narrationHistoryUnknown");

  return (
    <div className={styles.historyModal}>
      <p className={styles.pasteHint}>{tw("narrationHistoryHint")}</p>
      {history.length === 0 && <p className={styles.pasteSummary}>{tw("narrationHistoryEmpty")}</p>}
      <ul className={styles.historyList}>
        {history.map((e) => {
          const isCurrent = e.audio === current;
          return (
            <li key={e.audio} className={styles.historyItem} data-current={isCurrent ? "" : undefined}>
              <Button
                variant="ghost"
                size="sm"
                shape="circle"
                onClick={() => togglePreview(e.audio)}
                aria-label={tw("narrationListen")}
                aria-pressed={playing === e.audio}
                soundDisabled
                icon={playing === e.audio ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
              />
              <span className={styles.historyInfo}>
                <span className={styles.historyVoice}>{label(e)}</span>
                <span className={styles.historyMeta}>{when(e.at)}{e.script ? ` · ${e.script.slice(0, 40)}${e.script.length > 40 ? "…" : ""}` : ""}</span>
              </span>
              {isCurrent ? (
                <span className={styles.historyCurrent}>{tw("narrationHistoryCurrent")}</span>
              ) : (
                <Button variant="subtle" size="sm" shape="capsule" className={styles.bulkButton} onClick={() => { actions.restoreHistory(url, e); closeModal(HISTORY_MODAL_ID); }} soundDisabled>
                  {tw("narrationHistoryUse")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                shape="circle"
                onClick={() => removeNarrationHistory(url, e.audio)}
                disabled={isCurrent}
                aria-label={tw("narrationHistoryRemove")}
                title={tw("narrationHistoryRemove")}
                soundDisabled
                icon={<Trash2 size={14} strokeWidth={2} />}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HistoryButton({ url, note, actions, tw, disabled }: { url: string; note: GalleryNote | undefined; actions: NarrationActions; tw: (key: string) => string; disabled?: boolean }) {
  const { openModal } = useModalStore();
  const history = useSlideHistory(url);
  /* 지금 음성 하나뿐이면 볼 게 없다 — 숨기지 않고 누를 수 없게만 */
  const others = history.filter((e) => e.audio !== note?.audio).length;
  const label = others ? fillTemplate(tw("narrationHistoryN"), { n: others }) : tw("narrationHistory");
  return (
    <Button
      variant="ghost"
      size="sm"
      shape="circle"
      onClick={() => openModal(<HistoryDialog url={url} actions={actions} tw={tw} />, { id: HISTORY_MODAL_ID, header: { title: tw("narrationHistory") }, width: "560px", closeButton: true })}
      disabled={disabled || others === 0}
      aria-label={label}
      title={label}
      soundDisabled
      icon={<History size={14} strokeWidth={2} />}
    />
  );
}

/** 이력·녹음 올리기·지우기 — 듣기는 재생 막대 줄(PreviewSeek), 만들기는 조작 막대의 GenerateButton 하나로 */
function NarrationTools({ url, note, actions, tw }: { url: string; note: GalleryNote | undefined; actions: NarrationActions; tw: (key: string) => string }) {
  const rowBusy = actions.busy.has(url);
  const locked = rowBusy || !!actions.bulk;
  return (
    <span className={styles.toolButtons}>
      <HistoryButton url={url} note={note} actions={actions} tw={tw} disabled={locked} />
      <Button
        variant="ghost"
        size="sm"
        shape="circle"
        onClick={() => actions.uploadRecording(url)}
        disabled={locked}
        aria-label={tw("narrationUpload")}
        title={tw("narrationUpload")}
        soundDisabled
        icon={<Upload size={14} strokeWidth={2} />}
      />
      <Button
        variant="ghost"
        size="sm"
        shape="circle"
        onClick={() => actions.clearAudio(url)}
        disabled={locked || !note?.audio}
        aria-label={tw("narrationRemove")}
        title={tw("narrationRemove")}
        soundDisabled
        icon={<Trash2 size={14} strokeWidth={2} />}
      />
    </span>
  );
}

/**
 * 썸네일 칸에 붙는 작은 표시 — 음성 파일이 있으면 스피커, 대본만 있으면 글줄, 대본이 바뀌어 다시
 * 만들어야 하면 강조색. 아무것도 없으면 그리지 않는다. 자리는 부르는 쪽 className 이 정한다
 */
export function NarrationBadge({ note, className }: { note: GalleryNote | undefined; className?: string }) {
  const script = note?.script?.trim() ?? "";
  if (!note?.audio && !script) return null;
  const stale = note?.audioSource === "tts" && !!note.audio && note.audioScript !== (note.script ?? "");
  return (
    <span className={`${styles.badgeMark} ${className ?? ""}`} data-kind={note?.audio ? "audio" : "script"} data-stale={stale ? "" : undefined} aria-hidden>
      {note?.audio ? <Volume2 size={11} strokeWidth={2.25} /> : <AlignLeft size={11} strokeWidth={2.25} />}
    </span>
  );
}

/**
 * 작업대 — 아래 썸네일 줄에서 고른 장을 크게 보며 대본을 쓴다. 세 조각을 내어 부르는 쪽 그리드에 놓인다:
 * 왼쪽 칸 슬라이드, 오른쪽 칸 대본, 그 아래 두 칸을 가로지르는 조작 막대.
 * 조작 막대에 장 넘기기(‹ n / N ›)·이 장의 상태와 글자 수·이 장의 도구·목소리·한꺼번에 만들기를 한 줄로 모은다
 * (예전에는 슬라이드 아래, 대본 위아래, 갤러리 제목 줄에 흩어져 있었다). 고른 장이 없으면 첫 장이다.
 */
/* ── 대본 한꺼번에 넣기 — 발표 대본 문서를 통째로 붙여 넣으면 슬라이드별로 나눠 채운다(splitScripts).
   제목마다 번호가 있으면(## 03 …) 그 번호의 장에, 아니면 1장부터 차례로 ── */
const PASTE_MODAL_ID = "narration-paste";

function PasteScriptsDialog({ gallery, notes, actions, tw }: { gallery: string[]; notes: GalleryNotes; actions: NarrationActions; tw: (key: string) => string }) {
  const { closeModal } = useModalStore();
  const [text, setText] = useState("");
  const [overwrite, setOverwrite] = useState(true);
  const plan = useMemo(() => planScripts(splitScriptSections(text), gallery.length), [text, gallery.length]);
  const count = plan.items.length;
  const filled = gallery.filter((url) => notes[url]?.script?.trim()).length;

  const apply = () => {
    const n = actions.pasteScripts(plan.items, overwrite);
    closeModal(PASTE_MODAL_ID);
    showToast(fillTemplate(tw("narrationPasteDone"), { n }), "success");
  };

  return (
    <div className={styles.pasteModal}>
      <p className={styles.pasteHint}>{tw("narrationPasteHint")}</p>
      <Textarea size="sm" value={text} onChange={setText} placeholder={tw("narrationPastePlaceholder")} aria-label={tw("narrationPasteAll")} textareaClassName={styles.pasteTextarea} />
      <p className={styles.pasteSummary} data-warn={plan.skipped > 0 || (!plan.byNumber && count > 0 && count !== gallery.length) ? "" : undefined}>
        {count === 0 && plan.skipped === 0
          ? tw("narrationPasteEmpty")
          : plan.byNumber
            ? fillTemplate(tw(plan.skipped ? "narrationPasteByNumberSkipped" : "narrationPasteByNumber"), {
              n: count,
              slides: plan.items.map((x) => x.slide).join(", "),
              skipped: plan.skipped,
              total: gallery.length,
            })
            : fillTemplate(tw(count === gallery.length && !plan.skipped ? "narrationPasteMatch" : "narrationPasteMismatch"), { n: count + plan.skipped, total: gallery.length })}
      </p>
      {filled > 0 && <Checkbox checked={overwrite} onChange={setOverwrite} label={fillTemplate(tw("narrationPasteOverwrite"), { n: filled })} />}
      <div className={styles.pasteActions}>
        <Button variant="outline" size="sm" shape="capsule" onClick={() => closeModal(PASTE_MODAL_ID)} soundDisabled>{tw("narrationPasteCancel")}</Button>
        <Button variant="primary" size="sm" shape="capsule" onClick={apply} disabled={count === 0} soundDisabled>{tw("narrationPasteApply")}</Button>
      </div>
    </div>
  );
}

function PasteScriptsButton({ gallery, notes, actions, tw }: { gallery: string[]; notes: GalleryNotes; actions: NarrationActions; tw: (key: string) => string }) {
  const { openModal } = useModalStore();
  const label = tw("narrationPasteAll");
  return (
    <Button
      variant="ghost"
      size="sm"
      shape="circle"
      onClick={() => openModal(<PasteScriptsDialog gallery={gallery} notes={notes} actions={actions} tw={tw} />, { id: PASTE_MODAL_ID, header: { title: label }, width: "560px", closeButton: true })}
      /* 만드는 동안 대본을 통째로 바꾸면 만들고 있는 음성과 대본이 어긋난다 */
      disabled={actions.busy.size > 0 || !!actions.bulk}
      aria-label={label}
      title={label}
      soundDisabled
      icon={<ClipboardPaste size={14} strokeWidth={2} />}
    />
  );
}

const GENERATE_MANY_MODAL_ID = "narration-generate-many";

function GenerateManyDialog({ n, replacing, voice, tw, onReplaceAll, onMissingOnly }: {
  n: number;
  replacing: number;
  voice: string;
  tw: (key: string) => string;
  onReplaceAll: () => void;
  onMissingOnly: () => void;
}) {
  const { closeModal } = useModalStore();
  const missing = n - replacing;
  const go = (fn: () => void) => { closeModal(GENERATE_MANY_MODAL_ID); fn(); };
  return (
    <div className={styles.pasteModal}>
      <p className={styles.manyDesc}>{fillTemplate(tw("narrationGenerateManyDesc"), { n, replacing, voice })}</p>
      <div className={styles.pasteActions}>
        <Button variant="outline" size="sm" shape="capsule" onClick={() => closeModal(GENERATE_MANY_MODAL_ID)} soundDisabled>{tw("narrationPasteCancel")}</Button>
        <Button variant="outline" size="sm" shape="capsule" onClick={() => go(onMissingOnly)} disabled={missing === 0} soundDisabled>
          {fillTemplate(tw("narrationGenerateMissingOnly"), { n: missing })}
        </Button>
        <Button variant="primary" size="sm" shape="capsule" onClick={() => go(onReplaceAll)} soundDisabled>
          {fillTemplate(tw("narrationGenerateReplaceAll"), { n })}
        </Button>
      </div>
    </div>
  );
}

/* 음성 만들기 — 버튼 하나. 대본이 있는 장이 여럿이면 "이 장만 / N장 모두"를 고르는 메뉴를 띄운다.
   모두 만들 때 이미 음성이 있는 장이 섞여 있으면 바꾸기 전에 한 번 묻는다 */
function GenerateButton({ url, index, notes, actions, tw }: { url: string; index: number; notes: GalleryNotes; actions: NarrationActions; tw: (key: string) => string }) {
  const { openModal } = useModalStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const n = actions.targets.length;
  const script = notes[url]?.script?.trim() ?? "";
  const hasScript = !!script;
  const rowBusy = actions.busy.has(url);
  const replacing = actions.targets.filter((u) => notes[u]?.audio).length;

  /* 여러 장 만들기 — 이미 음성이 있는 장이 있으면 그것도 새로 만들지 묻는다. 모두 교체 / 없는 장만 / 취소 */
  const all = () => {
    if (replacing === 0) { void actions.generateAll(); return; }
    openModal(
      <GenerateManyDialog
        n={n}
        replacing={replacing}
        voice={voiceLabel(actions.voice, tw)}
        tw={tw}
        onReplaceAll={() => { void actions.generateAll({ replace: true }); }}
        onMissingOnly={() => { void actions.generateAll({ replace: false }); }}
      />,
      { id: GENERATE_MANY_MODAL_ID, header: { title: tw("narrationGenerateMany") }, width: "min(92vw, 480px)", closeButton: true },
    );
  };

  const label = actions.bulk
    ? fillTemplate(tw("narrationGenerating"), actions.bulk)
    : rowBusy ? tw("narrationWorking") : tw("narrationGenerate");
  const locked = !!actions.bulk || rowBusy;
  /* 글자가 "음성 만들기 → 만드는 중 → 3/19장 만드는 중"으로 바뀌어도 버튼 너비가 그대로이게, 가장 긴 글자 자리를
     보이지 않게 겹쳐 잡아 둔다 — 너비가 바뀌면 조작 막대의 다른 것들이 밀렸다 */
  const widest = [tw("narrationGenerate"), tw("narrationWorking"), fillTemplate(tw("narrationGenerating"), { done: n || 1, total: n || 1 })];
  const menuLabel = tw("narrationGenerateOptions");
  const voice = voiceParts(actions.voice, tw, actions.lang);

  const pick = (run: () => void) => { setMenuOpen(false); run(); };

  /* 분할 버튼 — 왼쪽은 이 장을 바로 만들고, 오른쪽 ▾ 는 만들 범위(이 장 / 대본 있는 장 모두)와 지금 목소리를 보여 준다.
     loading 을 쓰지 않는다 — 버튼 내용을 통째로 점 세 개로 바꿔 너비가 줄고 진행 글자도 가려졌다.
     만드는 동안에는 아이콘 자리에만 점 세 개를 움직이고, 글자(진행)는 그대로 둔다 */
  return (
    <span className={styles.generateSplit} data-busy={locked ? "" : undefined}>
      <Button
        variant="primary"
        size="sm"
        className={styles.generateMain}
        onClick={() => void actions.generateOne(url)}
        disabled={locked || !hasScript}
        title={hasScript ? undefined : tw("narrationGenerateNoScript")}
        soundDisabled
        icon={locked ? <LoadingDots className={styles.busyDots} /> : <Sparkles size={14} strokeWidth={2} />}
      >
        <span className={styles.stableLabel}>
          {widest.map((w) => <span key={w} className={styles.stableGhost} aria-hidden>{w}</span>)}
          <span>{label}</span>
        </span>
      </Button>
      <Popover
        placement="top-end"
        responsive={false}
        maxHeight={false}
        menu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        contentClassName={styles.generateMenu}
        trigger={
          <Button
            variant="primary"
            size="sm"
            className={styles.generateToggle}
            data-open={menuOpen ? "" : undefined}
            disabled={locked || n === 0}
            aria-label={menuLabel}
            title={menuLabel}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            soundDisabled
            icon={<ChevronDown size={14} strokeWidth={2.2} />}
          />
        }
      >
        {() => (
          <div role="menu" className={styles.generateMenuBody}>
            <GenerateMenuItem
              icon={<File size={16} strokeWidth={1.8} />}
              title={tw("narrationGenerateThisTitle")}
              meta={fillTemplate(tw(hasScript ? "narrationGenerateThisMeta" : "narrationGenerateThisEmpty"), { n: index + 1, chars: script.length.toLocaleString() })}
              disabled={!hasScript}
              onClick={() => pick(() => void actions.generateOne(url))}
            />
            <GenerateMenuItem
              icon={<Images size={16} strokeWidth={1.8} />}
              title={tw("narrationGenerateAllTitle")}
              meta={fillTemplate(tw(replacing > 0 ? "narrationGenerateAllMeta" : "narrationGenerateAllMetaFresh"), { n, replacing })}
              disabled={n === 0}
              onClick={() => pick(all)}
            />
            {/* 지금 목소리 — 목소리 고르기 트리거와 같은 짧은 모양(칩 · 성별 · 느낌) 뒤에 목소리 이름 */}
            <div className={styles.generateMenuVoice} title={voiceLabel(actions.voice, tw)}>
              <AudioLines size={14} strokeWidth={2} aria-hidden />
              <span className={styles.voiceChip}>{voice.providerShort}</span>
              <span>{voice.short} · {voice.detail}</span>
            </div>
          </div>
        )}
      </Popover>
    </span>
  );
}

/* 목소리 고르기 — 목록은 제공자로 묶고 한 줄에 "성별 · 느낌" 과 흐린 목소리 이름을, 트리거에는 제공자 칩과
   "성별 · 느낌" 만 보인다. 전체 이름("Fish Audio · 여성 · 밝음 (일반여성2)")을 트리거에 그대로 넣으니 조작 막대가 밀렸다 */
function VoiceSelect({ actions, tw, disabled }: { actions: NarrationActions; tw: (key: string) => string; disabled?: boolean }) {
  const options = voicesFor(actions.lang).map((v) => {
    const p = voiceParts(v, tw, actions.lang);
    /* label 은 트리거 너비를 정하는 데 쓰인다(Select 의 sizer) — 트리거에 보이는 모양과 같은 글자로 */
    return { value: v, label: `${p.providerShort} ${p.short}`, group: p.provider, trailing: p.detail };
  });
  const current = voiceParts(actions.voice, tw, actions.lang);
  return (
    <Select
      size="sm"
      disabled={disabled}
      value={actions.voice}
      onChange={(v) => { if (isTtsVoice(v)) actions.setVoice(v); }}
      options={options}
      className={styles.voiceSelect}
      renderValue={() => (
        <span className={styles.voiceValue} title={voiceLabel(actions.voice, tw)}>
          <span className={styles.voiceChip}>{current.providerShort}</span>
          <span className={styles.voiceShort}>{current.short}</span>
        </span>
      )}
      renderOption={(opt) => {
        const p = voiceParts(opt.value, tw, actions.lang);
        return (
          <span className={styles.voiceOption}>
            <span>{p.short}</span>
            <span className={styles.voiceDetail}>{p.detail}</span>
          </span>
        );
      }}
    />
  );
}

/* 음성 만들기 메뉴의 한 줄 — 아이콘 · 제목 · 설명(몇 장, 이미 음성이 있는 장) */
function GenerateMenuItem({ icon, title, meta, disabled, onClick }: { icon: ReactNode; title: string; meta: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Pressable type="button" role="menuitem" className={styles.generateItem} onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined}>
      <span className={styles.generateItemIcon} aria-hidden>{icon}</span>
      <span className={styles.generateItemText}>
        <span className={styles.generateItemTitle}>{title}</span>
        <span className={styles.generateItemMeta}>{meta}</span>
      </span>
    </Pressable>
  );
}

/* 읽기 사전 — 여기서는 창으로 바로 고치고, 긴 목록은 설정 화면(서비스 탭)에서 관리한다(같은 편집기).
   설정은 편집 중인 글을 잃지 않게 새 탭으로 연다 */
const LEXICON_MODAL_ID = "narration-lexicon";

function LexiconButton({ tw, lang, disabled }: { tw: (key: string) => string; lang: VoiceLang; disabled?: boolean }) {
  const { openModal } = useModalStore();
  const label = tw("narrationLexicon");
  const open = () => openModal(
    <div className={styles.lexiconModal}>
    <LexiconEditor
      compact
      initialLang={lang}
      footer={
        <Button variant="ghost" size="sm" shape="capsule" onClick={() => window.open("/admin/settings?tab=services#tts-lexicon", "_blank", "noopener")} soundDisabled icon={<ExternalLink size={14} strokeWidth={2} />}>
          {tw("narrationLexiconManage")}
        </Button>
      }
    />
    </div>,
    { id: LEXICON_MODAL_ID, header: { title: label }, width: "min(680px, 94vw)", closeButton: true },
  );
  return (
    <Button variant="ghost" size="sm" shape="circle" onClick={open} disabled={disabled} aria-label={label} title={label} soundDisabled icon={<BookOpen size={14} strokeWidth={2} />} />
  );
}

/* 사용 안내 — 대본 안 읽기 지정·읽기 사전·목소리·주의할 점. 글은 로케일의 narrationHelp.* 에 두고,
   항목은 줄바꿈으로 나눈다. `…` 로 감싼 부분은 코드 글꼴로 */
const HELP_MODAL_ID = "narration-help";
const HELP_SECTIONS = ["flow", "inline", "lexicon", "paste", "voices", "listen", "cautions"] as const;

function withCode(text: string) {
  return text.split("`").map((part, i) => (i % 2 ? <code key={i} className={styles.helpCode}>{part}</code> : part));
}

function NarrationHelp({ tw }: { tw: (key: string) => string }) {
  return (
    <div className={styles.helpModal}>
      {HELP_SECTIONS.map((key) => (
        <section key={key} className={styles.helpSection}>
          <h3 className={styles.helpTitle}>{tw(`narrationHelp.${key}.title`)}</h3>
          <ul className={styles.helpList}>
            {tw(`narrationHelp.${key}.items`).split("\n").map((line) => <li key={line}>{withCode(line)}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* 공용 도움말 단추(HelpButton)의 "i" — 옆의 투명 아이콘 단추들과 톤을 맞춰 ghost */
function NarrationHelpButton({ tw }: { tw: (key: string) => string }) {
  const { openModal } = useModalStore();
  const label = tw("narrationHelp.label");
  return (
    <HelpButton size="sm"
      symbol="i"
      variant="ghost"
      onClick={() => openModal(<NarrationHelp tw={tw} />, { id: HELP_MODAL_ID, header: { title: label }, width: "min(640px, 94vw)", closeButton: true })}
      aria-label={label}
      title={label}
      soundDisabled
    />
  );
}

export function GalleryNarrationPanel({
  gallery,
  notes,
  actions,
  tw,
  renderSlide,
}: {
  gallery: string[];
  notes: GalleryNotes;
  actions: NarrationActions;
  tw: (key: string) => string;
  /** 슬라이드 그림 — 그림·영상·문서 칸을 편집 화면의 칸과 같게 그린다 */
  renderSlide: (url: string) => React.ReactNode;
}) {
  const index = actions.openIndex >= 0 ? actions.openIndex : 0;
  const url = gallery[index];
  const inputRef = useRef<HTMLDivElement>(null);
  const playingUrl = usePreviewUrl();

  /* 썸네일이나 ‹ › 로 장을 열면 입력칸에 커서를 둔다(글 끝). 처음 그릴 때(focusTick 0)는 두지 않는다 —
     편집 화면을 열자마자 페이지가 여기로 끌려온다 */
  const focusTick = actions.focusTick;
  useEffect(() => {
    if (focusTick === 0) return;
    const ta = inputRef.current?.querySelector("textarea");
    if (!ta) return;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [focusTick]);

  /* 작업대가 사라지면(갤러리를 다 지움·화면을 떠남) 듣던 음성도 멈춘다 */
  useEffect(() => () => { pausePreview(); }, []);

  /* 다른 장으로 옮기면 앞 장의 음성을 멈춘다 — 계속 들리면 지금 보는 장의 음성으로 착각한다 */
  useEffect(() => { pausePreview(); }, [url]);

  if (!url) return null;
  const note = notes[url];
  const script = note?.script ?? "";
  const parts = chunkScript(script).length;
  /* 만든 음성의 가사는 만들 때 쓴 대본으로 — 그 뒤 고친 대본은 음성과 다르다 */
  const lyricsScript = (note?.audioSource === "tts" && note.audioScript?.trim()) || script;
  /* 이 장의 음성을 재생하는 동안만 가사로 보인다 — 멈추면 입력칸으로 돌아와 고칠 수 있다 */
  const lyricsOn = !!note?.audio && playingUrl === note.audio && !!lyricsScript.trim();
  const go = (to: number) => actions.open(gallery[Math.max(0, Math.min(gallery.length - 1, to))]);
  /* 만드는 동안 잠그는 것 — 이 장(여러 장 만들기면 모든 장)의 대본, 그리고 만들기에 쓰이는 목소리·읽기 사전·대본 한꺼번에 넣기.
     장 넘기기와 듣기는 그대로 둔다 */
  const generating = actions.busy.size > 0 || !!actions.bulk;
  const scriptLocked = actions.busy.has(url) || !!actions.bulk;

  return (
    <>
      <div className={styles.paneSlide}>
        <div className={styles.paneMedia}>{renderSlide(url)}</div>
      </div>
      <div ref={inputRef} className={styles.paneEditor} onKeyDown={stopSelectAll}>
        {lyricsOn && note?.audio && <LyricsView audio={note.audio} script={lyricsScript} tw={tw} />}
        {/* 가사를 보는 동안에도 입력칸은 남겨 둔다 — 커서 자리("커서 위치부터 듣기")를 잃지 않게 */}
        <div className={styles.paneInputWrap} hidden={lyricsOn}>
        <Textarea
          size="sm"
          value={script}
          onChange={(v) => actions.update(url, { script: v })}
          disabled={scriptLocked}
          placeholder={tw("narrationScriptPlaceholder")}
          aria-label={fillTemplate(tw("narrationSlideTitle"), { n: index + 1 })}
          className={styles.paneInput}
          textareaClassName={styles.paneTextarea}
        />
        </div>
      </div>
      {/* 재생 막대 — 조작 막대 안에서는 남는 폭이 좁아 따로 한 줄. 음성이 없는 장도 자리는 지킨다(disabled) */}
      <div className={styles.paneSeek}>
        <PreviewSeek audio={note?.audio} tw={tw} />
      </div>
      <div className={styles.paneBar}>
        <span className={styles.barPager}>
          <Button variant="ghost" size="sm" shape="circle" onClick={() => go(index - 1)} disabled={index <= 0} aria-label={tw("narrationPrev")} title={tw("narrationPrev")} soundDisabled icon={<ChevronLeft size={16} strokeWidth={2} />} />
          <span className={styles.paneIndex}>{index + 1} / {gallery.length}</span>
          <Button variant="ghost" size="sm" shape="circle" onClick={() => go(index + 1)} disabled={index >= gallery.length - 1} aria-label={tw("narrationNext")} title={tw("narrationNext")} soundDisabled icon={<ChevronRight size={16} strokeWidth={2} />} />
        </span>
        <span className={styles.barInfo}>
          <StatusLine note={note} progress={actions.busy.get(url)} tw={tw} />
          <span className={styles.paneCount}>
            {fillTemplate(tw("narrationCount"), { n: script.length.toLocaleString() })}
            {parts > 1 && ` · ${fillTemplate(tw("narrationParts"), { n: parts })}`}
          </span>
        </span>
        <span className={styles.barActions}>
          <NarrationTools url={url} note={note} actions={actions} tw={tw} />
          <span className={styles.barDivider} aria-hidden />
          <PasteScriptsButton gallery={gallery} notes={notes} actions={actions} tw={tw} />
          <LexiconButton tw={tw} lang={actions.lang} disabled={generating} />
          <NarrationHelpButton tw={tw} />
          <VoiceSelect actions={actions} tw={tw} disabled={generating} />
          <GenerateButton url={url} index={index} notes={notes} actions={actions} tw={tw} />
        </span>
      </div>
    </>
  );
}
