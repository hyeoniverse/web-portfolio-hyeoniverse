import { useState, useCallback, useMemo } from "react";
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
  /* 연결된 사이트 저자 프로필 id — 이 값이 있으면 그 계정이 이 작업물의 편집자가 된다.
     form 이 이 값을 들고 있지 않으면 팀원을 편집해 저장하는 순간 연결이 사라진다
     (buildMember 가 form state 로 객체를 새로 만들기 때문). */
  const [memberAuthorId, setMemberAuthorId] = useState<string | undefined>(undefined);
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
    setMemberAuthorId(undefined);
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
      author_id: memberAuthorId || undefined,
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
  }, [memberName, memberNameEn, memberRoleKo, memberRoleEn, memberUrl, memberEmail, memberAvatarUrl, memberAuthorId, memberContribsKo, memberContribsEn]);

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
    setMemberAuthorId(m.author_id);
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

  /* 값이 그대로면 같은 객체를 돌려준다 — 팀원 섹션이 메모로 다시 그리기를 건너뛸 수 있게(#850) */
  return useMemo(() => ({
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
    memberAuthorId,
    setMemberAuthorId,
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
  }), [
    memberName, memberNameEn, memberRoleKo, memberRoleEn, memberUrl, memberEmail, memberAvatarUrl,
    memberAuthorId, memberContribsKo, memberContribsEn, addMember, removeMember, editingIdx, startEdit, cancelEdit, saveEdit,
  ]);
}
