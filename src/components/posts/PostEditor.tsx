"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useShallowStable } from "@/hooks/useShallowStable";
import type { UploadResponse } from "@/types";
import { PREVIEW_KEY } from "@/constants";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ExternalLink, AlertTriangle } from "@/components/icons";
import { mdToRichHtml } from "./mdToRichHtml";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { showToast } from "@/stores/toastStore";
import { focusFirstMissingField } from "@/utils/focusFirstMissing";
import { stripHtml } from "@/utils/htmlUtils";
import type { Post, PostFormData, PostMetaForm, Series } from "@/types/post";

import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import { findCategoryNode, toCategoryOptions, flattenCategories } from "@/lib/categoryTree";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";

import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useEditorDraft, draftKey } from "@/hooks/useEditorDraft";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useEditorTranslation } from "@/hooks/useEditorTranslation";
import PostEditorOptionalFields from "./postEditor/PostEditorOptionalFields";
import { usePostRevisions } from "./postEditor/usePostRevisions";
import { useTemplateInsert } from "./postEditor/useTemplateInsert";
import SeoChecklist from "@/components/admin/SeoChecklist";

import CoverBanner from "@/components/admin/CoverBanner";

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

/** 폼에서 본문 두 필드를 뺀다 */
function omitContent({ content: _content, content_en: _contentEn, ...meta }: PostFormData): PostMetaForm {
  return meta;
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

import type { PlateEditorHandle } from "./PlateEditor";
import { useEditorImages } from "./plate/useEditorImages";
import { isVideoMedia, _postLinkCategory, _postLinkTags, _postLinkExcludeId } from "./plate/utils";

interface PostEditorProps {
  post?: Post;
}

import Pressable from "@/components/ui/Pressable";
import AuthorAvatar from "@/components/ui/AuthorAvatar";
import { CodedError, errorFromBody, errorText } from "@/lib/apiError";
import { sendAction, sendActions } from "@/lib/sendAction";

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
  const { t, language } = useLanguage();
  const config = useSiteConfig();
  const mediaLimits = (config.media as Record<string, unknown>)?.limits as Record<string, number> | undefined;
  const isEdit = !!post;
  const categories = useCategories();
  const serviceStatus = useServiceStatus();
  // 카테고리 ko 또는 en 값으로 매칭 — 2단계 트리 전체(대분류/소분류)에서 탐색
  const findCat = useCallback((val: string): BilingualCategory | undefined =>
    findCategoryNode(categories, val) ?? undefined, [categories]);
  // 선택 가능한(= Select 옵션에 뜨는) 카테고리는 leaf 뿐. 대분류(children 보유)는 배정 대상 아님.
  const isManagedCat = useCallback((val: string) => {
    const c = findCat(val);
    return !!c && !(c.children?.length);
  }, [findCat]);
  // posts.category 기본값·fallback 은 항상 leaf 여야 함 (대분류 값 저장 방지)
  const firstLeafKo = useMemo(() => flattenCategories(categories).find((c) => !c.children?.length)?.ko ?? "", [categories]);

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

  /* 본문만 바뀐 렌더에서는 같은 객체를 돌려준다 — 본문과 상관없는 섹션의 의존성으로 쓴다(#877) */
  const metaForm = useShallowStable(omitContent(form));

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

  const { openModal, closeModal } = useModalStore();
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
    t,
    i18nPrefix: "admin.posts.editor",
    fieldMapper: postFieldMapper,
    allFieldKeys: POST_FIELD_KEYS,
    onUpdate: (patch) => setForm((prev) => ({ ...prev, ...patch })),
    onStatus: (msg, type) => { setStatus(msg); setStatusType(type); },
    onError: setError,
    // 콘텐츠 작성 기본 언어로 편집 시작 (en 기본이면 영문 탭부터)
    initialLang: config.metadata.defaultLanguage as "ko" | "en",
  });

  /* 편집 화면 문구는 관리자 화면 언어를 따른다. 예전에는 편집 중인 글의 언어 탭(KO/EN)을 따라, 영어 화면에서
     한국어 글을 고치면 라벨·단추가 한국어로 나왔다. 글의 언어는 KO/EN 탭이 보여 준다. */
  const te = useCallback((key: string) => t(`admin.posts.editor.${key}`), [t]);
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
  const [editorImages, setEditorImages] = useEditorImages();
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
  }, [editorLang, form.content_type, setEditorImages]);
  const [slugManual, setSlugManual] = useState(isEdit);
  // 커버 배너의 페이지 이모지/아이콘 — form.icon 으로 저장(DB posts.icon)
  const initialFormRef = useRef(form);
  // 최신 form 스냅샷 — 이탈(unmount/unload) 핸들러가 stale closure 없이 현재 값을 읽게.
  const formRef = useRef(form);
  useSyncRef(formRef, form);
  // 수동 저장/발행이 끝났으면 이탈저장(draft) 을 발동하지 않음 — 발행글을 draft 로 되돌리는 사고 방지.
  const finalizedRef = useRef(false);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  // 새 글도 DB revision 저장을 위해 임시 ID 사용
  const draftEntityId = post?.id ?? "draft-new-post";
  const { revisions: dbRevisions, loaded: revisionsLoaded, latestSnapshot, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions<PostFormData>({
    entityType: "post",
    entityId: draftEntityId,
  });

  // 교차 기기 최신 로딩 — 서버 최신 리비전이 마지막 저장본(updated_at)보다 실제로 더 나중일 때만 복원.
  // updated_at 은 저장 시 명시 갱신되고 저장 시 옛 revision 은 dismiss 되므로, 저장본보다 오래된
  // stale 리비전이 내용을 되돌리는 사고를 이 가드가 막는다. (편집 중이면 useEditorDraft 가 추가로 차단.)
  const serverDraft = useMemo(() => {
    if (!latestSnapshot) return null;
    const savedContentAt = post?.updated_at ? new Date(post.updated_at).getTime() : 0;
    if (latestSnapshot.savedAt <= savedContentAt) return null;
    return latestSnapshot;
  }, [latestSnapshot, post?.updated_at]);

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
    // 서버(cross-device) 자동복원 — 다른 기기/브라우저에서 이어 쓰기. serverDraft 는 위에서
    // savedAt>updated_at 가드를 통과한 리비전만(= 저장본보다 실제로 더 나중). 로드 후 미편집(pristine)일
    // 때만 적용되므로 지금 작업분을 덮지 않는다. localStorage(같은 기기 백업)는 그대로 유지.
    serverDraft,
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

  const updateTags = useCallback((tags: string[]) => updateField("tags", tags), [updateField]);
  const tag = useTagInput(form.tags, updateTags);
  // 태그 추가 시 site.config 의 tagDescriptions 프리셋 자동 채움 (ko 만, en 은 빈값)
  // 기존 태그 autocomplete suggestions — 모든 post 의 distinct tag
  const [allTagSuggestions, setAllTagSuggestions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setAllTagSuggestions(d.tags ?? []))
      .catch(() => setAllTagSuggestions([]));
  }, []);

  const { seriesList, seriesPosts, setSeriesPosts, seriesPostsLoading, refetchSeries, reloadSeriesPosts } = usePostSeries(
    form.series_id,
    isEdit,
    post?.id,
    (order) => updateField("series_order", order),
  );

  /* 시리즈 안 다른 글의 바뀐 순서는 들고 있다가 이 글을 저장할 때 보낸다. 예전에는 바로 보내서, 저장하지 않고
     나가면 이 글과 다른 글의 번호가 겹쳤다(#873). 다른 시리즈로 바꾸면 이전 시리즈의 것은 버린다 */
  const pendingSeriesOrderRef = useRef<{ seriesId: string | null; orders: Map<string, number> }>({ seriesId: null, orders: new Map() });
  const queueSeriesOrder = useCallback((updates: { id: string; sort_order: number }[]) => {
    const seriesId = form.series_id ?? null;
    if (pendingSeriesOrderRef.current.seriesId !== seriesId) pendingSeriesOrderRef.current = { seriesId, orders: new Map() };
    for (const u of updates) pendingSeriesOrderRef.current.orders.set(u.id, u.sort_order);
  }, [form.series_id]);

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
      return runVideoUpload(file, mediaLimits, t("editor.videoUploadTitle"));
    }

    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    // 보안 + 형식별 크기 제한 검증 (설정 값 사용). 압축 가능 이미지는 일단 통과.
    const sizeError = validateFileSize(file, mediaLimits);
    if (sizeError) throw sizeError;

    // 이미지는 압축 파이프라인 적용.
    const payload = await compressImage(file);

    // 압축 후에도 한도 초과면 reject (예: 최저 품질로도 limit 못 맞춤)
    const postError = validateFileSize(payload, mediaLimits, { skipCompressibleBypass: true });
    if (postError) throw postError;

    const formData = new FormData();
    formData.append("file", payload);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    // 빈/비JSON 응답(413·게이트웨이 오류 등)에서도 의미 있는 에러를 던지도록 방어적 파싱
    const data: UploadResponse = await res.json().catch(() => ({}));

    // 거절 사유는 코드로 싣는다 — 오류 창(uploadErrorText)이 화면 언어 문구로 바꾼다
    if (!res.ok) throw errorFromBody(data, res.status);
    if (!data.url) throw new CodedError("Upload response has no URL");
    return data.url;
  }, [mediaLimits, t]);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/mp4,video/webm,video/quicktime";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        updateField("cover_image", await handleImageUpload(file));
      } catch (err) {
        /* 예전에는 잡지 않아 실패해도 아무 표시가 없었다. 사유는 화면 언어로(#862) */
        showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
      }
    };
    input.click();
  }, [handleImageUpload, updateField, t]);

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
              desc={te("scheduledPastConfirm")}
              confirmText={te("publishNow")}
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
          /* "왜" 는 코드로 온다(본인 글만·세션 갱신 필요·제목 길이 등) — 화면 언어 문구로(#862) */
          setError(errorText(data, t, te("saveFailed")));
          return;
        }

        // 저장 성공 — 반환된 version 으로 base 갱신 (연속 저장/이 세션 유지 대비)
        if (typeof data.version === "number") baseVersionRef.current = data.version;

        if (!savedId.current) savedId.current = data.id;
        // 수동 저장 성공 → 이탈저장(draft) 발동 차단 (발행글이 draft 로 되돌아가는 것 방지).
        finalizedRef.current = true;

        // 관계 동기화 — 별도 endpoint. 글은 이미 저장됐으므로 실패해도 저장은 끝내고 알린다(#868)
        if (savedId.current && related_work_ids) {
          await sendAction(`/api/admin/posts/${savedId.current}/related-works`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workIds: related_work_ids }),
          }, t, te("relatedWorksFailed"));
        }

        // 시리즈 안 다른 글의 순서 — 이 글을 저장한 뒤에 보낸다(#873). 실패하면 알리고 서버 순서로 다시 받는다
        const pendingOrder = pendingSeriesOrderRef.current;
        if (pendingOrder.orders.size > 0 && pendingOrder.seriesId === (form.series_id ?? null)) {
          const updates = [...pendingOrder.orders];
          pendingSeriesOrderRef.current = { seriesId: pendingOrder.seriesId, orders: new Map() };
          const saved = await sendActions(
            updates.map(([id, order]) => ({
              input: `/api/posts/${id}`,
              init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ series_order: order }) },
            })),
            t, t("admin.common.reorderFailed"),
          );
          if (saved < updates.length) reloadSeriesPosts();
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

  const { handleRestoreRevision, handleLoadRevisionDetail, handleDeleteRevision, handleRevert } =
    usePostRevisions({
      setForm,
      revisions: { revisions: dbRevisions, loadRevisionSnapshot, deleteRevision },
      markBaseline,
      seriesList,
      snapshotMeta: postSnapshotMeta,
      initialFormRef,
      authorNameById,
      te,
      setStatus,
      setStatusType,
      setStatusTimestamp,
    });

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

  const handleInsertTemplate = useTemplateInsert({ editorLang, formRef, updateField, te });

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  // 작성자 칩 = 현재 로그인 사용자(항상 표시, 설정 authors 비어도) + 설정 authors(중복 제거).
  const authorChips = useMemo(() => {
    const configAuthors = (config.authors ?? []) as Array<{ id: string; name: string; avatar?: string }>;
    return currentUserAuthor
      ? [currentUserAuthor, ...configAuthors.filter((a) => a.id !== currentUserAuthor.id)]
      : configAuthors;
  }, [config.authors, currentUserAuthor]);

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

  /* 본문과 상관없는 섹션은 JSX 를 메모해 두고, 쓰는 값이 바뀔 때만 다시 만든다(#877). 본문을 칠 때마다 폼이 바뀌어
     편집 화면 전체를 다시 그렸다. 폼 값은 본문을 뺀 metaForm 으로 읽어, 본문만 바뀐 렌더에서는 의존성이 그대로다 */
  const metaSection = useMemo(() => (
    <div className={styles.meta}>
      {/* title + slug + 예약 발행 — 컴팩트 그룹 (gap 작게) */}
      <div className={styles.titleGroup}>
        <div className={es.field} data-seo="title" data-required="title">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--spacing-xs)" }}>
            <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${titleFieldError ? ` ${es.fieldLabelError}` : ""}`}>{te("title")}</label>
            <span style={{ fontSize: "var(--font-size-hint)", fontVariantNumeric: "tabular-nums", color: metaForm[titleKey].length >= POST_TITLE_MAX ? "var(--text-accent)" : "var(--text-muted)" }}>
              {metaForm[titleKey].length}/{POST_TITLE_MAX}
            </span>
          </div>
          <input
            className={`${es.titleInput}${titleFieldError ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={metaForm[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={te("titlePlaceholder")}
            maxLength={POST_TITLE_MAX}
          />
        </div>

        <div className={es.row}>
          <div className={es.field} style={{ gridColumn: "1 / -1" }} data-seo="slug" data-required="slug">
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
              <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (!metaForm.slug.trim() || validateSlug(metaForm.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{te("slug")}</label>
              {metaForm.slug.trim() && validateSlug(metaForm.slug) && (
                <span className={styles.slugHint}>{te(`slugError.${validateSlug(metaForm.slug)}`)}</span>
              )}
            </div>
            <input
              className={`${es.fieldInput}${showErrors && (!metaForm.slug.trim() || validateSlug(metaForm.slug)) ? ` ${es.fieldInputError}` : ""}`}
              type="text"
              value={metaForm.slug}
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
            <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !metaForm.category.trim() ? ` ${es.fieldLabelError}` : ""}`}>{te("category")}</label>
            {(() => {
              const matched = isManagedCat(metaForm.category);
              const isCustom = categoryCustomMode || (!!metaForm.category && !matched);
              const selectValue = isCustom ? "__custom__" : (matched ? (findCat(metaForm.category)?.ko ?? metaForm.category) : firstLeafKo);
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
                      value={metaForm.category}
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
                  const ids = metaForm.author_ids ?? [];
                  const actualSelected = ids.includes(a.id);
                  // 미할당(빈 배열)이면 기본 작성자(첫 항목)를 선택된 것처럼 표시 — 리더뷰 fallback 과 일치
                  const showSelected = actualSelected || (ids.length === 0 && i === 0);
                  return (
                    <Pressable
                      key={a.id}
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
                      <AuthorAvatar value={a.avatar} name={a.name} size={22} className={styles.authorChipAvatar} />
                      <span>{a.name}</span>
                    </Pressable>
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
      <PostEditorOptionalFields
        form={metaForm}
        setForm={setForm}
        updateField={updateField}
        te={te}
        config={config}
        post={post}
        series={{ seriesList, seriesPosts, setSeriesPosts, seriesPostsLoading }}
        onReorderSeriesPosts={queueSeriesOrder}
        allWorks={allWorks}
        allTagSuggestions={allTagSuggestions}
        categories={categories}
        excerptKey={excerptKey}
        tag={tag}
        optionalOpen={optionalOpen}
        setOptionalOpen={setOptionalOpen}
        optionalInnerRef={optionalInnerRef}
        optionalContentRef={optionalContentRef}
        seriesSelectMode={seriesSelectMode}
        setSeriesSelectMode={setSeriesSelectMode}
        onSeriesCreated={handleSeriesCreated}
        onCoverUpload={handleCoverUpload}
      />
    </div>
  ), [
    allTagSuggestions, allWorks, authorChips, categories, categoryCustomMode, config, excerptKey, findCat, firstLeafKo,
    handleCoverUpload, handleSeriesCreated, isManagedCat, language, metaForm, optionalOpen, post, queueSeriesOrder,
    seriesList, seriesPosts, seriesPostsLoading, seriesSelectMode, setSeriesPosts, showErrors, tag, te, titleFieldError,
    titleKey, updateField,
  ]);

  const editorHeader = useMemo(() => (
    <div className={es.editorHeader}>
      <div className={styles.editorHeaderLeft}>
        <span className={`${styles.editorLabel}${contentFieldError ? ` ${styles.editorLabelError}` : ""}`}>{te("content")}</span>
        <Pressable
          className={styles.templateBtn}
          onClick={handleInsertTemplate}
        >
          {te("insertTemplate")}
        </Pressable>
        <Tooltip content={te("shortcutsGuide")} placement="top">
          <Pressable
            className={styles.editorHelpBtn}
            onClick={() => openModal(<ShortcutsModalContent />, { id: "shortcuts-help", header: { title: te("shortcutsGuide") }, closeButton: true })}
          >
            ?
          </Pressable>
        </Tooltip>
      </div>
      <Checkbox
        checked={editorHtmlMode}
        onChange={() => plateRef.current?.toggleHtmlMode()}
        shape="square"
        label="HTML"
      />
    </div>
  ), [contentFieldError, editorHtmlMode, handleInsertTemplate, openModal, te]);

  const imagesSection = useMemo(() => (
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
  ), [editorImages, handleImageUpload, setEditorImages]);

  const seoChecklist = useMemo(() => (
    <SeoChecklist
      data={{
        title: metaForm[titleKey] || metaForm.title,
        slug: metaForm.slug,
        excerpt: metaForm[excerptKey] || metaForm.excerpt,
        cover: metaForm.cover_image,
        category: metaForm.category,
        tagsCount: metaForm.tags?.length ?? 0,
      }}
      onItemClick={handleSeoItemClick}
    />
  ), [excerptKey, handleSeoItemClick, metaForm, titleKey]);

  /* 커버 배너 + 페이지 이모지 — topBar 위 최상단(전역 nav 바로 아래) */
  const coverBanner = useMemo(() => (
    <CoverBanner
      cover={metaForm.cover_image}
      onCoverChange={(url) => updateField("cover_image", url)}
      onUpload={handleCoverUpload}
      emoji={metaForm.icon || null}
      onEmojiChange={(e) => updateField("icon", e ?? "")}
      position={metaForm.cover_position}
      zoom={metaForm.cover_zoom}
      onPositionChange={(n) => updateField("cover_position", n)}
      onZoomChange={(n) => updateField("cover_zoom", n)}
    />
  ), [handleCoverUpload, metaForm.cover_image, metaForm.cover_position, metaForm.cover_zoom, metaForm.icon, updateField]);

  const pinToggle = useMemo(() => (
    <Checkbox
      checked={metaForm.is_pinned}
      onChange={(v) => updateField("is_pinned", v)}
      shape="square"
      label={te("pinLabel")}
    />
  ), [metaForm.is_pinned, te, updateField]);

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
      topBarFirstRowExtra={pinToggle}
      coverSlot={coverBanner}
    >
      {presenceOthers > 0 && (
        <div className={styles.presenceBanner} role="status">
          <AlertTriangle size={14} />
          <span>{language === "ko"
            ? "다른 기기·탭에서 이 글을 편집 중이에요. 동시에 저장하면 충돌할 수 있어요."
            : "This post is being edited on another device or tab — saving at the same time may conflict."}</span>
        </div>
      )}
      {metaSection}

      <div className={styles.editorSection}>
        {editorHeader}

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
      {imagesSection}

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (wrapper 불필요) */}
      {seoChecklist}

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
