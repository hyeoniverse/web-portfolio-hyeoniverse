import { useState, useCallback } from "react";
import type { TeamMember } from "@/types/work";

export function useTeamMembers(
  currentMembers: TeamMember[],
  onUpdate: (members: TeamMember[]) => void,
) {
  const [memberName, setMemberName] = useState("");
  const [memberNameEn, setMemberNameEn] = useState("");
  const [memberRoleKo, setMemberRoleKo] = useState("");
  const [memberRoleEn, setMemberRoleEn] = useState("");
  const [memberUrl, setMemberUrl] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberAvatarUrl, setMemberAvatarUrl] = useState("");
  const [memberContribsKo, setMemberContribsKo] = useState<Record<string, string[]>>({});
  const [memberContribsEn, setMemberContribsEn] = useState<Record<string, string[]>>({});
  // null = add 모드, number = 해당 index 의 멤버 편집 모드
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const clearForm = useCallback(() => {
    setMemberName("");
    setMemberNameEn("");
    setMemberRoleKo("");
    setMemberRoleEn("");
    setMemberUrl("");
    setMemberEmail("");
    setMemberAvatarUrl("");
    setMemberContribsKo({});
    setMemberContribsEn({});
  }, []);

  // form state → TeamMember 객체 (add / save 둘 다 공용)
  const buildMember = useCallback((): TeamMember | null => {
    if (!memberName.trim()) return null;
    const koRoles = memberRoleKo.split(",").map((r) => r.trim()).filter(Boolean);
    const enRoles = memberRoleEn.split(",").map((r) => r.trim()).filter(Boolean);
    const prunedKo = Object.fromEntries(
      Object.entries(memberContribsKo).filter(([k, v]) => koRoles.includes(k) && v.length > 0),
    );
    const prunedEn = Object.fromEntries(
      Object.entries(memberContribsEn).filter(([k, v]) => enRoles.includes(k) && v.length > 0),
    );
    return {
      name: memberName.trim(),
      name_en: memberNameEn.trim() || undefined,
      role_ko: memberRoleKo.trim(),
      role_en: memberRoleEn.trim(),
      url: memberUrl.trim() || undefined,
      email: memberEmail.trim() || undefined,
      avatar_url: memberAvatarUrl.trim() || undefined,
      contributions_ko: Object.keys(prunedKo).length > 0 ? prunedKo : undefined,
      contributions_en: Object.keys(prunedEn).length > 0 ? prunedEn : undefined,
    };
  }, [memberName, memberNameEn, memberRoleKo, memberRoleEn, memberUrl, memberEmail, memberAvatarUrl, memberContribsKo, memberContribsEn]);

  const addMember = useCallback(() => {
    const member = buildMember();
    if (!member) return;
    onUpdate([...currentMembers, member]);
    clearForm();
  }, [buildMember, currentMembers, onUpdate, clearForm]);

  const removeMember = useCallback(
    (index: number) => {
      onUpdate(currentMembers.filter((_, i) => i !== index));
      if (editingIdx === index) {
        setEditingIdx(null);
        clearForm();
      }
    },
    [currentMembers, onUpdate, editingIdx, clearForm],
  );

  // 편집 모드 진입 — 해당 멤버 데이터를 form state 에 prefill
  const startEdit = useCallback((index: number) => {
    const m = currentMembers[index];
    if (!m) return;
    setMemberName(m.name);
    setMemberNameEn(m.name_en ?? "");
    setMemberRoleKo(m.role_ko ?? "");
    setMemberRoleEn(m.role_en ?? "");
    setMemberUrl(m.url ?? "");
    setMemberEmail(m.email ?? "");
    setMemberAvatarUrl(m.avatar_url ?? "");
    setMemberContribsKo(m.contributions_ko ?? {});
    setMemberContribsEn(m.contributions_en ?? {});
    setEditingIdx(index);
  }, [currentMembers]);

  const cancelEdit = useCallback(() => {
    setEditingIdx(null);
    clearForm();
  }, [clearForm]);

  // 편집 저장 — form state → members[editingIdx] 으로 commit
  const saveEdit = useCallback(() => {
    if (editingIdx === null) return;
    const member = buildMember();
    if (!member) return;
    onUpdate(currentMembers.map((mm, i) => (i === editingIdx ? member : mm)));
    setEditingIdx(null);
    clearForm();
  }, [editingIdx, buildMember, currentMembers, onUpdate, clearForm]);

  return {
    memberName,
    setMemberName,
    memberNameEn,
    setMemberNameEn,
    memberRoleKo,
    setMemberRoleKo,
    memberRoleEn,
    setMemberRoleEn,
    memberUrl,
    setMemberUrl,
    memberEmail,
    setMemberEmail,
    memberAvatarUrl,
    setMemberAvatarUrl,
    memberContribsKo,
    setMemberContribsKo,
    memberContribsEn,
    setMemberContribsEn,
    addMember,
    removeMember,
    editingIdx,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
