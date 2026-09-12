"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import type { LocalizedText } from "@/types/common";
import { PREVIEW_KEY } from "@/constants";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { mdToRichHtml } from "@/components/posts/mdToRichHtml";
import { ChevronRight, Plus, Star, Check, X, User } from "@/components/icons";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
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
import { useEditorDraft } from "@/hooks/useEditorDraft";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useTagInput } from "@/hooks/useTagInput";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { autoTranslate } from "@/utils/autoTranslate";
import { WORK_TEMPLATES, TECH_PRESETS, type WorkTemplate } from "@/data/workTemplates";
import { getTechIcon, normalizeTechName, getTechAliases } from "@/data/techIcons";
import { showToast } from "@/stores/toastStore";
import { workToFormData, defaultForm } from "@/utils/workFormUtils";
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
      setForm(draft);
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

  const handleImageUpload = useCallback(async (field: "image" | "gallery") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/mp4,video/webm,video/quicktime";
    input.multiple = field === "gallery";
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;

      const { compressImage, validateFileSize } = await import("@/lib/compressImage");
      /* 막히거나 거절되면 사유를 화면 언어로 알린다. 예전에는 브라우저 alert 에 한국어 문장이 떴고,
         서버가 거절하면 아무 표시 없이 넘어갔다 */
      const fail = (err: unknown) => showToast(errorText(err, t, t("admin.common.uploadFailed")), "error");
      for (const file of Array.from(files)) {
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
          setForm((prev) => ({ ...prev, gallery: [...prev.gallery, data.url] }));
        }
      }
    };
    input.click();
  }, [t, updateField]);

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
      const { related_post_ids, related_series_ids, ...workBody } = form;
      const body = {
        ...workBody,
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

        // 관계 동기화 — 별도 endpoint
        if (savedId.current && related_post_ids) {
          await fetch(`/api/admin/works/${savedId.current}/related-posts`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postIds: related_post_ids }),
          }).catch(() => {});
        }
        if (savedId.current && related_series_ids) {
          await fetch(`/api/admin/works/${savedId.current}/related-series`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seriesIds: related_series_ids }),
          }).catch(() => {});
        }

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
    sessionStorage.setItem(PREVIEW_KEY.work, JSON.stringify(form));
    window.open("/admin/works/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot);
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
                currentOrder={form.sort_order || 1}
                otherItems={otherWorks}
                onChange={(newOrder, otherUpdates) => {
                  updateField("sort_order", newOrder);
                  otherUpdates.forEach((u) => {
                    fetch(`/api/works/${u.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sort_order: u.sort_order }),
                    });
                  });
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
    form.contributions_ko, form.nature_en, form.nature_ko, form.slug, form.sort_order, form.title, form.year,
    natureCustomMode, naturePresets, optionalOpen, otherWorks, ownRole.selectNode, primaryLang, reqTitle, roleValue,
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
          <Button
            variant="outline"
            size="xs"
            shape="capsule"
            onClick={() => handleImageUpload("gallery")}
            soundDisabled
          >
            <Plus size={12} strokeWidth={2} />
            {tw("addMore")}
          </Button>
        </div>
        {form.gallery.length === 0 ? (
          <Pressable
            className={styles.galleryAddTile}
            onClick={() => handleImageUpload("gallery")}
          >
            <Plus size={20} strokeWidth={1.5} />
            <span>{tw("addGallery")}</span>
          </Pressable>
        ) : (
          <HorizontalCarousel className={styles.galleryCarousel}>
            {form.gallery.map((src, i) => {
              const isMain = src === form.image && !!src;
              const filename = src.split("/").pop() ?? src;
              return (
                <div
                  key={i}
                  className={`${styles.galleryItem} ${isMain ? styles.galleryItemMain : ""}`}
                  onClick={() => setGalleryViewerIdx(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGalleryViewerIdx(i); } }}
                  aria-label={tw("viewImage")}
                >
                  {isVideoUrl(src) && !galleryImgErrors.has(src) ? (
                    <video
                      src={src}
                      className={styles.galleryImg}
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
                  <div
                    className={styles.galleryOverlay}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.galleryActions}>
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
                </div>
              );
            })}
          </HorizontalCarousel>
        )}
      </div>
    </div>
  ), [
    form.description_en, form.description_ko, form.gallery, form.image, form.tech, form.title, galleryImgErrors,
    handleImageUpload, removeGalleryItem, showCoverPicker, showErrors, tw, updateField,
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
