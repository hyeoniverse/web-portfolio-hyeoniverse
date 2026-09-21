"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { AlignLeft, ChevronLeft, ChevronRight, Pause, Play, Sparkles, Trash2, Upload, Volume2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { errorText } from "@/lib/apiError";
import { sendAction, tryRequest } from "@/lib/sendAction";
import { TTS_VOICES } from "@/lib/ttsVoices";
import { chunkScript } from "@/lib/ttsChunks";
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

/** 음성 만들기·녹음 올리기 — 칸마다의 창과 한꺼번에 만들기가 목소리·진행 상태를 같이 쓰도록 편집 화면에서 한 번 부른다 */
export function useNarrationActions({ gallery, notes, update, tw }: {
  gallery: string[];
  notes: GalleryNotes;
  update: Update;
  tw: (key: string) => string;
}) {
  const { t } = useLanguage();
  const [voice, setVoice] = useState<string>(TTS_VOICES[0]);
  /* 음성을 만드는 중인 장과 진행(조각 몇 개 중 몇 개) */
  const [busy, setBusy] = useState<ReadonlyMap<string, { done: number; total: number }>>(new Map());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  /* 갤러리 아래에 크게 열어 둔 장 — 주소로 들고 있는다(차례를 바꿔도 같은 장이 열려 있게) */
  const [openUrl, setOpenUrl] = useState<string | null>(null);
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

    /**
     * 대본으로 음성을 만든다. 실패하면 그 오류를 돌려준다(여럿 만들기가 한도 초과에서 멈추려고).
     * 긴 대본은 문장 경계에서 조각으로 나눠 차례로 만들고 서버가 한 파일로 잇는다. 중간에 실패하면 만든 조각은 지운다
     */
    const generate = async (url: string, script: string) => {
      const chunks = chunkScript(script);
      const parts: string[] = [];
      const fail = (err: Error) => {
        if (parts.length > 0) void post("/api/works/tts/merge", { urls: parts, discard: true });
        setRowBusy(url, null);
        return err;
      };
      setRowBusy(url, { done: 0, total: chunks.length });
      for (const chunk of chunks) {
        const res = await post("/api/works/tts", { text: chunk, voice });
        if (!(res instanceof Response)) return fail(res);
        const data = await res.json().catch(() => ({}));
        if (!data?.url) return fail(new Error("no url"));
        parts.push(data.url);
        setRowBusy(url, { done: parts.length, total: chunks.length });
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
      update(url, { audio, audioSource: "tts", audioScript: script });
      return null;
    };

    const generateOne = async (url: string) => {
      const err = await generate(url, notes[url]?.script?.trim() ?? "");
      if (err) showToast(errorText(err, t, tw("narrationFailed")), "error");
    };

    /* 대본은 있는데 음성이 없거나 대본이 바뀐 TTS 장 — 녹음한 장은 건드리지 않는다 */
    const pending = gallery.filter((url) => {
      const n = notes[url];
      if (!n?.script?.trim()) return false;
      if (n.audioSource === "recorded") return false;
      return !n.audio || n.audioScript !== n.script;
    });

    const generateAll = async () => {
      if (bulk || pending.length === 0) return;
      const todo = [...pending];
      setBulk({ done: 0, total: todo.length });
      let done = 0;
      for (const url of todo) {
        const err = await generate(url, notes[url]?.script?.trim() ?? "");
        if (err) {
          /* 한도 초과면 멈춘다 — 남은 장은 브라우저가 읽고, 내일 다시 만들 수 있다 */
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
        if (data?.url) update(url, { audio: data.url, audioSource: "recorded", audioScript: undefined });
      };
      input.click();
    };

    const clearAudio = (url: string) => update(url, { audio: undefined, audioSource: undefined, audioScript: undefined });

    /* 열어 둔 장이 갤러리에서 빠졌으면 닫힌 것으로 친다 */
    const openIndex = openUrl ? gallery.indexOf(openUrl) : -1;

    return {
      voice, setVoice, busy, bulk, pending, generateOne, generateAll, uploadRecording, clearAudio, update,
      openUrl, openIndex, focusTick,
      open: (url: string | null, focusScript = true) => {
        setOpenUrl(url);
        if (focusScript) setFocusTick((n) => n + 1);
      },
    };
  }, [gallery, notes, update, tw, t, voice, busy, bulk, openUrl, focusTick]);
}

export type NarrationActions = ReturnType<typeof useNarrationActions>;

/* 입력칸에서 친 Ctrl+A 가 갤러리의 "모두 고르기"로 올라가지 않게 — 대본 안 전체 선택이어야 한다 */
function stopSelectAll(e: React.KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") e.stopPropagation();
}

/* ── 미리 듣기 — 한 번에 한 장만. 다른 장을 누르면 앞의 것은 멈춘다 ── */
let previewAudio: HTMLAudioElement | null = null;
let previewUrl: string | null = null;
const previewListeners = new Set<() => void>();
const notifyPreview = () => previewListeners.forEach((l) => l());

function togglePreview(url: string) {
  if (previewUrl === url) { previewAudio?.pause(); return; }
  previewAudio?.pause();
  previewAudio = new Audio(url);
  previewUrl = url;
  const done = () => { if (previewUrl === url) { previewUrl = null; notifyPreview(); } };
  previewAudio.onended = done;
  previewAudio.onpause = done;
  previewAudio.play().catch(done);
  notifyPreview();
}

function subscribePreview(cb: () => void) {
  previewListeners.add(cb);
  return () => { previewListeners.delete(cb); };
}

function usePreviewUrl() {
  return useSyncExternalStore(subscribePreview, () => previewUrl, () => null);
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
        ? (note.audioSource === "recorded" ? tw("narrationSourceRecorded") : tw("narrationSourceTts"))
        : script.trim() ? tw("narrationBrowserShort") : "";
  return (
    <span className={styles.status} data-audio={note?.audio ? "" : undefined} data-stale={stale ? "" : undefined} title={text || undefined}>
      {text}
    </span>
  );
}

/** 미리 듣기·음성 만들기·녹음 올리기·지우기 */
function NarrationTools({ url, note, actions, tw }: { url: string; note: GalleryNote | undefined; actions: NarrationActions; tw: (key: string) => string }) {
  const script = note?.script ?? "";
  const rowBusy = actions.busy.has(url);
  const locked = rowBusy || !!actions.bulk;
  const listening = usePreviewUrl() === note?.audio && !!note?.audio;
  const generateLabel = rowBusy ? tw("narrationWorking") : note?.audio && note.audioSource === "tts" ? tw("narrationRegenerate") : tw("narrationGenerate");
  return (
    <span className={styles.toolButtons}>
      {note?.audio && (
        <Button
          variant="ghost"
          size="sm"
          shape="circle"
          onClick={() => togglePreview(note.audio!)}
          aria-label={tw("narrationListen")}
          aria-pressed={listening}
          title={tw("narrationListen")}
          soundDisabled
          icon={listening ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        shape="circle"
        onClick={() => actions.generateOne(url)}
        disabled={locked || !script.trim()}
        loading={rowBusy}
        aria-label={generateLabel}
        title={generateLabel}
        soundDisabled
        icon={<Sparkles size={14} strokeWidth={2} />}
      />
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
      {note?.audio && (
        <Button
          variant="ghost"
          size="sm"
          shape="circle"
          onClick={() => actions.clearAudio(url)}
          disabled={locked}
          aria-label={tw("narrationRemove")}
          title={tw("narrationRemove")}
          soundDisabled
          icon={<Trash2 size={14} strokeWidth={2} />}
        />
      )}
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
  useEffect(() => () => { previewAudio?.pause(); }, []);

  if (!url) return null;
  const note = notes[url];
  const script = note?.script ?? "";
  const parts = chunkScript(script).length;
  const pendingCount = actions.pending.length;
  const go = (to: number) => actions.open(gallery[Math.max(0, Math.min(gallery.length - 1, to))]);

  return (
    <>
      <div className={styles.paneSlide}>
        <div className={styles.paneMedia}>{renderSlide(url)}</div>
      </div>
      <div ref={inputRef} className={styles.paneEditor} onKeyDown={stopSelectAll}>
        <Textarea
          size="sm"
          value={script}
          onChange={(v) => actions.update(url, { script: v })}
          placeholder={tw("narrationScriptPlaceholder")}
          aria-label={fillTemplate(tw("narrationSlideTitle"), { n: index + 1 })}
          className={styles.paneInput}
          textareaClassName={styles.paneTextarea}
        />
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
          <Select size="sm" value={actions.voice} onChange={actions.setVoice} options={TTS_VOICES.map((v) => ({ value: v, label: `${tw("narrationVoice")} · ${v}` }))} />
          {/* 대본은 있는데 음성이 없거나 대본이 바뀐 장을 한꺼번에 — 그런 장이 있을 때만 */}
          {(pendingCount > 0 || actions.bulk) && (
            <Button variant="outline" size="xs" shape="capsule" onClick={actions.generateAll} disabled={!!actions.bulk} soundDisabled icon={<Sparkles size={12} strokeWidth={2} />}>
              {actions.bulk ? fillTemplate(tw("narrationGenerating"), actions.bulk) : fillTemplate(tw("narrationGenerateAllN"), { n: pendingCount })}
            </Button>
          )}
        </span>
      </div>
    </>
  );
}
