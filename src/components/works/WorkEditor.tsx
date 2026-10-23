"use client";

import { authoringLangOf } from "@/lib/siteLanguage";
import { useSourceBadge } from "@/hooks/useSourceBadge";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PREVIEW_KEY } from "@/constants";
import { useRouter } from "next/navigation";
import { mdToRichHtml } from "@/components/posts/mdToRichHtml";
import { Plus, Check, Globe, GithubIcon } from "@/components/icons";
import { GALLERY_NOTES_DROPPED_HEADER } from "@/lib/api/galleryNotesColumn";
import { WORK_COVER_DROPPED_HEADER } from "@/lib/api/workCoverColumns";
import { WORK_LANDING_DROPPED_HEADER } from "@/lib/api/workLandingColumn";
import LandingEditor, { asEditableLanding } from "./landing/editor/LandingEditor";
import { landingOf } from "./landing/landingData";
import { pickFiles } from "@/lib/pickFiles";
import { ExtraEmpty, ExtraSummary, type ExtraItem, type ExtraKey } from "./workEditor/ExtraInfoViews";
import { TechChips } from "./workEditor/TechChips";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { focusFirstMissingField } from "@/utils/focusFirstMissing";
import { generateSlug, validateSlug } from "@/utils/postSlug";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import SeoChecklist, { type SeoCheckId } from "@/components/admin/SeoChecklist";
import "@/components/admin/seoFlash.css";
import { flashSeoField } from "@/components/admin/seoFlash";
import { workFormToProject, type TeamMember, type Work, type WorkFormData } from "@/types/work";
import { OWNER_AUTHOR_ID } from "@/utils/resolvePostAuthors";
import { noteFor, patchNote } from "@/lib/galleryNotes";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useEditorLeaveGuard } from "@/hooks/useEditorLeaveGuard";
import { useEditorDraft } from "@/hooks/useEditorDraft";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useTagInput } from "@/hooks/useTagInput";
import { autoTranslate } from "@/utils/autoTranslate";
import { notifyAiFailures } from "@/lib/ai/notifyFailures";
import { TECH_PRESETS } from "@/data/workTemplates";
import { getTechIcon, normalizeTechName, getTechAliases } from "@/data/techIcons";
import { showToast } from "@/stores/toastStore";
import { workToFormData, defaultForm, syncOwnerRole } from "@/utils/workFormUtils";
import { restoreSavedForm } from "@/utils/restoreSavedForm";
import { stripHtml } from "@/utils/htmlUtils";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type {} from "@/data/profile";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverBanner from "@/components/admin/CoverBanner";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useFocusOnceWhenReady } from "@/hooks/useFocusOnceWhenReady";
import styles from "./WorkEditor.module.css";
import { CategoryMultiPicker, type WorksCategory } from "./workEditor/CategoryPicker";
import { SubtitleInput } from "./workEditor/SubtitleInput";
import { workSnapshotMeta } from "./workEditor/workSnapshotMeta";
import { parseYearAsPeriod, serializePeriodAsYear } from "./workEditor/periodFormat";
import { CodedError, errorFromBody, errorText } from "@/lib/apiError";
import { tryRequest } from "@/lib/sendAction";
import InputBlocker from "@/components/ui/InputBlocker";
import Badge from "@/components/ui/Badge";

interface WorkEditorProps {
  work?: Work;
}

export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const srcBadge = useSourceBadge();
  const { t, tLang } = useLanguage();
  const { openModal } = useModalStore();
  const isEdit = !!work;
  const serviceStatus = useServiceStatus();
  // 콘텐츠 작성 기본 언어 — nature/categories 필수 항목 + 초기 편집 언어의 기준 (방문자 언어와 무관)
  const primaryLang = authoringLangOf(useSiteConfig().metadata.defaultLanguage);

  const [editorLang, setEditorLang] = useState<"ko" | "en">(primaryLang);
  const titleInputRef = useRef<HTMLInputElement>(null);
  /* 추가 정보 — 펼친 항목(요약 카드 아래 편집기). 처음에는 모두 접어 둔다 */
  const [extraOpenKey, setExtraOpenKey] = useState<ExtraKey | null>(null);
  // slug — 사용자가 직접 수정한 적 있으면 manual 모드로 (제목 변경 시 auto-regenerate 안 함)
  const [slugManual, setSlugManual] = useState(!!work?.slug);

  /* 편집 화면 문구는 관리자 화면 언어를 따른다(편집 중인 작업물의 언어 탭이 아니라). 글 편집기와 같다. */
  const tw = useCallback((key: string) => t(`admin.works.editor.${key}`), [t]);
  const [translating, setTranslating] = useState(false);

  /* 팀원 기본값 — 사이트 소유자(본인)를 따로 연결하지 않아도 팀원 맨 앞에 둔다. 상세 화면이 소유자 카드를
     늘 붙이던 것과 편집 화면 목록을 맞추기 위해서다. 이미 소유자 계정에 연결된 팀원이 있으면 건드리지 않는다.
     처음 값에 들어가므로 열자마자 "변경됨"으로 잡히지 않고, 다음 저장 때 목록에 남는다 */
  const ownerSiteConfig = useSiteConfig();
  const withOwnerMember = (f: WorkFormData): WorkFormData => {
    /* 예전에 따로 적던 "내 역할·담당 업무"는 본인 팀원으로 옮긴다 — 본인 팀원이 이미 있으면 빈 칸만 채운다 */
    const hasContribs = (c?: Record<string, string[]>) => !!c && Object.values(c).some((v) => v.length > 0);
    const existing = f.team_members.find((m) => m.author_id === OWNER_AUTHOR_ID);
    if (existing) {
      const filled: TeamMember = {
        ...existing,
        role_ko: existing.role_ko?.trim() ? existing.role_ko : f.role_ko,
        role_en: existing.role_en?.trim() ? existing.role_en : f.role_en,
        contributions_ko: hasContribs(existing.contributions_ko) ? existing.contributions_ko : f.contributions_ko,
        contributions_en: hasContribs(existing.contributions_en) ? existing.contributions_en : f.contributions_en,
      };
      return { ...f, team_members: f.team_members.map((m) => (m === existing ? filled : m)) };
    }
    const personal = ownerSiteConfig.personal;
    const profile = (ownerSiteConfig.authors ?? []).find((a) => a.id === OWNER_AUTHOR_ID);
    /* 이름은 멤버 프로필(설정 > 계정)의 한국어·영어 이름이 먼저 — 사이트 기본 정보의 이름은 대개 한 언어뿐이다 */
    const name = profile?.name?.trim() || personal?.name?.trim();
    if (!name) return f;
    const profileAvatar = profile?.avatar && (/^(https?:)?\/\//.test(profile.avatar) || profile.avatar.startsWith("/")) ? profile.avatar : undefined;
    const github = ownerSiteConfig.socialLinks?.find((l) => l.platform === "github")?.url;
    const owner: TeamMember = {
      author_id: OWNER_AUTHOR_ID,
      name,
      name_en: profile?.name_en?.trim() || (personal?.name?.trim() !== name ? personal?.name?.trim() : undefined) || undefined,
      role_ko: f.role_ko,
      role_en: f.role_en,
      url: github || undefined,
      email: profile?.email || ownerSiteConfig.contact?.email || undefined,
      avatar_url: profileAvatar || personal?.profileImage || undefined,
      contributions_ko: hasContribs(f.contributions_ko) ? f.contributions_ko : undefined,
      contributions_en: hasContribs(f.contributions_en) ? f.contributions_en : undefined,
    };
    return { ...f, team_members: [owner, ...f.team_members] };
  };

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return withOwnerMember(defaultForm);
    const f = withOwnerMember(workToFormData(work));
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
  const [initialJson, setInitialJson] = useState(() => JSON.stringify(form));
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

  /* 다른 작업물 — 미리보기 번호(새 작업물은 맨 뒤 자리)를 매길 때만 쓴다. 순서는 작업물 목록에서 끌어서 바꾼다 */
  const [otherWorks, setOtherWorks] = useState<Array<{ id: string; title: string; sort_order: number }>>([]);
  /* 순서 목록의 이 작업물 자리 — 값이 아니라 앞선 작업물 수로 정한다. 휴지통으로 간 작업물이 빈 번호를 남기면
     값(4)과 자리(3번째)가 어긋나기 때문이다(#873). 새 작업물(0)은 맨 뒤 */
  const sortPosition = form.sort_order > 0
    ? otherWorks.filter((w) => w.sort_order < form.sort_order).length + 1
    : otherWorks.length + 1;

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

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
    baseSavedAt: work?.updated_at ? new Date(work.updated_at).getTime() : undefined,
    snapshot: form,
    // 로컬 로드 완료 → localStorage 복원 + baseline. 서버 로드 완료 → 서버(cross-device) 복원(단 미편집 시).
    ready: initialLoadsReady,
    serverReady: revisionsLoaded,
    applyDraft: (draft) => {
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
  /* 기술 추가 — "React, Next.js" 처럼 쉼표 · 줄바꿈으로 여러 개를 한 번에. 이미 있는 것은 건너뛰고 알린다 */
  const addTechs = useCallback((raw: string) => {
    const names = raw.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).map(normalizeTechName);
    if (names.length === 0) return;
    const have = new Set(form.tech.map((tg) => normalizeTechName(tg).toLowerCase()));
    const added: string[] = [];
    const dup: string[] = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (have.has(key)) { dup.push(name); continue; }
      have.add(key);
      added.push(name);
    }
    if (added.length > 0) updateField("tech", [...form.tech, ...added]);
    if (dup.length > 0) showToast(fillTemplate(tw("alreadyAdded"), { name: dup.join(", ") }), "info");
    tech.setInput("");
  }, [form.tech, tech, tw, updateField]);

  const TRANSLATABLE_FIELDS = useMemo(
    () => ["title", "subtitle", "description", "role"] as const,
    [],
  );

  // 필드 논리명 → form 키. title 만 bare+_en 컨벤션(title/title_en), 나머지는 _ko/_en.
  const fieldKeyFor = useCallback(
    (f: string, l: "ko" | "en"): keyof WorkFormData =>
      (f === "title" ? (l === "ko" ? "title" : "title_en") : `${f}_${l}`) as keyof WorkFormData,
    [],
  );

  /* fieldKeys 에 "gallery" 가 있으면 갤러리 대본도 번역한다 — 원문 언어 대본이 있는 장마다 한 문장씩.
     onlyMissing: 반대 언어 대본이 이미 있는 장은 건너뛴다(편집 언어를 바꿀 때의 자동 번역)
     urls: 그 장들의 대본만 번역한다(갤러리 음성 편집의 번역 버튼 — 고친 장만 다시 번역) */
  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en", { onlyMissing = false, urls }: { onlyMissing?: boolean; urls?: string[] } = {}) => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const activeFields = TRANSLATABLE_FIELDS.filter(
        (f) => want.has(f) && (form[fieldKeyFor(f, sourceLang)] as string)?.trim(),
      );
      const scriptOf = (url: string, l: "ko" | "en") => noteFor(form.gallery_notes?.[url], l)?.script?.trim() ?? "";
      const scriptUrls = want.has("gallery")
        ? form.gallery.filter((url) => (!urls || urls.includes(url)) && scriptOf(url, sourceLang) && (!onlyMissing || !scriptOf(url, targetLang)))
        : [];
      const texts = [
        ...(activeFields.map((f) => form[fieldKeyFor(f, sourceLang)]) as string[]),
        ...scriptUrls.map((url) => scriptOf(url, sourceLang)),
      ];

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tw("translating"));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      const feature = t("admin.aiHealth.feature.translation");
      if ("translations" in result) {
        /* 번역이 비어 온 칸(failedIndices)은 건드리지 않는다 — 빈 문자열로 덮으면 그 언어의 글이 지워진다 */
        const patch: Partial<WorkFormData> = {};
        activeFields.forEach((f, i) => {
          if (!result.failedIndices.includes(i)) patch[fieldKeyFor(f, targetLang)] = result.translations[i] as never;
        });
        setForm((prev) => {
          /* 갤러리 대본 — 텍스트 칸 뒤에 이어 보낸 순서대로 제 장에 넣는다 */
          let notes = prev.gallery_notes ?? {};
          scriptUrls.forEach((url, j) => {
            const i = activeFields.length + j;
            if (!result.failedIndices.includes(i) && result.translations[i]) notes = patchNote(notes, url, targetLang, { script: result.translations[i] });
          });
          return { ...prev, ...patch, ...(scriptUrls.length ? { gallery_notes: notes } : {}) };
        });
        setStatus(tw("autoTranslated"));
        setStatusType("success");
        notifyAiFailures(result, t, { feature, ok: true });
      } else {
        setError(errorText(result.error, t, tw("translateFailed")));
        notifyAiFailures(result, t, { feature, ok: false });
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
      if (hasSrc && !hasDst) await translateFields([...TRANSLATABLE_FIELDS], newLang, { onlyMissing: true });
    },
    [form, translating, translateFields, TRANSLATABLE_FIELDS, fieldKeyFor],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? [...TRANSLATABLE_FIELDS], editorLang);
    },
    [translating, editorLang, translateFields, TRANSLATABLE_FIELDS],
  );

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
  /* 그림·영상 하나를 올려 주소를 돌려준다 — 크기를 보고, 그림은 줄인 뒤 다시 본다. 실패하면 fail 로 알리고 null */
  const uploadMedia = useCallback(async (
    file: File,
    fail: (err: unknown) => void,
    { compressImage, validateFileSize }: typeof import("@/lib/compressImage"),
  ): Promise<{ url: string } | null> => {
    const sizeError = validateFileSize(file);
    if (sizeError) { fail(sizeError); return null; }
    // 비디오는 압축 X — 그대로 업로드. 이미지만 압축 파이프라인.
    const isVideo = file.type.startsWith("video/");
    const payload = isVideo ? file : await compressImage(file);
    // 압축 후에도 한도 초과면 reject
    const postError = validateFileSize(payload, undefined, { skipCompressibleBypass: true });
    if (postError) { fail(postError); return null; }
    const formData = new FormData();
    formData.append("file", payload);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) { fail(data); return null; }
    return { url: data.url as string };
  }, []);

  /* 표지 — 고른 그림 · 영상 하나를 올려 대표 이미지로 둔다(갤러리는 GalleryEditor 가 따로 들인다) */
  const ingestCover = useCallback(async (files: File[]) => {
    const [file] = files;
    if (!file) return;
    const fail = (err: unknown) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
    const data = await uploadMedia(file, fail, await import("@/lib/compressImage"));
    if (data) updateField("image", data.url);
  }, [t, updateField, uploadMedia]);

  /* 고르기 창 */
  const handleImageUpload = useCallback(() => {
    pickFiles({ accept: "image/*,video/mp4,video/webm,video/quicktime" }, (files) => {
      /* 업로드 흐름이 예상 못 한 곳에서 던지면 아무 표시 없이 끝났다 — 사유를 알린다 */
      ingestCover(files).catch((err) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error"));
    });
  }, [ingestCover, t]);

  const handleSave = useCallback(
    /* stay: 저장한 뒤 목록으로 나가지 않고 편집을 이어 간다 — 상단 상태 칩의 발행 전환(#1116) */
    async (publish?: boolean, { stay = false }: { stay?: boolean } = {}) => {
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
      /* 내 역할·담당 업무는 본인 팀원 값으로 — 목록 카드·상세 정보 칸이 role_*·contributions_* 를 읽는다 */
      /* 순서(sort_order)는 보내지 않는다 — 작업물 목록에서 끌어서 바꾸고, 새 작업물은 서버가 맨 뒤에 둔다 */
      const { related_post_ids, related_series_ids, sort_order: _sortOrder, ...workBody } = syncOwnerRole(form);
      /* 지운 장의 음성은 남기지 않는다 — 그림 주소가 열쇠라 갤러리에 없는 항목은 쓰일 일이 없다 */
      const inGallery = new Set(form.gallery);
      const galleryNotes = Object.fromEntries(Object.entries(form.gallery_notes ?? {}).filter(([url]) => inGallery.has(url)));
      const body = {
        ...workBody,
        gallery_notes: galleryNotes,
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
        /* 랜딩 칸도 같다 — 랜딩을 고친 경우에만 알린다 */
        if (res.headers.get(WORK_LANDING_DROPPED_HEADER) && form.landing) {
          showToast(tw("landing.notSaved"), "error", 6000);
        }
        /* 커버 위치 · 확대 칸도 같다 — 기본값에서 옮긴 경우에만 알린다 */
        if (res.headers.get(WORK_COVER_DROPPED_HEADER) && (form.cover_position !== 50 || form.cover_zoom !== 1)) {
          showToast(tw("coverPositionNotSaved"), "error", 6000);
        }
  
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
        if (stay) {
          /* 저장한 값이 새 기준이다 — 그대로 두면 저장했는데도 "고친 내용이 있다" 로 남아 나갈 때 다시 묻는다 */
          const saved = { ...form, published: willPublish };
          initialFormRef.current = saved;
          setInitialJson(JSON.stringify(saved));
          setForm((prev) => ({ ...prev, published: willPublish }));
          requestAnimationFrame(() => markBaseline());
          setStatus(t(willPublish ? "admin.common.nowPublished" : "admin.common.nowUnpublished"));
          setStatusType("success");
          return;
        }
        router.push("/admin/works");
      } catch {
        setError(tw("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, t, tw, savedId, primaryLang, clearDraft, isEdit, markBaseline],
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
    setForm(initialFormRef.current);
    setStatus(tw("reverted"));
    setStatusType("info");
  }, [tw]);

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
    ],
    [tw],
  );

  const suf = editorLang === "ko" ? "_ko" : "_en";
  // 제목은 title(국문/기본) / title_en(영문) 이중언어 — editorLang 토글로 전환
  const titleKey = editorLang === "ko" ? "title" : "title_en";
  // 필수 제목 값 — 콘텐츠 작성 기본 언어 기준
  const reqTitle = primaryLang === "en" ? form.title_en : form.title;

  /* 본문과 상관없는 섹션은 쓰는 값이 바뀔 때만 다시 그린다. 본문 한 글자마다 편집 화면 전체를 다시 그려
     입력이 늦었다(#850). 섹션 JSX 를 메모해 두면 React 는 같은 요소를 받아 그 아래를 건너뛴다.
     의존성은 exhaustive-deps 가 확인한다 — 빠뜨리면 경고로 잡힌다. */
  const titleValue = form[titleKey];
  const subtitleValue = form[`subtitle${suf}`];
  const descriptionValue = form[`description${suf}`];

  /* 랜딩 — 저장된 값이 있으면 그것을, 없으면 저장소 기본 데이터 · 카드 정보로 만든 기본 랜딩을 편집 출발점으로 */
  const editableLanding = useMemo(() => asEditableLanding(form.landing), [form.landing]);
  const landingValue = useMemo(() => editableLanding ?? landingOf(workFormToProject(form)), [editableLanding, form]);

  /* Basic Info — 필수 (title, year, category) + 선택 (collapsible) */
  const basicInfoSection = useMemo(() => (
    <div className={styles.section}>
      {/* ── 필수 ── 제목 + 부제목 + slug 묶음 */}
      <div className={es.field} data-required="title" id="work-title">
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
        <div className={es.fieldLabelRow}>
          <label className={es.fieldLabel}>{tw("subtitle")}</label>
          <span className={es.fieldHint}>{tw("subtitleHint")}</span>
        </div>
        <SubtitleInput
          value={subtitleValue}
          onChange={(v) => updateField(`subtitle${suf}`, v)}
          placeholder={tw("subtitlePlaceholder")}
        />
      </div>

      {/* 설명 — 기본 정보의 하위 항목, 선택 입력보다 위 */}
      <div className={es.field} id="work-description">
        <div className={es.fieldLabelRow}>
          <label className={es.fieldLabel}>{tw("description")}</label>
          <span className={es.fieldHint}>{tw("descriptionHint")}</span>
        </div>
        <Textarea
          textareaClassName={styles.fieldTextarea}
          value={descriptionValue}
          onChange={(v) => updateField(`description${suf}`, v)}
          placeholder={tw("descPlaceholder")}
          rows={3}
          maxHint="basic"
        />
      </div>
    </div>
  ), [
    descriptionValue, reqTitle, showErrors, subtitleValue, suf, titleKey, titleValue, tw, updateField,
  ]);

  // 홈 Selected Works 핀 — 켜면 홈 랭킹 최상단 (posts 편집기 pinToggle 미러). 속성 패널 맨 위에 선다
  const pinToggle = useMemo(() => (
    <Checkbox
      checked={form.is_pinned}
      onChange={(v) => updateField("is_pinned", v)}
      shape="square"
      label={tw("pinLabel")}
    />
  ), [form.is_pinned, tw, updateField]);

  /* 속성 패널 — 주소 · 기간 · 성격 · 분류와 홈 고정. 본문 옆 열(넓은 화면) 또는 서랍(좁은 화면)에 선다 */
  /* 커버 이미지 — 목록 · 공유 카드에 쓰이는 대표 한 장이라 속성 패널에 둔다(갤러리와 떨어뜨려) */
  const coverField = useMemo(() => (
    <div data-required="image" id="work-image">
      <CoverImageField
        value={form.image}
        onChange={(url) => updateField("image", url)}
        label={tw("mainImage")}
        removeLabel={tw("remove")}
        uploadLabel={tw("uploadImage")}
        chooseLabel={tw("chooseCover")}
        closeLabel={tw("closePicker")}
        onUpload={() => handleImageUpload()}
        pickerOpen={showCoverPicker}
        onPickerToggle={() => setShowCoverPicker((v) => !v)}
        urlInputPlaceholder={tw("pasteUrl")}
        hasError={showErrors && !form.image.trim()}
        fill
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
  ), [
    form.description_en, form.description_ko, form.image, form.tech, form.title,
    handleImageUpload, showCoverPicker, showErrors, tw, updateField,
  ]);

  const propertiesSection = useMemo(() => (
    <div className={styles.properties}>
      {pinToggle}

      {/* 메인 이미지 — 목록 카드 · 랜딩의 얼굴이라 속성 맨 위(slug 위)에 */}
      {coverField}

      {/* slug — title 자동 생성. 사용자 수정 시 manual 모드 */}
      <div className={es.field} id="work-slug">
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-8)" }}>
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{tw("slug")}</label>
          {form.slug.trim() && validateSlug(form.slug) && (
            <span style={{ fontSize: "var(--font-size-body-sm)", color: "var(--text-accent)" }}>{tw(`slugError.${validateSlug(form.slug)}`) || validateSlug(form.slug)}</span>
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
                      <Badge className={styles.customCategoryBadge}>{srcBadge}</Badge>
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
                      <Badge className={styles.customCategoryBadge}>EN</Badge>
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
        <div className={es.field} style={{ gridColumn: "1 / -1" }} data-required="category" id="work-category">
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

    </div>
  ), [
    coverField, srcBadge, categoryCustomMode, editorLang, form.categories_en, form.categories_ko,
    form.nature_en, form.nature_ko, form.slug, form.year,
    natureCustomMode, naturePresets, pinToggle, primaryLang,
    showErrors, tw, updateField, worksCategories,
  ]);

  /* 기술 추가 줄 — 프리셋 추천 combobox + ＋. 기본 보기와 표 보기가 같이 쓴다 */
  const techAddRow = useMemo(() => (
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
        onAdd={addTechs}
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
        className={styles.categoryAddBtnSized}
        onClick={() => addTechs(tech.input)}
        disabled={!tech.input.trim()}
        aria-label={tw("techAdd")}
        icon={<Plus size={14} strokeWidth={2} />}
      />
    </div>
  ), [addTechs, form.tech, tech, tw]);

  /* Tech Stack */
  const techSection = useMemo(() => (
    /* id — SEO 체크리스트의 "태그" 항목이 여기로 옮겨 온다 */
    <div className={styles.section} id="work-tech">
      <h2 className={styles.sectionTitle}>{tw("techStack")}</h2>
      <p className={styles.extraHint}>{tw("techHint")}</p>
      <div className={es.field}>
        {techAddRow}
        <TechChips
          items={form.tech}
          notes={form.tech_notes ?? {}}
          onItemsChange={(next) => updateField("tech", next)}
          onNotesChange={(next) => updateField("tech_notes", next)}
          labels={{ remove: tw("techRemove"), empty: tw("techEmpty") }}
        />
      </div>
    </div>
  ), [form.tech, form.tech_notes, techAddRow, tw, updateField]);




  /* 추가 정보 항목 — 제목 · 개수 · 미리보기 · 편집기. 세 보기가 같이 쓴다 */
  /* Links */
  const linksSection = useMemo(() => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{tw("links")}</h2>
      <p className={styles.extraHint}>{tw("linksHint")}</p>
      {/* 한 줄에 하나 — [아이콘 · 이름 | 주소]. 이름 칸 폭이 같아 두 주소 칸의 시작이 맞는다 */}
      <div className={styles.linkRows}>
        <label className={styles.linkRow}>
          <span className={styles.linkRowLabel}><Globe size={14} strokeWidth={1.8} />{tw("liveUrl")}</span>
          <input
            className={es.fieldInput}
            type="url"
            value={form.live_url}
            onChange={(e) => updateField("live_url", e.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className={styles.linkRow}>
          <span className={styles.linkRowLabel}><GithubIcon size={14} />{tw("githubUrl")}</span>
          <input
            className={es.fieldInput}
            type="url"
            value={form.github_url}
            onChange={(e) => updateField("github_url", e.target.value)}
            placeholder="https://github.com/..."
          />
        </label>
      </div>
    </div>
  ), [form.github_url, form.live_url, tw, updateField]);

  const extraItems = useMemo<ExtraItem[]>(() => {
    const empty = <ExtraEmpty>{tw("extraEmpty")}</ExtraEmpty>;
    const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };
    const links = [form.live_url, form.github_url].filter((u): u is string => !!u?.trim());
    return [
      {
        key: "tech",
        title: tw("techStack"),
        count: form.tech.length,
        preview: form.tech.length === 0 ? empty : (
          <>
            {form.tech.slice(0, 10).map((tg) => (
              <span key={tg} className={styles.extraPreviewChip}>{getTechIcon(tg)}{tg}</span>
            ))}
            {form.tech.length > 10 && <span>+{form.tech.length - 10}</span>}
          </>
        ),
        body: techSection,
      },
      {
        key: "links",
        title: tw("links"),
        count: links.length,
        preview: links.length === 0 ? empty : <>{links.map((u) => <span key={u} className={styles.extraPreviewChip}>{host(u)}</span>)}</>,
        body: linksSection,
      },
    ];
  }, [form.github_url, form.live_url, form.tech, linksSection, techSection, tw]);

  return (
    <>
    <AdminEditorShell
      backHref="/admin/works"
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
      onTogglePublished={isEdit ? () => handleSave(!form.published, { stay: true }) : undefined}
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
      sidebar={propertiesSection}
      coverSlot={
        /* 커버 배너 + 페이지 이모지 — topBar 위 최상단(전역 nav 바로 아래) */
        <CoverBanner
          cover={form.image}
          onCoverChange={(url) => updateField("image", url)}
          onUpload={() => handleImageUpload()}
          position={form.cover_position}
          zoom={form.cover_zoom}
        />
      }
    >
      {basicInfoSection}

      {/* 랜딩 페이지 — 속성 열 옆 본문 열에(아래 전체 폭에 두면 짧은 기본 정보 옆이 크게 비었다). 추가 정보도 같은 열에 두어
          2단의 끝이 멀리 있으므로, 섹션을 여닫아 높이가 바뀌어도 붙어 따라오는 속성 열이 밀리지 않는다 */}
      <div className={styles.section}>
        <LandingEditor
          value={landingValue}
          lang={editorLang}
          onUpload={handleContentImageUpload}
          onChange={(next) => updateField("landing", next)}
        />
      </div>

      {/* ── 추가 정보 — 요약 카드 한 줄 + 누른 항목의 편집기가 그 아래에 펼쳐진다 ── */}
      <div className={styles.extraSections}>
        <h2 className={styles.sectionTitle}>{tw("additionalInfo")}</h2>
        <ExtraSummary items={extraItems} open={extraOpenKey} onOpenChange={setExtraOpenKey} />
      </div>

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (works 는 number/slug 없음) */}
      <SeoChecklist
        data={{
          title: form.title,
          slug: form.slug,
          excerpt: editorLang === "ko" ? form.description_ko : form.description_en,
          cover: form.image,
          category: (editorLang === "ko" ? form.categories_ko : form.categories_en)?.join(", ") ?? "",
          tagsCount: form.tech?.length ?? 0,
        }}
        onItemClick={(id: SeoCheckId) => {
          const fieldId = id === "excerpt" ? "work-description" : id === "cover" ? "work-image" : id === "tags" ? "work-tech" : `work-${id}`;
          if (id === "tags" && extraOpenKey !== "tech") {
            /* 기술 칸은 추가 정보의 펼친 항목일 때만 그려진다 — 펼치고 다음 프레임에 다시 찾는다 */
            setExtraOpenKey("tech");
            requestAnimationFrame(() => {
              const el2 = document.getElementById(fieldId);
              el2?.scrollIntoView({ behavior: "smooth", block: "center" });
              if (el2) flashSeoField(el2);
            });
            return;
          }
          const el = document.getElementById(fieldId);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
          // 이동한 필드를 상호작용 전까지 blink
          flashSeoField(el);
        }}
      />
    </AdminEditorShell>
    {/* 초안 복원 모달 확인 동안 사용자 인터랙션 차단 */}
    {!revisionsLoaded && (
      <InputBlocker />
    )}
    </>
  );
}
