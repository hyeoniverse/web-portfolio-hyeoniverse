"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { UploadResponse } from "@/types";
import { PREVIEW_KEY } from "@/constants";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronRight, ExternalLink, AlertTriangle } from "@/components/icons";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { showToast } from "@/stores/toastStore";
import { focusFirstMissingField } from "@/utils/focusFirstMissing";
import { stripHtml } from "@/utils/htmlUtils";
import type { Post, PostFormData, Series } from "@/types/post";
import SeriesInlineEditor from "@/app/admin/(dashboard)/settings/_components/SeriesInlineEditor";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import { findCategoryNode, toCategoryOptions, flattenCategories } from "@/lib/categoryTree";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useEditorDraft, draftKey } from "@/hooks/useEditorDraft";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useEditorTranslation } from "@/hooks/useEditorTranslation";
import CoverImagePicker from "./CoverImagePicker";
import SeoChecklist from "@/components/admin/SeoChecklist";
import RelationPicker from "@/components/admin/RelationPicker";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverBanner from "@/components/admin/CoverBanner";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import { motion, AnimatePresence } from "framer-motion";
import { postProcessMarkedHtml } from "./postProcessMarkedHtml";
import { generateSlug, validateSlug } from "@/utils/postSlug";
import { POST_TITLE_MAX } from "@/lib/postConstants";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import SaveConflictDialog from "./SaveConflictDialog";
import { usePostPresence } from "@/hooks/usePostPresence";
import { useTagInput } from "@/hooks/useTagInput";
import { usePostSeries } from "@/hooks/usePostSeries";
import ShortcutsModalContent from "./ShortcutsModal";
import styles from "./PostEditor.module.css";
import "./PostEditor.global.css";
import "@/components/admin/seoFlash.css";
import { flashSeoField, clearSeoFlash } from "@/components/admin/seoFlash";

/**
 * 레거시 마크다운 본문 → richtext(HTML) 1회 변환.
 * 에디터는 이제 richtext 단일이라, DB 에 markdown 으로 저장된 옛 글은 열 때 한 번만
 * 변환한다(이미 검증된 md→richtext 단방향). 변환 실패 시 원문 유지.
 */
function mdToRichHtml(md: string): string {
  if (!md) return md;
  try {
    return postProcessMarkedHtml(marked.parse(md, { async: false }) as string);
  } catch {
    return md;
  }
}

const Editor = dynamic(() => import("./PlateEditor"), {
  ssr: false,
  loading: () => (
    <div className={styles.editorSkeletonFrame}>
      <div className={styles.editorSkeletonToolbar}>
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
        <div className={styles.editorSkeletonBar} style={{ width: 60, height: 24 }} />
      </div>
      <div className={styles.editorSkeleton}>
        <div className={styles.editorSkeletonBar} style={{ width: "60%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "90%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "75%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "85%" }} />
        <div className={styles.editorSkeletonBar} style={{ width: "40%" }} />
      </div>
    </div>
  ),
});

const ImagePanel = dynamic(
  () => import("./PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

import type { PlateEditorHandle, EditorImageInfo } from "./PlateEditor";
import { isVideoMedia, _postLinkCategory, _postLinkTags, _postLinkExcludeId } from "./plate/utils";

interface PostEditorProps {
  post?: Post;
}

import { POST_TEMPLATES } from "@/data/postTemplates";
import type { PostTemplate } from "@/data/postTemplates";

/** Revision detail panel — lang 별 라벨/필드 로컬라이즈 + 해당 lang KO|EN 값만 노출. */
function postSnapshotMeta(s: PostFormData, seriesList: { id: string; title: string }[], authorNames: Map<string, string>, lang: "ko" | "en"): import("@/components/admin/AdminEditorShell/types").RevisionMetaGroup[] {
  const isKo = lang === "ko";
  const L = (ko: string, en: string) => (isKo ? ko : en);
  const seriesTitle = seriesList.find((x) => x.id === s.series_id)?.title || "";
  const tagNotesCount = Object.keys(s.tag_notes ?? {}).length;
  return [
    {
      label: L("기본", "Basic"),
      fields: {
        Slug: s.slug || "",
        [L("작성자", "Authors")]: (s.author_ids ?? []).map((id) => authorNames.get(id) || id).join(", "),
        [L("언어", "Language")]: s.language || "",
      },
    },
    {
      label: L("미디어", "Media"),
      secondary: true,
      fields: {
        [L("아이콘", "Icon")]: s.icon || "",
        [L("커버 이미지", "Cover Image")]: s.cover_image || "",
      },
    },
    {
      label: L("분류", "Categories"),
      fields: {
        [L("카테고리", "Category")]: s.category || "",
        [L("태그", "Tags")]: (s.tags ?? []).join(", "),
        [L("태그 노트", "Tag Notes")]: tagNotesCount > 0 ? L(`${tagNotesCount}개`, `${tagNotesCount}`) : "",
      },
    },
    {
      label: L("시리즈", "Series"),
      secondary: true,
      fields: {
        [L("시리즈", "Series")]: seriesTitle,
        [L("시리즈 순서", "Series Order")]: s.series_id ? String(s.series_order ?? 0) : "",
      },
    },
    {
      label: L("연결", "Links"),
      secondary: true,
      fields: {
        "GitHub URL": s.github_url || "",
        [L("관련 프로젝트", "Related Works")]: s.related_work_ids?.length ? L(`${s.related_work_ids.length}개`, `${s.related_work_ids.length}`) : "",
      },
    },
    {
      label: L("발행", "Publishing"),
      secondary: true,
      fields: {
        [L("게시", "Published")]: s.published ? L("예", "Yes") : "",
        [L("고정", "Pinned")]: s.is_pinned ? L("예", "Yes") : "",
        [L("예약 발행", "Scheduled")]: s.scheduled_at || "",
      },
    },
  ];
}

// 새 글을 발행 없이 이탈해도 draft 로 저장 — 이 탭 세션에서 만든 draft id 를 보관해 중복 생성 방지.
const NEW_DRAFT_SESSION_KEY = "new-post-draft-id";

export default function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const config = useSiteConfig();
  const mediaLimits = (config.media as Record<string, unknown>)?.limits as Record<string, number> | undefined;
  const isEdit = !!post;
  const categories = useCategories();
  const serviceStatus = useServiceStatus();
  // 카테고리 ko 또는 en 값으로 매칭 — 2단계 트리 전체(대분류/소분류)에서 탐색
  const findCat = (val: string): BilingualCategory | undefined =>
    findCategoryNode(categories, val) ?? undefined;
  // 선택 가능한(= Select 옵션에 뜨는) 카테고리는 leaf 뿐. 대분류(children 보유)는 배정 대상 아님.
  const isManagedCat = (val: string) => {
    const c = findCat(val);
    return !!c && !(c.children?.length);
  };
  // posts.category 기본값·fallback 은 항상 leaf 여야 함 (대분류 값 저장 방지)
  const firstLeafKo = flattenCategories(categories).find((c) => !c.children?.length)?.ko ?? "";

  const POST_FIELD_KEYS = ["title", "content", "excerpt"];

  const postFieldMapper = useCallback(
    (lang: "ko" | "en") => {
      const isToEn = lang === "en";
      return [
        { key: "title", sourceKey: isToEn ? "title" : "title_en", targetKey: isToEn ? "title_en" : "title" },
        { key: "content", sourceKey: isToEn ? "content" : "content_en", targetKey: isToEn ? "content_en" : "content" },
        { key: "excerpt", sourceKey: isToEn ? "excerpt" : "excerpt_en", targetKey: isToEn ? "excerpt_en" : "excerpt" },
      ];
    },
    [],
  );

  // draft(localStorage)의 미저장 커버 값을 mount 시 동기 읽어 초기값에 반영 — 새로고침 때 DB 커버가 먼저 떴다가
  // draft 커버로 교체되는 flash + 위치(cover_position/zoom) 초기화 방지. (전체 draft 복원은 useEditorDraft 가 fetch 후 별도 처리)
  const [draftCover] = useState<{ cover_image?: string; cover_position?: number; cover_zoom?: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(draftKey("post", post?.id ?? "draft-new-post"));
      if (!raw) return null;
      const d = JSON.parse(raw) as Partial<PostFormData>;
      return { cover_image: d.cover_image, cover_position: d.cover_position, cover_zoom: d.cover_zoom };
    } catch { return null; }
  });

  const [form, setForm] = useState<PostFormData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    // 레거시 md 글은 로드 시 richtext 로 1회 변환 후 richtext 로 고정 (토글 제거)
    content: post?.content_type === "markdown" ? mdToRichHtml(post?.content ?? "") : (post?.content ?? ""),
    content_type: "richtext",
    excerpt: post?.excerpt ?? "",
    cover_image: draftCover?.cover_image ?? post?.cover_image ?? "",
    cover_position: draftCover?.cover_position ?? post?.cover_position ?? 50,
    cover_zoom: draftCover?.cover_zoom ?? post?.cover_zoom ?? 1,
    icon: post?.icon ?? "",
    tags: post?.tags ?? [],
    tag_notes: post?.tag_notes ?? {},
    category: post?.category || "",
    is_pinned: post?.is_pinned ?? false,
    published: post?.published ?? false,
    language: post?.language ?? "ko",
    title_en: post?.title_en ?? "",
    content_en: post?.content_type === "markdown" ? mdToRichHtml(post?.content_en ?? "") : (post?.content_en ?? ""),
    excerpt_en: post?.excerpt_en ?? "",
    series_id: post?.series_id ?? null,
    series_order: post?.series_order ?? 0,
    github_url: post?.github_url ?? "",
    scheduled_at: post?.scheduled_at ?? null,
    related_work_ids: [],
    author_ids: post?.author_ids ?? [],
  });

  // 직접 입력 모드 — 사용자가 "직접 입력" 선택 시 활성화. form.category 가 비어도 input 유지
  const [categoryCustomMode, setCategoryCustomMode] = useState(false);

  /** 연결된 works 목록 — 편집기 진입 시 한 번 fetch */
  const [allWorks, setAllWorks] = useState<Array<{ id: string; title: string; year: string; image: string; published: boolean; categories_ko?: string[] }>>([]);
  useEffect(() => {
    fetch("/api/works?all=true&limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.works)) setAllWorks(d.works);
      })
      .catch(() => {});
  }, []);

  // 새 글 (post.id 없음) 은 async fetch 없음 → 즉시 ready. 기존 글은 fetch 완료 시 true.
  const [initialLoadsReady, setInitialLoadsReady] = useState(!post?.id);

  // 현재 로그인 사용자를 에디터 작성자 칩에 항상 표시 (설정 authors 가 비어도). /api/admin/authors/context 로 채움.
  const [currentUserAuthor, setCurrentUserAuthor] = useState<{ id: string; name: string; avatar: string } | null>(null);
  // 히스토리 메타의 작성자 표시용 id→이름 맵 (설정 authors + 현재 로그인 사용자).
  const authorNameById = useMemo(() => {
    const m = new Map<string, string>();
    ((config.authors ?? []) as Array<{ id: string; name?: string }>).forEach((a) => { if (a.id) m.set(a.id, a.name || a.id); });
    if (currentUserAuthor) m.set(currentUserAuthor.id, currentUserAuthor.name || currentUserAuthor.id);
    return m;
  }, [config.authors, currentUserAuthor]);

  // Auto-correct ONLY when category is empty — 직접 입력한 커스텀 카테고리/모드는 유지
  useEffect(() => {
    if (categories.length === 0) return;
    if (categoryCustomMode) return;
    if (!form.category) {
      const fallback = categories.find((c) => c.ko === "기타")?.ko ?? firstLeafKo;
      setForm((prev) => ({ ...prev, category: fallback }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const { openModal, closeAll, closeModal } = useModalStore();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingSummary, setRegeneratingSummary] = useState(false);
  const [status, setStatusRaw] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [statusTimestamp, setStatusTimestamp] = useState<number | undefined>(undefined);
  const setStatus = useCallback((s: string) => { setStatusRaw(s); setStatusTimestamp(undefined); }, []);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const {
    editorLang,
    translating,
    handleEditorLangChange,
    handleRetranslate,
  } = useEditorTranslation({
    form: form as unknown as Record<string, unknown>,
    tLang,
    i18nPrefix: "admin.posts.editor",
    fieldMapper: postFieldMapper,
    allFieldKeys: POST_FIELD_KEYS,
    onUpdate: (patch) => setForm((prev) => ({ ...prev, ...patch })),
    onStatus: (msg, type) => { setStatus(msg); setStatusType(type); },
    onError: setError,
    // 콘텐츠 작성 기본 언어로 편집 시작 (en 기본이면 영문 탭부터)
    initialLang: config.metadata.defaultLanguage as "ko" | "en",
  });

  const te = useCallback(
    (key: string) => tLang(`admin.posts.editor.${key}`, editorLang),
    [tLang, editorLang],
  );
  const [optionalOpen, setOptionalOpen] = useState(false);
  const optionalInnerRef = useRef<HTMLDivElement>(null);
  const optionalContentRef = useRef<HTMLDivElement>(null);

  /** SEO 체크리스트 항목 클릭 → 해당 필드로 스크롤 + 포커스 + 상호작용 전까지 blink. */
  // 컴포넌트 unmount 시 blink 리스너 정리
  useEffect(() => () => clearSeoFlash(), []);

  const handleSeoItemClick = useCallback((id: "title" | "slug" | "excerpt" | "cover" | "category" | "tags") => {
    // category 는 titleGroup 으로 옮겨졌으므로 optional 펼침 불필요
    const inOptional = id === "excerpt" || id === "cover" || id === "tags";
    if (inOptional) setOptionalOpen(true);
    const scrollAndHighlight = () => {
      const el = document.querySelector<HTMLElement>(`[data-seo="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, textarea, select, button");
      input?.focus({ preventScroll: true });
      // 이동한 필드를 상호작용 전까지 blink
      flashSeoField(el);
    };
    if (inOptional) requestAnimationFrame(() => requestAnimationFrame(scrollAndHighlight));
    else scrollAndHighlight();
  }, []);

  useEffect(() => {
    const inner = optionalInnerRef.current;
    const content = optionalContentRef.current;
    if (!inner || !content) return;
    const update = () => {
      if (optionalOpen) {
        // box-sizing: border-box 라서 max-height 가 padding 까지 포함하는 총 높이.
        // inner.scrollHeight 만 쓰면 padding-bottom 만큼 마지막 항목이 잘림 → 명시적으로 더해줌.
        const cs = getComputedStyle(content);
        const pad = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
        content.style.setProperty("--_content-height", `${inner.scrollHeight + pad}px`);
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
  const [editorHtmlMode, setEditorHtmlMode] = useState(false);
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
  // 커버 배너의 페이지 이모지/아이콘 — form.icon 으로 저장(DB posts.icon)
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  // 닫는 중 — coverPickerCollapse 애니메이션 (~0.45s) 끝난 뒤 unmount.
  // showCoverPicker 만 false 로 즉시 두면 컴포넌트가 사라져 닫는 애니메이션이 보이지 않음
  const [closingCoverPicker, setClosingCoverPicker] = useState(false);
  const closeCoverPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCloseCoverPicker = useCallback(() => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
    setClosingCoverPicker(true);
    closeCoverPickerTimer.current = setTimeout(() => {
      setShowCoverPicker(false);
      setClosingCoverPicker(false);
      closeCoverPickerTimer.current = null;
    }, 450);
  }, []);
  useEffect(() => () => {
    if (closeCoverPickerTimer.current) clearTimeout(closeCoverPickerTimer.current);
  }, []);
  const initialFormRef = useRef(form);
  // 최신 form 스냅샷 — 이탈(unmount/unload) 핸들러가 stale closure 없이 현재 값을 읽게.
  const formRef = useRef(form);
  formRef.current = form;
  // 수동 저장/발행이 끝났으면 이탈저장(draft) 을 발동하지 않음 — 발행글을 draft 로 되돌리는 사고 방지.
  const finalizedRef = useRef(false);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  // 새 글도 DB revision 저장을 위해 임시 ID 사용
  const draftEntityId = post?.id ?? "draft-new-post";
  const { revisions: dbRevisions, loaded: revisionsLoaded, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions<PostFormData>({
    entityType: "post",
    entityId: draftEntityId,
  });

  // draft 복원 모달은 제거 — autosave 가 background 에서 조용히 동작.
  // 사용자가 복원하고 싶으면 revision history 패널에서 명시적으로 비교/복원.
  // (Notion / Linear / Vercel admin 등 현대 에디터 표준 패턴)

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  // status 메시지는 다음 액션까지 유지

  /* ── Auto-save ── */
  const savedIdRef = useRef<string | undefined>(post?.id);
  useEffect(() => { if (post?.id) savedIdRef.current = post.id; }, [post?.id]);
  const savedId = savedIdRef; // backward-compat — handleSave 가 .current 로 접근
  // 낙관적 동시성 — 로드 시점 version. undefined 면(마이그레이션 전) 버전 체크 생략 → 기존 저장 유지.
  const baseVersionRef = useRef<number | undefined>(post?.version);
  // presence — 같은 글을 다른 기기/탭에서 편집 중이면 소프트 경고
  const presenceOthers = usePostPresence(post?.id, isEdit);

  const onAutoSaved = useCallback(() => {
    setStatus(te("autoSaved"));
    setStatusType("success");
  }, [te, setStatus]);

  const { markBaseline } = useEditorAutoSave<PostFormData>({
    entityType: "post",
    entityId: post?.id,
    draftEntityId,
    snapshot: form,
    getTitle: () => form.title || form.title_en || "(untitled)",
    saveRevision,
    ignoredKeys: ["scheduled_at"],
    block: saving || translating,
    onSaved: onAutoSaved,
    // 마지막 편집 후 3초 멈추면 저장 — 60초는 사실상 자동저장이 아니라 특수블록 넣고 확인하면 아직 저장 전이었다.
    // debounce 라 연속 타이핑 중엔 저장 안 하고 멈출 때마다 저장(과도하지 않음).
    debounceMs: 3000,
  });

  // 글자 단위 continuous draft (localStorage) — mount 시 silent restore.
  // Revision (DB save point) 와 분리: draft 는 "예상치 못한 종료 복구" 용, revision 은 "돌아갈 수 있는 save point".
  const { clearDraft } = useEditorDraft<PostFormData>({
    entityType: "post",
    entityId: post?.id,
    draftEntityId,
    snapshot: form,
    // 로컬 로드 완료 → localStorage 복원 + baseline. 서버 로드 완료 → 서버(cross-device) 복원(단 미편집 시).
    ready: initialLoadsReady,
    serverReady: revisionsLoaded,
    applyDraft: (draft) => {
      setForm(draft);
      // restored 가 baseline 이 되도록 — 즉시 autosave 가 또 fire 하는 거 방지
      requestAnimationFrame(markBaseline);
    },
    ignoredKeys: ["scheduled_at"],
    // 서버(cross-device) 자동복원은 현재 비활성 — 기존 글은 과거 저장이 updated_at 을 안 올려(=stale)
    // "저장본보다 오래된 dismiss 안 된 revision"이 로드 시 복원돼 내용을 옛 버전으로 되돌리는 사고 발생.
    // localStorage 복원(같은 기기)만 사용 → posts.content 가 진실, 되돌림 없음.
    // 재활성화 조건: 각 글을 새 코드로 1회 저장(→ 옛 revision dismiss + updated_at 갱신)하거나
    // 기존 revision 일괄 dismiss 후, latestSnapshot(savedAt>updated_at) 가드로 안전하게 켤 수 있음.
    serverDraft: null,
  });

  // related_work_ids fetch 완료 시 baseline 정합화 + draft restore 활성화
  useEffect(() => {
    if (!post?.id) return;
    let cancelled = false;
    fetch(`/api/admin/posts/${post.id}/related-works`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.items)) {
          setForm((prev) => ({ ...prev, related_work_ids: d.items.map((w: { id: string }) => w.id) }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          markBaseline();
          // initial loads 완료 → draft restore 가능
          setInitialLoadsReady(true);
        });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  // 현재 로그인 사용자를 작성자 칩으로 항상 표시(설정 무관) + 새 글이면 author_ids 에 자동 지정.
  // 공동 작성자는 아래 칩(현재 사용자 + 설정 authors)에서 추가. author_ids 가 이미 있으면 건드리지 않음.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/authors/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx: { email?: string | null; authorId?: string | null; myName?: string | null; myAvatar?: string | null; ownerName?: string | null; ownerAvatar?: string | null } | null) => {
        if (cancelled || !ctx) return;
        const authors = (config.authors ?? []) as Array<{ id: string; email?: string }>;
        const email = ctx.email?.toLowerCase() ?? null;
        // 서버가 준 authorId 를 우선 신뢰(클라 config.authors 유무와 무관). 없으면 email 매칭.
        const myId =
          (typeof ctx.authorId === "string" && ctx.authorId ? ctx.authorId : null) ||
          (email ? authors.find((a) => a.email?.toLowerCase() === email)?.id ?? null : null);
        if (!myId) return;
        setCurrentUserAuthor({
          id: myId,
          name: ctx.myName || ctx.ownerName || email || myId,
          avatar: ctx.myAvatar || ctx.ownerAvatar || "",
        });
        if (!post?.id) {
          setForm((prev) => (prev.author_ids && prev.author_ids.length > 0 ? prev : { ...prev, author_ids: [myId] }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  // ── 새 글: 발행 없이 이탈해도 draft(미발행)로 저장 ──
  // 새 글은 이전 이탈-draft 를 '이어받지' 않는다. '완전 이탈'(탭 닫기 / SPA 이동) 시 draft 로 저장한 뒤
  // 새 글 autosave(localStorage · 서버 revision · 세션 id) 를 비워, 다음 '새 글'은 이전 내용을 복원하지
  // 않고 완전히 새로 시작한다. 탭 전환(hidden)은 복귀 가능성이 있어 draft 만 남기고 autosave 는 유지.
  const flushNewDraft = useCallback((keepalive: boolean, finalize = false) => {
    if (isEdit || finalizedRef.current) return;
    const f = formRef.current;
    const meaningful = !!(
      f.title.trim() || f.title_en.trim() ||
      stripHtml(f.content || "").trim() || stripHtml(f.content_en || "").trim()
    );
    if (!meaningful) return; // 빈 글은 draft 안 만들고 autosave 도 건드리지 않음
    const postBody: Record<string, unknown> = { ...f };
    delete postBody.related_work_ids; // posts 컬럼 아님 — 별도 endpoint 대상(이탈저장에선 생략)
    const body = JSON.stringify({ ...postBody, published: false });
    const headers = { "Content-Type": "application/json" };
    const url = savedId.current ? `/api/posts/${savedId.current}` : "/api/posts";
    const method = savedId.current ? "PATCH" : "POST";
    const req = fetch(url, { method, headers, body, keepalive });
    // '완전 이탈'(SPA 이동/unmount) 이고 draft 저장이 성공했을 때만 새 글 autosave 를 비운다 →
    // 다음 '새 글'은 완전히 새로 시작. 저장 실패 시엔 내용을 잃지 않도록 autosave 를 남긴다.
    if (finalize && !keepalive) {
      req.then((r) => {
        if (!r.ok) return;
        try { window.localStorage.removeItem(draftKey("post", "draft-new-post")); } catch { /* ignore */ }
        fetch(`/api/revisions?entity_type=post&entity_id=draft-new-post`, { method: "DELETE" }).catch(() => {});
        try { window.sessionStorage.removeItem(NEW_DRAFT_SESSION_KEY); } catch { /* ignore */ }
      }).catch(() => {});
    } else {
      req.catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const onBeforeUnload = () => flushNewDraft(true, true);   // 탭 닫기/새로고침 = 완전 이탈
    const onVis = () => { if (document.hidden) flushNewDraft(true, false); }; // 탭 전환 = 복귀 가능 → 유지
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVis);
      flushNewDraft(false, true); // SPA 이동/unmount = 완전 이탈
    };
  }, [isEdit, flushNewDraft]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // 현재 글 메타를 PostLinkMenu([[])에 공유 — "연관 게시물" 스코어링
  useEffect(() => { _postLinkCategory.current = form.category || ""; }, [form.category]);
  useEffect(() => { _postLinkTags.current = form.tags || []; }, [form.tags]);
  useEffect(() => { _postLinkExcludeId.current = post?.id || ""; }, [post?.id]);

  const tag = useTagInput(form.tags, (tags) => updateField("tags", tags));
  // 태그 추가 시 site.config 의 tagDescriptions 프리셋 자동 채움 (ko 만, en 은 빈값)
  const addTagWithPreset = useCallback((value?: string) => {
    const raw = (value ?? tag.input).trim().replace(/,/g, "");
    if (!raw || form.tags.includes(raw)) {
      tag.setInput("");
      return;
    }
    /* tagDescriptions 의 description (bilingual) 을 tag_notes 초기값으로 채움 */
    const stored = config.tagDescriptions?.[raw];
    const meta = stored !== undefined
      ? (() => {
          if (typeof stored === "string") return { description: { ko: stored, en: "" } };
          if ("description" in stored && stored.description) return { description: stored.description };
          // legacy { ko, en } as description
          return { description: { ko: stored.ko ?? "", en: stored.en ?? "" } };
        })()
      : null;
    const presetNote = meta?.description.ko || meta?.description.en
      ? { ko: meta.description.ko, en: meta.description.en }
      : null;
    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, raw],
      tag_notes: presetNote
        ? { ...(prev.tag_notes ?? {}), [raw]: presetNote }
        : prev.tag_notes,
    }));
    tag.setInput("");
  }, [tag, form.tags, config.tagDescriptions]);
  // 기존 태그 autocomplete suggestions — 모든 post 의 distinct tag
  const [allTagSuggestions, setAllTagSuggestions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setAllTagSuggestions(d.tags ?? []))
      .catch(() => setAllTagSuggestions([]));
  }, []);

  const { seriesList, seriesPosts, setSeriesPosts, seriesPostsLoading, refetchSeries } = usePostSeries(
    form.series_id,
    isEdit,
    post?.id,
    (order) => updateField("series_order", order),
  );

  const [seriesSelectMode, setSeriesSelectMode] = useState<"existing" | "custom">("existing");

  const handleSeriesCreated = useCallback(async (saved?: Series) => {
    await refetchSeries();
    if (saved?.id) {
      updateField("series_id", saved.id);
      if (saved.category) updateField("category", saved.category);
    }
    setSeriesSelectMode("existing");
  }, [refetchSeries, updateField]);



  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    // 동영상 — 서버 body 한도(배포 시 ~4.5MB)를 우회하려 Storage 직접 업로드.
    // 제한 초과 시 브라우저에서 압축 후 업로드 (진행 모달 포함).
    if (file.type.startsWith("video/")) {
      const { runVideoUpload } = await import("@/components/posts/plate/MediaUploadModal");
      return runVideoUpload(file, mediaLimits);
    }

    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    // 보안 + 형식별 크기 제한 검증 (설정 값 사용). 압축 가능 이미지는 일단 통과.
    const sizeError = validateFileSize(file, mediaLimits);
    if (sizeError) throw new Error(sizeError);

    // 이미지는 압축 파이프라인 적용.
    const payload = await compressImage(file);

    // 압축 후에도 한도 초과면 reject (예: 최저 품질로도 limit 못 맞춤)
    const postError = validateFileSize(payload, mediaLimits, { skipCompressibleBypass: true });
    if (postError) throw new Error(postError);

    const formData = new FormData();
    formData.append("file", payload);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    // 빈/비JSON 응답(413·게이트웨이 오류 등)에서도 의미 있는 에러를 던지도록 방어적 파싱
    const data: UploadResponse = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || `업로드 실패 (${res.status})`);
    if (!data.url) throw new Error(data.error || "업로드 응답을 받지 못했습니다");
    return data.url;
  }, [mediaLimits]);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/mp4,video/webm,video/quicktime";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await handleImageUpload(file);
      updateField("cover_image", url);
    };
    input.click();
  }, [handleImageUpload, updateField]);


  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: Array<{ label: string; field: string }> = [];
        // KO/EN 중 한 쪽만 title+content 둘 다 채워져 있으면 통과. 다른 쪽은 비어있거나 일부만 채워져있어도 OK.
        const koComplete = !!(form.title.trim() && form.content.trim());
        const enComplete = !!(form.title_en.trim() && form.content_en.trim());

        if (!form.slug.trim()) {
          missing.push({ label: te("slug"), field: "slug" });
        }
        if (!form.category.trim()) missing.push({ label: te("category"), field: "category" });

        if (!koComplete && !enComplete) {
          // 어느 쪽도 완성 안 됨 — 부분 입력된 쪽의 missing 필드 표시, 양쪽 다 비어있으면 KO 기준
          const koStarted = !!(form.title.trim() || form.content.trim());
          const enStarted = !!(form.title_en.trim() || form.content_en.trim());

          if (!koStarted && !enStarted) {
            missing.push({ label: te("title"), field: "title" });
            missing.push({ label: te("content"), field: "content" });
          } else {
            if (koStarted) {
              if (!form.title.trim()) missing.push({ label: `${te("title")} (KO)`, field: "title" });
              if (!form.content.trim()) missing.push({ label: `${te("content")} (KO)`, field: "content" });
            }
            if (enStarted) {
              if (!form.title_en.trim()) missing.push({ label: `${te("title")} (EN)`, field: "title" });
              if (!form.content_en.trim()) missing.push({ label: `${te("content")} (EN)`, field: "content" });
            }
          }
        }

        if (missing.length > 0) {
          const msg = `${missing.map((m) => m.label).join(" · ")} ${te("requiredFields")}`;
          setError(msg);
          setShowErrors(true);
          showToast(msg, "error", 3500);
          focusFirstMissingField(missing[0].field);
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

        // scheduled_at 이 이미 과거면 — confirm dialog. 확인 시 scheduled_at clear + 즉시 publish 진행
        if (form.scheduled_at && new Date(form.scheduled_at).getTime() <= Date.now()) {
          openModal(
            <ModalConfirm
              desc={te("scheduledPastConfirm") || "예약 시점이 이미 지났습니다. 지금 바로 발행할까요?"}
              confirmText={te("publishNow") || "지금 발행"}
              onConfirm={async () => {
                updateField("scheduled_at", null);
                // 새 form 값으로 retry — state 업데이트 후 다음 tick
                setTimeout(() => handleSave(publish), 0);
              }}
            />,
            { id: "scheduled-past-confirm", header: { title: te("scheduledAt") } },
          );
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      // posts 테이블에는 related_work_ids 컬럼이 없음 — 분리해서 별도 endpoint로 sync.
      const { related_work_ids, ...postBody } = form;
      const isPatch = !!savedId.current;
      const body = {
        ...postBody,
        published: willPublish,
        // 기존 글 수정 + version 로드됨(마이그레이션 후)일 때만 낙관적 버전 체크
        ...(isPatch && typeof baseVersionRef.current === "number" ? { baseVersion: baseVersionRef.current } : {}),
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

        // 저장 충돌 — 다른 기기/탭에서 먼저 저장됨. 덮어쓰기/최신 불러오기/취소 선택.
        if (res.status === 409 && data.error === "version_conflict") {
          setSaving(false);
          openModal(
            <SaveConflictDialog
              language={language}
              onCancel={() => closeModal("post-save-conflict")}
              onReload={() => { closeModal("post-save-conflict"); clearDraft(); window.location.reload(); }}
              onOverwrite={() => {
                closeModal("post-save-conflict");
                if (typeof data.currentVersion === "number") baseVersionRef.current = data.currentVersion;
                handleSave(publish); // 최신 version 으로 재시도 → 덮어쓰기
              }}
            />,
            { id: "post-save-conflict", header: { title: language === "ko" ? "저장 충돌" : "Save conflict" }, width: "400px" },
          );
          return;
        }

        if (!res.ok) {
          setError(data.error ?? "Failed to save");
          return;
        }

        // 저장 성공 — 반환된 version 으로 base 갱신 (연속 저장/이 세션 유지 대비)
        if (typeof data.version === "number") baseVersionRef.current = data.version;

        if (!savedId.current) savedId.current = data.id;
        // 수동 저장 성공 → 이탈저장(draft) 발동 차단 (발행글이 draft 로 되돌아가는 것 방지).
        finalizedRef.current = true;

        // 관계 동기화 — 별도 endpoint
        if (savedId.current && related_work_ids) {
          await fetch(`/api/admin/posts/${savedId.current}/related-works`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workIds: related_work_ids }),
          }).catch(() => {});
        }

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/posts/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        const savedSlug = data.slug || form.slug;

        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        // 새 글이었으면 임시 draft revision 정리 + 이탈저장 세션 id 정리(다음 새 글은 fresh)
        if (!isEdit) {
          fetch(`/api/revisions?entity_type=post&entity_id=draft-new-post`, { method: "DELETE" }).catch(() => {});
          try { window.sessionStorage.removeItem(NEW_DRAFT_SESSION_KEY); } catch { /* ignore */ }
        } else if (savedId.current) {
          // 기존 글: 이 저장으로 대체된 autosave revision 을 dismiss → 다음 진입 시 저장본이
          // 옛 autosave 로 되돌아가지 않게(서버 복원은 non-dismissed 최신만 대상).
          fetch(`/api/revisions`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: "post", entity_id: savedId.current, dismissed: true }),
          }).catch(() => {});
        }
        // 실제 save 성공 — localStorage draft 정리 (DB 가 진실의 원천)
        clearDraft();
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
      router.push("/admin/posts");
    } catch {
      setError(te("deleteFailed"));
      setDeleting(false);
    }
  }, [post, router, te]);

  const handlePreview = useCallback(() => {
    sessionStorage.setItem(PREVIEW_KEY.post, JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot);
        // restore 직후 autosave 가 또 fire 해서 중복 revision 생성하는 거 방지
        // form 이 snapshot 으로 설정되면 baseline 도 그 값으로 정합화 — 사용자가 추가 편집 시에만 autosave
        requestAnimationFrame(() => markBaseline());
        setStatus(te("restored"));
        setStatusType("success");
        setStatusTimestamp(rev.timestamp);
      }
    },
    [dbRevisions, loadRevisionSnapshot, markBaseline, te], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number, lang: "ko" | "en") => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot;
      const isKo = lang === "ko";
      return {
        title: (isKo ? s.title : s.title_en) || s.title || s.title_en || "",
        excerpt: (isKo ? s.excerpt : s.excerpt_en) || "",
        content: stripHtml((isKo ? s.content : s.content_en) || ""),
        meta: postSnapshotMeta(s, seriesList, authorNameById, lang),
        headerLabels: { title: isKo ? "제목" : "Title", excerpt: isKo ? "요약" : "Excerpt" },
      };
    },
    [dbRevisions, loadRevisionSnapshot, seriesList, authorNameById],
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
      view: te("viewPost"),
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
      scheduledAt: te("scheduledAt"),
      scheduledHint: te("scheduledHint"),
      scheduledClear: te("scheduledClear"),
      publishScheduled: te("publishScheduled"),
      publishOptions: te("publishOptions"),
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
    const lang = editorLang;
    const key = lang === "ko" ? "content" : "content_en";
    const current = form[key as keyof PostFormData] as string;

    const applyTemplate = (tmpl: PostTemplate) => {
      const md = lang === "ko" ? tmpl.content.ko : tmpl.content.en;
      // 에디터는 richtext 단일 — 템플릿 md 를 richtext 로 변환해 삽입
      const content = mdToRichHtml(md);

      if (current.trim()) {
        updateField(key as keyof PostFormData, current + "<hr />" + content);
      } else {
        updateField(key as keyof PostFormData, content);
      }
    };

    openModal(
      <div className={styles.templateModal}>
        <p className={styles.templateModalDesc}>{te("templateDesc")}</p>
        <div className={styles.templateList}>
          {POST_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              className={styles.templateItem}
              onClick={() => {
                if (current.trim()) {
                  openModal(
                    <ModalConfirm
                      desc={te("templateConfirm")}
                      confirmText={te("insertTemplate")}
                      onConfirm={() => { applyTemplate(tmpl); closeAll(); }}
                    />,
                    { header: { title: te("insertTemplate") }, closeButton: true, width: "360px" },
                  );
                } else {
                  applyTemplate(tmpl);
                  closeAll();
                }
              }}
            >
              <span className={styles.templateItemLabel}>{lang === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{lang === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </button>
          ))}
        </div>
      </div>,
      { header: { title: te("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, form, updateField, te, openModal, closeAll]);

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  // 작성자 칩 = 현재 로그인 사용자(항상 표시, 설정 authors 비어도) + 설정 authors(중복 제거).
  const configAuthors = (config.authors ?? []) as Array<{ id: string; name: string; avatar?: string }>;
  const authorChips: Array<{ id: string; name: string; avatar?: string }> = currentUserAuthor
    ? [currentUserAuthor, ...configAuthors.filter((a) => a.id !== currentUserAuthor.id)]
    : configAuthors;

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
      onSaveDraft={() => {
        // 미발행 게시물은 저장 시 발행 여부를 한 번 물어본다 (임시저장=미발행 유지 / 발행하기=바로 발행).
        if (form.published) { handleSave(); return; }
        openModal(
          <ModalConfirm
            desc={language === "ko"
              ? "미발행 상태로 저장됩니다. 지금 발행하시겠어요?"
              : "This will be saved as a draft. Publish it now?"}
            confirmText={language === "ko" ? "발행하기" : "Publish"}
            cancelText={language === "ko" ? "임시저장" : "Save draft"}
            onConfirm={() => handleSave(true)}
            onCancel={() => handleSave(false)}
          />,
          { id: "publish-prompt", header: { title: language === "ko" ? "발행 여부" : "Publish?" } },
        );
      }}
      onPublish={() => handleSave(true)}
      hidePublish={!form.published}
      onPreview={handlePreview}
      viewHref={form.published && form.slug ? `/posts/${form.slug}` : undefined}
      scheduledAt={form.scheduled_at}
      onScheduledChange={(iso) => updateField("scheduled_at", iso)}
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
      retranslating={translating}
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      getCurrentSnapshot={(lang) => {
        const isKo = lang === "ko";
        return {
          title: (isKo ? form.title : form.title_en) || form.title || form.title_en || "",
          excerpt: (isKo ? form.excerpt : form.excerpt_en) || "",
          content: stripHtml((isKo ? form.content : form.content_en) || ""),
          meta: postSnapshotMeta(form, seriesList, authorNameById, lang),
          headerLabels: { title: isKo ? "제목" : "Title", excerpt: isKo ? "요약" : "Excerpt" },
        };
      }}
      topBarFirstRowExtra={
        <Checkbox
          checked={form.is_pinned}
          onChange={(v) => updateField("is_pinned", v)}
          shape="square"
          label={te("pinLabel")}
        />
      }
      coverSlot={
        /* 커버 배너 + 페이지 이모지 — topBar 위 최상단(전역 nav 바로 아래) */
        <CoverBanner
          cover={form.cover_image}
          onCoverChange={(url) => updateField("cover_image", url)}
          onUpload={handleCoverUpload}
          emoji={form.icon || null}
          onEmojiChange={(e) => updateField("icon", e ?? "")}
          position={form.cover_position}
          zoom={form.cover_zoom}
          onPositionChange={(n) => updateField("cover_position", n)}
          onZoomChange={(n) => updateField("cover_zoom", n)}
        />
      }
    >
      {presenceOthers > 0 && (
        <div className={styles.presenceBanner} role="status">
          <AlertTriangle size={14} />
          <span>{language === "ko"
            ? "다른 기기·탭에서 이 글을 편집 중이에요. 동시에 저장하면 충돌할 수 있어요."
            : "This post is being edited on another device or tab — saving at the same time may conflict."}</span>
        </div>
      )}
      <div className={styles.meta}>
        {/* title + slug + 예약 발행 — 컴팩트 그룹 (gap 작게) */}
        <div className={styles.titleGroup}>
          <div className={es.field} data-seo="title" data-required="title">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--spacing-xs)" }}>
              <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${titleFieldError ? ` ${es.fieldLabelError}` : ""}`}>{te("title")}</label>
              <span style={{ fontSize: "var(--font-size-2xs)", fontVariantNumeric: "tabular-nums", color: form[titleKey].length >= POST_TITLE_MAX ? "var(--text-accent)" : "var(--text-muted)" }}>
                {form[titleKey].length}/{POST_TITLE_MAX}
              </span>
            </div>
            <input
              className={`${es.titleInput}${titleFieldError ? ` ${es.titleInputError}` : ""}`}
              type="text"
              value={form[titleKey]}
              onChange={(e) => updateField(titleKey, e.target.value)}
              placeholder={te("titlePlaceholder")}
              maxLength={POST_TITLE_MAX}
            />
          </div>

          <div className={es.row}>
            <div className={es.field} style={{ gridColumn: "1 / -1" }} data-seo="slug" data-required="slug">
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
                <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{te("slug")}</label>
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

          {/* slug 아래 — 카테고리 (필수 입력) */}
          <div className={es.row}>
            <div className={es.field} style={{ gridColumn: "1 / -1" }} data-seo="category" data-required="category">
              <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !form.category.trim() ? ` ${es.fieldLabelError}` : ""}`}>{te("category")}</label>
              {(() => {
                const matched = isManagedCat(form.category);
                const isCustom = categoryCustomMode || (!!form.category && !matched);
                const selectValue = isCustom ? "__custom__" : (matched ? (findCat(form.category)?.ko ?? form.category) : firstLeafKo);
                return (
                  <>
                    <Select
                      value={selectValue}
                      options={[
                        { value: "__custom__", label: te("customCategory") },
                        ...toCategoryOptions(categories, language === "ko" ? "ko" : "en"),
                      ]}
                      onChange={(v) => {
                        if (v === "__custom__") {
                          setCategoryCustomMode(true);
                          updateField("category", "");
                        } else {
                          setCategoryCustomMode(false);
                          updateField("category", v);
                        }
                      }}
                    />
                    {isCustom && (
                      <input
                        className={es.fieldInput}
                        type="text"
                        value={form.category}
                        onChange={(e) => updateField("category", e.target.value)}
                        placeholder={te("category")}
                        style={{ marginTop: "var(--spacing-xs)" }}
                        autoFocus
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* 작성자 (복수 선택) — site.config authors 에서 선택. 비면 리더뷰에서 기본 작성자 표시 */}
          <div className={es.row}>
            <div className={es.field} style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <label className={es.fieldLabel}>{language === "en" ? "Authors" : "작성자"}</label>
                <a href="/admin/settings?tab=account" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                  {language === "en" ? "Manage authors" : "작성자 관리"}
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className={styles.authorSelect}>
                {authorChips.length > 0 ? (
                  authorChips.map((a, i) => {
                    const ids = form.author_ids ?? [];
                    const actualSelected = ids.includes(a.id);
                    // 미할당(빈 배열)이면 기본 작성자(첫 항목)를 선택된 것처럼 표시 — 리더뷰 fallback 과 일치
                    const showSelected = actualSelected || (ids.length === 0 && i === 0);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`${styles.authorChip}${showSelected ? ` ${styles.authorChipSelected}` : ""}`}
                        onClick={() => {
                          const atLeastOne = language === "en"
                            ? "At least one author is required."
                            : "작성자는 최소 한 명이 필요합니다.";
                          if (actualSelected) {
                            const next = ids.filter((x) => x !== a.id);
                            if (next.length === 0) {
                              // 마지막 작성자 해제 → 유효 작성자 0 방지 (리더뷰는 기본 작성자로 fallback)
                              showToast(atLeastOne, "info");
                              return;
                            }
                            updateField("author_ids", next);
                          } else if (showSelected) {
                            // ids 빈 상태에서 fallback 표시된 기본 작성자 해제 시도 — 유효 작성자 0 이 되므로 차단
                            showToast(atLeastOne, "info");
                          } else {
                            updateField("author_ids", [...ids, a.id]);
                          }
                        }}
                      >
                        {a.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatar} alt="" className={styles.authorChipAvatar} />
                        ) : (
                          <span className={styles.authorChipAvatar} aria-hidden>{(a.name || "?").charAt(0)}</span>
                        )}
                        <span>{a.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className={styles.authorEmpty}>
                    {language === "en" ? "Add authors in settings." : "설정에서 작성자를 추가하세요."}
                  </span>
                )}
              </div>
            </div>
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
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              style={{ transform: optionalOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>

          {/* 시리즈 — 항상 표시 (optionalContent 바깥이라 직접 padding 부여) */}
          <div style={{ padding: "0 var(--spacing-md) var(--spacing-md)" }}>
            <div className={es.row}>
              <div className={es.field} onFocusCapture={() => { if (!optionalOpen) setOptionalOpen(true); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <label className={es.fieldLabel}>{te("series")}</label>
                  <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                    {te("seriesManage")}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {seriesSelectMode === "custom" ? (
                    <motion.div
                      key="custom"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <SeriesInlineEditor
                        series={null}
                        categories={categories}
                        onSave={handleSeriesCreated}
                        onCancel={() => setSeriesSelectMode("existing")}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="existing"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <Select
                        width="full"
                        value={form.series_id ?? ""}
                        options={[
                          { value: "", label: te("seriesNone") },
                          { value: "__custom__", label: te("customSeries") },
                          ...seriesList.map((s) => ({ value: s.id, label: `${s.title} (${s.post_count ?? 0})` })),
                        ]}
                        onChange={(v) => {
                          if (v === "__custom__") {
                            setSeriesSelectMode("custom");
                            updateField("series_id", null);
                            return;
                          }
                          setSeriesSelectMode("existing");
                          updateField("series_id", v || null);
                          // 시리즈 카테고리를 글에 상속하지 않음 — 글은 각자 카테고리를 가진다(도출 모델)
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div ref={optionalContentRef} className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            <div ref={optionalInnerRef} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {/* 줄1: [시리즈 순서(1열) + 관련 프로젝트(2열)] — 시리즈 없으면 관련 프로젝트 단독 */}
              {(() => {
                const seriesOrderEl = form.series_id ? (
                  seriesPostsLoading ? (
                    <div className={es.field} style={{ opacity: 0.5 }}>
                      <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                      <div className={styles.seriesOrderSkeleton}>
                        {[1, 2, 3].map((i) => (
                          <span key={i} className={styles.seriesOrderSkeletonRow} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SortOrderDragList
                      label={te("seriesOrder")}
                      currentTitle={form.title || te("currentPost")}
                      currentOrder={form.series_order || 1}
                      // SortOrderDragList 의 sort_order 필드명에 맞게 매핑
                      otherItems={seriesPosts
                        .filter((p) => p.id !== post?.id)
                        .map((p) => ({ id: p.id, title: p.title, sort_order: p.series_order }))
                        .sort((a, b) => a.sort_order - b.sort_order)}
                      onChange={(newOrder, otherUpdates) => {
                        updateField("series_order", newOrder);
                        if (otherUpdates.length) {
                          setSeriesPosts((prev) => prev.map((p) => {
                            const u = otherUpdates.find((x) => x.id === p.id);
                            return u ? { ...p, series_order: u.sort_order } : p;
                          }));
                          otherUpdates.forEach((u) => {
                            fetch(`/api/posts/${u.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ series_order: u.sort_order }),
                            });
                          });
                        }
                      }}
                    />
                  )
                ) : null;

                const relatedWorksEl = (
                  <div className={es.field}>
                    <div className={es.fieldLabelRow}>
                      <label className={es.fieldLabel}>{te("relatedWorks")}</label>
                      {(form.related_work_ids ?? []).length === 0 && (
                        <span className={es.fieldHint}>{te("relatedWorksEmpty")}</span>
                      )}
                    </div>
                    <RelationPicker
                      items={allWorks}
                      selectedIds={form.related_work_ids ?? []}
                      onChange={(ids) => updateField("related_work_ids", ids)}
                      getId={(w) => w.id}
                      getTitle={(w) => w.title}
                      getMeta={(w) => w.year}
                      getThumb={(w) => w.image}
                      getStatus={(w) => (w.published ? "published" : "draft")}
                      searchPlaceholder={te("relatedWorksSearch")}
                      searchInputPlaceholder={te("relatedWorksSearchInput")}
                      noResultsText={te("relatedWorksNoResults")}
                    />
                  </div>
                );

                return seriesOrderEl ? (
                  <div className={es.row}>
                    {seriesOrderEl}
                    {relatedWorksEl}
                  </div>
                ) : (
                  relatedWorksEl
                );
              })()}
              {/* 줄2: [요약 + 태그] (1열 / 2열) */}
              <div className={es.row}>
                <div className={es.field} data-seo="excerpt">
                  <label className={es.fieldLabel}>{te("excerpt")}</label>
                  <Textarea
                    textareaClassName={styles.excerptInput}
                    value={form[excerptKey]}
                    onChange={(v) => updateField(excerptKey, v)}
                    placeholder={te("excerptPlaceholder")}
                    rows={2}
                    maxHint="basic"
                  />
                </div>
                <div className={es.field} data-seo="tags">
                  <label className={es.fieldLabel}>{te("tags")}</label>
                  <div>
                    <div className={styles.tagInputRow}>
                      <Select
                        combobox
                        value=""
                        onChange={() => {}}
                        inputValue={tag.input}
                        onInputChange={tag.setInput}
                        onAdd={(v) => addTagWithPreset(v)}
                        options={allTagSuggestions
                          .filter((t) => !form.tags.includes(t))
                          .map((t) => ({ value: t, label: t }))}
                        placeholder={te("tagsPlaceholder")}
                      />
                      <button type="button" className={styles.tagAddBtn} onClick={() => addTagWithPreset()} disabled={!tag.input.trim()}>+</button>
                    </div>
                    {/* 태그별 설명 — 공통 TagNotesEditor (drag-reorder + ko/en + add/cancel 애니메이션) */}
                    <TagNotesEditor
                      items={form.tags}
                      notes={form.tag_notes ?? {}}
                      onItemsChange={(next) => updateField("tags", next)}
                      onNotesChange={(next) => updateField("tag_notes", next)}
                      prefix="#"
                      notePlaceholder={te("tagNotePlaceholder")}
                      addLabel={te("tagNoteAddPlaceholder")}
                      cancelLabel={te("tagNoteCancel")}
                      editLabel="편집"
                      removeTitle="태그 제거"
                    />
                  </div>
                </div>
              </div>
              {/* 줄3: [커버이미지 라벨/thumb/버튼(1열)] + [GitHub URL(2열)]
                  picker 본체는 row 밖 full-width 로 렌더 → 좁은 column 에 squeeze 되거나
                  optional wrapper 에 닿는 문제 회피 */}
              <div className={es.row}>
                <CoverImageField
                  value={form.cover_image}
                  onChange={(url) => {
                    updateField("cover_image", url);
                    if (!url) setShowCoverPicker(false);
                  }}
                  label={te("coverImage")}
                  removeLabel={te("remove")}
                  uploadLabel={te("upload")}
                  chooseLabel={te("chooseCover")}
                  closeLabel={te("closePicker")}
                  onUpload={handleCoverUpload}
                  pickerOpen={showCoverPicker}
                  pickerClosing={closingCoverPicker}
                  onPickerToggle={() => {
                    if (showCoverPicker && !closingCoverPicker) {
                      requestCloseCoverPicker();
                    } else if (!showCoverPicker) {
                      setShowCoverPicker(true);
                    }
                  }}
                  seoId="cover"
                />
                {/* 2열: GitHub URL */}
                <div className={es.field}>
                  <label className={es.fieldLabel}>GitHub URL</label>
                  <input
                    className={es.fieldInput}
                    type="url"
                    value={form.github_url}
                    onChange={(e) => updateField("github_url", e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              {/* picker — full-width (col 안에 두면 좁은 폭에 squeeze + wrapper 와 닿음).
                  cover_image 세팅 후에도 유지 — AI auto-save 시 picker 가 사라지면 재생성 불가능 */}
              {showCoverPicker && (
                <CoverImagePicker
                  onSelect={(url) => {
                    updateField("cover_image", url);
                    // 선택 직후엔 닫는 애니메이션 없이 즉시 unmount (커버 이미지 미리보기로 전환)
                    setShowCoverPicker(false);
                    setClosingCoverPicker(false);
                  }}
                  onClose={requestCloseCoverPicker}
                  closing={closingCoverPicker}
                  // AI 생성 즉시 form 에 반영 (picker 유지) — 사용자가 "사용" 안 눌러도 자동저장
                  onAutoSave={(url) => updateField("cover_image", url)}
                  currentUrl={form.cover_image}
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
            <Tooltip content="단축키 및 기능 안내" placement="top">
              <button
                type="button"
                className={styles.editorHelpBtn}
                onClick={() => openModal(<ShortcutsModalContent />, { id: "shortcuts-help", header: { title: "단축키 및 기능 안내" }, closeButton: true })}
              >
                ?
              </button>
            </Tooltip>
          </div>
          <Checkbox
            checked={editorHtmlMode}
            onChange={() => plateRef.current?.toggleHtmlMode()}
            shape="square"
            label="HTML"
          />
        </div>

        <div className={styles.editorWrap} data-required="content">
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
            onHtmlModeChange={setEditorHtmlMode}
          />
        </div>
      </div>

      {/* ── 첨부 이미지 패널 (richtext 단일) ── */}
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
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onBulkInsert={(items) => {
              // 선택 항목을 본문에 복제 삽입 (이미 첨부된 이미지여도 같은 걸 또 추가)
              for (const it of items) {
                if (isVideoMedia(it.mediaType, it.url)) plateRef.current?.insertMediaByUrl(it.url);
                else plateRef.current?.insertImageByUrl(it.url);
              }
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onReinsert={(url, mediaType) => {
              if (isVideoMedia(mediaType, url)) plateRef.current?.insertMediaByUrl(url);
              else plateRef.current?.insertImageByUrl(url);
            }}
            onRemoveDetached={(url) => {
              plateRef.current?.removeDetached(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
          />
        </div>

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (wrapper 불필요) */}
      <SeoChecklist
        data={{
          title: form[titleKey] || form.title,
          slug: form.slug,
          excerpt: form[excerptKey] || form.excerpt,
          cover: form.cover_image,
          category: form.category,
          tagsCount: form.tags?.length ?? 0,
        }}
        onItemClick={handleSeoItemClick}
      />

    </AdminEditorShell>
    {/* 초안 복원 모달 확인 동안 사용자 인터랙션 차단 — 모달이 늦게 떠도 그 사이 편집/이동 못하게 */}
    {!revisionsLoaded && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-top)",
          background: "transparent",
          cursor: "wait",
        }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />
    )}
</>
  );
}
