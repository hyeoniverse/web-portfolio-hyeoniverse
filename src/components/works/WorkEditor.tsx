"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import type { LocalizedText } from "@/types/common";
import { PREVIEW_KEY } from "@/constants";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { mdToRichHtml } from "@/components/posts/mdToRichHtml";
import { ChevronLeft, ChevronRight, Plus, Star, Check, X, User, Maximize2, FileText } from "@/components/icons";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { isOfficeDocUrl, officeDocKind } from "@/lib/officeViewer";
import { GalleryNarrationPanel, NarrationBadge, useNarrationActions } from "./GalleryNarrationEditor";
import { useBenchSplit } from "./useBenchSplit";
import { GALLERY_NOTES_DROPPED_HEADER } from "@/lib/api/galleryNotesColumn";
import type { GalleryNote, GalleryNotes } from "@/data/projects";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { focusFirstMissingField } from "@/utils/focusFirstMissing";
import { generateSlug, validateSlug } from "@/utils/postSlug";
import Chip, {} from "@/components/ui/Chip";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import SeoChecklist, { type SeoCheckId } from "@/components/admin/SeoChecklist";
import "@/components/admin/seoFlash.css";
import { flashSeoField } from "@/components/admin/seoFlash";
import type { Work, WorkFormData } from "@/types/work";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useEditorLeaveGuard } from "@/hooks/useEditorLeaveGuard";
import { useEditorDraft } from "@/hooks/useEditorDraft";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useTagInput } from "@/hooks/useTagInput";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { autoTranslate } from "@/utils/autoTranslate";
import { WORK_TEMPLATES, TECH_PRESETS, type WorkTemplate } from "@/data/workTemplates";
import { getTechIcon, normalizeTechName, getTechAliases } from "@/data/techIcons";
import { showToast } from "@/stores/toastStore";
import { workToFormData, defaultForm } from "@/utils/workFormUtils";
import { restoreSavedForm } from "@/utils/restoreSavedForm";
import { stripHtml } from "@/utils/htmlUtils";
import { isVideoMedia } from "@/components/posts/plate/utils";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type {} from "@/data/profile";
import RelationPicker from "@/components/admin/RelationPicker";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverBanner from "@/components/admin/CoverBanner";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { List } from "@/app/admin/(dashboard)/components";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import { useMyRole } from "@/hooks/useMyRole";
import { useFocusOnceWhenReady } from "@/hooks/useFocusOnceWhenReady";
import AuthorAvatar from "@/components/ui/AuthorAvatar";
import styles from "./WorkEditor.module.css";
import type { PlateEditorHandle } from "@/components/posts/PlateEditor";
import { useEditorImages } from "@/components/posts/plate/useEditorImages";
import Pressable from "@/components/ui/Pressable";
import { ROLE_PRESETS_KO, ROLE_PRESETS_EN, useRoleMultiPicker } from "./workEditor/roleMultiPicker";
import { TeamMemberCard } from "./workEditor/TeamMemberCard";
import { CategoryMultiPicker, type WorksCategory } from "./workEditor/CategoryPicker";
import { SubtitleInput } from "./workEditor/SubtitleInput";
import { workSnapshotMeta } from "./workEditor/workSnapshotMeta";
import { parseYearAsPeriod, serializePeriodAsYear } from "./workEditor/periodFormat";
import { CodedError, errorFromBody, errorFromResponse, errorText } from "@/lib/apiError";
import { tryRequest } from "@/lib/sendAction";

const Editor = dynamic(() => import("@/components/posts/PlateEditor"), {
  ssr: false,
});
const ImagePanel = dynamic(
  () => import("@/components/posts/PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

interface WorkEditorProps {
  work?: Work;
}

/** 파일이 들어 있는 끌기인가 — 칸을 끌어 차례를 바꾸는 것과 가른다 */
const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { t, tLang, language } = useLanguage();
  const { openModal, closeAll } = useModalStore();
  const isEdit = !!work;
  const serviceStatus = useServiceStatus();
  // 콘텐츠 작성 기본 언어 — nature/categories 필수 항목 + 초기 편집 언어의 기준 (방문자 언어와 무관)
  const primaryLang = useSiteConfig().metadata.defaultLanguage as "ko" | "en";

  const [editorLang, setEditorLang] = useState<"ko" | "en">(primaryLang);
  // 본문 에디터 ref + 첨부 이미지 패널 (Posts editor 와 동일 패턴)
  const plateRef = useRef<PlateEditorHandle>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editorImages, setEditorImages] = useEditorImages();
  const [editorHtmlMode, setEditorHtmlMode] = useState(false);
  // 에디터 준비될 때까지 polling 으로 이미지 목록 동기화. 언어 전환 시 에디터가 remount(key=editorLang) 되므로 재동기화.
  useEffect(() => {
    setEditorImages([]);
    let cancelled = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const imgs = plateRef.current?.getImages();
      if (!cancelled && imgs !== undefined) {
        setEditorImages(imgs);
        if (imgs.length > 0 || attempts >= 10) clearInterval(poll);
      }
    }, 300);
    return () => { cancelled = true; clearInterval(poll); };
  }, [editorLang, setEditorImages]);
  // 필수/선택 그룹 토글 — Posts editor 와 동일 패턴
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  // slug — 사용자가 직접 수정한 적 있으면 manual 모드로 (제목 변경 시 auto-regenerate 안 함)
  const [slugManual, setSlugManual] = useState(!!work?.slug);

  /* 편집 화면 문구는 관리자 화면 언어를 따른다(편집 중인 작업물의 언어 탭이 아니라). 글 편집기와 같다. */
  const tw = useCallback((key: string) => t(`admin.works.editor.${key}`), [t]);
  const [translating, setTranslating] = useState(false);

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return defaultForm;
    const f = workToFormData(work);
    // 레거시 md 글은 열 때 richtext 로 1회 변환 후 richtext 로 고정 (토글 제거)
    if (f.content_type === "markdown") {
      return {
        ...f,
        content_ko: mdToRichHtml(f.content_ko),
        content_en: mdToRichHtml(f.content_en),
        content_type: "richtext",
      };
    }
    return f;
  });

  // title 변경 시 slug auto-generate (manual 모드 아닐 때만). form 선언 이후에 위치
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  const initialFormRef = useRef(form);
  /* 처음 값은 한 번만 문자열로 바꿔 둔다. 본문까지 든 폼이라 글자마다 두 번 바꾸면 그만큼 입력이 늦다(#850) */
  const [initialJson] = useState(() => JSON.stringify(form));
  const isDirty = useMemo(() => JSON.stringify(form) !== initialJson, [form, initialJson]);

  const { revisions: dbRevisions, loaded: revisionsLoaded, latestSnapshot, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
  });
  // 새 작업물이면 초안 확인이 끝난 뒤 제목 칸에 한 번 포커스를 준다(#897)
  useFocusOnceWhenReady(titleInputRef, !isEdit && revisionsLoaded);

  // 교차 기기 최신 로딩 — 서버 최신 리비전이 마지막 저장본(updated_at)보다 실제로 더 나중일 때만 복원.
  // updated_at 은 저장 시 명시 갱신되고 저장 시 옛 revision 은 dismiss 되므로, 저장본보다 오래된
  // stale 리비전이 내용을 되돌리는 사고를 이 가드가 막는다. (편집 중이면 useEditorDraft 가 추가로 차단.)
  const serverDraft = useMemo(() => {
    if (!latestSnapshot) return null;
    const savedContentAt = work?.updated_at ? new Date(work.updated_at).getTime() : 0;
    if (latestSnapshot.savedAt <= savedContentAt) return null;
    return latestSnapshot;
  }, [latestSnapshot, work?.updated_at]);

  // draft 복원 모달 제거 — autosave background 동작.
  // 복원은 revision history 패널에서 명시적으로 (markBaseline 으로 baseline 정합화).
  // 새 작품 (work.id 없음) 은 async fetch 없음 → 즉시 ready. 기존은 fetch 완료 시 true.
  const [initialLoadsReady, setInitialLoadsReady] = useState(!work?.id);

  // 정렬 list — 다른 작품들 (현재 편집중인 작품 제외)
  const [otherWorks, setOtherWorks] = useState<Array<{ id: string; title: string; sort_order: number }>>([]);
  /* 순서 목록의 이 작업물 자리 — 값이 아니라 앞선 작업물 수로 정한다. 휴지통으로 간 작업물이 빈 번호를 남기면
     값(4)과 자리(3번째)가 어긋나기 때문이다(#873). 새 작업물(0)은 맨 뒤 */
  const sortPosition = form.sort_order > 0
    ? otherWorks.filter((w) => w.sort_order < form.sort_order).length + 1
    : otherWorks.length + 1;
  /* 저장할 때 sort_order 는 자리를 옮겼을 때만 보낸다. 서버는 받은 값을 자리로 보고 다시 매기므로, 빈 번호 뒤
     작업물은 그대로 저장해도 한 칸 밀렸다. 목록에서 옮겼거나 값이 마지막으로 저장한 값과 다르면 보낸다 */
  const sortMovedRef = useRef(false);
  const sortBaselineRef = useRef(form.sort_order);

  useEffect(() => {
    fetch("/api/works?all=true")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.works ?? []) as Array<{ id: string; title: string; sort_order: number }>;
        const others = list.filter((w) => w.id !== work?.id);
        setOtherWorks(others.sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch(() => {});
  }, [work?.id]);

  const [worksCategories, setWorksCategories] = useState<WorksCategory[]>([]);
  // 직접 입력 모드 — 사용자가 "직접 입력" 선택 시 활성화. categories_ko/en 비어도 input 유지
  const [categoryCustomMode, setCategoryCustomMode] = useState(false);
  const [natureCustomMode, setNatureCustomMode] = useState(false);

  // 성격(Nature) preset — i18n 로부터 ko/en 동시 로드 (category 와 동일하게 ko/en 두 컬럼 사용)
  const NATURE_PRESET_KEYS = useMemo(() => ["toy", "clone", "side", "academic", "contest", "opensource", "study"] as const, []);
  const naturePresets = useMemo(
    () => NATURE_PRESET_KEYS.map((key) => ({
      key,
      ko: tLang(`admin.works.editor.naturePresets.${key}`, "ko"),
      en: tLang(`admin.works.editor.naturePresets.${key}`, "en"),
    })),
    [NATURE_PRESET_KEYS, tLang],
  );

  useEffect(() => {
    fetch("/api/works-categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWorksCategories(data);
      })
      .catch(() => {});
  }, []);

  /* ── 관련 글 multi-select ── */
  const [allPosts, setAllPosts] = useState<Array<{ id: string; title: string; title_en?: string; cover_image: string; category: string; published: boolean; created_at: string }>>([]);
  const [allSeries, setAllSeries] = useState<Array<{ id: string; title: string; title_en?: string; cover_image: string; category: string; published: boolean }>>([]);

  useEffect(() => {
    fetch("/api/posts?all=true&limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.posts)) setAllPosts(d.posts);
      })
      .catch(() => {});
    fetch("/api/series?all=true")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
        setAllSeries(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!work?.id) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/works/${work.id}/related-posts`).then((r) => r.json()).catch(() => null),
      fetch(`/api/admin/works/${work.id}/related-series`).then((r) => r.json()).catch(() => null),
    ])
      .then(([posts, series]) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          ...(Array.isArray(posts?.items) ? { related_post_ids: posts.items.map((p: { id: string }) => p.id) } : {}),
          ...(Array.isArray(series?.items) ? { related_series_ids: series.items.map((s: { id: string }) => s.id) } : {}),
        }));
      })
      .finally(() => {
        if (cancelled) return;
        // async load 된 관계 ID 가 form 에 반영된 다음 frame 에 baseline 정합화 + draft restore 활성화
        requestAnimationFrame(() => {
          markBaseline();
          setInitialLoadsReady(true);
        });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id]);

  // 커버 배너의 페이지 이모지/아이콘 — form.icon 으로 저장(DB works.icon)
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [galleryViewerIdx, setGalleryViewerIdx] = useState<number | null>(null);
  /* 갤러리에서 고른 칸 — 여러 장을 한 번에 지우려고 둔다. 목록이 바뀌면 비운다(자리 번호가 밀린다) */
  const [gallerySelected, setGallerySelected] = useState<Set<number>>(new Set());
  /* 마지막으로 그냥 누른 칸 — Shift+클릭의 범위가 여기서 시작한다 */
  const galleryAnchor = useRef<number | null>(null);
  /* 끌어서 옮기기 — 칸을 통째로 끈다. dragIdx = 끌고 있는 칸, overIdx = 지금 지나는 칸 */
  const [galleryDragIdx, setGalleryDragIdx] = useState<number | null>(null);
  const [galleryOverIdx, setGalleryOverIdx] = useState<number | null>(null);

  /* PDF 를 들이는 동안의 진행 — 읽기 → 쪽마다 그리기 → 올리기. 끝날 때까지 갤러리는 잠근다.
     쪽이 많으면 분 단위로 걸리는데, 그 사이에 지우거나 더 넣으면 자리 번호가 어긋난다 */
  const [pdfProgress, setPdfProgress] = useState<
    { phase: "reading" | "rendering" | "uploading"; name: string; done: number; total: number } | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [galleryImgErrors, setGalleryImgErrors] = useState<Set<string>>(new Set());
  // gallery 항목이 바뀔 때 제거된 src 의 에러 상태 정리
  const galleryChanged = useDepsChanged([form.gallery]);
  if (galleryChanged) {
    if (gallerySelected.size > 0) setGallerySelected(new Set());
    const valid = new Set(form.gallery);
    setGalleryImgErrors((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const s of prev) {
        if (valid.has(s)) next.add(s);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }


  /* 저장하지 않고 떠나려 하면 묻는다 — 뒤로 가기·사이트 안 링크·새로고침·탭 닫기 */
  const askLeave = (go: () => void) => openModal(
    <ModalConfirm desc={t("admin.common.leaveConfirm")} confirmText={t("admin.common.leaveConfirmAction")} danger onConfirm={go} />,
    { width: "min(90vw, 480px)" },
  );
  useEditorLeaveGuard({ form, dirty: isDirty, busy: saving, ask: askLeave, fallback: "/admin/works" });

  /* ── Auto-save ── */
  const savedIdRef = useRef<string | undefined>(work?.id);
  useEffect(() => { if (work?.id) savedIdRef.current = work.id; }, [work?.id]);
  const savedId = savedIdRef;

  const onAutoSaved = useCallback(() => {
    setStatus(tw("autoSaved"));
    setStatusType("success");
  }, [tw]);

  const { markBaseline } = useEditorAutoSave<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
    snapshot: form,
    getTitle: () => form.title || "(untitled)",
    saveRevision,
    ignoredKeys: ["scheduled_at"],
    block: saving || translating,
    onSaved: onAutoSaved,
    // 편집 멈춘 뒤 3초에 저장 — 60초 기본값은 사실상 자동저장 체감이 안 남(post 와 동일 기준).
    debounceMs: 3000,
  });

  // 글자 단위 continuous draft (localStorage) — mount 시 silent restore
  const { clearDraft } = useEditorDraft<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
    snapshot: form,
    // 로컬 로드 완료 → localStorage 복원 + baseline. 서버 로드 완료 → 서버(cross-device) 복원(단 미편집 시).
    ready: initialLoadsReady,
    serverReady: revisionsLoaded,
    applyDraft: (draft) => {
      sortMovedRef.current = false;
      setForm((prev) => restoreSavedForm(prev, draft));
      requestAnimationFrame(markBaseline);
    },
    ignoredKeys: ["scheduled_at"],
    // 서버(cross-device) 자동복원 — 다른 기기/브라우저에서 이어 쓰기. serverDraft 는 위에서
    // savedAt>updated_at 가드를 통과한 리비전만(= 저장본보다 실제로 더 나중). 로드 후 미편집(pristine)일
    // 때만 적용되므로 지금 작업분을 덮지 않는다. localStorage(같은 기기 백업)는 그대로 유지.
    serverDraft,
  });

  const updateField = useCallback(
    <K extends keyof WorkFormData>(key: K, value: WorkFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [],
  );

  const onTechChange = useCallback((tags: string[]) => updateField("tech", tags), [updateField]);
  const tech = useTagInput(form.tech, onTechChange);

  const TRANSLATABLE_FIELDS = useMemo(
    () => ["title", "subtitle", "description", "role", "content"] as const,
    [],
  );

  // 필드 논리명 → form 키. title 만 bare+_en 컨벤션(title/title_en), 나머지는 _ko/_en.
  const fieldKeyFor = useCallback(
    (f: string, l: "ko" | "en"): keyof WorkFormData =>
      (f === "title" ? (l === "ko" ? "title" : "title_en") : `${f}_${l}`) as keyof WorkFormData,
    [],
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const activeFields = TRANSLATABLE_FIELDS.filter(
        (f) => want.has(f) && (form[fieldKeyFor(f, sourceLang)] as string)?.trim(),
      );
      const texts = activeFields.map((f) => form[fieldKeyFor(f, sourceLang)]) as string[];

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tw("translating"));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<WorkFormData> = {};
        activeFields.forEach((f, i) => {
          patch[fieldKeyFor(f, targetLang)] = result.translations[i] as never;
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tw("autoTranslated"));
        setStatusType("success");
      } else {
        setError(errorText(result.error, t, tw("translateFailed")));
      }
    },
    [form, t, tw, TRANSLATABLE_FIELDS, fieldKeyFor],
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const srcLang: "ko" | "en" = isToEn ? "ko" : "en";
      const dstLang: "ko" | "en" = isToEn ? "en" : "ko";

      const hasSrc = TRANSLATABLE_FIELDS.some((f) => (form[fieldKeyFor(f, srcLang)] as string)?.trim());
      const hasDst = TRANSLATABLE_FIELDS.some((f) => (form[fieldKeyFor(f, dstLang)] as string)?.trim());

      if (hasSrc && !hasDst) {
        await translateFields(
          TRANSLATABLE_FIELDS.slice(),
          newLang,
        );
      }
    },
    [form, translating, translateFields, TRANSLATABLE_FIELDS, fieldKeyFor],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? TRANSLATABLE_FIELDS.slice(), editorLang);
    },
    [translating, editorLang, translateFields, TRANSLATABLE_FIELDS],
  );

  const onTeamMembersChange = useCallback((members: WorkFormData["team_members"]) => updateField("team_members", members), [updateField]);
  const team = useTeamMembers(form.team_members, onTeamMembersChange);

  /* 팀원에 사이트 저자 프로필을 연결하면 그 계정이 이 작업물의 편집자가 된다
     (canEditWork · RLS 의 can_edit_work). 연결을 바꾸는 것은 권한을 주고 뺏는 일이라
     관리자만 할 수 있다 — 서버도 같은 규칙으로 막는다. */
  const myRole = useMyRole();
  const siteAuthorsConfig = useSiteConfig().authors;
  const siteAuthors = useMemo(
    () => (siteAuthorsConfig ?? []) as Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>,
    [siteAuthorsConfig],
  );
  const linkedAuthorIds = useMemo(
    () => new Set(form.team_members.map((m) => m.author_id).filter((v): v is string => !!v)),
    [form.team_members],
  );
  /** 연결 토글 — 이미 다른 팀원이 쓰고 있는 계정은 고를 수 없다(한 사람이 두 줄이 되면 안 된다). */
  const toggleLinkedAuthor = useCallback((a: { id: string; name: string; avatar?: string; email?: string }) => {
    if (team.memberAuthorId === a.id) {
      team.setMemberAuthorId(undefined);
      return;
    }
    team.setMemberAuthorId(a.id);
    // 비어 있는 칸만 채운다 — 이미 적어 둔 표시 이름·아바타를 덮지 않는다.
    if (!team.memberName.trim()) team.setMemberName(a.name);
    if (!team.memberAvatarUrl.trim() && a.avatar) team.setMemberAvatarUrl(a.avatar);
    if (!team.memberEmail.trim() && a.email) team.setMemberEmail(a.email);
  }, [team]);

  // 팀원 역할 multi-picker — select 와 chip 을 분리 배치 (chip 은 URL row 아래) */
  const teamRole = useRoleMultiPicker({
    value: editorLang === "ko" ? team.memberRoleKo : team.memberRoleEn,
    onChange: editorLang === "ko" ? team.setMemberRoleKo : team.setMemberRoleEn,
    presets: editorLang === "ko" ? ROLE_PRESETS_KO : ROLE_PRESETS_EN,
    placeholder: tw("memberRole"),
  });

  const onOwnRoleChange = useCallback((v: string) => updateField(editorLang === "ko" ? "role_ko" : "role_en", v), [editorLang, updateField]);
  // 본인 역할 multi-picker — chip 은 TeamContribsByRole 의 group header 가 담당 → selectNode 만 사용 */
  const ownRole = useRoleMultiPicker({
    value: editorLang === "ko" ? form.role_ko : form.role_en,
    onChange: onOwnRoleChange,
    presets: editorLang === "ko" ? ROLE_PRESETS_KO : ROLE_PRESETS_EN,
    placeholder: tw("rolePlaceholder"),
  });

  // form 의 avatar preview — 사용자 입력 기준 derive (avatar_url 우선, 없으면 url 에서)
  const teamAvatarPreview = deriveTeamMemberAvatar({
    avatar_url: team.memberAvatarUrl,
    url: team.memberUrl,
  });
  // avatar 더블클릭 → 파일 picker
  const teamAvatarFileRef = useRef<HTMLInputElement>(null);
  const [teamAvatarUploading, setTeamAvatarUploading] = useState(false);
  const handleTeamAvatarFile = useCallback(async (file: File) => {
    setTeamAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw await errorFromResponse(res);
      const data = await res.json();
      if (data.url) team.setMemberAvatarUrl(data.url);
    } catch (err) {
      showToast(errorText(err, t, tw("avatarUploadFailed")), "error");
    } finally {
      setTeamAvatarUploading(false);
      if (teamAvatarFileRef.current) teamAvatarFileRef.current.value = "";
    }
  }, [team, t, tw]);


  const handleInsertTemplate = useCallback(() => {
    const lang = editorLang;
    const contentKey = lang === "ko" ? "content_ko" : "content_en";
    const current = form[contentKey];

    const applyTemplate = (tmpl: WorkTemplate) => {
      // 에디터는 richtext 단일 — 템플릿 md 를 richtext 로 변환해 삽입
      const content = mdToRichHtml(lang === "ko" ? tmpl.content.ko : tmpl.content.en);
      if (current.trim()) {
        updateField(contentKey, current + "<hr />" + content);
      } else {
        updateField(contentKey, content);
      }
    };

    openModal(
      <div className={styles.templateModal}>
        <p className={styles.templateModalDesc}>{tw("templateDesc")}</p>
        <div className={styles.templateList}>
          {WORK_TEMPLATES.map((tmpl) => (
            <Pressable
              key={tmpl.id}
              className={styles.templateItem}
              onClick={() => {
                if (current.trim()) {
                  openModal(
                    <ModalConfirm
                      desc={tw("templateConfirm")}
                      confirmText={tw("insertTemplate")}
                      onConfirm={() => { applyTemplate(tmpl); closeAll(); }}
                    />,
                    { header: { title: tw("insertTemplate") }, closeButton: true, width: "360px" },
                  );
                } else {
                  applyTemplate(tmpl);
                  closeAll();
                }
              }}
            >
              {/* 템플릿 이름·설명은 고르는 단추라 화면 언어로, 넣는 본문만 편집 중인 언어로 */}
              <span className={styles.templateItemLabel}>{language === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{language === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </Pressable>
          ))}
        </div>
      </div>,
      { header: { title: tw("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, language, form, updateField, tw, openModal, closeAll]);

  const handleContentImageUpload = useCallback(async (file: File): Promise<string> => {
    // 동영상 — 서버 body 한도 우회 위해 Storage 직접 업로드 (제한 초과 시 브라우저 압축).
    if (file.type.startsWith("video/")) {
      const { runVideoUpload } = await import("@/components/posts/plate/MediaUploadModal");
      return runVideoUpload(file, undefined, t("editor.videoUploadTitle"));
    }

    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    const sizeError = validateFileSize(file);
    if (sizeError) throw sizeError;

    const compressed = await compressImage(file);

    // 압축 후에도 한도 초과면 reject
    const postError = validateFileSize(compressed, undefined, { skipCompressibleBypass: true });
    if (postError) throw postError;

    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    // 거절 사유는 코드로 싣는다 — 본문 편집기의 오류 창이 화면 언어 문구로 바꾼다
    if (!res.ok) throw errorFromBody(data, res.status);
    if (!data.url) throw new CodedError("Upload response has no URL");
    return data.url;
  }, [t]);

  /**
   * 고른 파일을 들인다 — 고르기 창과 끌어 놓기가 같이 쓴다.
   *
   * PDF·PPTX 는 쪽(슬라이드)마다 그림으로 펼쳐 갤러리에 붙이고, 나머지는 압축해서 올린다.
   * 옛 .ppt 는 브라우저에서 그림으로 바꿀 방법이 없어 파일째 올린다 — 읽는 화면이 문서 뷰어로 보여 준다.
   */
  const ingestFiles = useCallback(async (files: File[], field: "image" | "gallery") => {
      if (files.length === 0) return;

      const { compressImage, validateFileSize } = await import("@/lib/compressImage");
      const { isPdfFile, pdfToImages } = await import("@/lib/pdfToImages");
      const { isPptxFile, pptxToImages } = await import("@/lib/pptxToImages");
      /* 막히거나 거절되면 사유를 화면 언어로 알린다. 예전에는 브라우저 alert 에 한국어 문장이 떴고,
         서버가 거절하면 아무 표시 없이 넘어갔다 */
      const fail = (err: unknown) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
      /* PDF·PPTX 는 쪽 수만큼 그림으로 펼친 뒤 나머지 흐름을 그대로 탄다 */
      /* 발표 자료는 장마다 발표자 노트가 따라온다 — 올린 그림 주소에 붙여 슬라이드 음성의 기본 대본으로 둔다 */
      const expanded: { file: File; notes?: string }[] = [];
      let fromPdf = false;
      for (const file of files) {
        const deck = field === "gallery" && isPdfFile(file)
          ? async (f: File, onP: Parameters<typeof pdfToImages>[1]) => (await pdfToImages(f, onP)).map((page) => ({ file: page }))
          : field === "gallery" && isPptxFile(file) ? pptxToImages
          : null;
        if (deck) {
          try {
            setPdfProgress({ phase: "reading", name: file.name, done: 0, total: 0 });
            const pages = await deck(file, (p) => setPdfProgress({ phase: "rendering", name: file.name, ...p }));
            expanded.push(...pages);
            fromPdf = true;
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
        if (fromPdf) setPdfProgress({ phase: "uploading", name: file.name, done: uploaded, total: expanded.length });
        uploaded++;
        const sizeError = validateFileSize(file);
        if (sizeError) { fail(sizeError); continue; }
        // 비디오는 압축 X — 그대로 업로드. 이미지만 압축 파이프라인.
        const isVideo = file.type.startsWith("video/");
        const payload = isVideo ? file : await compressImage(file);
        // 압축 후에도 한도 초과면 reject
        const postError = validateFileSize(payload, undefined, { skipCompressibleBypass: true });
        if (postError) { fail(postError); continue; }
        const formData = new FormData();
        formData.append("file", payload);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) { fail(data); continue; }

        if (field === "image") {
          updateField("image", data.url);
        } else {
          setForm((prev) => ({
            ...prev,
            gallery: [...prev.gallery, data.url],
            ...(notes ? { gallery_notes: { ...(prev.gallery_notes ?? {}), [data.url]: { script: notes } } } : {}),
          }));
        }
      }
      if (fromPdf) setPdfProgress(null);
  }, [t, updateField]);

  /* 고르기 창 */
  const handleImageUpload = useCallback((field: "image" | "gallery") => {
    const input = document.createElement("input");
    input.type = "file";
    /* 갤러리에는 PDF·PPTX 도 받는다 — 쪽마다 그림으로 바꿔 슬라이드처럼 넘겨 보게 한다.
       옛 .ppt 는 파일째 올라가 읽는 화면에서 문서 뷰어로 열린다 */
    input.accept = field === "gallery"
      ? "image/*,video/mp4,video/webm,video/quicktime,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,application/vnd.ms-powerpoint"
      : "image/*,video/mp4,video/webm,video/quicktime";
    input.multiple = field === "gallery";
    input.onchange = () => { void ingestFiles(Array.from(input.files ?? []), field); };
    input.click();
  }, [ingestFiles]);

  /* 밖에서 끌어다 놓기 — 갤러리 영역 전체가 받는다. 칸을 끌어 차례를 바꾸는 것과는 다른 일이라
     "파일이 들어 있는 끌기" 일 때만 받는다 */
  const [galleryFileOver, setGalleryFileOver] = useState(false);
  /* 갤러리 작업대 — 단축키를 받는 틀과 아래 가로 썸네일 줄(끌고 좌우 가장자리에 다가가면 줄을 민다) */
  const galleryAreaRef = useRef<HTMLDivElement>(null);
  const galleryRailRef = useRef<HTMLDivElement>(null);
  /* 작업대 위의 슬라이드 | 대본 폭 — 사이 핸들로 조절한다 */
  const galleryBenchRef = useRef<HTMLDivElement>(null);
  const benchSplit = useBenchSplit(galleryBenchRef);
  const autoScroll = useRef<{ timer: ReturnType<typeof setInterval>; dir: -1 | 1 } | null>(null);
  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current) clearInterval(autoScroll.current.timer);
    autoScroll.current = null;
  }, []);
  /* 화면 밖에 있는 칸으로도 끌고 갈 수 있게 — 끌기 중 가장자리에 머물면 줄이 저절로 밀린다.
     끌기 중에는 휠도 스크롤 막대도 못 쓰므로, 이게 없으면 안 보이는 자리에는 못 떨군다 */
  const edgeAutoScroll = useCallback((clientX: number) => {
    const strip = galleryRailRef.current?.querySelector<HTMLElement>(`.${styles.galleryCarousel}`);
    if (!strip) return;
    const r = strip.getBoundingClientRect();
    const EDGE = 90; // 가장자리에서 이 안에 들어오면 민다
    const STEP = 12; // 한 번에 미는 거리(px)
    const dir: -1 | 1 | 0 = clientX < r.left + EDGE ? -1 : clientX > r.right - EDGE ? 1 : 0;
    if (dir === 0) { stopAutoScroll(); return; }
    if (autoScroll.current?.dir === dir) {
      /* 이미 그쪽으로 밀고 있다 — 이 사건만큼 한 걸음 더. 끌기가 도는 동안 타이머가 멈추는
         브라우저에서도 최소한 손을 움직이는 만큼은 따라간다 */
      strip.scrollLeft += dir * STEP;
      return;
    }
    stopAutoScroll();
    /* 타이머로 민다 — requestAnimationFrame 은 끌기가 도는 동안 한 번 돌고 멈춰 버린다 */
    strip.scrollLeft += dir * STEP;
    autoScroll.current = { timer: setInterval(() => { strip.scrollLeft += dir * STEP; }, 16), dir };
  }, [stopAutoScroll]);

  const onGalleryDragOver = useCallback((e: React.DragEvent) => {
    if (galleryDragIdx !== null) {
      /* 칸을 끌고 있다 — 칸 사이 빈 곳을 지날 때도 받아야 가장자리 밀기가 끊기지 않는다 */
      e.preventDefault();
      edgeAutoScroll(e.clientX);
      return;
    }
    if (pdfProgress || !isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setGalleryFileOver(true);
  }, [edgeAutoScroll, galleryDragIdx, pdfProgress]);
  const onGalleryDragLeave = useCallback((e: React.DragEvent) => {
    /* 안쪽 칸으로 옮겨 갈 때도 leave 가 온다. 끌기 중에는 relatedTarget 이 비어 오는 일이 많아
       그걸로 가르면 칸을 지날 때마다 가장자리 밀기가 끊긴다 — 자리로 판별한다 */
    const r = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (inside) return;
    stopAutoScroll();
    setGalleryFileOver(false);
  }, [stopAutoScroll]);
  const onGalleryDrop = useCallback((e: React.DragEvent) => {
    if (pdfProgress || galleryDragIdx !== null || !isFileDrag(e)) return;
    e.preventDefault();
    setGalleryFileOver(false);
    void ingestFiles(Array.from(e.dataTransfer.files), "gallery");
  }, [galleryDragIdx, ingestFiles, pdfProgress]);

  /* 창을 떠나거나 그대로 끝나도 밀기는 멈춰야 한다 */
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  /**
   * 갤러리 칸을 누를 때의 고르기 — 끌기는 차례 바꾸기가 가져갔으므로 고르기는 누르기로만 한다.
   *
   * Shift 면 지난번 누른 칸부터 여기까지, ⌘/Ctrl 이면 하나씩 켜고 끈다 — 파일 목록에서 쓰는 방식 그대로다.
   * 그냥 누르면 고르지 않고 그 장을 작업대 위에 연다(대본 쓰기). 아래 mods 가 둘 다 false 로 오는 일은
   * 이제 없지만, 오면 그 한 장만(다시 누르면 해제) 고른다.
   */
  const pickGalleryItem = useCallback((i: number, mods: { shift: boolean; toggle: boolean }) => {
    setGallerySelected((prev) => {
      if (mods.shift && galleryAnchor.current !== null) {
        const lo = Math.min(galleryAnchor.current, i);
        const hi = Math.max(galleryAnchor.current, i);
        const next = new Set(prev);
        for (let n = lo; n <= hi; n++) next.add(n);
        return next;
      }
      if (mods.toggle) {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
      }
      /* 혼자 골라져 있던 칸을 다시 누르면 아무것도 안 고른 상태로 */
      if (prev.size === 1 && prev.has(i)) return new Set<number>();
      return new Set([i]);
    });
    if (!mods.shift) galleryAnchor.current = i;
  }, []);

  const removeSelectedGallery = useCallback(() => {
    setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => !gallerySelected.has(i)) }));
    setGallerySelected(new Set());
  }, [gallerySelected]);

  /* 끌어 놓은 자리로 옮긴다 — 뽑아서 그 자리에 끼운다(맞바꾸기가 아니다. 멀리 끌면 사이에 있던
     칸들이 통째로 한 칸씩 밀려야 눈에 보이는 대로 떨어진다) */
  const reorderGallery = useCallback((from: number, to: number) => {
    setForm((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.gallery.length || to >= prev.gallery.length) return prev;
      const gallery = [...prev.gallery];
      const [moved] = gallery.splice(from, 1);
      gallery.splice(to, 0, moved);
      return { ...prev, gallery };
    });
  }, []);

  /* 차례 바꾸기 — 이웃과 자리를 맞바꾼다. 끌기는 고르기가 쓰고 있어서 단추로 옮긴다.
     자리가 바뀌면 galleryChanged 가 고른 칸을 비운다(번호가 밀려 엉뚱한 칸이 지워지지 않게) */
  const moveGalleryItem = useCallback((index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.gallery.length) return prev;
      const gallery = [...prev.gallery];
      [gallery[index], gallery[to]] = [gallery[to], gallery[index]];
      return { ...prev, gallery };
    });
  }, []);

  /* 갤러리 장 하나의 음성 값을 바꾼다 — 폼 최신값 위에 덧쓰므로 음성을 만드는 동안 다른 장을 고쳐도 섞이지 않는다.
     undefined 인 칸은 지우고, 다 비면 그 장의 항목을 없앤다 */
  const updateGalleryNote = useCallback((url: string, patch: Partial<GalleryNote>) => {
    setForm((prev) => {
      const notes: GalleryNotes = { ...(prev.gallery_notes ?? {}) };
      const next: GalleryNote = { ...(notes[url] ?? {}), ...patch };
      for (const k of Object.keys(next) as (keyof GalleryNote)[]) if (next[k] === undefined || next[k] === "") delete next[k];
      if (Object.keys(next).length === 0) delete notes[url]; else notes[url] = next;
      return { ...prev, gallery_notes: notes };
    });
  }, []);

  /* 슬라이드 음성 — 칸마다의 음성 단추와 제목 줄의 "음성 만들기"가 목소리·진행 상태를 같이 쓴다 */
  const narration = useNarrationActions({ gallery: form.gallery, notes: form.gallery_notes ?? {}, update: updateGalleryNote, tw });
  /* 작업대 위에 연 장 — 고른 적이 없으면 첫 장 */
  const narrationCurrent = narration.openIndex >= 0 ? narration.openIndex : 0;

  const removeGalleryItem = useCallback(
    (index: number) => {
      setForm((prev) => ({
        ...prev,
        gallery: prev.gallery.filter((_, i) => i !== index),
      }));
    },
    [],
  );

  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: Array<{ label: string; field: string }> = [];
        if (!(primaryLang === "en" ? form.title_en : form.title).trim()) missing.push({ label: tw("title"), field: "title" });
        // 카테고리·성격의 필수 기준은 기본 언어 (en 기본이면 영문 쪽이 필수)
        const reqCategories = (primaryLang === "en" ? form.categories_en : form.categories_ko) ?? [];
        if (reqCategories.length === 0) missing.push({ label: tw("category"), field: "category" });
        if (!(primaryLang === "en" ? form.nature_en : form.nature_ko).trim()) missing.push({ label: tw("nature"), field: "nature" });
        if (!form.year.trim()) missing.push({ label: tw("year"), field: "year" });
        if (!form.image.trim()) missing.push({ label: tw("mainImage"), field: "image" });
        if (!form.content_ko.trim() && !form.content_en.trim()) missing.push({ label: tw("content"), field: "content" });
        if (missing.length > 0) {
          const msg = `${missing.map((m) => m.label).join(" · ")} ${tw("requiredFields")}`;
          setError(msg);
          setShowErrors(true);
          showToast(msg, "error", 3500);
          focusFirstMissingField(missing[0].field);
          return;
        }

        const security = validateContentSecurity(form.content_ko + form.content_en);
        if (!security.safe) {
          setError(`${tw("securityWarning")}: ${security.warnings.join(", ")}`);
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      // works 테이블에는 관계 컬럼이 없음 — 분리해서 별도 endpoint로 sync.
      const { related_post_ids, related_series_ids, sort_order, ...workBody } = form;
      const sendSortOrder = sortMovedRef.current || sort_order !== sortBaselineRef.current;
      /* 지운 장의 음성은 남기지 않는다 — 그림 주소가 열쇠라 갤러리에 없는 항목은 쓰일 일이 없다 */
      const inGallery = new Set(form.gallery);
      const galleryNotes = Object.fromEntries(Object.entries(form.gallery_notes ?? {}).filter(([url]) => inGallery.has(url)));
      const body = {
        ...workBody,
        gallery_notes: galleryNotes,
        ...(sendSortOrder ? { sort_order } : {}),
        published: willPublish,
      };

      try {
        const url = savedId.current
          ? `/api/works/${savedId.current}`
          : "/api/works";
        const method = savedId.current ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          /* 서버는 "왜" 를 reason 에 담는다 — error 만 쓰면 "Forbidden" 밖에 안 남아 원인을 알 수 없다. */
          setError(errorText(data, t, tw("saveFailed")));
          return;
        }

        if (!savedId.current) savedId.current = data.id;
        /* DB 에 음성 칸이 아직 없으면 서버가 그 칸만 빼고 저장한다 — 음성을 적어 둔 경우에만 알린다 */
        if (res.headers.get(GALLERY_NOTES_DROPPED_HEADER) && Object.keys(galleryNotes).length > 0) {
          showToast(tw("narrationNotSaved"), "error", 6000);
        }
        sortMovedRef.current = false;
        sortBaselineRef.current = sort_order;

        // 관계 동기화 — 별도 endpoint. 작업물은 이미 저장됐으므로 실패해도 저장은 끝내고 알림 하나로 알린다(#868)
        const relationFailures: CodedError[] = [];
        const syncRelation = async (path: string, body: object) => {
          const res = await tryRequest(`/api/admin/works/${savedId.current}/${path}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res instanceof CodedError) relationFailures.push(res);
        };
        if (savedId.current && related_post_ids) await syncRelation("related-posts", { postIds: related_post_ids });
        if (savedId.current && related_series_ids) await syncRelation("related-series", { seriesIds: related_series_ids });
        if (relationFailures.length) showToast(errorText(relationFailures[0], t, tw("relatedFailed")), "error");

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/works/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        // 실제 save 성공 — localStorage draft 정리 + 이 저장으로 대체된 autosave revision dismiss
        // (다음 진입 시 저장본이 옛 autosave 로 되돌아가지 않게)
        if (isEdit && savedId.current) {
          fetch(`/api/revisions`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: "work", entity_id: savedId.current, dismissed: true }),
          }).catch(() => {});
        }
        clearDraft();
        router.push("/admin/works");
      } catch {
        setError(tw("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, t, tw, savedId, primaryLang, clearDraft, isEdit],
  );

  const handleDelete = useCallback(async () => {
    if (!work) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/works/${work.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/admin/works");
    } catch {
      setError(tw("deleteFailed"));
      setDeleting(false);
    }
  }, [work, router, tw]);

  const handlePreview = useCallback(() => {
    /* 새 작업물(자리 0)은 저장하면 맨 뒤에 서므로 미리보기 번호도 그 자리로 */
    sessionStorage.setItem(PREVIEW_KEY.work, JSON.stringify({ ...form, sort_order: sortPosition }));
    window.open("/admin/works/preview", "_blank");
  }, [form, sortPosition]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        sortMovedRef.current = false;
        setForm((prev) => restoreSavedForm(prev, snapshot));
        requestAnimationFrame(() => markBaseline());
        setStatus(tw("restored"));
        setStatusType("success");
      }
    },
    [dbRevisions, loadRevisionSnapshot, markBaseline, tw],
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
        title: s.title || "",
        subtitle: (isKo ? s.subtitle_ko : s.subtitle_en) || "",
        excerpt: (isKo ? s.description_ko : s.description_en) || "",
        content: stripHtml((isKo ? s.content_ko : s.content_en) || ""),
        meta: workSnapshotMeta(s, lang),
      };
    },
    [dbRevisions, loadRevisionSnapshot],
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
    sortMovedRef.current = false;
    setForm(initialFormRef.current);
    setStatus(tw("reverted"));
    setStatusType("info");
  }, [tw]);

  const [generatingSummary, setRegeneratingSummary] = useState(false);

  const handleGenerateSummary = useCallback(async () => {
    const id = savedId.current ?? work?.id;
    if (!id) return;
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`/api/works/${id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        /* 서버는 "왜" 를 reason 에 담는다 — error 만 쓰면 "Forbidden" 밖에 안 남아 원인을 알 수 없다. */
        setError(errorText(data, t, tw("saveFailed")));
        return;
      }
      setStatus(tw("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(tw("saveFailed"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [work?.id, tw, savedId, t]);

  const shellLabels = useMemo(
    () => ({
      delete: tw("delete"),
      deleting: tw("deleting"),
      deleteConfirm: tw("deleteConfirm"),
      deleteConfirmInput: tw("deleteConfirmInput"),
      deleteCancel: tw("deleteCancel"),
      preview: tw("preview"),
      view: tw("viewPost"),
      saving: tw("saving"),
      saveDraft: tw("saveDraft"),
      update: tw("update"),
      publish: tw("publish"),
      revert: tw("revert"),
      revisionHistory: tw("revisionHistory"),
      restore: tw("restore"),
      retranslate: tw("retranslate"),
      retranslateAll: tw("retranslateAll"),
      retranslateDisabled: tw("retranslateDisabled"),
      generateSummary: tw("generateSummary"),
      generateSummaryDisabled: tw("generateSummaryDisabled"),
      scheduledAt: tw("scheduledAt"),
      scheduledHint: tw("scheduledHint"),
      scheduledClear: tw("scheduledClear"),
      publishScheduled: tw("publishScheduled"),
      publishOptions: tw("publishOptions"),
    }),
    [tw],
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "subtitle", label: tw("subtitle") },
      { key: "description", label: tw("description") },
      { key: "role", label: tw("role") },
      { key: "content", label: tw("content") },
    ],
    [tw],
  );

  const suf = editorLang === "ko" ? "_ko" : "_en";
  // 제목은 title(국문/기본) / title_en(영문) 이중언어 — editorLang 토글로 전환
  const titleKey = editorLang === "ko" ? "title" : "title_en";
  // 필수 제목 값 — 콘텐츠 작성 기본 언어 기준
  const reqTitle = primaryLang === "en" ? form.title_en : form.title;
  const contentKey = editorLang === "ko" ? "content_ko" : "content_en";

  /* 본문과 상관없는 섹션은 쓰는 값이 바뀔 때만 다시 그린다. 본문 한 글자마다 편집 화면 전체를 다시 그려
     입력이 늦었다(#850). 섹션 JSX 를 메모해 두면 React 는 같은 요소를 받아 그 아래를 건너뛴다.
     의존성은 exhaustive-deps 가 확인한다 — 빠뜨리면 경고로 잡힌다. */
  const titleValue = form[titleKey];
  const subtitleValue = form[`subtitle${suf}`];
  const descriptionValue = form[`description${suf}`];
  const roleValue = form[`role${suf}`];

  /* Basic Info — 필수 (title, year, category) + 선택 (collapsible) */
  const basicInfoSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("basicInfo")}</h2>

      {/* ── 필수 ── 제목 + 부제목 + slug 묶음 */}
      <div className={es.field} data-required="title">
        <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !reqTitle.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("title")}</label>
        <input
          ref={titleInputRef}
          className={`${es.titleInput}${showErrors && !reqTitle.trim() ? ` ${es.titleInputError}` : ""}`}
          type="text"
          value={titleValue}
          onChange={(e) => updateField(titleKey, e.target.value)}
          placeholder={tw("titlePlaceholder")}
        />
      </div>

      {/* 부제목 — 제목 바로 아래 */}
      <div className={es.field}>
        <label className={es.fieldLabel}>{tw("subtitle")}</label>
        <SubtitleInput
          value={subtitleValue}
          onChange={(v) => updateField(`subtitle${suf}`, v)}
          placeholder={tw("subtitlePlaceholder")}
        />
      </div>

      {/* slug — title 자동 생성. 사용자 수정 시 manual 모드 */}
      <div className={es.field}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{tw("slug")}</label>
          {form.slug.trim() && validateSlug(form.slug) && (
            <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-accent)" }}>{tw(`slugError.${validateSlug(form.slug)}`) || validateSlug(form.slug)}</span>
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
          placeholder="work-url-slug"
        />
      </div>

      {/* year — 단독 row */}
      <div className={es.row}>
        <div className={es.field} style={{ gridColumn: "1 / -1" }} data-required="year">
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !form.year.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("year")}</label>
          <PeriodPicker
            value={parseYearAsPeriod(form.year)}
            onChange={(p) => updateField("year", serializePeriodAsYear(p))}
            maxDate={new Date()}
          />
        </div>
      </div>

      {/* nature (성격) — 제작 동기 축. category 와 별도. 필수 입력 */}
      <div className={es.row}>
        <div className={es.field} style={{ gridColumn: "1 / -1" }} data-required="nature">
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !(primaryLang === "en" ? form.nature_en : form.nature_ko).trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("nature")}</label>
          {(() => {
            const matchedIdx = naturePresets.findIndex(
              (n) => n.ko === form.nature_ko && n.en === form.nature_en,
            );
            const isCustom = natureCustomMode || (form.nature_ko.trim() !== "" && matchedIdx === -1);
            const selectValue = isCustom ? "__custom__" : (matchedIdx >= 0 ? String(matchedIdx) : "");
            return (
              <div className={styles.categoryAddRow}>
                <Select
                  value={selectValue}
                  placeholder={tw("naturePlaceholder")}
                  options={[
                    { value: "__custom__", label: tw("customNature") },
                    ...naturePresets.map((n, i) => ({
                      value: String(i),
                      label: editorLang === "ko" ? n.ko : n.en,
                    })),
                  ]}
                  onChange={(v) => {
                    if (v === "__custom__") {
                      setNatureCustomMode(true);
                      setForm((prev) => ({ ...prev, nature_ko: "", nature_en: "" }));
                    } else {
                      setNatureCustomMode(false);
                      const idx = parseInt(v);
                      const n = naturePresets[idx];
                      if (n) setForm((prev) => ({ ...prev, nature_ko: n.ko, nature_en: n.en }));
                    }
                    setStatus("");
                    setError("");
                  }}
                />
                {isCustom && (
                  <>
                    <div className={styles.customCategoryInputWrap}>
                      <span className={styles.customCategoryBadge}>KO</span>
                      <input
                        className={`${es.fieldInput} ${styles.customCategoryInput}`}
                        type="text"
                        value={form.nature_ko}
                        onChange={(e) => updateField("nature_ko", e.target.value)}
                        placeholder={tw("naturePlaceholder")}
                        autoFocus
                      />
                    </div>
                    <div className={styles.customCategoryInputWrap}>
                      <span className={styles.customCategoryBadge}>EN</span>
                      <input
                        className={`${es.fieldInput} ${styles.customCategoryInput}`}
                        type="text"
                        value={form.nature_en}
                        onChange={(e) => updateField("nature_en", e.target.value)}
                        placeholder={tw("naturePlaceholder")}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* category — multi-select. 선택된 chip 위에, 추가 Select 아래에. 직접 입력 가능 */}
      <div className={es.row}>
        <div className={es.field} style={{ gridColumn: "1 / -1" }} data-required="category">
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && ((primaryLang === "en" ? form.categories_en : form.categories_ko) ?? []).length === 0 ? ` ${es.fieldLabelError}` : ""}`}>{tw("category")}</label>
          <CategoryMultiPicker
            selectedKos={form.categories_ko ?? []}
            selectedEns={form.categories_en ?? []}
            presets={worksCategories}
            editorLang={editorLang}
            customMode={categoryCustomMode}
            setCustomMode={setCategoryCustomMode}
            labels={{
              placeholder: tw("categoryPlaceholder"),
              custom: tw("customCategory"),
              add: tw("categoryAdd"),
            }}
            onChange={(ko, en) => {
              setForm((prev) => ({ ...prev, categories_ko: ko, categories_en: en }));
              setStatus("");
              setError("");
            }}
          />
        </div>
      </div>

      {/* 설명 — 기본 정보의 하위 항목, 선택 입력보다 위 */}
      <div className={es.field}>
        <label className={es.fieldLabel}>{tw("description")}</label>
        <Textarea
          textareaClassName={styles.fieldTextarea}
          value={descriptionValue}
          onChange={(v) => updateField(`description${suf}`, v)}
          placeholder={tw("descPlaceholder")}
          rows={3}
          maxHint="basic"
        />
      </div>

      {/* ── 선택 (collapsible) ── */}
      <div className={styles.optionalSection}>
        <Pressable
          className={styles.optionalToggle}
          onClick={() => setOptionalOpen((v) => !v)}
        >
          <span>{tw("optionalFields")}</span>
          <ChevronRight
            size={12}
            strokeWidth={2.5}
            style={{ transform: optionalOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </Pressable>

        <div className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
          {/* 좌: 정렬순서 (세로 1열 전체)  |  우: subtitle / role (세로 stack) */}
          <div className={styles.optionalSplit}>
            <div className={`${es.field} ${styles.optionalSplitLeft}`}>
              <SortOrderDragList
                label={tw("sortOrder")}
                currentTitle={form.title || tw("subtitle")}
                currentOrder={sortPosition}
                otherItems={otherWorks}
                onChange={(newOrder, otherUpdates) => {
                  /* 이 작업물의 자리만 바꿔 두고 저장할 때 보낸다. 서버가 그 자리에 끼우고 나머지를 다시 매긴다.
                     예전에는 밀리는 작업물마다 PATCH 를 바로 보내 저장 전에 순서가 바뀌고, 동시에 오가며 뒤섞였다(#873).
                     아래는 목록 미리보기만 바꾼다 */
                  sortMovedRef.current = true;
                  updateField("sort_order", newOrder);
                  setOtherWorks((prev) => prev.map((w) => {
                    const u = otherUpdates.find((x) => x.id === w.id);
                    return u ? { ...w, sort_order: u.sort_order } : w;
                  }).sort((a, b) => a.sort_order - b.sort_order));
                }}
              />
            </div>
            <div className={styles.optionalSplitRight}>
              <div className={styles.memberFormBlock}>
                <div className={styles.memberSubLabelRow}>
                  <span className={styles.memberSubLabel}>{tw("role")}</span>
                </div>
                {/* multi-select — chip 은 아래 TeamContribsByRole 가 담당 (selectNode 만 사용) */}
                {ownRole.selectNode}
                {/* 역할별 작업 내용 — 공통 TagNotesEditor (ko/en 동시) */}
                {(() => {
                  const rolesArr = (roleValue || "")
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean);
                  const koMap = (form.contributions_ko ?? {}) as Record<string, string[]>;
                  const enMap = (form.contributions_en ?? {}) as Record<string, string[]>;
                  const notesMap: Record<string, LocalizedText> = {};
                  // entry 존재 여부 보존 — 둘 중 한 쪽에라도 key 가 있으면 (빈 문자열이라도) entry 유지
                  for (const r of rolesArr) {
                    if (r in koMap || r in enMap) {
                      notesMap[r] = {
                        ko: (koMap[r] ?? []).join("\n"),
                        en: (enMap[r] ?? []).join("\n"),
                      };
                    }
                  }
                  return (
                    <TagNotesEditor
                      items={rolesArr}
                      notes={notesMap}
                      onItemsChange={(next) => updateField(`role${suf}`, next.join(", "))}
                      onNotesChange={(next) => {
                        // 빈 문자열도 split 후 [] 로 저장 — entry 존재 여부 (= key in map) 유지
                        const nextKo: Record<string, string[]> = {};
                        const nextEn: Record<string, string[]> = {};
                        for (const [r, v] of Object.entries(next)) {
                          // filter 안 함 — 빈 pair 도 유지해야 + Add 가 작동
                          nextKo[r] = v.ko !== undefined ? v.ko.split("\n") : [];
                          nextEn[r] = v.en !== undefined ? v.en.split("\n") : [];
                        }
                        updateField("contributions_ko", nextKo);
                        updateField("contributions_en", nextEn);
                      }}
                      prefix=""
                      notePlaceholder={tw("memberContributionPlaceholder")}
                      addLabel={tw("noteAdd")}
                      cancelLabel={tw("cancel")}
                      editLabel={tw("noteEdit")}
                      removeTitle={tw("roleRemove")}
                      multiLine
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [
    categoryCustomMode, descriptionValue, editorLang, form.categories_en, form.categories_ko, form.contributions_en,
    form.contributions_ko, form.nature_en, form.nature_ko, form.slug, form.title, form.year,
    natureCustomMode, naturePresets, optionalOpen, otherWorks, ownRole.selectNode, primaryLang, reqTitle, roleValue, sortPosition,
    showErrors, subtitleValue, suf, titleKey, titleValue, tw, updateField, worksCategories,
  ]);

  /* Images */
  const imagesSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("images")}</h2>

      <div style={{ marginBottom: "var(--spacing-lg)" }} data-required="image">
        <CoverImageField
          value={form.image}
          onChange={(url) => updateField("image", url)}
          label={tw("mainImage")}
          removeLabel={tw("remove")}
          uploadLabel={tw("uploadImage")}
          chooseLabel={tw("chooseCover")}
          closeLabel={tw("closePicker")}
          onUpload={() => handleImageUpload("image")}
          pickerOpen={showCoverPicker}
          onPickerToggle={() => setShowCoverPicker((v) => !v)}
          urlInputPlaceholder={tw("pasteUrl")}
          hint={form.gallery.length > 0 ? tw("galleryPickHint") : undefined}
          hasError={showErrors && !form.image.trim()}
        />
        {/* cover_image 세팅 후에도 picker 유지 — AI auto-save 시 재생성 가능 */}
        {showCoverPicker && (
          <CoverImagePicker
            onSelect={(url) => { updateField("image", url); setShowCoverPicker(false); }}
            onClose={() => setShowCoverPicker(false)}
            onAutoSave={(url) => updateField("image", url)}
            currentUrl={form.image}
            postContext={{ title: form.title, tags: form.tech, excerpt: form.description_ko || form.description_en }}
          />
        )}
      </div>

      <div className={es.field}>
        <div className={styles.galleryLabelRow}>
          <label className={es.fieldLabel} style={{ marginBottom: 0 }}>
            {tw("gallery")}
            {form.gallery.length > 0 && (
              <span className={styles.galleryCount}>{form.gallery.length}</span>
            )}
          </label>
          <span className={styles.galleryLabelActions}>
          {gallerySelected.size > 0 && (
            <span className={styles.gallerySelectionBar}>
              <span>{fillTemplate(t("admin.common.selectedCount"), { count: gallerySelected.size })}</span>
              <Button variant="ghost" size="xs" shape="capsule" onClick={() => setGallerySelected(new Set())} disabled={!!pdfProgress} soundDisabled>
                {t("admin.common.clearSelection")}
              </Button>
              <Button variant="outline" size="xs" shape="capsule" onClick={removeSelectedGallery} disabled={!!pdfProgress} soundDisabled>
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
              {/* 진행 막대 — 쪽 수를 모르는 읽기 단계에서는 자리만 지킨다 */}
              <span className={styles.galleryProgressTrack}>
                <span
                  className={styles.galleryProgressFill}
                  style={{ width: pdfProgress.total > 0 ? `${Math.round((pdfProgress.done / pdfProgress.total) * 100)}%` : "0%" }}
                />
              </span>
            </span>
          )}
          <Button
            variant="outline"
            size="xs"
            shape="capsule"
            onClick={() => handleImageUpload("gallery")}
            disabled={!!pdfProgress}
            soundDisabled
          >
            {tw("addMore")}
          </Button>
          </span>
        </div>
        {form.gallery.length === 0 ? (
          <Pressable
            className={`${styles.galleryAddTile}${galleryFileOver ? ` ${styles.galleryFileOver}` : ""}`}
            onClick={() => handleImageUpload("gallery")}
            disabled={!!pdfProgress}
            onDragOver={onGalleryDragOver}
            onDragLeave={onGalleryDragLeave}
            onDrop={onGalleryDrop}
          >
            <Plus size={20} strokeWidth={1.5} />
            <span>{tw("addGallery")}</span>
          </Pressable>
        ) : (
          /* 작업대 — 위는 고른 장(왼쪽)과 대본(오른쪽), 아래는 가로 썸네일 줄(누르면 위에 열림, Shift·⌘ 로 여럿 고르기,
             끌어 차례 바꾸기). 위 칸 높이가 정해져 있어 대본이 길어도 페이지가 길어지지 않는다.
             단축키(⌘A·Esc·← →)는 감싼 div 가 받는다 */
          <div
            ref={galleryAreaRef}
            tabIndex={0}
            /* 들이는 중에는 손대지 못하게 — 자리 번호가 밀려 고른 것과 지울 것이 어긋난다 */
            data-busy={pdfProgress ? "" : undefined}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (pdfProgress) return;
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
                e.preventDefault();
                setGallerySelected(new Set(form.gallery.map((_, i) => i)));
              }
              if (e.key === "Escape") setGallerySelected(new Set());
              /* ← → — 위에 여는 장을 옮긴다. 대본을 쓰는 중(입력칸)에는 커서 이동이라 건드리지 않는다 */
              if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.target as HTMLElement).closest("textarea, input, select")) {
                e.preventDefault();
                const next = Math.max(0, Math.min(form.gallery.length - 1, narrationCurrent + (e.key === "ArrowLeft" ? -1 : 1)));
                narration.open(form.gallery[next], false);
                /* 썸네일 줄에서 옮겼으면 초점도 그 칸으로 — 다음 ← → 가 이어진다 */
                const tile = galleryRailRef.current?.querySelector<HTMLElement>(`[data-gallery-index="${next}"]`);
                tile?.scrollIntoView({ block: "nearest", inline: "nearest" });
                if ((e.target as HTMLElement).closest(`.${styles.galleryRail}`)) tile?.focus({ preventScroll: true });
              }
            }}
            className={`${styles.gallerySelectArea}${galleryFileOver ? ` ${styles.galleryFileOver}` : ""}`}
            onDragOver={onGalleryDragOver}
            onDragLeave={onGalleryDragLeave}
            onDrop={onGalleryDrop}
          >
          <div ref={galleryBenchRef} className={styles.galleryBench} style={benchSplit.benchStyle}>
          {/* 위 — 고른 장을 크게 보며 대본을 쓴다(왼쪽 칸 슬라이드, 오른쪽 칸 대본, 그 아래 조작 막대) */}
          <GalleryNarrationPanel
          gallery={form.gallery}
          notes={form.gallery_notes ?? {}}
          actions={narration}
          tw={tw}
          renderSlide={(src) => isOfficeDocUrl(src) ? (
            <span className={styles.galleryDoc}>
              <FileText size={40} strokeWidth={1.25} />
              <span className={styles.galleryDocKind}>{officeDocKind(src)}</span>
            </span>
          ) : isVideoUrl(src) ? (
            <video src={src} muted playsInline controls preload="metadata" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={src} alt="" />
          )}
          />
          {/* 슬라이드 | 대본 사이 핸들 — 끌거나 ← → 로 폭을 나눈다. 두 번 누르면 반반 */}
          <div className={styles.galleryBenchHandle} aria-label={tw("narrationSplit")} {...benchSplit.handleProps}>
            <span className={styles.galleryBenchHandleBar} />
          </div>
          <div ref={galleryRailRef} className={styles.galleryRail}>
          <HorizontalCarousel className={styles.galleryCarousel}>
            {form.gallery.map((src, i) => {
              const isMain = src === form.image && !!src;
              const filename = src.split("/").pop() ?? src;
              return (
                <div
                    key={i}
                    data-gallery-index={i}
                    className={[
                      styles.galleryItem,
                      narrationCurrent === i ? styles.galleryItemCurrent : "",
                      isMain ? styles.galleryItemMain : "",
                      gallerySelected.has(i) ? styles.galleryItemSelected : "",
                      galleryDragIdx === i ? styles.galleryItemDragging : "",
                      galleryOverIdx === i && galleryDragIdx !== null && galleryDragIdx !== i
                        ? (galleryDragIdx < i ? styles.galleryDropAfter : styles.galleryDropBefore)
                        : "",
                    ].filter(Boolean).join(" ")}
                    /* 칸을 통째로 끌어 차례를 바꾼다(들이는 중에는 못 끈다) */
                    draggable={!pdfProgress}
                    onDragStart={(e) => {
                      if (pdfProgress) { e.preventDefault(); return; }
                      setGalleryDragIdx(i);
                      e.dataTransfer.effectAllowed = "move";
                      /* 자료를 하나도 담지 않으면 브라우저가 끌기를 그 자리에서 취소한다 —
                         dragstart 만 오고 dragover·drop 이 오지 않는다 */
                      e.dataTransfer.setData("text/plain", String(i));
                    }}
                    onDragOver={(e) => {
                      if (galleryDragIdx === null) return;
                      e.preventDefault();
                      setGalleryOverIdx(i);
                    }}
                    onDragEnd={() => { stopAutoScroll(); setGalleryDragIdx(null); setGalleryOverIdx(null); }}
                    onDrop={(e) => {
                      if (galleryDragIdx === null) return; // 밖에서 온 파일 — 갤러리 영역이 받는다
                      e.preventDefault();
                      stopAutoScroll();
                      reorderGallery(galleryDragIdx, i);
                      setGalleryDragIdx(null);
                      setGalleryOverIdx(null);
                    }}
                    /* 누르면 고른다 — 크게 보기는 오버레이의 돋보기 단추가 연다 */
                    /* 그냥 누르면 위에 이 장을 연다. Shift·⌘ 는 여럿 고르기 — 크게 보기는 오버레이의 돋보기 단추가 연다 */
                    onClick={(e) => {
                      if (e.shiftKey || e.metaKey || e.ctrlKey) pickGalleryItem(i, { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey });
                      else narration.open(src);
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0 || pdfProgress) return;
                      /* 캐러셀까지 내려가면 그쪽이 포인터를 붙잡아 가로로 밀어 버린다 — 그러면
                         브라우저가 칸의 끌기를 시작하지 못한다(가로로 미는 일은 휠과 화살표가 맡는다) */
                      e.stopPropagation();
                    }}

                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (e.shiftKey || e.metaKey || e.ctrlKey) pickGalleryItem(i, { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey });
                        else narration.open(src);
                      }
                    }}
                    aria-label={tw("viewImage")}
                    aria-pressed={gallerySelected.has(i)}
                    aria-current={narrationCurrent === i ? "true" : undefined}
                  >
                    {isOfficeDocUrl(src) ? (
                      /* 문서 칸 — 그림이 아니라 그대로 그리면 깨진 그림이 된다. 읽는 화면은 문서 뷰어로 연다 */
                      <span className={styles.galleryDoc}>
                        <FileText size={28} strokeWidth={1.5} />
                        <span className={styles.galleryDocKind}>{officeDocKind(src)}</span>
                      </span>
                    ) : isVideoUrl(src) && !galleryImgErrors.has(src) ? (
                      <video
                        src={src}
                        className={styles.galleryImg}
                        draggable={false}
                        muted
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        onError={() => setGalleryImgErrors((prev) => {
                          if (prev.has(src)) return prev;
                          const next = new Set(prev);
                          next.add(src);
                          return next;
                        })}
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={galleryImgErrors.has(src) ? "/images/placeholder.svg" : src}
                        alt={`Gallery ${i + 1}`}
                        className={styles.galleryImg}
                        draggable={false}
                        onError={() => setGalleryImgErrors((prev) => {
                          if (prev.has(src)) return prev;
                          const next = new Set(prev);
                          next.add(src);
                          return next;
                        })}
                      />
                    )}
                    {isMain && (
                      <span className={styles.galleryMainBadge}>
                        <Star size={10} strokeWidth={2.5} fill="currentColor" />
                        {tw("currentMain")}
                      </span>
                    )}
                    <div className={styles.galleryOverlay}>
                      {/* 단추를 눌렀을 때만 칸의 고르기가 따라오지 않게 한다 — 겹 전체에 걸면
                          칸을 누르는 것도, 끌어서 고르는 것도 여기서 다 먹힌다 */}
                      <div
                        className={styles.galleryActions}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="difference"
                          size="xs"
                          shape="circle"
                          disabled={i === 0}
                          onClick={() => moveGalleryItem(i, -1)}
                          aria-label={tw("moveEarlier")}
                          title={tw("moveEarlier")}
                          soundDisabled
                          icon={<ChevronLeft size={12} strokeWidth={2} />}
                        />
                        <Button
                          variant="difference"
                          size="xs"
                          shape="circle"
                          disabled={i === form.gallery.length - 1}
                          onClick={() => moveGalleryItem(i, 1)}
                          aria-label={tw("moveLater")}
                          title={tw("moveLater")}
                          soundDisabled
                          icon={<ChevronRight size={12} strokeWidth={2} />}
                        />
                        <Button
                          variant="difference"
                          size="xs"
                          shape="circle"
                          onClick={() => setGalleryViewerIdx(i)}
                          aria-label={tw("viewImage")}
                          title={tw("viewImage")}
                          soundDisabled
                          icon={<Maximize2 size={12} strokeWidth={2} />}
                        />
                        <Button
                          variant="difference"
                          size="xs"
                          shape="circle"
                          active={isMain}
                          onClick={() => { if (!isMain) updateField("image", src); }}
                          aria-label={tw("setAsMain")}
                          title={tw("setAsMain")}
                          soundDisabled
                          icon={<Star size={12} strokeWidth={2} fill={isMain ? "currentColor" : "none"} />}
                        />
                        <Button
                          variant="difference"
                          size="xs"
                          shape="circle"
                          onClick={() => removeGalleryItem(i)}
                          aria-label={tw("remove")}
                          title={tw("remove")}
                          soundDisabled
                          icon={<X size={12} strokeWidth={2} />}
                        />
                      </div>
                      <div className={styles.galleryMeta}>
                        <span className={styles.galleryMetaIndex}>{i + 1} / {form.gallery.length}</span>
                        <span className={styles.galleryMetaName}>{filename}</span>
                      </div>
                    </div>
                    {/* 이 장의 음성 — 음성 파일(스피커)·대본만(글줄). 없으면 그리지 않는다 */}
                    <NarrationBadge note={form.gallery_notes?.[src]} className={styles.galleryNarrationBadge} />
                  </div>
              );
            })}
          </HorizontalCarousel>
          </div>
          </div>
          </div>
        )}
      </div>
    </div>
  ), [
    form.description_en, form.description_ko, form.gallery, form.gallery_notes, form.image, form.tech, form.title, galleryImgErrors,
    galleryDragIdx, galleryFileOver, galleryOverIdx, gallerySelected, handleImageUpload, moveGalleryItem,
    onGalleryDragLeave, onGalleryDragOver, onGalleryDrop, pdfProgress, pickGalleryItem, removeGalleryItem,
    removeSelectedGallery, reorderGallery, stopAutoScroll,
    showCoverPicker, showErrors, t, tw, updateField, narration, narrationCurrent, benchSplit,
  ]);

  /* Tech Stack */
  const techSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("techStack")}</h2>
      <div className={es.field}>
        <div className={styles.techInputRow}>
          {/* combobox 형태 — input 에 타이핑 시 프리셋 추천 dropdown.
           *  - 그룹 + 아이콘 표시, 이미 추가된 항목은 옅은 accent 배경 + ✓
           *  - Enter 또는 dropdown 클릭 시 추가 (alias 정규화 + 중복 toast) */}
          <Select
            combobox
            value=""
            onChange={() => {}}
            inputValue={tech.input}
            onInputChange={tech.setInput}
            onAdd={(v) => {
              const raw = v.trim();
              if (!raw) return;
              const canonical = normalizeTechName(raw);
              if (form.tech.some((tg) => normalizeTechName(tg).toLowerCase() === canonical.toLowerCase())) {
                showToast(fillTemplate(tw("alreadyAdded"), { name: canonical }), "info");
                tech.setInput("");
                return;
              }
              tech.add(canonical);
              tech.setInput("");
            }}
            options={TECH_PRESETS.map((p) => {
              const added = form.tech.some((tg) => normalizeTechName(tg).toLowerCase() === p.name.toLowerCase());
              return {
                value: p.name,
                label: p.name,
                group: p.group,
                icon: getTechIcon(p.name),
                selected: added,
                trailing: added ? <Check size={12} strokeWidth={2.5} /> : undefined,
                // 한국어 alias 도 매칭 (예: "리액트" 입력 시 React 추천)
                searchTerms: getTechAliases(p.name),
              };
            })}
            placeholder={tw("techPlaceholder")}
          />
          <Button
            variant="outline"
            shape="circle"
            size="sm"
            className={styles.categoryAddBtnSized}
            onClick={() => {
              const raw = tech.input.trim();
              if (!raw) return;
              const canonical = normalizeTechName(raw);
              if (form.tech.some((tg) => normalizeTechName(tg).toLowerCase() === canonical.toLowerCase())) {
                showToast(fillTemplate(tw("alreadyAdded"), { name: canonical }), "info");
                tech.setInput("");
                return;
              }
              tech.add(canonical);
              tech.setInput("");
            }}
            disabled={!tech.input.trim()}
            aria-label={tw("techAdd")}
            icon={<Plus size={12} strokeWidth={2} />}
          />
        </div>
        {/* 기술별 — 공통 TagNotesEditor (drag-reorder + ko/en + multiLine add/cancel) */}
        <TagNotesEditor
          items={form.tech}
          notes={form.tech_notes ?? {}}
          onItemsChange={(next) => updateField("tech", next)}
          onNotesChange={(next) => updateField("tech_notes", next)}
          prefix=""
          notePlaceholder={tw("techNotePlaceholder")}
          addLabel={tw("noteAdd")}
          cancelLabel={tw("cancel")}
          editLabel={tw("noteEdit")}
          removeTitle={tw("techRemove")}
          multiLine
        />
      </div>
    </div>
  ), [form.tech, form.tech_notes, tech, tw, updateField]);

  /* Team Members */
  const teamSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("teamMembers")}</h2>
      {/* 추가된 팀원 — 저장된 멤버가 있을 때만 */}
      {form.team_members.length > 0 && (
        <div className={styles.memberListBlock}>
          <div className={styles.memberSubLabel}>{tw("memberListLabel")}</div>
          <List className={styles.memberList}>
            {form.team_members.map((m, i) => (
              <TeamMemberCard
                key={i}
                member={m}
                editorLang={editorLang}
                linkedAuthorName={m.author_id ? siteAuthors.find((a) => a.id === m.author_id)?.name ?? m.author_id : undefined}
                onChange={(next) => {
                  const newMembers = form.team_members.map((mm, idx) => (idx === i ? next : mm));
                  updateField("team_members", newMembers);
                }}
                onRemove={() => team.removeMember(i)}
                onEdit={() => team.editingIdx === i ? team.cancelEdit() : team.startEdit(i)}
                isEditingFull={team.editingIdx === i}
              />
            ))}
          </List>
        </div>
      )}
      {/* 새 팀원 추가 — add-mode 카드 */}
      <div className={styles.memberFormBlock}>
        <div className={styles.memberSubLabelRow}>
          <span className={styles.memberSubLabel}>
            {team.editingIdx !== null
              ? tw("memberEdit")
              : tw("memberFormLabel")}
          </span>
          {team.editingIdx !== null ? (
            <div className={styles.memberFormActions}>
              <Button
                variant="outline"
                size="xs"
                className={styles.avatarUploadBtn}
                onClick={team.cancelEdit}
                aria-label={tw("cancel")}
                icon={<X size={12} strokeWidth={2} />}
              >
                {tw("cancel")}
              </Button>
              <Button
                variant="outline"
                size="xs"
                className={styles.avatarUploadBtn}
                onClick={team.saveEdit}
                disabled={!team.memberName.trim()}
                aria-label={tw("memberSave")}
                icon={<Check size={12} strokeWidth={2} />}
              >
                {tw("memberSave")}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="xs"
              className={styles.avatarUploadBtn}
              onClick={team.addMember}
              disabled={!team.memberName.trim()}
              aria-label={tw("memberAddAria")}
              icon={<Plus size={12} strokeWidth={2} />}
            >
              {tw("memberAddButton")}
            </Button>
          )}
        </div>
        <div className={`${styles.memberCard} ${styles.memberCardAdd}`}>
          <input
            ref={teamAvatarFileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTeamAvatarFile(file);
            }}
          />
          <div className={styles.memberHeaderRow}>
            <span
              className={`${styles.memberAvatar} ${styles.memberAvatarUploadable}`}
              onDoubleClick={() => !teamAvatarUploading && teamAvatarFileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={tw("memberAvatarUpload")}
              title={tw("memberAvatarUpload")}
            >
              {teamAvatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamAvatarPreview} alt="" className={styles.memberAvatarImg} loading="lazy" />
              ) : team.memberName.trim() ? (
                <span className={styles.memberAvatarInitial}>{getMemberInitial(team.memberName)}</span>
              ) : (
                <User size={20} strokeWidth={1.5} className={styles.memberAvatarPlaceholder} />
              )}
              <Pressable
                className={styles.memberAvatarAddBadge}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!teamAvatarUploading) teamAvatarFileRef.current?.click();
                }}
                aria-label={tw("memberAvatarUpload")}
                tabIndex={-1}
              >
                <Plus size={10} strokeWidth={2.5} />
              </Pressable>
            </span>
            <BilingualInputPair
              value={{ ko: team.memberName, en: team.memberNameEn }}
              onChange={(next) => { team.setMemberName(next.ko); team.setMemberNameEn(next.en); }}
              placeholder={tw("memberName")}
            />
          </div>
          {/* email + url — name 아래 row */}
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="email"
              value={team.memberEmail}
              onChange={(e) => team.setMemberEmail(e.target.value)}
              placeholder={tw("memberEmail")}
            />
            <input
              className={es.fieldInput}
              type="url"
              value={team.memberUrl}
              onChange={(e) => team.setMemberUrl(e.target.value)}
              placeholder={tw("memberUrl")}
            />
          </div>
          {/* 사이트 멤버 연결 — 이 작업물의 편집 권한을 주는 것이라 관리자에게만 보인다 */}
          {myRole.canManageWorks && siteAuthors.length > 0 && (
            <div className={styles.memberLinkRow}>
              <span className={styles.memberLinkLabel}>
                {tw("linkSiteMember")}
              </span>
              <div className={styles.memberLinkChips}>
                {siteAuthors.map((a) => {
                  const selected = team.memberAuthorId === a.id;
                  // 다른 팀원이 이미 쓰고 있는 계정 — 편집 중인 본인 것은 제외
                  const takenByOther = !selected && linkedAuthorIds.has(a.id);
                  return (
                    <Chip
                      key={a.id}
                      active={selected}
                      className={takenByOther ? styles.memberLinkChipTaken : undefined}
                      leftIcon={
                        <AuthorAvatar
                          value={a.avatar}
                          name={a.name}
                          size={16}
                          imgClassName={styles.memberLinkChipAvatar}
                          initialClassName={styles.memberLinkChipAvatar}
                        />
                      }
                      onClick={() => {
                        if (takenByOther) {
                          showToast(
                            editorLang === "ko"
                              ? `${a.name} 은(는) 이미 다른 팀원에 연결돼 있습니다.`
                              : `${a.name} is already linked to another member.`,
                            "info",
                          );
                          return;
                        }
                        toggleLinkedAuthor(a);
                      }}
                    >
                      {a.name}
                    </Chip>
                  );
                })}
              </div>
              <p className={styles.memberLinkHint}>{tw("memberLinkHint")}</p>
            </div>
          )}
          {/* role select — 별도 row (full width) */}
          <div className={styles.memberRoleRow}>
            {teamRole.selectNode}
          </div>
          {/* 신규 멤버 add-card 역할별 작업 내용 — 공통 TagNotesEditor (ko/en 동시) */}
          {(() => {
            const rolesArr = (editorLang === "ko" ? team.memberRoleKo : team.memberRoleEn)
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
            const koMap = team.memberContribsKo as Record<string, string[]>;
            const enMap = team.memberContribsEn as Record<string, string[]>;
            const notesMap: Record<string, LocalizedText> = {};
            for (const r of rolesArr) {
              if (r in koMap || r in enMap) {
                notesMap[r] = {
                  ko: (koMap[r] ?? []).join("\n"),
                  en: (enMap[r] ?? []).join("\n"),
                };
              }
            }
            return (
              <TagNotesEditor
                items={rolesArr}
                notes={notesMap}
                onItemsChange={(next) => {
                  const setRole = editorLang === "ko" ? team.setMemberRoleKo : team.setMemberRoleEn;
                  setRole(next.join(", "));
                }}
                onNotesChange={(next) => {
                  const nextKo: Record<string, string[]> = {};
                  const nextEn: Record<string, string[]> = {};
                  for (const [r, v] of Object.entries(next)) {
                    nextKo[r] = v.ko !== undefined ? v.ko.split("\n") : [];
                    nextEn[r] = v.en !== undefined ? v.en.split("\n") : [];
                  }
                  team.setMemberContribsKo(nextKo);
                  team.setMemberContribsEn(nextEn);
                }}
                prefix=""
                notePlaceholder={tw("memberContributionPlaceholder")}
                addLabel={tw("noteAdd")}
                cancelLabel={tw("cancel")}
                      editLabel={tw("noteEdit")}
                removeTitle={tw("roleRemove")}
                      multiLine
              />
            );
          })()}
        </div>
      </div>
    </div>
  ), [
    editorLang, form.team_members, handleTeamAvatarFile, linkedAuthorIds, myRole.canManageWorks, siteAuthors, team,
    teamAvatarPreview, teamAvatarUploading, teamRole.selectNode, toggleLinkedAuthor, tw, updateField,
  ]);

  /* Links */
  const linksSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("links")}</h2>
      <div className={es.row}>
        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("liveUrl")}</label>
          <input
            className={es.fieldInput}
            type="url"
            value={form.live_url}
            onChange={(e) => updateField("live_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("githubUrl")}</label>
          <input
            className={es.fieldInput}
            type="url"
            value={form.github_url}
            onChange={(e) => updateField("github_url", e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>
      </div>
    </div>
  ), [form.github_url, form.live_url, tw, updateField]);

  /* 관련 글 */
  const relatedPostsSection = useMemo(() => (
    <div className={styles.section}>
      <div className={styles.sectionTitleRow}>
        <h2 className={styles.sectionTitle}>{tw("relatedPosts")}</h2>
        {(form.related_post_ids ?? []).length === 0 && (
          <span className={styles.sectionTitleHint}>{tw("relatedPostsEmpty")}</span>
        )}
      </div>
      <RelationPicker
        items={allPosts}
        selectedIds={form.related_post_ids ?? []}
        onChange={(ids) => updateField("related_post_ids", ids)}
        getId={(p) => p.id}
        getTitle={(p) => (language === "en" && p.title_en ? p.title_en : p.title)}
        getMeta={(p) => p.category}
        getThumb={(p) => p.cover_image}
        getStatus={(p) => (p.published ? "published" : "draft")}
        searchPlaceholder={tw("relatedPostsSearch")}
        searchInputPlaceholder={tw("relatedPostsSearchInput")}
        noResultsText={tw("relatedPostsNoResults")}
      />
    </div>
  ), [allPosts, form.related_post_ids, language, tw, updateField]);

  /* 관련 시리즈 */
  const relatedSeriesSection = useMemo(() => (
    <div className={styles.section}>
      <div className={styles.sectionTitleRow}>
        <h2 className={styles.sectionTitle}>{tw("relatedSeries")}</h2>
        {(form.related_series_ids ?? []).length === 0 && (
          <span className={styles.sectionTitleHint}>{tw("relatedSeriesEmpty")}</span>
        )}
      </div>
      <RelationPicker
        items={allSeries}
        selectedIds={form.related_series_ids ?? []}
        onChange={(ids) => updateField("related_series_ids", ids)}
        getId={(s) => s.id}
        getTitle={(s) => (language === "en" && s.title_en ? s.title_en : s.title)}
        getMeta={(s) => s.category}
        getThumb={(s) => s.cover_image}
        getStatus={(s) => (s.published ? "published" : "draft")}
        searchPlaceholder={tw("relatedSeriesSearch")}
        searchInputPlaceholder={tw("relatedSeriesSearchInput")}
        noResultsText={tw("relatedSeriesNoResults")}
      />
    </div>
  ), [allSeries, form.related_series_ids, language, tw, updateField]);

  // 홈 Selected Works 핀 — 켜면 홈 랭킹 최상단 (posts 편집기 pinToggle 미러)
  const pinToggle = (
    <Checkbox
      checked={form.is_pinned}
      onChange={(v) => updateField("is_pinned", v)}
      shape="square"
      label={tw("pinLabel")}
    />
  );

  return (
    <>
    <AdminEditorShell
      backHref="/admin/works"
      topBarFirstRowExtra={pinToggle}
      backLabel={tw("backToWorks")}
      editorLang={editorLang}
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      deleteTargetName={work?.title}
      onSaveDraft={() => handleSave()}
      onPublish={() => handleSave(true)}
      scheduledAt={form.scheduled_at}
      onScheduledChange={(iso) => updateField("scheduled_at", iso)}
      onPreview={handlePreview}
      viewHref={form.published && form.slug ? `/works/${form.slug}` : undefined}
      status={status}
      statusType={statusType}
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
          title: form.title,
          subtitle: (isKo ? form.subtitle_ko : form.subtitle_en) || "",
          excerpt: (isKo ? form.description_ko : form.description_en) || "",
          content: stripHtml((isKo ? form.content_ko : form.content_en) || ""),
          meta: workSnapshotMeta(form, lang),
        };
      }}
      coverSlot={
        /* 커버 배너 + 페이지 이모지 — topBar 위 최상단(전역 nav 바로 아래) */
        <CoverBanner
          cover={form.image}
          onCoverChange={(url) => updateField("image", url)}
          onUpload={() => handleImageUpload("image")}
          emoji={form.icon || null}
          onEmojiChange={(e) => updateField("icon", e ?? "")}
        />
      }
    >
      {basicInfoSection}

      {/* Detail Content */}
      <div className={styles.section} data-required="content">
        <div className={styles.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <h2 className={`${styles.sectionTitle}${showErrors && !form.content_ko.trim() && !form.content_en.trim() ? ` ${styles.sectionTitleError}` : ""}`} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
              {tw("content")}
            </h2>
            <Pressable
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {tw("insertTemplate")}
            </Pressable>
          </div>
          <Checkbox
            checked={editorHtmlMode}
            onChange={() => plateRef.current?.toggleHtmlMode()}
            shape="square"
            label="HTML"
          />
        </div>

        <div className={styles.editorBlock}>
          <Editor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => {
              updateField(contentKey, v);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onImageUpload={handleContentImageUpload}
            editorRef={plateRef}
            postLang={editorLang}
            onHtmlModeChange={setEditorHtmlMode}
          />
        </div>

        {/* ── 본문 첨부 이미지 패널 (Posts editor 와 동일) ── */}
        <div style={{ marginTop: "var(--spacing-md)" }}>
          <ImagePanel
            images={editorImages}
            onSelect={(path) => plateRef.current?.selectImageAt(path)}
            onReorder={(from, to) => plateRef.current?.reorderImage(from, to)}
            onRemove={(path) => plateRef.current?.removeImage(path)}
            onImageUpload={async (file) => {
              const url = await handleContentImageUpload(file);
              plateRef.current?.insertImageByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onVideoUpload={async (file) => {
              const url = await handleContentImageUpload(file);
              plateRef.current?.insertMediaByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onBulkInsert={(items) => {
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
      </div>

      {imagesSection}

      {/* ── 추가 정보 (Tech + Team + Links + RelatedPosts) — 선택 입력 통합 collapsible ── */}
      <div className={styles.extraSections}>
        <Pressable
          className={styles.optionalToggle}
          onClick={() => setExtraOpen((v) => !v)}
        >
          <span>{tw("additionalInfo")}</span>
          <ChevronRight
            size={12}
            strokeWidth={2.5}
            style={{ transform: extraOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </Pressable>
        <div className={`${styles.extraSectionsContent}${extraOpen ? ` ${styles.extraSectionsContentOpen}` : ""}`}>

      {techSection}

      {teamSection}

      {linksSection}

      {relatedPostsSection}

      {relatedSeriesSection}

        </div>{/* /extraSectionsContent */}
      </div>{/* /extraSections (Tech+Team+Links+Related) */}

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (works 는 number/slug 없음) */}
      <SeoChecklist
        data={{
          title: form.title,
          excerpt: editorLang === "ko" ? form.description_ko : form.description_en,
          cover: form.image,
          category: (editorLang === "ko" ? form.categories_ko : form.categories_en)?.join(", ") ?? "",
          tagsCount: form.tech?.length ?? 0,
        }}
        onItemClick={(id: SeoCheckId) => {
          const fieldId = id === "excerpt" ? "work-description" : id === "cover" ? "work-image" : id === "tags" ? "work-tech" : `work-${id}`;
          const el = document.getElementById(fieldId);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
          // 이동한 필드를 상호작용 전까지 blink
          flashSeoField(el);
        }}
      />
      <ImageViewer
        images={form.gallery}
        index={galleryViewerIdx ?? 0}
        open={galleryViewerIdx !== null}
        onClose={() => setGalleryViewerIdx(null)}
        title={form.title}
      />
    </AdminEditorShell>
    {/* 초안 복원 모달 확인 동안 사용자 인터랙션 차단 */}
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
