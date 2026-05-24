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

  const addMember = useCallback(() => {
    if (!memberName.trim()) return;
    // role 목록에 없는 키는 prune (역할 제거 후 남은 orphan contribs 제거)
    const koRoles = memberRoleKo.split(",").map((r) => r.trim()).filter(Boolean);
    const enRoles = memberRoleEn.split(",").map((r) => r.trim()).filter(Boolean);
    const prunedKo = Object.fromEntries(
      Object.entries(memberContribsKo).filter(([k, v]) => koRoles.includes(k) && v.length > 0),
    );
    const prunedEn = Object.fromEntries(
      Object.entries(memberContribsEn).filter(([k, v]) => enRoles.includes(k) && v.length > 0),
    );
    const member: TeamMember = {
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
    onUpdate([...currentMembers, member]);
    setMemberName("");
    setMemberNameEn("");
    setMemberRoleKo("");
    setMemberRoleEn("");
    setMemberUrl("");
    setMemberEmail("");
    setMemberAvatarUrl("");
    setMemberContribsKo({});
    setMemberContribsEn({});
  }, [memberName, memberNameEn, memberRoleKo, memberRoleEn, memberUrl, memberEmail, memberAvatarUrl, memberContribsKo, memberContribsEn, currentMembers, onUpdate]);

  const removeMember = useCallback(
    (index: number) => {
      onUpdate(currentMembers.filter((_, i) => i !== index));
    },
    [currentMembers, onUpdate],
  );

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
  };
}
