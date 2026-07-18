"use client";

import { useContext } from "react";
import { createPortal } from "react-dom";
import { Mail, Clock, Pencil, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import { useModalStore } from "@/stores/modalStore";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useLanguage } from "@/providers/LanguageProvider";
import { RoleBadge, ProviderChips } from "@/components/admin/MemberBadges";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import type { Author } from "@/types/author";
import type { Member, MemberRole } from "@/types/member";
import styles from "../Settings.module.css";
import mStyles from "@/components/admin/MembersList.module.css";

interface Props {
  author: Author;
  member?: Member;
  /** 이 프로필이 소유자인지 — 배지 표시용 */
  isOwnerProfile?: boolean;
  /** 접근 정보(권한/OAuth/최근 로그인) 표시 — owner 관리뷰만 true */
  showAccess?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  /** 편집 버튼 라벨 — 기본 "수정". 미생성 프로필이면 "만들기" 등으로. */
  editLabel?: string;
}

const LEVEL_LABEL = (level: number | null, ko: boolean) =>
  level != null && level >= 2 ? (ko ? "편집자 (모든 글)" : "Editor (all posts)") : ko ? "작성자 (자기 글)" : "Author (own posts)";

/** 멤버 상세 프로필 (읽기 전용) — 행 클릭 시 표시. 권한 있으면 "수정" 으로 편집 모달 전환. (이슈 #334) */
export default function MemberDetailModal({ author, member, isOwnerProfile, showAccess, canEdit, onEdit, editLabel }: Props) {
  const { language } = useLanguage();
  const ko = language === "ko";
  const L = (k: string, e: string) => (ko ? k : e);
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  const badgeRole: MemberRole | null = isOwnerProfile ? "owner" : member?.role ?? null;
  const links = author.links ?? [];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(ko ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className={styles.memberDetail}>
      <div className={styles.memberDetailHead}>
        <span className={styles.memberDetailAvatar}>
          {author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar} alt="" />
          ) : (
            <span aria-hidden>{(author.name || author.email || "?").charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className={styles.memberDetailHeadInfo}>
          <div className={styles.memberDetailNameRow}>
            <span className={styles.memberDetailName}>{author.name || L("(이름 없음)", "(unnamed)")}</span>
            {badgeRole && <RoleBadge role={badgeRole} />}
          </div>
          {author.role && <span className={styles.memberDetailRole}>{author.role}</span>}
        </div>
      </div>

      <div className={styles.memberDetailMeta}>
        {author.email && (
          <div className={styles.memberDetailMetaRow}>
            <Mail size={13} strokeWidth={1.8} />
            <a href={`mailto:${author.email}`} className={styles.memberDetailMetaLink}>{author.email}</a>
          </div>
        )}
        {showAccess && (
          <>
            <div className={styles.memberDetailMetaRow}>
              {member ? <ProviderChips providers={member.providers} /> : <span className={mStyles.role + " " + mStyles.rolePendingBadge}>{L("OAuth 미연결", "OAuth not linked")}</span>}
            </div>
            {!isOwnerProfile && member && (
              <div className={styles.memberDetailMetaRow}>
                <span className={styles.memberDetailMetaLabel}>{L("권한", "Access")}</span>
                <span>{LEVEL_LABEL(member.level, ko)}</span>
              </div>
            )}
            {member?.lastSignInAt && (
              <div className={styles.memberDetailMetaRow}>
                <Clock size={13} strokeWidth={1.8} />
                <span>{L("최근 로그인", "Last sign-in")} · {fmtDate(member.lastSignInAt)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {author.bio && <p className={styles.memberDetailBio}>{author.bio}</p>}

      {links.length > 0 && (
        <div className={styles.memberDetailLinks}>
          {links.map((l, i) => {
            const meta = SOCIAL_ICONS[l.platform];
            const label = l.label || meta?.label || l.platform;
            return (
              <a key={`${l.platform}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.memberDetailLink}>
                <ExternalLink size={12} strokeWidth={1.8} />
                {label}
              </a>
            );
          })}
        </div>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={() => closeModal("member-detail")}>{L("닫기", "Close")}</Button>
          {canEdit && (
            <Button variant="primary" size="sm" soundDisabled icon={<Pencil size={14} />} onClick={() => { closeModal("member-detail"); onEdit?.(); }}>
              {editLabel ?? L("수정", "Edit")}
            </Button>
          )}
        </>,
        footerEl,
      )}
    </div>
  );
}
