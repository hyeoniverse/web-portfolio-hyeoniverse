"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { ChevronRight, Plus, Star, Eye } from "lucide-react";
import CloseIcon from "@/components/ui/CloseIcon";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import EditorToggle from "@/components/posts/EditorToggle";
import MarkdownEditor from "@/components/posts/MarkdownEditor";
import SeoChecklist, { type SeoCheckId } from "@/components/admin/SeoChecklist";
import type { Work, WorkFormData } from "@/types/work";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useTagInput } from "@/hooks/useTagInput";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { autoTranslate } from "@/utils/autoTranslate";
import { SIZES, TEMPLATE_KO, TEMPLATE_EN } from "@/data/workTemplates";
import { workToFormData, defaultForm } from "@/utils/workFormUtils";
import { stripHtml } from "@/utils/htmlUtils";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DateTimePicker from "@/components/ui/DatePicker/DateTimePicker";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type { DatePeriod } from "@/data/profile";
import RelationPicker from "@/components/admin/RelationPicker";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import styles from "./WorkEditor.module.css";

const Editor = dynamic(() => import("@/components/posts/PlateEditor"), {
  ssr: false,
});

// ── year ↔ DatePeriod 변환 ──
// 기존 work.year 는 "2024" 같은 단순 문자열. 이제 "기간" 도 지원하기 위해 JSON 직렬화로 저장.
// 구버전 데이터와의 back-compat — JSON 이 아니면 단순 year 로 fallback.
function parseYearAsPeriod(year: string): DatePeriod {
  // 신규 작품(빈 year) 은 "기간으로 표시" default — end 를 빈 문자열로 둬서
  // PeriodPicker 의 hasRange (`end !== undefined`) 가 true 가 되게 함
  if (!year || !year.trim()) return { start: "", end: "", format: "year" };
  const trimmed = year.trim();
  // JSON 시도
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.start === "string" && parsed.format) {
        return parsed as DatePeriod;
      }
    } catch { /* fallthrough */ }
  }
  // 구버전: "2024" / "2024-2025" / "2024.01" 등 — start 만 채움 (range OFF, back-compat 유지)
  return { start: trimmed, format: "year" };
}

function serializePeriodAsYear(p: DatePeriod): string {
  if (!p.start) return "";
  // 기간 / 진행중 정보가 없으면 단순 string 으로 저장 (back-compat 유지)
  if (!p.end && !p.ongoing && p.format === "year") return p.start;
  return JSON.stringify(p);
}

// 역할 프리셋 — RoleMultiSelect 가 popover 안에서 사용
const ROLE_PRESETS_KO = ["기획", "디자인", "프론트엔드", "백엔드", "풀스택", "데이터", "PM", "QA", "DevOps", "모바일"];
const ROLE_PRESETS_EN = ["Planning", "Design", "Frontend", "Backend", "Full-stack", "Data", "PM", "QA", "DevOps", "Mobile"];

/** comma-separated 문자열 → trim 된 token 배열 */
function parseRoles(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
/** token 배열 → ", " join */
function joinRoles(tokens: string[]): string {
  return tokens.join(", ");
}

/**
 * Combobox-style multi-select.
 * - 한 줄 capsule 안에 선택된 chip + 검색 input 이 inline 으로 들어감
 * - 입력 / 포커스 시 아래 dropdown 펼쳐짐 — 미선택 preset 들 + "추가: <query>" 후보
 * - chip ×, Backspace, Enter 모두 지원
 */
function RoleMultiSelect({
  value,
  onChange,
  presets,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  // dropdown 을 body 로 portal — 부모 (optionalContent) 의 overflow: hidden 으로 잘리지 않게
  const [popPos, setPopPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const measurePop = useCallback(() => {
    const el = comboRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPopPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measurePop();
    const onScroll = () => measurePop();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, measurePop]);

  const current = parseRoles(value);
  // 미선택 preset + (query 검색 포함) custom 으로 추가한 후보 표시
  const candidates = presets.filter((p) => !current.includes(p));
  const q = query.trim().toLowerCase();
  const filtered = q ? candidates.filter((o) => o.toLowerCase().includes(q)) : candidates;
  const trimmedQuery = query.trim();
  // "추가: <query>" — query 있고, 기존(선택+preset) 어디에도 정확히 일치 없을 때만
  const canAddCustom = trimmedQuery !== "" &&
    !current.some((c) => c.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !presets.some((p) => p.toLowerCase() === trimmedQuery.toLowerCase());

  const remove = (role: string) => onChange(joinRoles(current.filter((r) => r !== role)));
  const add = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || current.includes(trimmed)) return;
    onChange(joinRoles([...current, trimmed]));
  };

  // 외부 클릭 / Escape 시 닫기 — capsule 과 portal'd dropdown 둘 다 "안" 으로 인정
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const insideCombo = comboRef.current?.contains(t);
      const insidePop = wrapRef.current?.contains(t);
      if (!insideCombo && !insidePop) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const showDropdown = open && (filtered.length > 0 || canAddCustom);
  const dropdown = showDropdown && popPos && typeof window !== "undefined" ? createPortal(
    <div
      ref={wrapRef}
      className={styles.roleMSPopover}
      // capsule 폭을 minWidth 로 — capsule 이 좁아도 dropdown 은 자연스럽게 펼쳐짐 (CSS min-width 280px)
      style={{ position: "fixed", top: popPos.top, left: popPos.left, minWidth: popPos.width }}
    >
      <div className={styles.roleMSList}>
        {filtered.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.roleMSItem}
            onClick={() => { add(role); setQuery(""); inputRef.current?.focus(); }}
          >
            <Plus size={11} strokeWidth={2.5} className={styles.roleMSItemIcon} aria-hidden />
            <span className={styles.roleMSItemLabel}>{role}</span>
          </button>
        ))}
        {canAddCustom && (
          <button
            type="button"
            className={`${styles.roleMSItem} ${styles.roleMSItemAdd}`}
            onClick={() => { add(trimmedQuery); setQuery(""); inputRef.current?.focus(); }}
          >
            <Plus size={11} strokeWidth={2.5} className={styles.roleMSItemIcon} aria-hidden />
            <span className={styles.roleMSItemLabel}>
              추가: <strong>{trimmedQuery}</strong>
            </span>
          </button>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className={styles.roleMS}>
      {/* 선택된 chip row — chip 전체를 클릭 가능한 버튼으로 → 어디 눌러도 제거 */}
      {current.length > 0 && (
        <div className={styles.roleMSChips}>
          {current.map((role) => (
            <button
              key={role}
              type="button"
              className={styles.roleMSChip}
              onClick={() => remove(role)}
              aria-label={`Remove ${role}`}
              title="클릭하여 제거"
            >
              <span className={styles.roleMSChipLabel}>{role}</span>
              <span className={styles.roleMSChipRemove} aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
      {/* input — 검색 / 직접 입력 */}
      <div
        ref={comboRef}
        className={`${styles.roleMSInputWrap} ${open ? styles.roleMSInputWrapOpen : ""}`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.roleMSInput}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            // 한글 IME 조합 중 Enter — 마지막 글자가 중복 추가되는 현상 방지
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (canAddCustom) {
                add(trimmedQuery);
                setQuery("");
              } else if (filtered.length > 0) {
                add(filtered[0]);
                setQuery("");
              }
            } else if (e.key === "Backspace" && query === "" && current.length > 0) {
              remove(current[current.length - 1]);
            }
          }}
          placeholder={placeholder}
        />
      </div>
      {dropdown}
    </div>
  );
}


/**
 * 부제목 input — role 영역 높이에 맞춰 stretch 되며,
 * 2줄 이상 (높이 > 1줄 임계) 이 되면 radius 를 capsule → 2xl 로 자동 morph.
 */
function SubtitleInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 1줄 baseline 기준 — 1줄 size-sm(=32px) 의 1.5배 정도 넘어가면 multi-line 으로 간주
    const SINGLE_LINE_MAX = 50;
    const update = () => setMultiLine(el.offsetHeight > SINGLE_LINE_MAX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      className={`${es.fieldInput} ${styles.subtitleInput} ${multiLine ? styles.subtitleInputMultiLine : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

interface WorkEditorProps {
  work?: Work;
}

interface WorksCategory {
  ko: string;
  en: string;
}


export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const { openModal } = useModalStore();
  const isEdit = !!work;
  const serviceStatus = useServiceStatus();

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");
  // 필수/선택 그룹 토글 — Posts editor 와 동일 패턴
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);

  const tw = useCallback(
    (key: string) => tLang(`admin.works.editor.${key}`, editorLang),
    [tLang, editorLang],
  );
  const [translating, setTranslating] = useState(false);

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return defaultForm;
    return workToFormData(work);
  });

  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  formRef.current = form;
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  const { revisions: dbRevisions, loaded: revisionsLoaded, latestUndismissedSnapshot, saveRevision, loadRevisionSnapshot, deleteRevision, dismissRevision } = useRevisions<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
  });

  // 편집기 진입 시 DB revision 복원 확인
  // 최신 non-dismissed revision(B)이 저장된 데이터(A)와 다르면 한 번만 물어봄
  // 무시 → B dismissed, A 유지 / 불러오기 → B dismissed, B 적용
  const draftAsked = useRef(false);
  // 비동기 fetch 중 unmount/navigation 발생 시 모달이 다른 페이지에 뜨는 문제 방지
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (draftAsked.current) return;
    if (!revisionsLoaded) return;
    if (!latestUndismissedSnapshot) return;
    const snapshot = latestUndismissedSnapshot.snapshot;
    const latestId = latestUndismissedSnapshot.id;
    const initialJson = JSON.stringify(initialFormRef.current);
    if (JSON.stringify(snapshot) === initialJson) {
      draftAsked.current = true;
      return;
    }
    if (!mountedRef.current) return;
    if (JSON.stringify(formRef.current) !== initialJson) {
      draftAsked.current = true;
      dismissRevision(latestId);
      return;
    }
    draftAsked.current = true;

    openModal(
      <ModalConfirm
        desc={tw("draftFoundDesc")}
        cancelText={tw("draftFoundDiscard")}
        confirmText={tw("draftFoundLoad")}
        onConfirm={() => {
          autoSaveSkip.current = true;
          setForm(snapshot);
          setStatus(tw("draftRestored"));
          setStatusType("info");
          dismissRevision(latestId);
        }}
        onCancel={() => {
          dismissRevision(latestId);
        }}
      />,
      { id: "draft-restore", header: { title: tw("draftFoundTitle") }, width: "360px", closeButton: false },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisionsLoaded, latestUndismissedSnapshot]);

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
  // 직접 입력 모드 — 사용자가 "직접 입력" 선택 시 활성화. category_ko/en 비어도 input 유지
  const [categoryCustomMode, setCategoryCustomMode] = useState(false);

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

  useEffect(() => {
    fetch("/api/posts?all=true&limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.posts)) setAllPosts(d.posts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!work?.id) return;
    fetch(`/api/admin/works/${work.id}/related-posts`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) {
          setForm((prev) => ({ ...prev, related_post_ids: d.items.map((p: { id: string }) => p.id) }));
        }
      })
      .catch(() => {});
  }, [work?.id]);

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [galleryViewerIdx, setGalleryViewerIdx] = useState<number | null>(null);
  const galleryGridRef = useRef<HTMLDivElement | null>(null);

  // 세로 wheel → 가로 스크롤 변환 (가로 strip UX). passive: false 로 등록해야 preventDefault 가능
  useEffect(() => {
    const el = galleryGridRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // shift 누르면 native 가로 스크롤 그대로 사용
      if (e.shiftKey) return;
      const dy = e.deltaY;
      const dx = e.deltaX;
      // 세로 우세할 때만 가로로 변환 (trackpad 가로 스와이프는 그대로)
      if (Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault();
        el.scrollLeft += dy;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [galleryImgErrors, setGalleryImgErrors] = useState<Set<string>>(new Set());
  // gallery 항목이 바뀔 때 제거된 src 의 에러 상태 정리
  useEffect(() => {
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
  }, [form.gallery]);

  /* ── Auto-save ── */
  const getWorkTitle = useCallback(
    () => formRef.current.title || "(untitled)",
    [],
  );
  const onAutoSaved = useCallback(() => {
    setStatus(tw("autoSaved"));
    setStatusType("success");
  }, [tw]);

  const { savedId, autoSaveSkip, scheduleAutoSave } =
    useEditorAutoSave<WorkFormData>({
      entityType: "work",
      entityId: work?.id,
      formRef,
      saveRevision,
      getTitle: getWorkTitle,
      busyFlags: { saving, translating },
      onSaved: onAutoSaved,
      ignoredFields: ["scheduled_at"],
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(scheduleAutoSave, [form]);

  const updateField = useCallback(
    <K extends keyof WorkFormData>(key: K, value: WorkFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [],
  );

  const tech = useTagInput(form.tech, (tags) => updateField("tech", tags));

  const TRANSLATABLE_FIELDS = useMemo(
    () => ["subtitle", "description", "role", "content"] as const,
    [],
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const srcSuf = isToEn ? "_ko" : "_en";
      const dstSuf = isToEn ? "_en" : "_ko";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const activeFields = TRANSLATABLE_FIELDS.filter(
        (f) => want.has(f) && form[`${f}${srcSuf}`]?.trim(),
      );
      const texts = activeFields.map((f) => form[`${f}${srcSuf}`]) as string[];

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tLang("admin.works.editor.translating", lang));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<WorkFormData> = {};
        activeFields.forEach((f, i) => {
          patch[`${f}${dstSuf}` as keyof WorkFormData] = result.translations[i] as never;
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tLang("admin.works.editor.autoTranslated", lang));
        setStatusType("success");
      } else {
        setError(result.error);
      }
    },
    [form, tLang, TRANSLATABLE_FIELDS],
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const srcSuf = isToEn ? "_ko" : "_en";
      const dstSuf = isToEn ? "_en" : "_ko";

      const hasSrc = TRANSLATABLE_FIELDS.some((f) => form[`${f}${srcSuf}`]?.trim());
      const hasDst = TRANSLATABLE_FIELDS.some((f) => form[`${f}${dstSuf}`]?.trim());

      if (hasSrc && !hasDst) {
        await translateFields(
          TRANSLATABLE_FIELDS.slice(),
          newLang,
        );
      }
    },
    [form, translating, translateFields, TRANSLATABLE_FIELDS],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? TRANSLATABLE_FIELDS.slice(), editorLang);
    },
    [translating, editorLang, translateFields, TRANSLATABLE_FIELDS],
  );

  const team = useTeamMembers(form.team_members, (members) => updateField("team_members", members));

  const handleContentTypeChange = useCallback(
    async (newType: "markdown" | "richtext") => {
      if (newType === form.content_type) return;

      const convert = async (content: string): Promise<string> => {
        if (!content) return content;
        if (form.content_type === "markdown" && newType === "richtext") {
          return marked.parse(content, { async: false }) as string;
        } else {
          const TurndownService = (await import("turndown")).default;
          const td = new TurndownService({ headingStyle: "atx" });
          return td.turndown(content);
        }
      };

      const [newKo, newEn] = await Promise.all([
        convert(form.content_ko),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content_ko: newKo,
        content_en: newEn,
        content_type: newType,
      }));
      setStatus("");
      setError("");
    },
    [form.content_type, form.content_ko, form.content_en],
  );

  const handleInsertTemplate = useCallback(() => {
    const contentKey = editorLang === "ko" ? "content_ko" : "content_en";
    const template = editorLang === "ko" ? TEMPLATE_KO : TEMPLATE_EN;
    const current = form[contentKey];

    if (current.trim()) {
      if (!confirm(tw("templateConfirm"))) return;
      updateField(contentKey, current + "\n\n" + template);
    } else {
      updateField(contentKey, template);
    }
  }, [editorLang, form, updateField, tw]);

  const handleContentImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    const sizeError = validateFileSize(file);
    if (sizeError) throw new Error(sizeError);

    const compressed = await compressImage(file);

    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, []);

  const handleImageUpload = useCallback(async (field: "image" | "gallery") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = field === "gallery";
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;

      const { compressImage, validateFileSize } = await import("@/lib/compressImage");
      for (const file of Array.from(files)) {
        const sizeError = validateFileSize(file);
        if (sizeError) { alert(sizeError); continue; }
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) continue;

        if (field === "image") {
          updateField("image", data.url);
        } else {
          setForm((prev) => ({ ...prev, gallery: [...prev.gallery, data.url] }));
        }
      }
    };
    input.click();
  }, [updateField]);

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
        const missing: string[] = [];
        if (!form.title.trim()) missing.push(tw("title"));
        if (!form.category_ko.trim()) missing.push(tw("category"));
        if (!form.year.trim()) missing.push(tw("year"));
        if (!form.image.trim()) missing.push(tw("mainImage"));
        if (!form.content_ko.trim() && !form.content_en.trim()) missing.push(tw("description"));
        if (missing.length > 0) {
          setError(`${missing.join(" · ")} ${tw("requiredFields")}`);
          setShowErrors(true);
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

      // works 테이블에는 related_post_ids 컬럼이 없음 — 분리해서 별도 endpoint로 sync.
      const { related_post_ids, ...workBody } = form;
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
          setError(data.error ?? tw("saveFailed"));
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

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/works/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        router.push("/admin/works");
      } catch {
        setError(tw("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, tw, savedId],
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
    sessionStorage.setItem("work-preview", JSON.stringify(form));
    window.open("/admin/works/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot);
        setStatus(tw("restored"));
        setStatusType("success");
      }
    },
    [dbRevisions, loadRevisionSnapshot, tw],
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot;
      return {
        excerpt: s.description_ko || s.description_en || "",
        content: stripHtml(s.content_ko || s.content_en || ""),
        meta: {
          Category: s.category_ko || s.category_en || "",
          Year: s.year || "",
          Tech: s.tech?.join(", ") || "",
          Size: s.size || "",
          Role: s.role_ko || s.role_en || "",
        },
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
        setError(data.error ?? tw("saveError"));
        return;
      }
      setStatus(tw("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(tw("saveError"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [work?.id, tw, savedId]);

  const shellLabels = useMemo(
    () => ({
      delete: tw("delete"),
      deleting: tw("deleting"),
      deleteConfirm: tw("deleteConfirm"),
      deleteConfirmInput: tw("deleteConfirmInput"),
      deleteCancel: tw("deleteCancel"),
      preview: tw("preview"),
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
  const contentKey = editorLang === "ko" ? "content_ko" : "content_en";

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
      onPreview={handlePreview}
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
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      currentSnapshot={(() => {
        return {
          title: form.title,
          excerpt: form.description_ko || form.description_en || "",
          content: stripHtml(form.content_ko || form.content_en || ""),
          meta: {
            Category: form.category_ko || form.category_en || "",
            Year: form.year || "",
            Tech: form.tech?.join(", ") || "",
            Size: form.size || "",
            Role: form.role_ko || form.role_en || "",
          },
        };
      })()}
      topBarSecondRowLeft={
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", flexWrap: "nowrap" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", whiteSpace: "nowrap", flexShrink: 0, marginRight: "var(--spacing-2xs)" }}>{tw("scheduledAt")}</span>
          <DateTimePicker
            value={form.scheduled_at ?? null}
            onChange={(iso) => updateField("scheduled_at", iso)}
          />
          <AnimatePresence>
            {form.scheduled_at && (
              <motion.button
                key="clear"
                type="button"
                className={es.scheduledClearBtn}
                onClick={() => updateField("scheduled_at", null)}
                title={tw("scheduledClear")}
                aria-label={tw("scheduledClear")}
                data-close-trigger
                initial={{ opacity: 0, scale: 0.5, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 24 }}
                exit={{ opacity: 0, scale: 0.5, width: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                <CloseIcon />
              </motion.button>
            )}
          </AnimatePresence>
          {form.scheduled_at && !form.published && (
            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{tw("scheduledHint")}</span>
          )}
        </div>
      }
    >
      {/* Basic Info — 필수 (title, year, category) + 선택 (collapsible) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("basicInfo")}</h2>

        {/* ── 필수 ── */}
        <div className={es.field}>
          <label className={`${es.fieldLabel}${showErrors && !form.title.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("title")}</label>
          <input
            className={`${es.titleInput}${showErrors && !form.title.trim() ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={tw("titlePlaceholder")}
          />
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={`${es.fieldLabel}${showErrors && !form.year.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("year")}</label>
            <PeriodPicker
              value={parseYearAsPeriod(form.year)}
              onChange={(p) => updateField("year", serializePeriodAsYear(p))}
            />
          </div>
          <div className={es.field}>
            <label className={`${es.fieldLabel}${showErrors && !form.category_ko.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("category")}</label>
            {(() => {
              // 현재 form 값이 카테고리 목록 안에 있는지 확인 → 없거나 직접 입력 모드면 input 표시
              const matchedIdx = worksCategories.findIndex(
                (c) => c.ko === form.category_ko && c.en === form.category_en,
              );
              const isCustom = categoryCustomMode || (form.category_ko.trim() !== "" && matchedIdx === -1);
              const selectValue = isCustom ? "__custom__" : String(matchedIdx);
              return (
                <>
                  <Select
                    value={selectValue}
                    options={[
                      { value: "__custom__", label: tw("customCategory") },
                      ...worksCategories.map((cat, i) => ({
                        value: String(i),
                        label: editorLang === "ko" ? cat.ko : cat.en,
                      })),
                    ]}
                    onChange={(v) => {
                      if (v === "__custom__") {
                        setCategoryCustomMode(true);
                        setForm((prev) => ({ ...prev, category_ko: "", category_en: "" }));
                      } else {
                        setCategoryCustomMode(false);
                        const idx = parseInt(v);
                        const cat = worksCategories[idx];
                        if (cat) {
                          setForm((prev) => ({ ...prev, category_ko: cat.ko, category_en: cat.en }));
                        }
                      }
                      setStatus("");
                      setError("");
                    }}
                  />
                  {isCustom && (
                    <div className={styles.customCategoryGrid}>
                      <div className={styles.customCategoryField}>
                        <span className={styles.customCategoryLangTag}>KO</span>
                        <input
                          className={`${es.fieldInput} ${styles.customCategoryInput}`}
                          type="text"
                          value={form.category_ko}
                          onChange={(e) => updateField("category_ko", e.target.value)}
                          placeholder={tw("categoryPlaceholder")}
                          autoFocus
                        />
                      </div>
                      <div className={styles.customCategoryField}>
                        <span className={styles.customCategoryLangTag}>EN</span>
                        <input
                          className={`${es.fieldInput} ${styles.customCategoryInput}`}
                          type="text"
                          value={form.category_en}
                          onChange={(e) => updateField("category_en", e.target.value)}
                          placeholder={tw("categoryPlaceholder")}
                        />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* 설명 — 기본 정보의 하위 항목, 선택 입력보다 위 */}
        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("description")}</label>
          <Textarea
            textareaClassName={styles.fieldTextarea}
            value={form[`description${suf}`]}
            onChange={(v) => updateField(`description${suf}`, v)}
            placeholder={tw("descPlaceholder")}
            rows={3}
          />
        </div>

        {/* ── 선택 (collapsible) ── */}
        <div className={styles.optionalSection}>
          <button
            type="button"
            className={styles.optionalToggle}
            onClick={() => setOptionalOpen((v) => !v)}
          >
            <span>{tw("optionalFields") || "선택 입력"}</span>
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              style={{ transform: optionalOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>

          <div className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            {/* 좌: 정렬순서 (세로 1열 전체)  |  우: subtitle / role / cardSize (세로 stack) */}
            <div className={styles.optionalSplit}>
              <div className={`${es.field} ${styles.optionalSplitLeft}`}>
                <SortOrderDragList
                  label={tw("sortOrder")}
                  currentTitle={form.title || tw("subtitle") || "—"}
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
                <div className={es.field}>
                  <label className={es.fieldLabel}>{tw("subtitle")}</label>
                  <SubtitleInput
                    value={form[`subtitle${suf}`]}
                    onChange={(v) => updateField(`subtitle${suf}`, v)}
                    placeholder={tw("subtitlePlaceholder")}
                  />
                </div>
                <div className={es.field}>
                  <label className={es.fieldLabel}>{tw("role")}</label>
                  <RoleMultiSelect
                    value={form[`role${suf}`] || ""}
                    onChange={(v) => updateField(`role${suf}`, v)}
                    presets={editorLang === "ko" ? ROLE_PRESETS_KO : ROLE_PRESETS_EN}
                    placeholder={tw("rolePlaceholder")}
                  />
                </div>
                <div className={es.field}>
                  <label className={es.fieldLabel}>{tw("cardSize")}</label>
                  <Select
                    value={form.size}
                    options={SIZES.map((s) => ({ value: s, label: s }))}
                    onChange={(v) => updateField("size", v as WorkFormData["size"])}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div className={styles.section}>
        <div className={styles.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <h2 className={`${styles.sectionTitle}${showErrors && !form.content_ko.trim() && !form.content_en.trim() ? ` ${styles.sectionTitleError}` : ""}`} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
              {tw("content")}
            </h2>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {tw("insertTemplate")}
            </button>
          </div>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        <div className={styles.editorBlock}>
          {form.content_type === "markdown" ? (
            <MarkdownEditor
              key={editorLang}
              value={form[contentKey]}
              onChange={(v) => updateField(contentKey, v)}
              onImageUpload={handleContentImageUpload}
              compact
              editLabel={tw("editorLabel")}
              previewLabel={tw("previewLabel")}
            />
          ) : (
            <Editor
              key={editorLang}
              value={form[contentKey]}
              onChange={(v) => updateField(contentKey, v)}
              onImageUpload={handleContentImageUpload}
            />
          )}
        </div>
      </div>

      {/* Images */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("images")}</h2>

        <div style={{ marginBottom: "var(--spacing-lg)" }}>
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
            <button
              type="button"
              className={styles.galleryAddInline}
              onClick={() => handleImageUpload("gallery")}
            >
              <Plus size={12} strokeWidth={2} />
              <span>{tw("addMore")}</span>
            </button>
          </div>
          <div
            ref={galleryGridRef}
            className={styles.galleryGrid}
            data-lenis-prevent
          >
            {form.gallery.map((src, i) => {
              const isMain = src === form.image && !!src;
              return (
                <div
                  key={i}
                  className={`${styles.galleryItem} ${isMain ? styles.galleryItemMain : ""}`}
                >
                  <button
                    type="button"
                    className={styles.galleryThumb}
                    onClick={() => setGalleryViewerIdx(i)}
                    aria-label={tw("viewImage")}
                  >
                    {/* 깨진 이미지면 public/images/placeholder.svg 로 대체 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  </button>
                  {isMain && (
                    <span className={styles.galleryMainBadge}>
                      <Star size={10} strokeWidth={2.5} fill="currentColor" />
                      {tw("currentMain")}
                    </span>
                  )}
                  <div className={styles.galleryActions}>
                    {!isMain && (
                      <button
                        type="button"
                        className={styles.galleryActionBtn}
                        onClick={() => updateField("image", src)}
                        title={tw("setAsMain")}
                        aria-label={tw("setAsMain")}
                      >
                        <Star size={12} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.galleryActionBtn}
                      onClick={() => setGalleryViewerIdx(i)}
                      title={tw("viewImage")}
                      aria-label={tw("viewImage")}
                    >
                      <Eye size={12} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.galleryActionBtn} ${styles.galleryActionDanger}`}
                      onClick={() => removeGalleryItem(i)}
                      title={tw("remove")}
                      aria-label={tw("remove")}
                      data-close-trigger
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className={styles.galleryAddTile}
              onClick={() => handleImageUpload("gallery")}
            >
              <Plus size={20} strokeWidth={1.5} />
              <span>{form.gallery.length === 0 ? tw("addGallery") : tw("addMore")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 추가 정보 (Tech + Team + Links + RelatedPosts) — 선택 입력 통합 collapsible ── */}
      <div className={styles.extraSections}>
        <button
          type="button"
          className={styles.optionalToggle}
          onClick={() => setExtraOpen((v) => !v)}
        >
          <span>{tw("additionalInfo") || "추가 정보 (선택)"}</span>
          <ChevronRight
            size={12}
            strokeWidth={2.5}
            style={{ transform: extraOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </button>
        <div className={`${styles.extraSectionsContent}${extraOpen ? ` ${styles.extraSectionsContentOpen}` : ""}`}>

      {/* Tech Stack */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("techStack")}</h2>
        <div className={es.field}>
          <div className={styles.techInputRow}>
            <input
              className={es.fieldInput}
              type="text"
              value={tech.input}
              onChange={(e) => tech.setInput(e.target.value)}
              onKeyDown={tech.handleKeyDown}
              placeholder={tw("techPlaceholder")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={tech.add}
              disabled={!tech.input.trim()}
            >
              +
            </button>
          </div>
          {form.tech.length > 0 && (
            <div className={es.tags}>
              {form.tech.map((t) => (
                <span key={t} className={es.tag}>
                  {t}
                  <button type="button" className={es.tagRemove} onClick={() => tech.remove(t)}>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("teamMembers")}</h2>
        <div className={styles.memberForm}>
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="text"
              value={team.memberName}
              onChange={(e) => team.setMemberName(e.target.value)}
              placeholder={tw("memberName")}
            />
            {editorLang === "ko" ? (
              <input
                className={es.fieldInput}
                type="text"
                value={team.memberRoleKo}
                onChange={(e) => team.setMemberRoleKo(e.target.value)}
                placeholder={tw("memberRole")}
              />
            ) : (
              <input
                className={es.fieldInput}
                type="text"
                value={team.memberRoleEn}
                onChange={(e) => team.setMemberRoleEn(e.target.value)}
                placeholder={tw("memberRole")}
              />
            )}
          </div>
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="url"
              value={team.memberUrl}
              onChange={(e) => team.setMemberUrl(e.target.value)}
              placeholder={tw("memberUrl")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={team.addMember}
              disabled={!team.memberName.trim()}
            >
              +
            </button>
          </div>
        </div>
        {form.team_members.length > 0 && (
          <div className={styles.memberList}>
            {form.team_members.map((m, i) => (
              <div key={i} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberItemName}>{m.name}</span>
                  <span className={styles.memberItemRole}>
                    {[m.role_ko, m.role_en].filter(Boolean).join(" / ")}
                  </span>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className={styles.memberItemUrl}>
                      {m.url}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className={es.tagRemove}
                  onClick={() => team.removeMember(i)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Links */}
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

      {/* 관련 글 */}
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

        </div>{/* /extraSectionsContent */}
      </div>{/* /extraSections (Tech+Team+Links+Related) */}

      {/* SEO 체크리스트 — portal 로 floating pill 렌더 (works 는 number/slug 없음) */}
      <SeoChecklist
        data={{
          title: form.title,
          excerpt: editorLang === "ko" ? form.description_ko : form.description_en,
          cover: form.image,
          category: editorLang === "ko" ? form.category_ko : form.category_en,
          tagsCount: form.tech?.length ?? 0,
        }}
        onItemClick={(id: SeoCheckId) => {
          const fieldId = id === "excerpt" ? "work-description" : id === "cover" ? "work-image" : id === "tags" ? "work-tech" : `work-${id}`;
          const el = document.getElementById(fieldId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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
          zIndex: 9999,
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
