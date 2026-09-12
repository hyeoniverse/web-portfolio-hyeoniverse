"use client";

import styles from "../WorkEditor.module.css";
import { useRef, useState } from "react";
import { ListItem } from "@/app/admin/(dashboard)/components";
import { ChevronRight, Link2 as LinkIcon, Pencil, Plus, User, X } from "@/components/icons";
import CloseButton from "@/components/ui/CloseButton";
import Pressable from "@/components/ui/Pressable";
import { showToast } from "@/stores/toastStore";
import { type TeamMember } from "@/types/work";
import { deriveTeamMemberAvatar, getMemberInitial } from "@/utils/teamMemberAvatar";
import { useLanguage } from "@/providers/LanguageProvider";
/* ──────────────────────────────────────────────────────────────────────────
 * TeamMemberCard — 팀원 1명. 상단 chip-row (avatar + 이름/역할 + remove) + 하단 contributions ul.
 * contributions 는 editorLang 기준 단일 배열만 보여줌 — 다른 lang 은 그대로 유지. */
export function TeamMemberCard({
  member,
  editorLang,
  linkedAuthorName,
  onChange,
  onRemove,
  onEdit,
  isEditingFull,
}: {
  member: TeamMember;
  editorLang: "ko" | "en";
  /** 연결된 사이트 저자 이름 — 이 팀원이 작업물을 편집할 수 있음을 목록에서 드러낸다 */
  linkedAuthorName?: string;
  onChange: (next: TeamMember) => void;
  onRemove: () => void;
  /** 전체 편집 모드 진입 (KO/EN 분리·역할·작업 내용 등 add-card form 으로) */
  onEdit?: () => void;
  /** 현재 이 카드가 전체 편집 중인지 — 시각 강조 */
  isEditingFull?: boolean;
}) {
  /* 카드의 도움말·자리표시는 관리자 화면 언어. editorLang 은 역할·기여 항목 같은 콘텐츠 칸을 고를 때만 쓴다 */
  const { t } = useLanguage();
  const tw = (key: string) => t(`admin.works.editor.${key}`);
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
      showToast(tw("avatarUploadFailed"), "error");
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
            aria-label={tw("changePhoto")}
            title={tw("doubleClickPhoto")}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className={styles.memberAvatarImg} loading="lazy" />
            ) : member.name.trim() ? (
              <span className={styles.memberAvatarInitial}>{getMemberInitial(member.name)}</span>
            ) : (
              <User size={20} strokeWidth={1.5} className={styles.memberAvatarPlaceholder} />
            )}
            <Pressable
              className={styles.memberAvatarAddBadge}
              onClick={(e) => {
                e.stopPropagation();
                if (!avatarUploading) avatarFileRef.current?.click();
              }}
              aria-label={tw("changePhoto")}
              tabIndex={-1}
            >
              <Plus size={10} strokeWidth={2.5} />
            </Pressable>
          </span>
          <div className={styles.memberInfo}>
            {/* name — 첫 줄 */}
            {editingFields.has("name") ? (
              <input type="text" defaultValue={member.name} {...inlineEditProps("name", styles.memberItemName)} />
            ) : (
              <span className={styles.memberNameRow}>
                <span
                  className={styles.memberItemName}
                  onMouseDown={dblClickGuard}
                  onDoubleClick={() => startEdit("name")}
                  title={tw("doubleClickEdit")}
                >
                  {member.name}
                </span>
                {/* 연결된 계정이 있으면 드러낸다 — 이 목록이 곧 이 작업물의 편집자 명단이다 */}
                {linkedAuthorName && (
                  <span
                    className={styles.memberLinkedBadge}
                    title={
                      editorLang === "ko"
                        ? `${linkedAuthorName} 계정이 이 작업물을 편집할 수 있습니다.`
                        : `${linkedAuthorName} can edit this project.`
                    }
                  >
                    <LinkIcon size={10} strokeWidth={2} />
                    {linkedAuthorName}
                  </span>
                )}
              </span>
            )}
            {/* role — 두번째 줄 (subtitle). contribs 있으면 각 contrib group label 이 role 표시 담당 → 중복 숨김 */}
            {editingFields.has("role") ? (
              <input
                type="text"
                defaultValue={roleField}
                placeholder={tw("rolesPlaceholder")}
                {...inlineEditProps("role", styles.memberItemRole)}
              />
            ) : contribsToShow.length === 0 && (member.role_ko || member.role_en) ? (
              <span
                className={styles.memberItemRole}
                onMouseDown={dblClickGuard}
                onDoubleClick={() => startEdit("role")}
                title={tw("doubleClickEdit")}
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
                title={tw("doubleClickEdit")}
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
                title={tw("doubleClickEdit")}
                data-cursor="text"
              >
                {member.url}
              </span>
            ) : null}
          </div>
          <div className={styles.memberHeaderActions}>
            {onEdit && (
              <Pressable
                className={styles.memberHeaderEditBtn}
                onClick={onEdit}
                aria-label={isEditingFull ? "Cancel edit" : "Edit member"}
                title={isEditingFull ? tw("cancelEditAll") : tw("editAll")}
                data-cursor="big"
              >
                {isEditingFull ? <X size={14} strokeWidth={2.4} /> : <Pencil size={14} strokeWidth={2.2} />}
              </Pressable>
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
                  <Pressable
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
                        title={tw("doubleClickEdit")}
                        data-cursor="text"
                      >
                        {role}
                      </span>
                    )}
                  </Pressable>
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
                                title={tw("doubleClickEdit")}
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
                          placeholder={tw("newTaskPlaceholder")}
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
