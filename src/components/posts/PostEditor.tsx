"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import type { Post, PostFormData, Series } from "@/types/post";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { autoTranslate } from "@/utils/autoTranslate";
import EditorToggle from "./EditorToggle";
import MarkdownEditor, { extractMarkdownImages } from "./MarkdownEditor";
import CoverImagePicker from "./CoverImagePicker";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import styles from "./PostEditor.module.css";

function TagsList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  const { t } = useLanguage();
  const measureRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const [swapping, setSwapping] = useState<'exiting' | 'entering' | false>(false);
  const animating = useRef(false);

  useEffect(() => {
    if (expanded) { setVisibleCount(tags.length); return; }
    const el = measureRef.current;
    if (!el) return;

    const check = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const cutoff = el.getBoundingClientRect().top + el.clientHeight;

      let fitCount = 0;
      for (const child of children) {
        if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
        else break;
      }

      if (fitCount >= tags.length) {
        setVisibleCount(tags.length);
      } else {
        setVisibleCount(Math.max(1, fitCount - 1));
      }
    };

    const frame = requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [tags, expanded]);

  const animateToggle = useCallback((toExpanded: boolean) => {
    const el = displayRef.current;
    if (!el) { setExpanded(toExpanded); return; }

    const fromH = el.offsetHeight;
    animating.current = true;

    if (toExpanded) {
      // 펼치기: 먼저 상태 변경 → 새 높이 측정 → 애니메이션
      setExpanded(true);
      requestAnimationFrame(() => {
        const toH = el.scrollHeight;
        el.style.height = `${fromH}px`;
        el.style.transition = "none";
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${toH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.transition = "";
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    } else {
      // 접기: 높이 애니메이션 → 끝나면 마지막 태그 shrink + 더보기 slide-in
      const targetH = measureRef.current?.clientHeight ?? 64;
      const measureEl = measureRef.current;
      let newVC = 0;
      let total = 0;
      if (measureEl) {
        const children = Array.from(measureEl.children) as HTMLElement[];
        total = children.length;
        const cutoff = measureEl.getBoundingClientRect().top + measureEl.clientHeight;
        let fitCount = 0;
        for (const child of children) {
          if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
          else break;
        }
        newVC = fitCount >= total ? total : Math.max(1, fitCount - 1);
      }
      el.style.height = `${fromH}px`;
      el.style.overflow = "clip";
      el.style.transition = "none";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${targetH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.overflow = "";
            el.style.transition = "";
            setVisibleCount(newVC);
            setExpanded(false);
            if (newVC < total) setSwapping('exiting');
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    }
  }, []);

  const hiddenCount = tags.length - visibleCount;

  return (
    <div style={{ position: "relative" }}>
      {/* 숨겨진 측정용 */}
      <div
        ref={measureRef}
        className={es.tags}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", left: 0, right: 0 }}
      >
        {tags.map((tag) => (
          <span key={tag} className={es.tag}>
            {tag}
            <button type="button" className={es.tagRemove} tabIndex={-1}>&times;</button>
          </span>
        ))}
      </div>
      {/* 실제 표시 */}
      <div ref={displayRef} className={es.tags} style={{ maxHeight: "none", overflow: "visible" }}>
        {(expanded ? tags : swapping === 'exiting' ? tags.slice(0, visibleCount + 1) : tags.slice(0, visibleCount)).map((tag, i) => (
          <span
            key={tag}
            className={`${es.tag}${swapping === 'exiting' && i === visibleCount ? ` ${es.tagExiting}` : ""}`}
            onAnimationEnd={swapping === 'exiting' && i === visibleCount ? () => setSwapping('entering') : undefined}
          >
            {tag}
            <button type="button" className={es.tagRemove} onClick={() => onRemove(tag)}>&times;</button>
          </span>
        ))}
        {hiddenCount > 0 && !expanded && swapping !== 'exiting' && (
          <button
            type="button"
            className={`${es.tagMore}${swapping === 'entering' ? ` ${es.tagMoreEntering}` : ""}`}
            onClick={() => animateToggle(true)}
            onAnimationEnd={() => { if (swapping === 'entering') setSwapping(false); }}
          >
            + {t("editor.showMore")} ({hiddenCount})
          </button>
        )}
        {expanded && (
          <button type="button" className={es.tagMore} onClick={() => animateToggle(false)}>
            {t("editor.collapse")}
          </button>
        )}
      </div>
    </div>
  );
}

function ShortcutsModalContent() {
  const { t } = useLanguage();
  return (
    <div className={styles.helpGrid}>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpTextFormat")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.bold"), "⌘B"], [t("editor.italic"), "⌘I"], [t("editor.underline"), "⌘U"], [t("editor.strikethrough"), "⌘⇧S"], [t("editor.inlineCode"), "⌘E"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpParagraph")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.heading1"), "⌘⌥1"], [t("editor.heading2"), "⌘⌥2"], [t("editor.heading3"), "⌘⌥3"], [t("editor.blockquote"), "⌘⇧B"], [t("editor.helpBulletList"), "⌘⇧8"], [t("editor.helpOrderedList"), "⌘⇧7"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpEdit")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.undo"), "⌘Z"], [t("editor.redo"), "⌘⇧Z"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpFont")}</p>
        <div className={styles.helpRows}>
          <div className={styles.helpRow}><span>{t("editor.helpFontDblClick")}</span><span className={styles.helpDesc}>{t("editor.helpDirectInput")}</span></div>
          <div className={styles.helpRow}><span>Enter</span><span className={styles.helpDesc}>{t("editor.helpConfirmInput")}</span></div>
          <div className={styles.helpRow}><span>Escape</span><span className={styles.helpDesc}>{t("editor.helpCancelInput")}</span></div>
        </div>
      </div>
    </div>
  );
}

const Editor = dynamic(() => import("./PlateEditor"), {
  ssr: false,
});

const ImagePanel = dynamic(
  () => import("./PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

import type { PlateEditorHandle, EditorImageInfo } from "./PlateEditor";

interface PostEditorProps {
  post?: Post;
}

const POST_TEMPLATE_KO = `## 들어가며

이 글에서는 ___에 대해 다루겠습니다. ___를 하다가 ___한 경험을 공유하고자 합니다.

## 배경

___를 사용하고 있었는데, ___한 상황이 발생했습니다. 기존 방식으로는 ___가 어려웠기 때문에 다른 접근이 필요했습니다.

## 본론

### ___

___

### ___

___

## 트러블슈팅

### 문제: ___

**증상**: ___
**원인**: ___
**해결**: ___를 적용하여 해결했습니다.

## 마치며

___를 통해 ___를 알 수 있었습니다. 비슷한 문제를 겪고 있다면 ___를 시도해 보시길 추천합니다.`;

const POST_TEMPLATE_EN = `## Introduction

In this post, I'll cover ___. I'd like to share my experience with ___ while working on ___.

## Background

I was using ___ when ___ happened. The existing approach couldn't handle ___, so a different solution was needed.

## Main Content

### ___

___

### ___

___

## Troubleshooting

### Problem: ___

**Symptom**: ___
**Root cause**: ___
**Resolution**: Applied ___ to resolve the issue.

## Conclusion

Through ___, I learned ___. If you're facing a similar issue, I'd recommend trying ___.`;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const SLUG_RE = /^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/;

function validateSlug(slug: string): string | null {
  if (!slug.trim()) return null; // 빈 건 다른 검증에서 처리
  if (slug !== slug.toLowerCase()) return "SLUG_UPPERCASE";
  if (/\s/.test(slug)) return "SLUG_SPACE";
  if (/--/.test(slug)) return "SLUG_DOUBLE_HYPHEN";
  if (/^-|-$/.test(slug)) return "SLUG_EDGE_HYPHEN";
  if (!SLUG_RE.test(slug)) return "SLUG_INVALID_CHAR";
  if (slug.length > 80) return "SLUG_TOO_LONG";
  return null;
}

export default function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const config = useSiteConfig();
  const mediaLimits = (config.media as Record<string, unknown>)?.limits as Record<string, number> | undefined;
  const isEdit = !!post;
  const categories = useCategories();
  const serviceStatus = useServiceStatus();
  // 카테고리 ko 또는 en 값으로 매칭
  const findCat = (val: string): BilingualCategory | undefined =>
    categories.find((c) => c.ko === val || c.en === val);
  const isManagedCat = (val: string) => !!findCat(val);

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const te = useCallback(
    (key: string) => tLang(`admin.posts.editor.${key}`, editorLang),
    [tLang, editorLang],
  );

  const [form, setForm] = useState<PostFormData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    content: post?.content ?? "",
    content_type: post?.content_type ?? "markdown",
    excerpt: post?.excerpt ?? "",
    cover_image: post?.cover_image ?? "",
    tags: post?.tags ?? [],
    category: post?.category || "",
    is_pinned: post?.is_pinned ?? false,
    published: post?.published ?? false,
    language: post?.language ?? "ko",
    title_en: post?.title_en ?? "",
    content_en: post?.content_en ?? "",
    excerpt_en: post?.excerpt_en ?? "",
    series_id: post?.series_id ?? null,
    series_order: post?.series_order ?? 0,
  });

  // Auto-correct invalid category when categories load
  useEffect(() => {
    if (categories.length === 0) return;
    if (!isManagedCat(form.category)) {
      setForm((prev) => ({ ...prev, category: categories[0].ko }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const { openModal } = useModalStore();
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generatingSummary, setRegeneratingSummary] = useState(false);
  const [status, setStatusRaw] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [statusTimestamp, setStatusTimestamp] = useState<number | undefined>(undefined);
  const setStatus = useCallback((s: string) => { setStatusRaw(s); setStatusTimestamp(undefined); }, []);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const optionalInnerRef = useRef<HTMLDivElement>(null);
  const optionalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = optionalInnerRef.current;
    const content = optionalContentRef.current;
    if (!inner || !content) return;
    const update = () => {
      if (optionalOpen) {
        content.style.setProperty("--_content-height", `${inner.scrollHeight}px`);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [optionalOpen]);

  // 에디터 ref + 첨부 이미지
  const plateRef = useRef<PlateEditorHandle>(null);
  const [editorImages, setEditorImages] = useState<EditorImageInfo[]>([]);
  // 초기 로드 후 이미지 목록 동기화 (에디터 준비될 때까지 polling)
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const imgs = plateRef.current?.getImages();
      if (!cancelled && imgs !== undefined) {
        setEditorImages(imgs);
        // 이미지가 있거나 충분히 시도했으면 중단
        if (imgs.length > 0 || attempts >= 10) clearInterval(poll);
      }
    }, 300);
    return () => { cancelled = true; clearInterval(poll); };
  }, [editorLang, form.content_type]);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMdHelp, setShowMdHelp] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesPosts, setSeriesPosts] = useState<{ id: string; title: string; series_order: number }[]>([]);
  const [seriesPostsLoading, setSeriesPostsLoading] = useState(false);
  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  formRef.current = form;
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  // 새 글도 DB revision 저장을 위해 임시 ID 사용
  const draftEntityId = post?.id ?? "draft-new-post";
  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions({
    entityType: "post",
    entityId: draftEntityId,
  });

  // 편집기 진입 시 초안 복원 확인 (localStorage → DB revision 순서)
  const draftRestored = useRef(false);
  const applyDraft = useCallback((data: PostFormData, json?: string) => {
    autoSaveSkip.current = true;
    setForm(data);
    if (json) lastAutoSaveJson.current = json;
    setStatus(te("draftRestored"));
    setStatusType("info");
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const askRestore = useCallback((data: PostFormData, json?: string) => {
    const modalId = "draft-restore";
    openModal(
      <ModalConfirm
        desc={te("draftFoundDesc")}
        cancelText={te("draftFoundDiscard")}
        confirmText={te("draftFoundLoad")}
        onConfirm={() => applyDraft(data, json)}
        onCancel={() => {}}
      />,
      { id: modalId, header: { title: te("draftFoundTitle") }, width: "360px", closeButton: false },
    );
  }, [te, openModal, applyDraft]);

  useEffect(() => {
    if (draftRestored.current) return;
    // localStorage 먼저 확인
    try {
      const local = localStorage.getItem(localDraftKey);
      if (local) {
        const parsed = JSON.parse(local) as PostFormData;
        if (JSON.stringify(parsed) !== JSON.stringify(initialFormRef.current)) {
          draftRestored.current = true;
          localStorage.removeItem(localDraftKey);
          askRestore(parsed, local);
          return;
        }
        localStorage.removeItem(localDraftKey);
      }
    } catch { /* ignore */ }
    // DB revision fallback
    if (dbRevisions.length === 0) return;
    draftRestored.current = true;
    loadRevisionSnapshot(dbRevisions[0].id).then((snapshot) => {
      if (!snapshot) return;
      askRestore(snapshot as PostFormData);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRevisions]);

  useEffect(() => {
    fetch("/api/series?all=true")
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, []);

  // 시리즈 선택 시 해당 시리즈 게시물 목록 fetch + 순서 자동 설정
  useEffect(() => {
    if (!form.series_id) { setSeriesPosts([]); setSeriesPostsLoading(false); return; }
    setSeriesPostsLoading(true);
    fetch(`/api/series/${form.series_id}`)
      .then((res) => res.json())
      .then((data) => {
        const posts = (data.posts ?? []) as { id: string; title: string; series_order: number }[];
        setSeriesPosts(posts);
        // 새 글이면 마지막 순서 +1
        if (!isEdit || !posts.some((p) => p.id === post?.id)) {
          const maxOrder = posts.reduce((max, p) => Math.max(max, p.series_order ?? 0), 0);
          updateField("series_order", maxOrder + 1);
        }
      })
      .finally(() => setSeriesPostsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.series_id]);

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  // status 메시지는 다음 액션까지 유지

  /* ── Auto-save (5s debounce) ── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(post?.id);
  const lastAutoSaveJson = useRef<string>("");
  autoSaveBusy.current = saving || translating;

  // localStorage 키 (새 글: "post-draft-new", 기존 글: "post-draft-{id}")
  const localDraftKey = `post-draft-${post?.id ?? "new"}`;

  const flushSave = useCallback(() => {
    const current = JSON.stringify(formRef.current);
    if (!current || current === lastAutoSaveJson.current) return;

    // localStorage에 항상 백업 (id 없어도)
    try { localStorage.setItem(localDraftKey, current); } catch { /* quota */ }

    if (autoSaveBusy.current) return;
    lastAutoSaveJson.current = current;
    saveRevision({ ...formRef.current }, formRef.current.title || formRef.current.title_en || "(untitled)");
    setStatus(te("autoSaved"));
    setStatusType("success");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRevision, te, localDraftKey]);

  useEffect(() => {
    if (autoSaveSkip.current) {
      autoSaveSkip.current = false;
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(flushSave, 30000);

    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  /* ── Save on leave (visibility change + beforeunload + SPA nav) ── */
  useEffect(() => {
    const onVisChange = () => { if (document.hidden) flushSave(); };
    const onBeforeUnload = () => {
      // localStorage에 즉시 백업 (동기, 항상 동작)
      try { localStorage.setItem(localDraftKey, JSON.stringify(formRef.current)); } catch { /* quota */ }
      // DB revision도 시도 (새 글이면 draftEntityId 사용)
      const id = savedId.current || draftEntityId;
      const current = JSON.stringify(formRef.current);
      if (!current || current === lastAutoSaveJson.current) return;
      const body = JSON.stringify({
        entity_type: "post",
        entity_id: id,
        snapshot: formRef.current,
        title: formRef.current.title || formRef.current.title_en || "(untitled)",
      });
      navigator.sendBeacon("/api/revisions", new Blob([body], { type: "application/json" }));
    };

    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // SPA 이탈 시 keepalive fetch
      const id = savedId.current || draftEntityId;
      const current = JSON.stringify(formRef.current);
      if (!current || current === lastAutoSaveJson.current) return;
      fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "post",
          entity_id: id,
          snapshot: formRef.current,
          title: formRef.current.title || formRef.current.title_en || "(untitled)",
        }),
        keepalive: true,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushSave]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;
      const srcExcerpt = isToEn ? form.excerpt : form.excerpt_en;

      const texts: string[] = [];
      const keys: (keyof PostFormData)[] = [];

      if (want.has("title") && srcTitle.trim()) {
        texts.push(srcTitle);
        keys.push(isToEn ? "title_en" : "title");
      }
      if (want.has("content") && srcContent.trim()) {
        texts.push(srcContent);
        keys.push(isToEn ? "content_en" : "content");
      }
      if (want.has("excerpt") && srcExcerpt.trim()) {
        texts.push(srcExcerpt);
        keys.push(isToEn ? "excerpt_en" : "excerpt");
      }

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tLang("admin.posts.editor.translating", lang));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<PostFormData> = {};
        keys.forEach((k, i) => {
          (patch as Record<string, string>)[k] = result.translations[i];
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tLang("admin.posts.editor.autoTranslated", lang));
        setStatusType("success");
      } else {
        setError(result.error);
      }
    },
    [form, tLang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const dstTitle = isToEn ? form.title_en : form.title;
      const dstContent = isToEn ? form.content_en : form.content;
      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;

      const hasSource = !!(srcTitle.trim() || srcContent.trim());
      const hasDest = !!(dstTitle.trim() || dstContent.trim());

      if (hasSource && !hasDest) {
        await translateFields(["title", "content", "excerpt"], newLang);
      }
    },
    [form, translating, translateFields],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? ["title", "content", "excerpt"], editorLang);
    },
    [translating, editorLang, translateFields],
  );

  const [converting, setConverting] = useState(false);

  const handleContentTypeChange = useCallback(
    async (newType: "markdown" | "richtext") => {
      if (newType === form.content_type) return;
      setConverting(true);

      const convert = async (content: string): Promise<string> => {
        if (!content) return content;
        if (form.content_type === "markdown" && newType === "richtext") {
          let html = marked.parse(content, { async: false }) as string;
          // marked-footnote → Plate 호환 변환
          // 참조: <sup><a data-footnote-ref ...>1</a></sup> → <sup data-footnote-ref="1">[1]</sup>
          html = html.replace(
            /<sup><a[^>]*data-footnote-ref[^>]*>(\d+)<\/a><\/sup>/g,
            (_, num) => `<sup data-footnote-ref="${num}" id="fnref-${num}">[${num}]</sup>`
          );
          // 정의: <section class="footnotes"...><ol><li id="footnote-N"><p>text <a...>↩</a></p></li>...</ol></section>
          html = html.replace(
            /<section[^>]*data-footnotes[^>]*>[\s\S]*?<\/section>/g,
            (section) => {
              const items: string[] = [];
              const liRe = /<li id="footnote-(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
              let m;
              while ((m = liRe.exec(section)) !== null) {
                const id = m[1];
                const text = m[2].replace(/<\/?p>/g, "").replace(/<a[^>]*data-footnote-backref[^>]*>[^<]*<\/a>/g, "").trim();
                items.push(`<div data-footnote-content="${id}" id="fn-${id}">${text}</div>`);
              }
              return items.join("\n");
            }
          );
          // marked-alert → Plate callout 변환
          html = html.replace(
            /<div class="markdown-alert markdown-alert-(\w+)">([\s\S]*?)<\/div>/g,
            (_, type, inner) => {
              const iconMap: Record<string, string> = { note: "ℹ️", tip: "💡", important: "❗", warning: "⚠️", caution: "🔴" };
              const body = inner.replace(/<p class="markdown-alert-title">[\s\S]*?<\/p>/, "").trim();
              return `<div data-callout data-callout-bg="var(--bg-tertiary)" data-callout-icon="${iconMap[type] || "💡"}">${body}</div>`;
            }
          );
          // marked-katex inline → Plate inline_equation
          html = html.replace(
            /<span class="katex">([\s\S]*?)<\/span>(?=(?:(?!<span class="katex">).)*?(?:<\/p>|$))/g,
            (full) => {
              const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
              if (!ann) return full;
              const tex = ann[1];
              return `<span data-math-inline="true" data-latex="${tex}">${tex}</span>`;
            }
          );
          // marked-katex block → Plate equation
          html = html.replace(
            /<span class="katex-display">([\s\S]*?)<\/span>\s*(?=\n|$)/g,
            (full) => {
              const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
              if (!ann) return full;
              const tex = ann[1];
              return `<div data-math-block="true" data-latex="${tex}">${tex}</div>`;
            }
          );
          // 코드블록 wrap toggle 버튼 제거
          html = html.replace(/<button[^>]*class="code-wrap-toggle"[^>]*>[\s\S]*?<\/button>/g, "");
          return html;
        } else {
          const TurndownService = (await import("turndown")).default;
          const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
          // 백틱 이스케이프 방지
          td.escape = (str: string) => str;

          // 각주 참조: <sup data-footnote-ref="1">[1]</sup> → [^1]
          td.addRule("footnoteRef", {
            filter: (node) => node.nodeName === "SUP" && node.hasAttribute("data-footnote-ref"),
            replacement: (_content, node) => `[^${(node as HTMLElement).getAttribute("data-footnote-ref")}]`,
          });
          // 각주 ID span: <span data-footnote-id="1">[1]</span> → 무시
          td.addRule("footnoteIdSpan", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-footnote-id"),
            replacement: () => "",
          });
          // 각주 내용: <div data-footnote-content="1">text</div> → [^1]: text
          td.addRule("footnoteContent", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-footnote-content"),
            replacement: (content, node) => {
              const id = (node as HTMLElement).getAttribute("data-footnote-content");
              return `\n[^${id}]: ${content.trim()}\n`;
            },
          });
          // 수식 블록: <div data-math-block data-latex="..."> → $$...$$
          td.addRule("mathBlock", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-math-block"),
            replacement: (_content, node) => `\n$$\n${(node as HTMLElement).getAttribute("data-latex") ?? ""}\n$$\n`,
          });
          // 인라인 수식: <span data-math-inline data-latex="..."> → $...$
          td.addRule("mathInline", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-math-inline"),
            replacement: (_content, node) => `$${(node as HTMLElement).getAttribute("data-latex") ?? ""}$`,
          });
          // 코드 블록: fenced style 보장
          td.addRule("codeBlock", {
            filter: (node) => {
              if (node.nodeName === "PRE") {
                const code = (node as HTMLElement).querySelector("code");
                return !!code;
              }
              if (node.nodeName === "DIV" && (node as HTMLElement).classList.contains("code-block-wrap")) return true;
              return false;
            },
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const code = el.querySelector("code");
              if (!code) return _content;
              const lang = Array.from(code.classList).find(c => c.startsWith("language-"))?.replace("language-", "") ?? "";
              const text = code.textContent ?? "";
              return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
            },
          });

          return td.turndown(content);
        }
      };

      const [newContent, newContentEn] = await Promise.all([
        convert(form.content),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content: newContent,
        content_en: newContentEn,
        content_type: newType,
      }));
      setConverting(false);
      setStatus("");
      setError("");
    },
    [form.content, form.content_en, form.content_type] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    // 보안 + 형식별 크기 제한 검증 (설정 값 사용)
    const sizeError = validateFileSize(file, mediaLimits);
    if (sizeError) throw new Error(sizeError);

    // 일반 이미지는 압축 파이프라인 적용
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressed);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, [mediaLimits]);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await handleImageUpload(file);
      updateField("cover_image", url);
    };
    input.click();
  }, [handleImageUpload, updateField]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/,/g, "");
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }, [tagInput, form.tags, updateField]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
  );

  const removeTag = useCallback(
    (tag: string) => {
      updateField(
        "tags",
        form.tags.filter((t) => t !== tag)
      );
    },
    [form.tags, updateField]
  );

  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: string[] = [];
        const _koStarted = !!(form.title.trim() || form.content.trim());
        const _enStarted = !!(form.title_en.trim() || form.content_en.trim());

        if (!form.slug.trim()) {
          missing.push(te("slug"));
        }
        if (!form.category.trim()) missing.push(te("category"));

        if (!_koStarted && !_enStarted) {
          missing.push(te("title"));
          missing.push(te("content"));
        } else {
          if (_koStarted) {
            if (!form.title.trim()) missing.push(`${te("title")} (KO)`);
            if (!form.content.trim()) missing.push(`${te("content")} (KO)`);
          }
          if (_enStarted) {
            if (!form.title_en.trim()) missing.push(`${te("title")} (EN)`);
            if (!form.content_en.trim()) missing.push(`${te("content")} (EN)`);
          }
        }

        if (missing.length > 0) {
          setError(`${missing.join(" · ")} ${te("requiredFields")}`);
          setShowErrors(true);
          return;
        }

        const slugError = validateSlug(form.slug);
        if (slugError) {
          setError(`[Slug] ${te(`slugError.${slugError}`)}`);
          setShowErrors(true);
          return;
        }

        const security = validateContentSecurity(form.content + form.content_en);
        if (!security.safe) {
          setError(`${te("securityWarning")}: ${security.warnings.join(", ")}`);
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      const body = {
        ...form,
        published: willPublish,
      };

      try {
        const url = savedId.current
          ? `/api/posts/${savedId.current}`
          : "/api/posts";
        const method = savedId.current ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to save");
          return;
        }

        if (!savedId.current) savedId.current = data.id;

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/posts/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        const savedSlug = data.slug || form.slug;

        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        try { localStorage.removeItem(localDraftKey); } catch { /* ignore */ }
        // 새 글이었으면 임시 draft revision 정리
        if (!isEdit) {
          fetch(`/api/revisions?entity_type=post&entity_id=draft-new-post`, { method: "DELETE" }).catch(() => {});
        }
        router.push("/admin/posts");
      } catch {
        setError(te("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, te, isEdit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDelete = useCallback(async () => {
    if (!post) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      try { localStorage.removeItem(localDraftKey); } catch { /* ignore */ }
      router.push("/admin/posts");
    } catch {
      setError(te("deleteFailed"));
      setDeleting(false);
    }
  }, [post, router, te]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreview = useCallback(() => {
    sessionStorage.setItem("post-preview", JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot as PostFormData);
        setStatus(te("restored"));
        setStatusType("success");
        setStatusTimestamp(rev.timestamp);
      }
    },
    [dbRevisions, loadRevisionSnapshot, te], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot as PostFormData;
      const stripHtml = (html: string) =>
        html
          .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      return {
        excerpt: s.excerpt || s.excerpt_en || "",
        content: stripHtml(s.content || s.content_en || ""),
        meta: {
          Category: s.category || "",
          Tags: s.tags?.join(", ") || "",
          Series: seriesList.find((x) => x.id === s.series_id)?.title || "",
          Pinned: s.is_pinned ? "Yes" : "",
        },
      };
    },
    [dbRevisions, loadRevisionSnapshot, seriesList],
  );

  const handleDeleteRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return false;
      return deleteRevision(rev.id);
    },
    [dbRevisions, deleteRevision],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(te("reverted"));
    setStatusType("info");
    setStatusTimestamp(undefined);
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateSummary = useCallback(async () => {
    const id = savedId.current ?? post?.id;
    if (!id) return;
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`/api/posts/${id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const raw = data.error ?? "";
        const status = res.status;
        const msg = raw.includes("not configured") || status === 503 ? te("summaryNoKey")
          : status === 429 || raw.includes("429") ? te("summaryRateLimit")
          : status === 401 || status === 403 || raw.includes("401") || raw.includes("403") ? te("summaryAuthError")
          : status === 400 || raw.includes("400") ? te("summaryBadRequest")
          : te("summaryFailed");
        setError(msg);
        return;
      }
      setStatus(te("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(te("summaryFailed"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [post?.id, te]); // eslint-disable-line react-hooks/exhaustive-deps

  const shellLabels = useMemo(
    () => ({
      delete: te("delete"),
      deleting: te("deleting"),
      deleteConfirm: te("deleteConfirm"),
      deleteConfirmInput: te("deleteConfirmInput"),
      deleteCancel: te("deleteCancel"),
      preview: te("preview"),
      saving: te("saving"),
      saveDraft: te("saveDraft"),
      update: te("update"),
      publish: te("publish"),
      revert: te("revert"),
      revisionHistory: te("revisionHistory"),
      restore: te("restore"),
      retranslate: te("retranslate"),
      retranslateAll: te("retranslateAll"),
      retranslateDisabled: te("retranslateDisabled"),
      generateSummary: te("generateSummary"),
      generateSummaryDisabled: te("generateSummaryDisabled"),
    }),
    [te]
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "title", label: te("title") },
      { key: "excerpt", label: te("excerpt") },
      { key: "content", label: te("content") },
    ],
    [te]
  );

  const handleInsertTemplate = useCallback(() => {
    const key = editorLang === "ko" ? "content" : "content_en";
    const template = editorLang === "ko" ? POST_TEMPLATE_KO : POST_TEMPLATE_EN;
    const current = form[key as keyof PostFormData] as string;

    if (current.trim()) {
      if (!confirm(te("templateConfirm"))) return;
      updateField(key as keyof PostFormData, current + "\n\n" + template);
    } else {
      updateField(key as keyof PostFormData, template);
    }
  }, [editorLang, form, updateField, te]);

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  const koStarted = !!(form.title.trim() || form.content.trim());
  const enStarted = !!(form.title_en.trim() || form.content_en.trim());
  const titleFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.title.trim()) ||
    (editorLang === "en" && enStarted && !form.title_en.trim())
  );
  const contentFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.content.trim()) ||
    (editorLang === "en" && enStarted && !form.content_en.trim())
  );

  return (
    <>
    <AdminEditorShell
      backHref="/admin/posts"
      backLabel={te("backToPosts")}
      editorLang={editorLang}
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      deleteTargetName={post?.title}
      onSaveDraft={() => handleSave()}
      onPublish={() => handleSave(true)}
      onPreview={handlePreview}
      status={status}
      statusType={statusType}
      statusTimestamp={statusTimestamp}
      error={error}
      labels={shellLabels}
      revisions={dbRevisions.map((r) => ({
        timestamp: r.timestamp,
        title: r.title,
      }))}
      onRevert={handleRevert}
      onRestoreRevision={handleRestoreRevision}
      onLoadRevisionDetail={handleLoadRevisionDetail}
      onDeleteRevision={handleDeleteRevision}
      onRetranslate={serviceStatus.translation ? handleRetranslate : undefined}
      retranslateOptions={retranslateOptions}
      retranslateDisabled={!serviceStatus.loading && !serviceStatus.translation}
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      currentSnapshot={(() => {
        const stripHtml = (html: string) =>
          html
            .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        return {
          title: form.title || form.title_en,
          excerpt: form.excerpt || form.excerpt_en || "",
          content: stripHtml(form.content || form.content_en || ""),
          meta: {
            Category: form.category || "",
            Tags: form.tags?.join(", ") || "",
            Series: seriesList.find((x) => x.id === form.series_id)?.title || "",
            Pinned: form.is_pinned ? "Yes" : "",
          },
        };
      })()}
      topBarSecondRowLeft={
        <Checkbox
          checked={form.is_pinned}
          onChange={(v) => updateField("is_pinned", v)}
          shape="square"
          label={te("pinLabel")}
        />
      }
    >
      <div className={styles.meta}>
        {/* ── 필수 입력 ── */}
        <div className={es.field}>
          <label className={`${es.fieldLabel}${titleFieldError ? ` ${es.fieldLabelError}` : ""}`}>{te("title")}</label>
          <input
            className={`${es.titleInput}${titleFieldError ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={te("titlePlaceholder")}
          />
        </div>

        <div className={es.row}>
          <div className={es.field} style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
              <label className={`${es.fieldLabel}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{te("slug")}</label>
              {form.slug.trim() && validateSlug(form.slug) && (
                <span className={styles.slugHint}>{te(`slugError.${validateSlug(form.slug)}`)}</span>
              )}
            </div>
            <input
              className={`${es.fieldInput}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldInputError}` : ""}`}
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                updateField("slug", e.target.value);
              }}
              placeholder="post-url-slug"
            />
          </div>

        </div>

        {/* ── 선택 입력 (접기/펼치기) ── */}
        <div className={styles.optionalSection}>
          <button
            type="button"
            className={styles.optionalToggle}
            onClick={() => setOptionalOpen((v) => !v)}
          >
            <span>{te("optionalFields")}</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: optionalOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="2.5 4.5 6 8 9.5 4.5" />
            </svg>
          </button>

          {/* 시리즈 — 항상 표시 */}
          <div className={es.field} onFocusCapture={() => { if (!optionalOpen) setOptionalOpen(true); }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <label className={es.fieldLabel}>{te("series")}</label>
              <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                {te("seriesManage")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            </div>
            <Select
              value={form.series_id ?? ""}
              options={[
                { value: "", label: te("seriesNone") },
                ...seriesList.map((s) => ({ value: s.id, label: `${s.title} (${s.post_count ?? 0})${s.category ? ` — ${s.category}` : ""}` })),
              ]}
              onChange={(v) => {
                updateField("series_id", v || null);
                if (v) {
                  const selected = seriesList.find((s) => s.id === v);
                  if (selected?.category) updateField("category", selected.category);
                }
              }}
            />
          </div>
          <div ref={optionalContentRef} className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            <div ref={optionalInnerRef} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {form.series_id && seriesPostsLoading && (
                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                  <div className={styles.seriesOrderList}>
                    {[1, 2].map((i) => (
                      <div key={i} className={styles.seriesOrderItem} style={{ opacity: 0.4 }}>
                        <span className={styles.seriesOrderNum}>{i}</span>
                        <span className={styles.seriesOrderTitle} style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", height: "1em", width: `${60 + i * 20}px` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {form.series_id && !seriesPostsLoading && (() => {
                const currentPostId = post?.id ?? "__new__";
                const otherPosts = seriesPosts.filter((p) => p.id !== post?.id);
                const currentItem = { id: currentPostId, title: form.title || te("currentPost"), series_order: form.series_order };
                const allItems = [...otherPosts, currentItem].sort((a, b) => a.series_order - b.series_order);

                const reorder = (fromIdx: number, toIdx: number) => {
                  if (fromIdx === toIdx) return;
                  const reordered = [...allItems];
                  const [moved] = reordered.splice(fromIdx, 1);
                  reordered.splice(toIdx, 0, moved);
                  // 전체 순서 재할당 (1-based)
                  const updates: { id: string; series_order: number }[] = [];
                  reordered.forEach((item, i) => {
                    const newOrder = i + 1;
                    if (item.id === currentPostId) {
                      updateField("series_order", newOrder);
                    } else if (item.series_order !== newOrder) {
                      updates.push({ id: item.id, series_order: newOrder });
                    }
                  });
                  // 다른 게시물 순서 업데이트 (seriesPosts 로컬 상태도 반영)
                  if (updates.length) {
                    setSeriesPosts((prev) => prev.map((p) => {
                      const u = updates.find((x) => x.id === p.id);
                      return u ? { ...p, series_order: u.series_order } : p;
                    }));
                    // API로 다른 게시물 순서 저장
                    updates.forEach((u) => {
                      fetch(`/api/posts/${u.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ series_order: u.series_order }),
                      });
                    });
                  }
                };

                const dragIdxRef = { current: -1 };
                const handleDragStart = (e: React.DragEvent, idx: number) => {
                  dragIdxRef.current = idx;
                  e.dataTransfer.effectAllowed = "move";
                };
                const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
                const handleDrop = (e: React.DragEvent, targetIdx: number) => {
                  e.preventDefault();
                  reorder(dragIdxRef.current, targetIdx);
                  dragIdxRef.current = -1;
                };

                return (
                  <div className={es.field}>
                    <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                    <div className={styles.seriesOrderList}>
                      {allItems.map((item, idx) => {
                        const isCurrent = item.id === currentPostId;
                        return (
                          <div
                            key={item.id}
                            className={`${styles.seriesOrderItem} ${isCurrent ? styles.seriesOrderItemCurrent : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                          >
                            <span className={styles.seriesOrderNum}>{idx + 1}</span>
                            <span className={styles.seriesOrderGrip}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" />
                                <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                                <circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" />
                              </svg>
                            </span>
                            <span className={styles.seriesOrderTitle}>{item.title || "Untitled"}</span>
                            {isCurrent && (
                              <div className={styles.seriesOrderBtns}>
                                <button type="button" className={styles.numberBtn} disabled={idx === 0} onClick={() => reorder(idx, idx - 1)}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                                </button>
                                <button type="button" className={styles.numberBtn} disabled={idx === allItems.length - 1} onClick={() => reorder(idx, idx + 1)}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* 줄2: [카테고리 + 태그] */}
              <div className={es.row}>
                <div className={es.field}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <label className={`${es.fieldLabel}${showErrors && !form.category.trim() ? ` ${es.fieldLabelError}` : ""}`}>{te("category")}</label>
                    {form.series_id && (
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-space-grotesk)" }}>{te("categoryFromSeries")}</span>
                    )}
                  </div>
                  <Select
                    value={isManagedCat(form.category) ? (findCat(form.category)?.ko ?? form.category) : (categories[0]?.ko ?? "")}
                    options={categories.map((cat) => ({ value: cat.ko, label: language === "ko" ? cat.ko : cat.en }))}
                    onChange={(v) => updateField("category", v)}
                    disabled={!!form.series_id}
                  />
                </div>
                <div className={es.field} style={{ flex: 1 }}>
                  <label className={es.fieldLabel}>{te("tags")}</label>
                  <div>
                    <div className={styles.tagInputRow}>
                      <input className={es.fieldInput} type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={te("tagsPlaceholder")} />
                      <button type="button" className={styles.tagAddBtn} onClick={addTag} disabled={!tagInput.trim()}>+</button>
                    </div>
                    {form.tags.length > 0 && <TagsList tags={form.tags} onRemove={removeTag} />}
                  </div>
                </div>
              </div>
              {/* 줄3: [요약 + 커버이미지] */}
              <div className={es.row}>
                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("excerpt")}</label>
                  <textarea
                    className={styles.excerptInput}
                    value={form[excerptKey]}
                    onChange={(e) => updateField(excerptKey, e.target.value)}
                    placeholder={te("excerptPlaceholder")}
                    rows={2}
                  />
                </div>

                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("coverImage")}</label>
                  {form.cover_image ? (
                    <div className={styles.coverPreview}>
                      <Image
                        src={form.cover_image}
                        alt="Cover"
                        width={80}
                        height={50}
                        className={styles.coverThumb}
                      />
                      <button
                        type="button"
                        className={styles.coverRemove}
                        onClick={() => {
                          updateField("cover_image", "");
                          setShowCoverPicker(false);
                        }}
                      >
                        {te("remove")}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.coverActions}>
                      <button
                        type="button"
                        className={es.uploadBtn}
                        onClick={handleCoverUpload}
                      >
                        {te("upload")}
                      </button>
                      <button
                        type="button"
                        className={es.uploadBtn}
                        onClick={() => setShowCoverPicker((v) => !v)}
                      >
                        {showCoverPicker ? te("closePicker") : te("chooseCover")}
                      </button>
                    </div>
                  )}
                  {showCoverPicker && !form.cover_image && (
                    <CoverImagePicker
                      onSelect={(url) => {
                        updateField("cover_image", url);
                        setShowCoverPicker(false);
                      }}
                      onClose={() => setShowCoverPicker(false)}
                      postContext={{
                        title: form.title,
                        tags: form.tags,
                        excerpt: form.excerpt,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={es.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <span className={`${styles.editorLabel}${contentFieldError ? ` ${styles.editorLabelError}` : ""}`}>{te("content")}</span>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {te("insertTemplate")}
            </button>
            <button
              type="button"
              className={styles.editorHelpBtn}
              onClick={() => openModal(<ShortcutsModalContent />, { id: "shortcuts-help", header: { title: "단축키 및 기능 안내" }, closeButton: true })}
              title="단축키 및 기능 안내"
            >
              ?
            </button>
            {form.content_type === "markdown" && (
              <button
                type="button"
                className={`${styles.editorHelpBtn} ${showMdHelp ? styles.editorHelpBtnActive : ""}`}
                onClick={() => setShowMdHelp(!showMdHelp)}
                title="Markdown"
              >
                MD
              </button>
            )}
          </div>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        <div className={styles.editorWrap}>
        {converting ? (
          <div className={styles.editorSkeleton}>
            <div className={styles.editorSkeletonBar} style={{ width: "60%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "90%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "75%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "85%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "40%" }} />
          </div>
        ) : form.content_type === "markdown" ? (
          <MarkdownEditor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleImageUpload}
            editLabel={te("editorLabel")}
            previewLabel={te("previewLabel")}
            showHelp={showMdHelp}
          />
        ) : (
          <Editor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => {
              updateField(contentKey, v);
              // 이미지 목록 동기화
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onImageUpload={handleImageUpload}
            editorRef={plateRef}
            postLang={editorLang}
          />
        )}
        </div>
      </div>

      {/* ── 첨부 이미지 패널 ── */}
      {form.content_type === "markdown" ? (
        (() => {
          const mdImages = extractMarkdownImages(form[contentKey]).map((url, i) => ({
            url, path: [i], mediaType: "img" as const,
          }));
          return (
            <div className={styles.attachedImagesSection}>
              <ImagePanel
                images={mdImages}
                onSelect={() => {}}
                onReorder={() => {}}
                onRemove={() => {}}
                onImageUpload={async (file) => {
                  const url = await handleImageUpload(file);
                  // 마크다운 본문 끝에 이미지 삽입
                  const content = form[contentKey] as string;
                  updateField(contentKey, `${content}\n![image](${url})\n`);
                  return url;
                }}
              />
            </div>
          );
        })()
      ) : (
        <div className={styles.attachedImagesSection}>
          <ImagePanel
            images={editorImages}
            onSelect={(path) => plateRef.current?.selectImageAt(path)}
            onReorder={(from, to) => plateRef.current?.reorderImage(from, to)}
            onRemove={(path) => plateRef.current?.removeImage(path)}
            onImageUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertImageByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onVideoUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertMediaByUrl(url);
              return url;
            }}
            onBulkInsert={(paths) => {
              for (const path of paths) {
                plateRef.current?.selectImageAt(path);
              }
            }}
            onReinsert={(url, mediaType) => {
              if (mediaType === "media_embed") plateRef.current?.insertMediaByUrl(url);
              else plateRef.current?.insertImageByUrl(url);
            }}
            onRemoveDetached={(url) => plateRef.current?.removeDetached(url)}
          />
        </div>
      )}

    </AdminEditorShell>

</>
  );
}
