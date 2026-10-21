"use client";

import { BadgeCheck, Mail, Pencil, X } from "@/components/icons";
import AuthorAvatar from "@/components/ui/AuthorAvatar";
import Pressable from "@/components/ui/Pressable";
import { type TeamMember } from "@/types/work";
import { deriveTeamMemberAvatar } from "@/utils/teamMemberAvatar";
import { splitRoleList } from "@/utils/teamRoles";
import styles from "./TeamMemberRow.module.css";

/**
 * 팀원 한 줄 — [얼굴 | 이름 · 사이트 멤버 | 역할 칩 | 연락처 | 편집 · 빼기].
 * 예전 카드는 역할별 작업 내용 목록까지 펼쳐 한 사람이 화면 반을 썼다. 목록에서는 누구인지만 보이고,
 * 고칠 때는 편집으로 그 줄을 폼으로 바꾼다(WorkEditor 의 memberForm).
 */
export function TeamMemberRow({
  member,
  editorLang,
  linkedAuthorName,
  onEdit,
  onRemove,
  labels,
}: {
  member: TeamMember;
  editorLang: "ko" | "en";
  linkedAuthorName?: string;
  onEdit: () => void;
  onRemove: () => void;
  labels: { edit: string; remove: string; linked: string };
}) {
  const name = editorLang === "en" && member.name_en ? member.name_en : member.name;
  const otherName = editorLang === "en" ? member.name : member.name_en;
  const roles = splitRoleList(editorLang === "en" ? member.role_en : member.role_ko);
  const host = (() => {
    if (!member.url) return "";
    try { return new URL(member.url).host.replace(/^www\./, ""); } catch { return member.url; }
  })();
  return (
    <li className={styles.row}>
      <AuthorAvatar value={deriveTeamMemberAvatar(member)} name={member.name} size={36} imgClassName={styles.avatar} initialClassName={styles.avatar} />
      <div className={styles.main}>
        <div className={styles.nameLine}>
          <span className={styles.name}>{name}</span>
          {otherName && otherName !== name && <span className={styles.otherName}>{otherName}</span>}
          {linkedAuthorName && (
            <span className={styles.linked} title={linkedAuthorName}>
              <BadgeCheck size={12} strokeWidth={2} />
              {labels.linked}
            </span>
          )}
        </div>
        {roles.length > 0 && (
          <p className={styles.roles}>{roles.join(" · ")}</p>
        )}
      </div>
      <div className={styles.contact}>
        {member.email && <span className={styles.contactLine}><Mail size={12} strokeWidth={2} />{member.email}</span>}
        {host && <span className={styles.contactLine}>{host}</span>}
      </div>
      <div className={styles.actions}>
        <Pressable className={styles.action} onClick={onEdit} aria-label={`${labels.edit}: ${name}`} title={labels.edit}>
          <Pencil size={14} strokeWidth={2} />
        </Pressable>
        <Pressable className={styles.action} onClick={onRemove} aria-label={`${labels.remove}: ${name}`} title={labels.remove}>
          <X size={14} strokeWidth={2} />
        </Pressable>
      </div>
    </li>
  );
}
