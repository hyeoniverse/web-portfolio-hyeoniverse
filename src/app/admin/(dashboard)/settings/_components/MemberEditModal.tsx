"use client";

import { useContext, useState } from "react";
import type { SelectOption } from "@/types";
import type { Outcome } from "../_types";
import { createPortal } from "react-dom";
import { Plus, Mail, Clock } from "@/components/icons";
import { SiGithub } from "react-icons/si";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useModalStore } from "@/stores/modalStore";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useLanguage } from "@/providers/LanguageProvider";
import { RoleBadge, ProviderChips } from "@/components/admin/MemberBadges";
import type { Author } from "@/types/author";
import type { Member, PendingMember } from "@/types/member";
import Field from "./SettingsFormFields";
import SocialLinksEditor from "./SocialLinksEditor";
import styles from "./MemberEditModal.module.css";
import shared from "../Settings.module.css";
import mStyles from "@/components/admin/MembersList.module.css";

interface Props {
  initial: Author;
  member?: Member;
  invited?: PendingMember;
  /** 프로필 없이 로그인만 한 계정을 이 프로필에 연결할 때의 대상 계정 id (GitHub 데이터로 pre-fill). */
  linkMemberId?: string;
  levels: SelectOption[];
  onSaveProfile: (author: Author) => void;
  onInvite: (author: Author, level: number) => Promise<Outcome>;
  onChangeLevel: (memberId: string, authorId: string, level: number) => Promise<Outcome>;
  /** 기존 로그인 계정을 프로필과 연결 + 권한 부여. */
  onLink?: (memberId: string, authorId: string, level: number) => Promise<Outcome>;
  uploadAvatar: () => Promise<string | null>;
  /** 접근 권한(초대/권한변경/연결) 관리 표시 여부 — owner 만 true. 비owner 는 프로필만 편집. */
  canManageAccess?: boolean;
  /** GitHub(OAuth) 프로필 정보 — "GitHub 에서 불러오기" 버튼으로 이름/아바타/소셜 채움. */
  githubInfo?: { name: string | null; avatar: string | null; url: string | null };
}

/** 멤버(작성자 프로필 + 로그인 접근) 편집 모달. draft 기반 — 저장 시 config 반영, 취소 시 폐기.
 *  접근(초대/권한/연결)은 API 반영하고 모달 내부 상태로 표시 갱신. (이슈 #334) */
export default function MemberEditModal({
  initial, member, invited, linkMemberId, levels, onSaveProfile, onInvite, onChangeLevel, onLink, uploadAvatar, canManageAccess = true, githubInfo,
}: Props) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  const [draft, setDraft] = useState<Author>(initial);
  const [inviteLevel, setInviteLevel] = useState<string>(invited ? String(invited.level) : "1");
  const [localInvited, setLocalInvited] = useState<boolean>(!!invited);
  const [memberLevel, setMemberLevel] = useState<string>(member ? String(member.level ?? 1) : "1");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const set = (p: Partial<Author>) => setDraft((d) => ({ ...d, ...p }));

  const pickAvatar = async () => {
    const url = await uploadAvatar();
    if (url) set({ avatar: url }); // 아바타 URL 필드도 draft.avatar 바인딩이라 함께 갱신됨
  };

  const ghHasData = !!githubInfo && (!!githubInfo.name || !!githubInfo.avatar || !!githubInfo.url);
  // GitHub 프로필로 이름/아바타 채우기 + GitHub 소셜 링크 추가
  const loadGithub = () => {
    if (!githubInfo) return;
    setDraft((d) => {
      const next: Author = { ...d };
      if (githubInfo.name) next.name = githubInfo.name;
      if (githubInfo.avatar) next.avatar = githubInfo.avatar;
      if (githubInfo.url && !d.links.some((l) => l.platform === "github")) {
        next.links = [...d.links, { platform: "github", url: githubInfo.url }];
      }
      return next;
    });
  };

  const save = async () => {
    if (!draft.name.trim()) { setStatus({ ok: false, msg: L("이름을 입력해 주세요.", "Please enter a name.") }); return; }
    onSaveProfile(draft);
    if (linkMemberId && onLink) {
      setBusy(true);
      const r = await onLink(linkMemberId, draft.id, Number(inviteLevel));
      setBusy(false);
      if (!r.ok) { setStatus(r); return; } // 실패 시 모달 유지
    }
    closeModal("member-edit");
  };

  const invite = async () => {
    if (!draft.name.trim()) { setStatus({ ok: false, msg: L("이름을 입력해 주세요.", "Please enter a name.") }); return; }
    if (!draft.email) { setStatus({ ok: false, msg: L("이메일을 먼저 입력해 주세요.", "Please enter an email first.") }); return; }
    setBusy(true);
    onSaveProfile(draft); // author_id 정합성 위해 프로필 먼저 저장
    const r = await onInvite(draft, Number(inviteLevel));
    setStatus(r);
    if (r.ok) setLocalInvited(true);
    setBusy(false);
  };

  const changeLevel = async (v: string) => {
    if (!member) return;
    setMemberLevel(v);
    setBusy(true);
    const r = await onChangeLevel(member.id, draft.id, Number(v));
    setStatus(r);
    setBusy(false);
  };

  return (
    <div className={styles.memberModal}>
      <div className={styles.authorCardHead}>
        <button
          type="button"
          className={styles.authorAvatarUpload}
          onClick={pickAvatar}
          title={L("이미지 업로드", "Upload image")}
          aria-label={L("아바타 이미지 업로드", "Upload avatar image")}
        >
          {draft.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.avatar} alt="" className={styles.authorAvatarImg} />
          ) : (
            <span className={styles.authorAvatarInitial} aria-hidden>
              {(draft.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className={styles.authorAvatarPlus} aria-hidden>
            <Plus size={12} strokeWidth={2.5} />
          </span>
        </button>
        <span className={styles.authorCardName}>{draft.name || L("(이름 없음)", "(unnamed)")}</span>
      </div>

      {ghHasData && (
        <div className={shared.memberGithubLoad}>
          <Button variant="outline" size="xs" icon={<SiGithub size={13} />} onClick={loadGithub}>
            {L("GitHub 정보 불러오기", "Load from GitHub")}
          </Button>
          <span className={shared.fieldHint}>
            {L("이름·아바타·GitHub 소셜 링크를 GitHub 계정 정보로 채웁니다.", "Fills name, avatar and GitHub social link from the GitHub account.")}
          </span>
        </div>
      )}

      <div className={styles.authorCardFields}>
        <Field label={L("이름", "Name")} value={draft.name} onChange={(v) => set({ name: v })} required />
        <Field label={L("아바타 URL", "Avatar URL")} value={draft.avatar} onChange={(v) => set({ avatar: v })} placeholder="https://..." maxHint={null} />
        <Field label={L("역할", "Role")} value={draft.role} onChange={(v) => set({ role: v })} placeholder={L("예: 프론트엔드 개발자", "e.g. Frontend Developer")} />
        <Field label={L("이메일", "Email")} value={draft.email} onChange={(v) => set({ email: v })} placeholder="name@example.com" maxHint={null} />
        <Field label={L("소개", "Bio")} value={draft.bio} onChange={(v) => set({ bio: v })} multiline />
      </div>

      {/* 접근 권한 — owner 만 (비owner 는 본인 프로필만 편집) */}
      {canManageAccess && (
      <div className={shared.authorInvite}>
        <span className={shared.fieldLabel}>{L("접근 권한", "Access")}</span>

        {member ? (
          <>
            <div className={styles.authorMemberStatus}>
              <RoleBadge role={member.role} />
              <ProviderChips providers={member.providers} />
              {member.lastSignInAt && (
                <span className={mStyles.since}>
                  <Clock size={11} strokeWidth={2} />
                  {new Date(member.lastSignInAt).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            {/* owner 는 전권이라 레벨 조정 불가 */}
            {member.role !== "owner" && (
              <div className={styles.authorInviteRow}>
                <Select value={memberLevel} options={levels} size="sm" disabled={busy} onChange={changeLevel} />
              </div>
            )}
          </>
        ) : linkMemberId ? (
          <>
            <span className={shared.fieldHint}>
              {L("이미 로그인한 계정입니다. 저장하면 이 프로필과 연결하고 권한을 부여합니다.", "This account has already signed in. Saving links it to this profile and grants access.")}
            </span>
            <div className={styles.authorInviteRow}>
              <Select value={inviteLevel} options={levels} size="sm" disabled={busy} onChange={setInviteLevel} />
            </div>
          </>
        ) : (
          <>
            <span className={shared.fieldHint}>
              {localInvited
                ? L("초대를 보냈습니다. 동일한 GitHub 계정으로 로그인하면 권한이 부여됩니다.", "Invite sent. Access is granted when they sign in with the matching GitHub account.")
                : L("이 이메일과 동일한 GitHub 계정으로 로그인하면 권한이 부여됩니다.", "Access is granted when they sign in with the GitHub account that uses this email.")}
            </span>
            <div className={styles.authorInviteRow}>
              <Select value={inviteLevel} options={levels} size="sm" onChange={setInviteLevel} />
              <Button variant="outline" size="sm" icon={<Mail size={14} />} disabled={busy || !draft.email} onClick={invite}>
                {busy ? L("초대하고 있습니다…", "Sending…") : localInvited ? L("초대 다시 보내기", "Resend invite") : L("이메일로 초대", "Invite by email")}
              </Button>
              {localInvited && (
                <span className={`${mStyles.role} ${mStyles.rolePendingBadge}`}>{L("초대됨 · 미가입", "Invited · pending")}</span>
              )}
            </div>
          </>
        )}

        {status && (
          <span className={status.ok ? shared.authorInviteOk : shared.authorInviteErr}>{status.msg}</span>
        )}
      </div>
      )}

      <div className={styles.authorLinksEditor}>
        <span className={shared.fieldLabel}>{L("링크", "Links")}</span>
        <SocialLinksEditor links={draft.links} onChange={(links) => set({ links })} max={8} />
      </div>

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={() => closeModal("member-edit")}>{L("취소", "Cancel")}</Button>
          <Button variant="primary" size="sm" soundDisabled disabled={busy || !draft.name.trim()} onClick={save}>{L("저장", "Save")}</Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
