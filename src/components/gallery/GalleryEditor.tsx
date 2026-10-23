"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText, Maximize2, Plus, Replace, Star, X } from "@/components/icons";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pressable from "@/components/ui/Pressable";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { GalleryNarrationPanel, NarrationBadge, useNarrationActions } from "@/components/works/GalleryNarrationEditor";
import { useBenchSplit } from "@/components/works/useBenchSplit";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useLanguage } from "@/providers/LanguageProvider";
import type { GalleryNote, GalleryNotes } from "@/data/projects";
import { noteFor, notesForLang, patchNote } from "@/lib/galleryNotes";
import { isOfficeDocUrl, officeDocKind } from "@/lib/officeViewer";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { IMAGE_FALLBACK_SRC } from "@/lib/imageFallback";
import { pickFiles } from "@/lib/pickFiles";
import { errorText } from "@/lib/apiError";
import { notifyAiFailures } from "@/lib/ai/notifyFailures";
import { autoTranslate } from "@/utils/autoTranslate";
import { fillTemplate } from "@/utils/format";
import { showToast } from "@/stores/toastStore";
import styles from "./GalleryEditor.module.css";

/** 갤러리 값 — 차례대로 놓인 그림 · 영상 주소와, 주소를 열쇠로 한 장마다의 대본 · 음성(두 언어, lib/galleryNotes) */
export interface GalleryValue {
  gallery: string[];
  notes: GalleryNotes;
}

type Updater = (prev: GalleryValue) => GalleryValue;

interface GalleryEditorProps {
  value: GalleryValue;
  /** 값을 바꾼다 — 늘 직전 값 위에 덧쓴다(음성을 만드는 동안 다른 장을 고쳐도 섞이지 않게) */
  onChange: (update: Updater) => void;
  /** 대본 · 음성을 쓰는 언어 — 한국어는 노트 기본 칸, 영어는 노트의 en 칸 */
  lang: "ko" | "en";
  /** 라벨 자리(“갤러리” 와 장 수) 옆에 둘 제목 — 없으면 기본 라벨 */
  label?: ReactNode;
  /** 대표 그림 — 주면 칸마다 ‘대표로’ 단추와 배지가 생긴다(작업물 표지) */
  cover?: { url: string; set: (url: string) => void };
  /** 한 장을 다른 파일로 바꾼 뒤 — 대표 그림처럼 밖에서 그 주소를 들고 있는 값을 따라 바꾸게 알린다 */
  onUrlReplaced?: (oldUrl: string, newUrl: string) => void;
  /** 크게 보기 창의 제목 */
  viewerTitle?: string;
  /** 다른 언어의 대본을 옮겨 오는 번역 — 한 문서가 한 언어인 글 갤러리 블록은 끈다 */
  translatable?: boolean;
}

/** 파일이 들어 있는 끌기인가 — 칸을 끌어 차례를 바꾸는 것과 가른다 */
const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

type PdfProgress = { phase: "reading" | "rendering" | "uploading"; name: string; done: number; total: number };

/**
 * 갤러리 편집 — 작업물 편집기와 글 편집기의 갤러리 블록이 같이 쓴다.
 *
 * 위는 고른 장(왼쪽)과 대본(오른쪽), 아래는 가로 썸네일 줄. 그림 · 영상 · PDF · PPTX 를 고르거나 끌어 놓아 들이고(PDF · PPTX 는
 * 쪽마다 그림으로 펼치고, 발표자 노트는 그 장의 대본으로), 칸을 끌어 차례를 바꾸고, Shift · ⌘ 로 여럿 골라 지운다.
 * 장마다 대본을 쓰고 음성을 만들거나 녹음한다(GalleryNarrationEditor).
 */
export default function GalleryEditor({ value, onChange, lang, label, cover, onUrlReplaced, viewerTitle, translatable = true }: GalleryEditorProps) {
  const { t } = useLanguage();
  const tw = useCallback((key: string) => t(`admin.works.editor.${key}`), [t]);
  const serviceStatus = useServiceStatus();
  const { gallery } = value;

  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  /* 고른 칸 — 칸 번호. Shift 로 이어 고를 때의 기준 칸은 anchor */
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const anchor = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [pdfProgress, setPdfProgress] = useState<PdfProgress | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [fileOver, setFileOver] = useState(false);
  const [replacingUrl, setReplacingUrl] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  /* 갤러리가 바뀌면 고른 칸을 비운다 — 번호가 밀려 엉뚱한 칸이 지워지지 않게 */
  if (useDepsChanged([gallery]) && selected.size > 0) setSelected(new Set());

  const markImgError = useCallback((src: string) => setImgErrors((prev) => {
    if (prev.has(src)) return prev;
    const next = new Set(prev);
    next.add(src);
    return next;
  }), []);

  /* 그림 · 영상 하나를 올려 주소를 돌려준다 — 크기를 보고, 그림은 줄인 뒤 다시 본다. 실패하면 fail 로 알리고 null */
  const uploadMedia = useCallback(async (
    file: File,
    fail: (err: unknown) => void,
    { compressImage, validateFileSize }: typeof import("@/lib/compressImage"),
  ): Promise<string | null> => {
    const sizeError = validateFileSize(file);
    if (sizeError) { fail(sizeError); return null; }
    const payload = file.type.startsWith("video/") ? file : await compressImage(file);
    const postError = validateFileSize(payload, undefined, { skipCompressibleBypass: true });
    if (postError) { fail(postError); return null; }
    const formData = new FormData();
    formData.append("file", payload);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) { fail(data); return null; }
    return data.url as string;
  }, []);

  /* 고른 파일을 들인다 — PDF · PPTX 는 쪽(슬라이드)마다 그림으로 펼쳐 붙이고, 발표자 노트는 그 장의 기본 대본으로 둔다.
     옛 .ppt 는 그림으로 바꿀 방법이 없어 파일째 올린다 — 읽는 화면이 문서 뷰어로 보여 준다 */
  const ingestFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const lib = await import("@/lib/compressImage");
    const { isPdfFile, pdfToImages } = await import("@/lib/pdfToImages");
    const { isPptxFile, pptxToImages } = await import("@/lib/pptxToImages");
    const fail = (err: unknown) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
    const expanded: { file: File; notes?: string }[] = [];
    let fromDeck = false;
    for (const file of files) {
      const deck = isPdfFile(file)
        ? async (f: File, onP: Parameters<typeof pdfToImages>[1]) => (await pdfToImages(f, onP)).map((page) => ({ file: page }))
        : isPptxFile(file) ? pptxToImages : null;
      if (deck) {
        try {
          setPdfProgress({ phase: "reading", name: file.name, done: 0, total: 0 });
          expanded.push(...await deck(file, (p) => setPdfProgress({ phase: "rendering", name: file.name, ...p })));
          fromDeck = true;
        } catch (err) {
          fail(err);
          setPdfProgress(null);
        }
        continue;
      }
      expanded.push({ file });
    }
    let uploaded = 0;
    for (const { file, notes } of expanded) {
      if (fromDeck) setPdfProgress({ phase: "uploading", name: file.name, done: uploaded, total: expanded.length });
      uploaded++;
      const url = await uploadMedia(file, fail, lib);
      if (!url) continue;
      onChange((prev) => ({
        gallery: [...prev.gallery, url],
        notes: notes ? { ...prev.notes, [url]: { script: notes } } : prev.notes,
      }));
    }
    if (fromDeck) setPdfProgress(null);
  }, [onChange, t, uploadMedia]);

  const pickGalleryFiles = useCallback(() => {
    pickFiles({
      accept: "image/*,video/mp4,video/webm,video/quicktime,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,application/vnd.ms-powerpoint",
      multiple: true,
    }, (files) => {
      ingestFiles(files).catch((err) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error"));
    });
  }, [ingestFiles, t]);

  /* 작업대 — 단축키를 받는 틀, 슬라이드 | 대본 폭을 나누는 핸들, 아래 가로 썸네일 줄 */
  const areaRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const benchSplit = useBenchSplit(benchRef);

  /* 끌기 중 줄 가장자리에 머물면 줄이 저절로 밀린다 — 화면 밖 칸으로도 끌고 갈 수 있게 */
  const autoScroll = useRef<{ timer: ReturnType<typeof setInterval>; dir: -1 | 1 } | null>(null);
  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current) clearInterval(autoScroll.current.timer);
    autoScroll.current = null;
  }, []);
  const edgeAutoScroll = useCallback((clientX: number) => {
    const strip = railRef.current?.querySelector<HTMLElement>(`.${styles.galleryCarousel}`);
    if (!strip) return;
    const r = strip.getBoundingClientRect();
    const EDGE = 90;
    const STEP = 12;
    const dir: -1 | 1 | 0 = clientX < r.left + EDGE ? -1 : clientX > r.right - EDGE ? 1 : 0;
    if (dir === 0) { stopAutoScroll(); return; }
    if (autoScroll.current?.dir === dir) { strip.scrollLeft += dir * STEP; return; }
    stopAutoScroll();
    strip.scrollLeft += dir * STEP;
    autoScroll.current = { timer: setInterval(() => { strip.scrollLeft += dir * STEP; }, 16), dir };
  }, [stopAutoScroll]);
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (dragIdx !== null) { e.preventDefault(); edgeAutoScroll(e.clientX); return; }
    if (pdfProgress || !isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setFileOver(true);
  }, [edgeAutoScroll, dragIdx, pdfProgress]);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    stopAutoScroll();
    setFileOver(false);
  }, [stopAutoScroll]);
  const onDrop = useCallback((e: React.DragEvent) => {
    if (pdfProgress || dragIdx !== null || !isFileDrag(e)) return;
    e.preventDefault();
    setFileOver(false);
    void ingestFiles(Array.from(e.dataTransfer.files));
  }, [dragIdx, ingestFiles, pdfProgress]);

  /* 칸 누르기 — Shift 면 지난번 칸부터 여기까지, ⌘/Ctrl 이면 하나씩 켜고 끈다 */
  const pickItem = useCallback((i: number, mods: { shift: boolean; toggle: boolean }) => {
    setSelected((prev) => {
      if (mods.shift && anchor.current !== null) {
        const next = new Set(prev);
        for (let n = Math.min(anchor.current, i); n <= Math.max(anchor.current, i); n++) next.add(n);
        return next;
      }
      if (mods.toggle) {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
      }
      if (prev.size === 1 && prev.has(i)) return new Set<number>();
      return new Set([i]);
    });
    if (!mods.shift) anchor.current = i;
  }, []);

  const setGallery = useCallback((fn: (g: string[]) => string[]) => onChange((prev) => ({ ...prev, gallery: fn(prev.gallery) })), [onChange]);
  const removeSelected = useCallback(() => {
    setGallery((g) => g.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  }, [selected, setGallery]);
  const removeItem = useCallback((index: number) => setGallery((g) => g.filter((_, i) => i !== index)), [setGallery]);
  /* 끌어 놓은 자리로 — 뽑아서 그 자리에 끼운다(사이 칸들이 한 칸씩 밀린다) */
  const reorder = useCallback((from: number, to: number) => setGallery((g) => {
    if (from === to || from < 0 || to < 0 || from >= g.length || to >= g.length) return g;
    const next = [...g];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }), [setGallery]);
  /* 이웃과 자리를 맞바꾼다 — 끌기를 못 쓰는 키보드 · 단추용 */
  const moveItem = useCallback((index: number, dir: -1 | 1) => setGallery((g) => {
    const to = index + dir;
    if (to < 0 || to >= g.length) return g;
    const next = [...g];
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  }), [setGallery]);

  /* 장 하나의 그 언어 대본 · 음성을 고친다 */
  const updateNote = useCallback((url: string, patch: Partial<GalleryNote>) => {
    onChange((prev) => ({ ...prev, notes: patchNote(prev.notes, url, lang, patch) }));
  }, [lang, onChange]);
  const langNotes: GalleryNotes = useMemo(() => notesForLang(value.notes, lang), [value.notes, lang]);
  const sourceLang: "ko" | "en" = lang === "en" ? "ko" : "en";
  const sourceNotes: GalleryNotes = useMemo(() => notesForLang(value.notes, sourceLang), [value.notes, sourceLang]);

  const narration = useNarrationActions({ gallery, notes: langNotes, update: updateNote, tw, lang });
  const narrationCurrent = narration.openIndex >= 0 ? narration.openIndex : 0;
  /* 들이는 중이거나 음성을 만드는 중에는 장을 빼거나 옮기지 못한다 — 만든 음성이 엉뚱한 장에 붙는다 */
  const narrationBusy = narration.busy.size > 0 || !!narration.bulk;
  const locked = !!pdfProgress || narrationBusy;

  /* 다른 언어의 대본을 지금 언어로 옮긴다 — 고른 장들만 */
  const translateScripts = useCallback(async (urls: string[]) => {
    const targets = urls.filter((url) => noteFor(value.notes[url], sourceLang)?.script?.trim());
    if (translating || targets.length === 0) return;
    setTranslating(true);
    const result = await autoTranslate(targets.map((url) => noteFor(value.notes[url], sourceLang)?.script?.trim() ?? ""), sourceLang, lang);
    setTranslating(false);
    const feature = t("admin.aiHealth.feature.translation");
    if ("translations" in result) {
      onChange((prev) => {
        let notes = prev.notes;
        targets.forEach((url, i) => {
          if (!result.failedIndices.includes(i) && result.translations[i]) notes = patchNote(notes, url, lang, { script: result.translations[i] });
        });
        return { ...prev, notes };
      });
      notifyAiFailures(result, t, { feature, ok: true });
    } else {
      showToast(errorText(result.error, t, tw("translateFailed")), "error");
      notifyAiFailures(result, t, { feature, ok: false });
    }
  }, [lang, onChange, sourceLang, t, translating, tw, value.notes]);

  /* 한 장을 다른 파일로 — 자리는 그대로, 그 장의 대본 · 음성(두 언어)은 새 주소로 옮긴다 */
  const replaceItem = useCallback((oldUrl: string) => {
    pickFiles({ accept: "image/*,video/mp4,video/webm,video/quicktime", multiple: false }, async ([file]) => {
      if (!file) return;
      setReplacingUrl(oldUrl);
      const fail = (err: unknown) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
      const newUrl = await uploadMedia(file, fail, await import("@/lib/compressImage"));
      setReplacingUrl(null);
      if (!newUrl) return;
      onChange((prev) => {
        const at = prev.gallery.indexOf(oldUrl);
        if (at < 0 || oldUrl === newUrl) return prev;
        const { [oldUrl]: moved, ...rest } = prev.notes;
        return { gallery: prev.gallery.map((u, i) => (i === at ? newUrl : u)), notes: moved ? { ...rest, [newUrl]: moved } : prev.notes };
      });
      onUrlReplaced?.(oldUrl, newUrl);
      if (narration.openUrl === oldUrl) narration.open(newUrl, false);
      showToast(tw("galleryReplaced"), "success");
    });
  }, [narration, onChange, onUrlReplaced, t, tw, uploadMedia]);

  const renderSlide = (src: string) => isOfficeDocUrl(src) ? (
    <span className={styles.galleryDoc}>
      <FileText size={40} strokeWidth={1.25} />
      <span className={styles.galleryDocKind}>{officeDocKind(src)}</span>
    </span>
  ) : isVideoUrl(src) ? (
    <video src={src} muted playsInline controls preload="metadata" />
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt="" />
  );

  return (
    <div className={es.field}>
      <div className={styles.galleryLabelRow}>
        <label className={es.fieldLabel} style={{ marginBottom: 0 }}>
          {label ?? tw("gallery")}
          {gallery.length > 0 && <span className={styles.galleryCount}>{gallery.length}</span>}
        </label>
        <span className={styles.galleryLabelActions}>
          {selected.size > 0 && (
            <span className={styles.gallerySelectionBar}>
              <span>{fillTemplate(t("admin.common.selectedCount"), { count: selected.size })}</span>
              <Button variant="ghost" shape="capsule" onClick={() => setSelected(new Set())} disabled={locked} soundDisabled>
                {t("admin.common.clearSelection")}
              </Button>
              <Button variant="outline" shape="capsule" onClick={removeSelected} disabled={locked} soundDisabled>
                {t("admin.common.deleteSelected")}
              </Button>
            </span>
          )}
          {pdfProgress && (
            <span className={styles.galleryPdfProgress}>
              <span>
                {pdfProgress.phase === "reading"
                  ? fillTemplate(tw("pdfReading"), { name: pdfProgress.name })
                  : pdfProgress.phase === "rendering"
                    ? fillTemplate(tw("pdfConverting"), { name: pdfProgress.name, done: pdfProgress.done, total: pdfProgress.total })
                    : fillTemplate(tw("pdfUploading"), { done: pdfProgress.done, total: pdfProgress.total })}
              </span>
              <span className={styles.galleryProgressTrack}>
                <span
                  className={styles.galleryProgressFill}
                  style={{ width: pdfProgress.total > 0 ? `${Math.round((pdfProgress.done / pdfProgress.total) * 100)}%` : "0%" }}
                />
              </span>
            </span>
          )}
          <Button variant="outline" shape="capsule" onClick={pickGalleryFiles} disabled={locked} soundDisabled>
            {tw("addMore")}
          </Button>
        </span>
      </div>
      {gallery.length === 0 ? (
        <Pressable
          className={`${styles.galleryAddTile}${fileOver ? ` ${styles.galleryFileOver}` : ""}`}
          onClick={pickGalleryFiles}
          disabled={locked}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(e) => { if (narrationBusy) { e.preventDefault(); return; } onDrop(e); }}
        >
          <Plus size={20} strokeWidth={1.5} />
          <span>{tw("addGallery")}</span>
        </Pressable>
      ) : (
        <div
          ref={areaRef}
          tabIndex={0}
          data-busy={pdfProgress ? "" : undefined}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (pdfProgress) return;
            if (!narrationBusy && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !(e.target as HTMLElement).closest("textarea, input")) {
              e.preventDefault();
              setSelected(new Set(gallery.map((_, i) => i)));
            }
            if (e.key === "Escape") setSelected(new Set());
            if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.target as HTMLElement).closest("textarea, input, select")) {
              e.preventDefault();
              const next = Math.max(0, Math.min(gallery.length - 1, narrationCurrent + (e.key === "ArrowLeft" ? -1 : 1)));
              narration.open(gallery[next], false);
              const tile = railRef.current?.querySelector<HTMLElement>(`[data-gallery-index="${next}"]`);
              tile?.scrollIntoView({ block: "nearest", inline: "nearest" });
              if ((e.target as HTMLElement).closest(`.${styles.galleryRail}`)) tile?.focus({ preventScroll: true });
            }
          }}
          className={`${styles.gallerySelectArea}${fileOver ? ` ${styles.galleryFileOver}` : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(e) => { if (narrationBusy) { e.preventDefault(); return; } onDrop(e); }}
        >
          <div ref={benchRef} className={styles.galleryBench} style={benchSplit.benchStyle}>
            <GalleryNarrationPanel
              gallery={gallery}
              notes={langNotes}
              actions={narration}
              tw={tw}
              translate={translatable && serviceStatus.translation ? { sourceNotes, busy: translating, run: translateScripts } : undefined}
              renderSlide={renderSlide}
            />
            <div className={styles.galleryBenchHandle} aria-label={tw("narrationSplit")} {...benchSplit.handleProps}>
              <span className={styles.galleryBenchHandleBar} />
            </div>
            <div ref={railRef} className={styles.galleryRail}>
              <HorizontalCarousel className={styles.galleryCarousel}>
                {gallery.map((src, i) => {
                  const isMain = !!cover && src === cover.url && !!src;
                  const filename = src.split("/").pop() ?? src;
                  const activate = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
                    if (e.shiftKey || e.metaKey || e.ctrlKey) pickItem(i, { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey });
                    else narration.open(src);
                  };
                  return (
                    <div
                      key={i}
                      data-gallery-index={i}
                      className={[
                        styles.galleryItem,
                        narrationCurrent === i ? styles.galleryItemCurrent : "",
                        selected.has(i) ? styles.galleryItemSelected : "",
                        dragIdx === i ? styles.galleryItemDragging : "",
                        overIdx === i && dragIdx !== null && dragIdx !== i ? (dragIdx < i ? styles.galleryDropAfter : styles.galleryDropBefore) : "",
                      ].filter(Boolean).join(" ")}
                      draggable={!locked}
                      onDragStart={(e) => {
                        if (locked) { e.preventDefault(); return; }
                        setDragIdx(i);
                        e.dataTransfer.effectAllowed = "move";
                        /* 자료를 하나도 담지 않으면 브라우저가 끌기를 그 자리에서 취소한다 */
                        e.dataTransfer.setData("text/plain", String(i));
                      }}
                      onDragOver={(e) => { if (dragIdx === null) return; e.preventDefault(); setOverIdx(i); }}
                      onDragEnd={() => { stopAutoScroll(); setDragIdx(null); setOverIdx(null); }}
                      onDrop={(e) => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                        stopAutoScroll();
                        reorder(dragIdx, i);
                        setDragIdx(null);
                        setOverIdx(null);
                      }}
                      onClick={activate}
                      /* 캐러셀까지 내려가면 그쪽이 포인터를 붙잡아 가로로 밀어 칸의 끌기가 시작되지 못한다 */
                      onPointerDown={(e) => { if (e.button === 0 && !pdfProgress) e.stopPropagation(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(e); } }}
                      aria-label={tw("viewImage")}
                      aria-pressed={selected.has(i)}
                      aria-current={narrationCurrent === i ? "true" : undefined}
                    >
                      {isOfficeDocUrl(src) ? (
                        <span className={styles.galleryDoc}>
                          <FileText size={28} strokeWidth={1.5} />
                          <span className={styles.galleryDocKind}>{officeDocKind(src)}</span>
                        </span>
                      ) : isVideoUrl(src) && !imgErrors.has(src) ? (
                        <video
                          src={src}
                          className={styles.galleryImg}
                          draggable={false}
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                          onError={() => markImgError(src)}
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imgErrors.has(src) ? IMAGE_FALLBACK_SRC : src}
                          alt={`Gallery ${i + 1}`}
                          className={styles.galleryImg}
                          draggable={false}
                          onError={() => markImgError(src)}
                        />
                      )}
                      {isMain && (
                        <Badge variant="solid" tone="accent" size="md" icon={<Star size={10} strokeWidth={2.5} fill="currentColor" />} className={styles.galleryMainBadge}>
                          {tw("currentMain")}
                        </Badge>
                      )}
                      <div className={styles.galleryOverlay}>
                        <div className={styles.galleryActions} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                          <Button variant="difference" shape="circle" disabled={locked || i === 0} onClick={() => moveItem(i, -1)}
                            aria-label={tw("moveEarlier")} title={tw("moveEarlier")} soundDisabled icon={<ChevronLeft size={12} strokeWidth={2} />} />
                          <Button variant="difference" shape="circle" disabled={locked || i === gallery.length - 1} onClick={() => moveItem(i, 1)}
                            aria-label={tw("moveLater")} title={tw("moveLater")} soundDisabled icon={<ChevronRight size={12} strokeWidth={2} />} />
                          <Button variant="difference" shape="circle" onClick={() => setViewerIdx(i)}
                            aria-label={tw("viewImage")} title={tw("viewImage")} soundDisabled icon={<Maximize2 size={12} strokeWidth={2} />} />
                          {cover && (
                            <Button variant="difference" shape="circle" active={isMain} disabled={narrationBusy} onClick={() => { if (!isMain) cover.set(src); }}
                              aria-label={tw("setAsMain")} title={tw("setAsMain")} soundDisabled icon={<Star size={12} strokeWidth={2} fill={isMain ? "currentColor" : "none"} />} />
                          )}
                          <Button variant="difference" shape="circle" disabled={locked || !!replacingUrl} loading={replacingUrl === src} onClick={() => replaceItem(src)}
                            aria-label={tw("replaceImage")} title={tw("replaceImage")} soundDisabled icon={<Replace size={12} strokeWidth={2} />} />
                          <Button variant="difference" shape="circle" disabled={locked} onClick={() => removeItem(i)}
                            aria-label={tw("remove")} title={tw("remove")} soundDisabled icon={<X size={14} strokeWidth={2} />} />
                        </div>
                        <div className={styles.galleryMeta}>
                          <span className={styles.galleryMetaIndex}>{i + 1} / {gallery.length}</span>
                          <span className={styles.galleryMetaName}>{filename}</span>
                        </div>
                      </div>
                      <NarrationBadge note={langNotes[src]} className={styles.galleryNarrationBadge} />
                    </div>
                  );
                })}
              </HorizontalCarousel>
            </div>
          </div>
        </div>
      )}
      <ImageViewer images={gallery} index={viewerIdx ?? 0} open={viewerIdx !== null} onClose={() => setViewerIdx(null)} title={viewerTitle} />
    </div>
  );
}
