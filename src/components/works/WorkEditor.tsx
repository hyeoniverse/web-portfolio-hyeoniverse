"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { ChevronRight, Plus, Star, Check, X, User, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { useLanguage } from "@/providers/LanguageProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import { focusFirstMissingField } from "@/utils/focusFirstMissing";
import { generateSlug, validateSlug } from "@/utils/postSlug";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { postProcessMarkedHtml } from "@/components/posts/postProcessMarkedHtml";
import SeoChecklist, { type SeoCheckId } from "@/components/admin/SeoChecklist";
import type { Work, WorkFormData, TeamMember } from "@/types/work";
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
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type { DatePeriod } from "@/data/profile";
import RelationPicker from "@/components/admin/RelationPicker";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import SortOrderDragList from "@/components/admin/SortOrderDragList";
import CoverImageField from "@/components/admin/CoverImageField";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { List, ListItem } from "@/app/admin/(dashboard)/components";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import styles from "./WorkEditor.module.css";

const Editor = dynamic(() => import("@/components/posts/PlateEditor"), {
  ssr: false,
});

/** 레거시 마크다운 본문 → richtext(HTML) 1회 변환 (에디터가 richtext 단일로 통합됨). */
function mdToRichHtml(md: string): string {
  if (!md) return md;
  try {
    return postProcessMarkedHtml(marked.parse(md, { async: false }) as string);
  } catch {
    return md;
  }
}

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

// 역할 프리셋 — Select combobox 의 옵션. 직접 입력으로 자유로운 텍스트도 가능
const ROLE_PRESETS_KO = ["기획", "디자인", "프론트엔드", "백엔드", "풀스택", "데이터", "PM", "QA", "DevOps", "모바일"];
const ROLE_PRESETS_EN = ["Planning", "Design", "Frontend", "Backend", "Full-stack", "Data", "PM", "QA", "DevOps", "Mobile"];

/* ──────────────────────────────────────────────────────────────────────────
 * useRoleMultiPicker — 역할 multi-select 의 state + 렌더 node 분리.
 * select 와 chip 을 다른 위치에 배치하고 싶을 때 사용 (예: 팀원 폼 → chip 을 URL row 아래로). */
function useRoleMultiPicker({
  value,
  onChange,
  presets,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  placeholder: string;
  lang: "ko" | "en";
}) {
  const [input, setInput] = useState("");
  const tokens = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const setTokens = (next: string[]) => onChange(next.join(", "));
  const add = (v: string) => {
    const t = v.trim().replace(/,/g, "");
    if (!t) return;
    if (tokens.includes(t)) {
      showToast(lang === "ko" ? `이미 추가됨: ${t}` : `Already added: ${t}`, "info");
      setInput("");
      return;
    }
    setTokens([...tokens, t]);
    setInput("");
  };
  const remove = (idx: number) => setTokens(tokens.filter((_, i) => i !== idx));
  const { itemProps } = useChipReorder((from, to) => {
    const next = [...tokens];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTokens(next);
  });
  const selectNode = (
    <Select
      combobox
      className={styles.roleSelect}
      value=""
      onChange={() => {}}
      inputValue={input}
      onInputChange={setInput}
      onAdd={(v) => add(v)}
      options={presets.map((p) => {
        const added = tokens.includes(p);
        return {
          value: p,
          label: p,
          selected: added,
          trailing: added ? <Check size={12} strokeWidth={2.5} /> : undefined,
        };
      })}
      placeholder={placeholder}
    />
  );
  const chipsNode = tokens.length > 0 ? (
    <div className={styles.categoryChipList}>
      {tokens.map((t, i) => {
        const { dragging, dropSide, ...handlers } = itemProps(i);
        return (
          <Chip
            key={`${t}-${i}`}
            variant="capsule"
            showHandle
            onRemove={() => remove(i)}
            dragging={dragging}
            dropSide={dropSide}
            dragHandlers={{ draggable: true, ...handlers }}
          >
            {t}
          </Chip>
        );
      })}
    </div>
  ) : null;
  return { selectNode, chipsNode };
}


/* ──────────────────────────────────────────────────────────────────────────
 * TeamMemberCard — 팀원 1명. 상단 chip-row (avatar + 이름/역할 + remove) + 하단 contributions ul.
 * contributions 는 editorLang 기준 단일 배열만 보여줌 — 다른 lang 은 그대로 유지. */
function TeamMemberCard({
  member,
  editorLang,
  onChange,
  onRemove,
  onEdit,
  isEditingFull,
}: {
  member: TeamMember;
  editorLang: "ko" | "en";
  onChange: (next: TeamMember) => void;
  onRemove: () => void;
  /** 전체 편집 모드 진입 (KO/EN 분리·역할·작업 내용 등 add-card form 으로) */
  onEdit?: () => void;
  /** 현재 이 카드가 전체 편집 중인지 — 시각 강조 */
  isEditingFull?: boolean;
}) {
  type EditField = "name" | "role" | "email" | "url";
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [editingFields, setEditingFields] = useState<Set<EditField>>(new Set());
  // 작업 item 인라인 편집 — { role, index } 한 개만
  const [editingContrib, setEditingContrib] = useState<{ role: string; idx: number } | null>(null);
  // 작업 섹션의 역할 label 인라인 rename — 어느 role 을 편집 중인지
  const [editingContribRole, setEditingContribRole] = useState<string | null>(null);
  // toggle 클릭 지연 — dblclick 가능성 대비. 250ms 내 두번째 click 오면 toggle 취소 → dblclick 핸들러가 처리
  const toggleClickTimerRef = useRef<number | null>(null);

  // avatar 파일 업로드 (더블클릭 / + 뱃지)
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const handleAvatarFile = async (file: File) => {
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) onChange({ ...member, avatar_url: data.url });
    } catch {
      showToast("Avatar upload failed", "error");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };
  const startEdit = (field: EditField) => setEditingFields((p) => new Set(p).add(field));
  const stopEdit = (field: EditField) =>
    setEditingFields((p) => {
      const n = new Set(p);
      n.delete(field);
      return n;
    });

  const avatarUrl = deriveTeamMemberAvatar(member);
  const roleField = editorLang === "ko" ? member.role_ko : member.role_en;
  const roles = roleField.split(",").map((r) => r.trim()).filter(Boolean);
  const contribsMap = (editorLang === "ko" ? member.contributions_ko : member.contributions_en) ?? {};
  // 역할 있으면 항상 표시 (작업 0개여도 toggle 펼치고 추가 가능)
  const contribsToShow = roles.map((role) => ({ role, items: contribsMap[role] ?? [] }));

  // 인라인 편집 commit helper — 필드 값을 member 에 반영하고 편집 모드 해제
  const commitField = (field: EditField, value: string) => {
    if (field === "role") {
      const key = editorLang === "ko" ? "role_ko" : "role_en";
      onChange({ ...member, [key]: value });
    } else {
      onChange({ ...member, [field]: value || undefined });
    }
    stopEdit(field);
  };

  // 작업 item commit — contribsMap 의 해당 role 배열 인덱스 갱신
  const commitContrib = (role: string, idx: number, value: string) => {
    const key = editorLang === "ko" ? "contributions_ko" : "contributions_en";
    const current = (member[key] ?? {}) as Record<string, string[]>;
    const items = [...(current[role] ?? [])];
    const trimmed = value.trim();
    if (trimmed) items[idx] = trimmed;
    else items.splice(idx, 1);
    onChange({ ...member, [key]: { ...current, [role]: items } });
    setEditingContrib(null);
  };

  // 작업 추가 — 빈 값이면 무시, 있으면 해당 role 의 배열에 append
  const appendContrib = (role: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = editorLang === "ko" ? "contributions_ko" : "contributions_en";
    const current = (member[key] ?? {}) as Record<string, string[]>;
    onChange({ ...member, [key]: { ...current, [role]: [...(current[role] ?? []), trimmed] } });
  };

  // 역할 rename — role 문자열의 해당 항목 + contribs map 의 key 둘 다 update
  const commitContribRole = (oldRole: string, newName: string) => {
    const trimmed = newName.trim();
    setEditingContribRole(null);
    if (!trimmed || trimmed === oldRole) return;
    const roleKey = editorLang === "ko" ? "role_ko" : "role_en";
    const newRoleField = roleField
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => (r === oldRole ? trimmed : r))
      .join(", ");
    const contribKey = editorLang === "ko" ? "contributions_ko" : "contributions_en";
    const next = { ...contribsMap };
    if (oldRole in next) {
      next[trimmed] = next[oldRole];
      delete next[oldRole];
    }
    onChange({ ...member, [roleKey]: newRoleField, [contribKey]: next });
  };

  // input 공통 props — blur 시 저장, Enter 저장 / Escape 취소.
  // typographyClass: display 요소와 동일 폰트 적용해 layout shift 최소화
  // data-cursor="text": CursorTrail 이 부모의 clickable 모드 대신 text cursor 강제 표시
  const inlineEditProps = (field: EditField, typographyClass?: string) => ({
    autoFocus: true,
    className: `${styles.memberInlineEdit} ${typographyClass ?? ""}`.trim(),
    "data-cursor": "text",
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => commitField(field, e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        stopEdit(field);
      }
    },
  });

  // 더블클릭 시 텍스트 선택 차단 (text selection 이 click 핸들러보다 우선되는 문제 방지)
  const dblClickGuard = (e: React.MouseEvent) => {
    if (e.detail > 1) e.preventDefault();
  };

  // 250ms 지연 click — 그 안에 두번째 click 이 오면 single-click 취소 (dblclick 핸들러 가 처리)
  const delayedClick = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleClickTimerRef.current !== null) {
      window.clearTimeout(toggleClickTimerRef.current);
      toggleClickTimerRef.current = null;
      return;
    }
    toggleClickTimerRef.current = window.setTimeout(() => {
      toggleClickTimerRef.current = null;
      handler();
    }, 250);
  };
  const cancelDelayed = () => {
    if (toggleClickTimerRef.current !== null) {
      window.clearTimeout(toggleClickTimerRef.current);
      toggleClickTimerRef.current = null;
    }
  };


  return (
    <ListItem layout="column" className={`${styles.memberCard} ${isEditingFull ? styles.memberCardEditing : ""}`}>
      <div className={styles.memberHeaderRow}>
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFile(file);
            }}
          />
          <span
            className={`${styles.memberAvatar} ${styles.memberAvatarUploadable}`}
            onDoubleClick={() => !avatarUploading && avatarFileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="사진 변경"
            title="더블클릭으로 사진 변경"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className={styles.memberAvatarImg} loading="lazy" />
            ) : member.name.trim() ? (
              <span className={styles.memberAvatarInitial}>{getMemberInitial(member.name)}</span>
            ) : (
              <User size={20} strokeWidth={1.5} className={styles.memberAvatarPlaceholder} />
            )}
            <button
              type="button"
              className={styles.memberAvatarAddBadge}
              onClick={(e) => {
                e.stopPropagation();
                if (!avatarUploading) avatarFileRef.current?.click();
              }}
              aria-label="사진 변경"
              tabIndex={-1}
            >
              <Plus size={10} strokeWidth={2.5} />
            </button>
          </span>
          <div className={styles.memberInfo}>
            {/* name — 첫 줄 */}
            {editingFields.has("name") ? (
              <input type="text" defaultValue={member.name} {...inlineEditProps("name", styles.memberItemName)} />
            ) : (
              <span
                className={styles.memberItemName}
                onMouseDown={dblClickGuard}
                onDoubleClick={() => startEdit("name")}
                title="더블클릭으로 편집"
              >
                {member.name}
              </span>
            )}
            {/* role — 두번째 줄 (subtitle). contribs 있으면 각 contrib group label 이 role 표시 담당 → 중복 숨김 */}
            {editingFields.has("role") ? (
              <input
                type="text"
                defaultValue={roleField}
                placeholder="역할 (쉼표로 구분)"
                {...inlineEditProps("role", styles.memberItemRole)}
              />
            ) : contribsToShow.length === 0 && (member.role_ko || member.role_en) ? (
              <span
                className={styles.memberItemRole}
                onMouseDown={dblClickGuard}
                onDoubleClick={() => startEdit("role")}
                title="더블클릭으로 편집"
              >
                {[member.role_ko, member.role_en].filter(Boolean).join(" / ")}
              </span>
            ) : null}
            {/* email — editor 에선 navigate 없음. 더블클릭으로 편집만 */}
            {editingFields.has("email") ? (
              <input type="email" defaultValue={member.email ?? ""} placeholder="email" {...inlineEditProps("email", styles.memberItemUrl)} />
            ) : member.email ? (
              <span
                className={styles.memberItemUrl}
                onMouseDown={dblClickGuard}
                onDoubleClick={() => startEdit("email")}
                title="더블클릭으로 편집"
                data-cursor="text"
              >
                {member.email}
              </span>
            ) : null}
            {/* url — editor 에선 navigate 없음. 더블클릭으로 편집만 */}
            {editingFields.has("url") ? (
              <input type="url" defaultValue={member.url ?? ""} placeholder="url" {...inlineEditProps("url", styles.memberItemUrl)} />
            ) : member.url ? (
              <span
                className={styles.memberItemUrl}
                onMouseDown={dblClickGuard}
                onDoubleClick={() => startEdit("url")}
                title="더블클릭으로 편집"
                data-cursor="text"
              >
                {member.url}
              </span>
            ) : null}
          </div>
          <div className={styles.memberHeaderActions}>
            {onEdit && (
              <button
                type="button"
                className={styles.memberHeaderEditBtn}
                onClick={onEdit}
                aria-label={isEditingFull ? "Cancel edit" : "Edit member"}
                title={isEditingFull ? "편집 취소" : "전체 편집"}
                data-cursor="big"
              >
                {isEditingFull ? <X size={14} strokeWidth={2.4} /> : <Pencil size={14} strokeWidth={2.2} />}
              </button>
            )}
            <CloseButton
              size="md"
              className={styles.memberHeaderActionBtn}
              onClick={onRemove}
              ariaLabel="Remove member"
            />
          </div>
        </div>
        {/* contribs — 역할 label 마다 개별 토글. 기본 접힘 → 클릭하면 해당 역할의 작업만 펼침 */}
        {contribsToShow.length > 0 && (
          <div className={styles.memberContribsWrap}>
            {contribsToShow.map(({ role, items }) => {
              const open = expandedRoles.has(role);
              return (
                <div key={role} className={styles.memberContribsGroup}>
                  <button
                    type="button"
                    className={`${styles.memberContribsToggle} ${open ? styles.memberContribsToggleOpen : ""}`}
                    onClick={editingContribRole === role ? (e) => e.preventDefault() : delayedClick(() => toggleRole(role))}
                    aria-expanded={open}
                  >
                    <ChevronRight size={12} strokeWidth={2} className={styles.memberContribsChevron} />
                    {editingContribRole === role ? (
                      <input
                        type="text"
                        autoFocus
                        defaultValue={role}
                        className={`${styles.memberInlineEdit} ${styles.memberItemRole}`}
                        data-cursor="text"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => commitContribRole(role, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setEditingContribRole(null);
                          }
                        }}
                      />
                    ) : (
                      <span
                        className={styles.memberItemRole}
                        onMouseDown={dblClickGuard}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelDelayed();
                          setEditingContribRole(role);
                        }}
                        title="더블클릭으로 편집"
                        data-cursor="text"
                      >
                        {role}
                      </span>
                    )}
                  </button>
                  {open && (
                    <ul className={styles.memberContribsList}>
                      {items.map((c, ci) => {
                        const isEditing = editingContrib?.role === role && editingContrib.idx === ci;
                        return (
                          <li key={ci}>
                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                defaultValue={c}
                                className={styles.memberInlineEdit}
                                data-cursor="text"
                                onBlur={(e) => commitContrib(role, ci, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                  } else if (e.key === "Escape") {
                                    setEditingContrib(null);
                                  }
                                }}
                              />
                            ) : (
                              <span
                                onMouseDown={dblClickGuard}
                                onDoubleClick={() => setEditingContrib({ role, idx: ci })}
                                title="더블클릭으로 편집"
                              >
                                {c}
                              </span>
                            )}
                          </li>
                        );
                      })}
                      {/* 새 작업 추가 — Enter: append + clear + 포커스 유지 (연속 입력), Blur: 동일 동작 + 포커스 해제 */}
                      <li className={styles.memberContribsAddItem}>
                        <input
                          type="text"
                          placeholder="새 작업 추가..."
                          className={styles.memberInlineEdit}
                          data-cursor="text"
                          onBlur={(e) => {
                            appendContrib(role, e.target.value);
                            e.target.value = "";
                          }}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === "Enter") {
                              e.preventDefault();
                              appendContrib(role, e.currentTarget.value);
                              e.currentTarget.value = "";
                              // blur 안 함 → 같은 input 에 포커스 유지 → 연속 추가 가능
                            }
                          }}
                        />
                      </li>
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </ListItem>
  );
}


/* ──────────────────────────────────────────────────────────────────────────
 * CategoryMultiPicker — 카테고리 multi-select. Select 위, chip 아래.
 * 공통 DraggableTag 로 chip 렌더 + 드래그로 순서 변경 (ko/en 배열 동기 유지). */
function CategoryMultiPicker({
  selectedKos,
  selectedEns,
  presets,
  editorLang,
  customMode,
  setCustomMode,
  labels,
  onChange,
}: {
  selectedKos: string[];
  selectedEns: string[];
  presets: { ko: string; en: string }[];
  editorLang: "ko" | "en";
  customMode: boolean;
  setCustomMode: (v: boolean) => void;
  labels: { placeholder: string; custom: string };
  onChange: (ko: string[], en: string[]) => void;
}) {
  const remaining = presets.filter((c) => !selectedKos.includes(c.ko));
  const add = (ko: string, en: string) => {
    const k = ko.trim();
    const e = en.trim();
    if (!k && !e) return;
    if (selectedKos.includes(k)) return;
    onChange([...selectedKos, k], [...selectedEns, e || k]);
    setCustomMode(false);
  };
  const remove = (idx: number) => {
    onChange(
      selectedKos.filter((_, i) => i !== idx),
      selectedEns.filter((_, i) => i !== idx),
    );
  };
  const { itemProps } = useChipReorder((from, to) => {
    const ko = [...selectedKos];
    const en = [...selectedEns];
    const [movedKo] = ko.splice(from, 1);
    const [movedEn] = en.splice(from, 1);
    ko.splice(to, 0, movedKo);
    en.splice(to, 0, movedEn);
    onChange(ko, en);
  });

  return (
    <div className={styles.categoryPicker}>
      {/* 위쪽 — Select + (custom 모드면) 직접 입력 row */}
      <div className={styles.categoryAddRow}>
        <Select
          value=""
          placeholder={labels.placeholder}
          options={[
            { value: "__custom__", label: labels.custom },
            ...remaining.map((cat, i) => ({
              value: `preset:${i}`,
              label: editorLang === "ko" ? cat.ko : cat.en,
            })),
          ]}
          onChange={(v) => {
            if (v === "__custom__") {
              setCustomMode(true);
            } else if (v.startsWith("preset:")) {
              const idx = parseInt(v.slice("preset:".length));
              const cat = remaining[idx];
              if (cat) add(cat.ko, cat.en);
            }
          }}
        />
        {customMode && (
          <CategoryCustomAdder onAdd={add} onCancel={() => setCustomMode(false)} koPh={labels.placeholder} enPh={labels.placeholder} />
        )}
      </div>
      {/* 아래쪽 — 선택된 chip 들 (공통 Chip + drag reorder) */}
      {selectedKos.length > 0 && (
        <div className={styles.categoryChipList}>
          {selectedKos.map((k, i) => {
            const { dragging, dropSide, ...handlers } = itemProps(i);
            return (
              <Chip
                key={`${k}-${i}`}
                variant="capsule"
                showHandle
                onRemove={() => remove(i)}
                dragging={dragging}
                dropSide={dropSide}
                dragHandlers={{ draggable: true, ...handlers }}
              >
                {editorLang === "en" ? (selectedEns[i] || k) : k}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 카테고리 직접 입력 — KO/EN 두 input + 추가 버튼. Enter 로 submit 가능 */
function CategoryCustomAdder({ onAdd, onCancel, koPh, enPh }: { onAdd: (ko: string, en: string) => void; onCancel: () => void; koPh: string; enPh: string }) {
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");
  const handleAdd = () => {
    if (!ko.trim() && !en.trim()) return;
    onAdd(ko, en);
    setKo("");
    setEn("");
  };
  return (
    <>
      <div className={styles.customCategoryInputWrap}>
        <span className={styles.customCategoryBadge}>KO</span>
        <input
          className={`${es.fieldInput} ${styles.customCategoryInput}`}
          type="text"
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } else if (e.key === "Escape") onCancel(); }}
          placeholder={koPh}
          autoFocus
        />
      </div>
      <div className={styles.customCategoryInputWrap}>
        <span className={styles.customCategoryBadge}>EN</span>
        <input
          className={`${es.fieldInput} ${styles.customCategoryInput}`}
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } else if (e.key === "Escape") onCancel(); }}
          placeholder={enPh}
        />
      </div>
      <Button
        variant="outline"
        shape="circle"
        size="sm"
        className={styles.categoryAddBtnSized}
        onClick={handleAdd}
        disabled={!ko.trim() && !en.trim()}
        aria-label="Add"
        icon={<Plus size={12} strokeWidth={2} />}
      />
    </>
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

/** Revision detail panel — lang 별 라벨/필드 로컬라이즈 + 해당 lang KO|EN 값만 노출. */
function workSnapshotMeta(s: WorkFormData, lang: "ko" | "en"): import("@/components/admin/AdminEditorShell/types").RevisionMetaGroup[] {
  const isKo = lang === "ko";
  const L = (ko: string, en: string) => (isKo ? ko : en);
  const categories = isKo ? (s.categories_ko ?? []) : (s.categories_en ?? []);
  const nature = isKo ? s.nature_ko : s.nature_en;
  const role = isKo ? s.role_ko : s.role_en;
  const contribs = isKo ? s.contributions_ko : s.contributions_en;
  const roleLabel = L("역할", "Role");
  /** Role fields — 각 역할명을 key, 그 역할의 기여 내용을 value 로 (flat key|value) */
  const roleList = (role || "").split(",").map((r) => r.trim()).filter(Boolean);
  const contribKeys = Object.keys(contribs ?? {});
  const allRoles = Array.from(new Set([...roleList, ...contribKeys]));
  const roleFields = Object.fromEntries(
    allRoles.map((r) => [r || roleLabel, (contribs?.[r] ?? []).filter(Boolean).join(", ")]),
  );
  /** Tech fields — 각 기술명을 key, 노트 설명을 value 로 (flat key|value) */
  const techList = s.tech ?? [];
  const noteKeys = Object.keys(s.tech_notes ?? {});
  const allTech = Array.from(new Set([...techList, ...noteKeys]));
  const techFields = Object.fromEntries(
    allTech.map((t) => {
      const note = s.tech_notes?.[t];
      return [t || L("기술", "Tech"), (isKo ? note?.ko : note?.en) || ""];
    }),
  );
  /** Team fields — 멤버별 한 entry, key = 이름, value = multi-line bullet (이메일/링크/역할별).
   *  역할에 기여 여러 개면 "역할명" 줄 + 들여쓰기로 sub-bullet 표현 (renderer 가 indent 파싱). */
  const emailLabel = L("이메일", "Email");
  const linkLabel = L("링크", "Link");
  const teamFields: Record<string, string> = {};
  (s.team_members ?? []).forEach((m, idx) => {
    const name = (isKo ? (m.name || m.name_en) : (m.name_en || m.name)) || `${L("팀원", "Member")} ${idx + 1}`;
    const mRole = isKo ? m.role_ko : m.role_en;
    const mContribs = isKo ? m.contributions_ko : m.contributions_en;
    const mRoleList = (mRole || "").split(",").map((r) => r.trim()).filter(Boolean);
    const mContribKeys = Object.keys(mContribs ?? {});
    const mAllRoles = Array.from(new Set([...mRoleList, ...mContribKeys]));
    const lines: string[] = [
      `${emailLabel}: ${m.email || ""}`,
      `${linkLabel}: ${m.url || ""}`,
    ];
    mAllRoles.forEach((r) => {
      const items = (mContribs?.[r] ?? []).filter(Boolean);
      if (items.length <= 1) {
        lines.push(items.length === 1 ? `${r}: ${items[0]}` : r);
      } else {
        lines.push(r);
        items.forEach((c) => lines.push(`  ${c}`));
      }
    });
    teamFields[name] = lines.join("\n");
  });
  return [
    {
      label: L("기본", "Basic"),
      fields: {
        Slug: s.slug || "",
        [L("연도", "Year")]: s.year || "",
        [L("콘텐츠 타입", "Content Type")]: s.content_type || "",
      },
    },
    {
      label: L("분류", "Categories"),
      fields: {
        [L("성격", "Nature")]: nature || "",
        [L("카테고리", "Category")]: categories.join(", "),
      },
    },
    {
      label: L("역할", "Role"),
      fields: roleFields,
    },
    {
      label: L("기술", "Tech"),
      fields: techFields,
      bulletValues: true,
    },
    {
      label: L("미디어", "Media"),
      secondary: true,
      fields: {
        [L("커버 이미지", "Cover Image")]: s.image || "",
        [L("갤러리", "Gallery")]: (s.gallery ?? []).filter(Boolean).join("\n"),
      },
    },
    {
      label: L("팀", "Team"),
      fields: teamFields,
      bulletValues: true,
      separateRows: true,
      secondary: true,
    },
    {
      label: L("연결", "Links"),
      secondary: true,
      fields: {
        [L("라이브 URL", "Live URL")]: s.live_url || "",
        "GitHub URL": s.github_url || "",
        [L("관련 게시물", "Related Posts")]: s.related_post_ids?.length ? L(`${s.related_post_ids.length}개`, `${s.related_post_ids.length}`) : "",
      },
    },
    {
      label: L("발행", "Publishing"),
      secondary: true,
      fields: {
        [L("게시", "Published")]: s.published ? L("예", "Yes") : "",
        [L("정렬 순서", "Sort Order")]: String(s.sort_order ?? 0),
        [L("예약 발행", "Scheduled")]: s.scheduled_at || "",
      },
    },
  ];
}


export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const { openModal, closeAll } = useModalStore();
  const isEdit = !!work;
  const serviceStatus = useServiceStatus();

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");
  // 필수/선택 그룹 토글 — Posts editor 와 동일 패턴
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  // slug — 사용자가 직접 수정한 적 있으면 manual 모드로 (제목 변경 시 auto-regenerate 안 함)
  const [slugManual, setSlugManual] = useState(!!work?.slug);

  const tw = useCallback(
    (key: string) => tLang(`admin.works.editor.${key}`, editorLang),
    [tLang, editorLang],
  );
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, slugManual]);

  const initialFormRef = useRef(form);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  const { revisions: dbRevisions, loaded: revisionsLoaded, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
  });

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
    let cancelled = false;
    fetch(`/api/admin/works/${work.id}/related-posts`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.items)) {
          setForm((prev) => ({ ...prev, related_post_ids: d.items.map((p: { id: string }) => p.id) }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        // async load 된 related_post_ids 가 form 에 반영된 다음 frame 에 baseline 정합화 + draft restore 활성화
        requestAnimationFrame(() => {
          markBaseline();
          setInitialLoadsReady(true);
        });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id]);

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
  });

  // 글자 단위 continuous draft (localStorage) — mount 시 silent restore
  const { clearDraft } = useEditorDraft<WorkFormData>({
    entityType: "work",
    entityId: work?.id,
    snapshot: form,
    ready: initialLoadsReady,
    applyDraft: (draft) => {
      setForm(draft);
      requestAnimationFrame(markBaseline);
    },
    ignoredKeys: ["scheduled_at"],
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

  // 팀원 역할 multi-picker — select 와 chip 을 분리 배치 (chip 은 URL row 아래) */
  const teamRole = useRoleMultiPicker({
    value: editorLang === "ko" ? team.memberRoleKo : team.memberRoleEn,
    onChange: editorLang === "ko" ? team.setMemberRoleKo : team.setMemberRoleEn,
    presets: editorLang === "ko" ? ROLE_PRESETS_KO : ROLE_PRESETS_EN,
    placeholder: tw("memberRole"),
    lang: editorLang,
  });

  // 본인 역할 multi-picker — chip 은 TeamContribsByRole 의 group header 가 담당 → selectNode 만 사용 */
  const ownRole = useRoleMultiPicker({
    value: editorLang === "ko" ? form.role_ko : form.role_en,
    onChange: (v) => updateField(editorLang === "ko" ? "role_ko" : "role_en", v),
    presets: editorLang === "ko" ? ROLE_PRESETS_KO : ROLE_PRESETS_EN,
    placeholder: tw("rolePlaceholder"),
    lang: editorLang,
  });

  // form 의 avatar preview — 사용자 입력 기준 derive (avatar_url 우선, 없으면 url 에서)
  const teamAvatarPreview = deriveTeamMemberAvatar({
    avatar_url: team.memberAvatarUrl,
    url: team.memberUrl,
  });
  // avatar 더블클릭 → 파일 picker
  const teamAvatarFileRef = useRef<HTMLInputElement>(null);
  const [teamAvatarUploading, setTeamAvatarUploading] = useState(false);
  const handleTeamAvatarFile = async (file: File) => {
    setTeamAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) team.setMemberAvatarUrl(data.url);
    } catch {
      showToast("Avatar upload failed", "error");
    } finally {
      setTeamAvatarUploading(false);
      if (teamAvatarFileRef.current) teamAvatarFileRef.current.value = "";
    }
  };


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
        <p className={styles.templateModalDesc}>{tw("templateDesc") || (lang === "ko" ? "삽입할 템플릿을 선택하세요. 기존 내용이 있으면 아래에 추가됩니다." : "Choose a template. If content exists, it will be appended below.")}</p>
        <div className={styles.templateList}>
          {WORK_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
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
              <span className={styles.templateItemLabel}>{lang === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{lang === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </button>
          ))}
        </div>
      </div>,
      { header: { title: tw("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, form, updateField, tw, openModal, closeAll]);

  const handleContentImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    const sizeError = validateFileSize(file);
    if (sizeError) throw new Error(sizeError);

    const compressed = await compressImage(file);

    // 압축 후에도 한도 초과면 reject
    const postError = validateFileSize(compressed, undefined, { skipCompressibleBypass: true });
    if (postError) throw new Error(postError);

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
    input.accept = "image/*,video/mp4,video/webm,video/quicktime";
    input.multiple = field === "gallery";
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;

      const { compressImage, validateFileSize } = await import("@/lib/compressImage");
      for (const file of Array.from(files)) {
        const sizeError = validateFileSize(file);
        if (sizeError) { alert(sizeError); continue; }
        // 비디오는 압축 X — 그대로 업로드. 이미지만 압축 파이프라인.
        const isVideo = file.type.startsWith("video/");
        const payload = isVideo ? file : await compressImage(file);
        // 압축 후에도 한도 초과면 reject
        const postError = validateFileSize(payload, undefined, { skipCompressibleBypass: true });
        if (postError) { alert(postError); continue; }
        const formData = new FormData();
        formData.append("file", payload);
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
        const missing: Array<{ label: string; field: string }> = [];
        if (!form.title.trim()) missing.push({ label: tw("title"), field: "title" });
        if (!form.categories_ko || form.categories_ko.length === 0) missing.push({ label: tw("category"), field: "category" });
        if (!form.nature_ko.trim()) missing.push({ label: tw("nature") || "성격", field: "nature" });
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

        // 실제 save 성공 — localStorage draft 정리
        clearDraft();
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
      scheduledAt={form.scheduled_at}
      onScheduledChange={(iso) => updateField("scheduled_at", iso)}
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
    >
      {/* Basic Info — 필수 (title, year, category) + 선택 (collapsible) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("basicInfo")}</h2>

        {/* ── 필수 ── 제목 + 부제목 + slug 묶음 */}
        <div className={es.field} data-required="title">
          <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !form.title.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("title")}</label>
          <input
            className={`${es.titleInput}${showErrors && !form.title.trim() ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={tw("titlePlaceholder")}
          />
        </div>

        {/* 부제목 — 제목 바로 아래 */}
        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("subtitle")}</label>
          <SubtitleInput
            value={form[`subtitle${suf}`]}
            onChange={(v) => updateField(`subtitle${suf}`, v)}
            placeholder={tw("subtitlePlaceholder")}
          />
        </div>

        {/* slug — title 자동 생성. 사용자 수정 시 manual 모드 */}
        <div className={es.field}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
            <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{tw("slug") || "Slug"}</label>
            {form.slug.trim() && validateSlug(form.slug) && (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-accent)" }}>{tw(`slugError.${validateSlug(form.slug)}`) || validateSlug(form.slug)}</span>
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
            <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && !form.nature_ko.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("nature") || "성격"}</label>
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
                    placeholder={tw("naturePlaceholder") || "성격"}
                    options={[
                      { value: "__custom__", label: tw("customNature") || "직접 입력" },
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
                          placeholder={tw("naturePlaceholder") || "성격"}
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
                          placeholder={tw("naturePlaceholder") || "성격"}
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
            <label className={`${es.fieldLabel} ${es.fieldLabelRequired}${showErrors && (form.categories_ko ?? []).length === 0 ? ` ${es.fieldLabelError}` : ""}`}>{tw("category")}</label>
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
            value={form[`description${suf}`]}
            onChange={(v) => updateField(`description${suf}`, v)}
            placeholder={tw("descPlaceholder")}
            rows={3}
            maxHint="basic"
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
            {/* 좌: 정렬순서 (세로 1열 전체)  |  우: subtitle / role (세로 stack) */}
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
                <div className={styles.memberFormBlock}>
                  <div className={styles.memberSubLabelRow}>
                    <span className={styles.memberSubLabel}>{tw("role")}</span>
                  </div>
                  {/* multi-select — chip 은 아래 TeamContribsByRole 가 담당 (selectNode 만 사용) */}
                  {ownRole.selectNode}
                  {/* 역할별 작업 내용 — 공통 TagNotesEditor (ko/en 동시) */}
                  {(() => {
                    const rolesArr = (form[`role${suf}`] || "")
                      .split(",")
                      .map((r) => r.trim())
                      .filter(Boolean);
                    const koMap = (form.contributions_ko ?? {}) as Record<string, string[]>;
                    const enMap = (form.contributions_en ?? {}) as Record<string, string[]>;
                    const notesMap: Record<string, { ko: string; en: string }> = {};
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
                        notePlaceholder={tw("memberContributionPlaceholder") || "이 역할로 무엇을 했는지 적어주세요."}
                        addLabel="설명 추가"
                        cancelLabel="취소"
                        editLabel="편집"
                        removeTitle="역할 제거"
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

      {/* Detail Content */}
      <div className={styles.section} data-required="content">
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
        </div>

        <div className={styles.editorBlock}>
          <Editor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleContentImageUpload}
          />
        </div>
      </div>

      {/* Images */}
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
            <button
              type="button"
              className={styles.galleryAddTile}
              onClick={() => handleImageUpload("gallery")}
            >
              <Plus size={20} strokeWidth={1.5} />
              <span>{tw("addGallery")}</span>
            </button>
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
                  showToast(editorLang === "ko" ? `이미 추가됨: ${canonical}` : `Already added: ${canonical}`, "info");
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
                  showToast(editorLang === "ko" ? `이미 추가됨: ${canonical}` : `Already added: ${canonical}`, "info");
                  tech.setInput("");
                  return;
                }
                tech.add(canonical);
                tech.setInput("");
              }}
              disabled={!tech.input.trim()}
              aria-label="Add"
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
            notePlaceholder="이 기술을 왜 선택했고, 무엇을 어떻게 구현했는지 적어주세요."
            addLabel="설명 추가"
            cancelLabel="취소"
            editLabel="편집"
            removeTitle="기술 제거"
            multiLine
          />
        </div>
      </div>

      {/* Team Members */}
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
                ? (editorLang === "ko" ? "팀원 편집" : "Edit member")
                : tw("memberFormLabel")}
            </span>
            {team.editingIdx !== null ? (
              <div className={styles.memberFormActions}>
                <Button
                  variant="outline"
                  size="xs"
                  className={styles.avatarUploadBtn}
                  onClick={team.cancelEdit}
                  aria-label="Cancel edit"
                  icon={<X size={12} strokeWidth={2} />}
                >
                  {editorLang === "ko" ? "취소" : "Cancel"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className={styles.avatarUploadBtn}
                  onClick={team.saveEdit}
                  disabled={!team.memberName.trim()}
                  aria-label="Save edit"
                  icon={<Check size={12} strokeWidth={2} />}
                >
                  {editorLang === "ko" ? "저장" : "Save"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="xs"
                className={styles.avatarUploadBtn}
                onClick={team.addMember}
                disabled={!team.memberName.trim()}
                aria-label="Add member"
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
                <button
                  type="button"
                  className={styles.memberAvatarAddBadge}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!teamAvatarUploading) teamAvatarFileRef.current?.click();
                  }}
                  aria-label={tw("memberAvatarUpload")}
                  tabIndex={-1}
                >
                  <Plus size={10} strokeWidth={2.5} />
                </button>
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
              const notesMap: Record<string, { ko: string; en: string }> = {};
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
                  notePlaceholder={tw("memberContributionPlaceholder") || "이 역할로 무엇을 했는지 적어주세요."}
                  addLabel="설명 추가"
                  cancelLabel="취소"
                        editLabel="편집"
                  removeTitle="역할 제거"
                        multiLine
                />
              );
            })()}
          </div>
        </div>
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
          category: (editorLang === "ko" ? form.categories_ko : form.categories_en)?.join(", ") ?? "",
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
