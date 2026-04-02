import { useState, useCallback } from "react";
import type { TeamMember } from "@/types/work";

export function useTeamMembers(
  currentMembers: TeamMember[],
  onUpdate: (members: TeamMember[]) => void,
) {
  const [memberName, setMemberName] = useState("");
  const [memberRoleKo, setMemberRoleKo] = useState("");
  const [memberRoleEn, setMemberRoleEn] = useState("");
  const [memberUrl, setMemberUrl] = useState("");

  const addMember = useCallback(() => {
    if (!memberName.trim()) return;
    const member: TeamMember = {
      name: memberName.trim(),
      role_ko: memberRoleKo.trim(),
      role_en: memberRoleEn.trim(),
      url: memberUrl.trim() || undefined,
    };
    onUpdate([...currentMembers, member]);
    setMemberName("");
    setMemberRoleKo("");
    setMemberRoleEn("");
    setMemberUrl("");
  }, [memberName, memberRoleKo, memberRoleEn, memberUrl, currentMembers, onUpdate]);

  const removeMember = useCallback(
    (index: number) => {
      onUpdate(currentMembers.filter((_, i) => i !== index));
    },
    [currentMembers, onUpdate],
  );

  return {
    memberName,
    setMemberName,
    memberRoleKo,
    setMemberRoleKo,
    memberRoleEn,
    setMemberRoleEn,
    memberUrl,
    setMemberUrl,
    addMember,
    removeMember,
  };
}
