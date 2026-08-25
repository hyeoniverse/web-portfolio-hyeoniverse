"use client";

import { useContext } from "react";
import { createPortal } from "react-dom";
import { Mail, MapPin, Clock } from "@/components/icons";
import SocialBrandIcon from "@/components/icons/SocialBrandIcon";
import Button from "@/components/ui/Button";
import { useModalStore } from "@/stores/modalStore";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useLanguage } from "@/providers/LanguageProvider";
import { RoleBadge, ProviderChips } from "@/components/admin/MemberBadges";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import type { Author } from "@/types/author";
import type { Member, MemberRole } from "@/types/member";
import { githubLoginFromLinks } from "@/utils/githubLogin";
import AuthorAvatar from "@/components/ui/AuthorAvatar";
import styles from "./MemberDetailModal.module.css";
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
  /* GitHub 을 연결해 뒀으면 사용자명을 링크에서 뽑아 보여준다 — 별도 필드를 두지 않아
     링크와 표시가 어긋나지 않는다. */
  const ghLogin = githubLoginFromLinks(links);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(ko ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className={styles.memberDetail}>
      <div className={styles.memberDetailHead}>
        <span className={styles.memberDetailAvatar}>
          <AuthorAvatar value={author.avatar} name={author.name || author.email} size={36} />
        </span>
        <div className={styles.memberDetailHeadInfo}>
          <div className={styles.memberDetailNameRow}>
            <span className={styles.memberDetailName}>{author.name || L("(이름 없음)", "(unnamed)")}</span>
            {ghLogin && (
              <a
                className={styles.memberDetailHandle}
                href={`https://github.com/${ghLogin}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                @{ghLogin}
              </a>
            )}
            {badgeRole && <RoleBadge role={badgeRole} />}
          </div>
          {author.role && <span className={styles.memberDetailRole}>{author.role}</span>}
          {/* 링크는 이 사람이 누구인지에 붙는 정보라 이름·직함과 같은 묶음에 둔다.
              meta 목록(이메일·지역·권한)은 계정에 관한 사실이라 성격이 다르다. */}
          {links.length > 0 && (
            <div className={styles.memberDetailLinks}>
              {links.map((l, i) => {
                const meta = SOCIAL_ICONS[l.platform];
                const label = l.label || meta?.label || l.platform;
                return (
                  /* 링크도 공통 Button 을 쓴다 — 외부링크·아이콘이 전부 prop 으로 있다.
                     아이콘만 두면 어느 서비스인지 알아보는 사람에게만 통한다. 라벨을 함께 낸다.
                     variant="link" 은 padding 이 0 이고 높이를 내용에 맡겨, 이름·직함 아래에
                     덧붙는 줄로 자연스럽게 앉는다.
                     라벨이 보이므로 aria-label 은 두지 않는다 — 있으면 그 텍스트를 덮어쓴다. */
                  <Button
                    key={`${l.platform}-${i}`}
                    href={l.url}
                    external
                    variant="link"
                    soundDisabled
                    icon={
                      SOCIAL_ICONS[l.platform]
                        ? <SocialBrandIcon name={l.platform} size={13} />
                        : undefined
                    }
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 소개는 사람을 설명하는 문장이라 헤더 바로 다음에 온다.
          아래 meta 목록(이메일·지역·권한)은 계정에 관한 사실이라 그 뒤가 맞다.
          문장이므로 아이콘 라벨은 붙이지 않는다. */}
      {author.bio && <p className={styles.memberDetailBio}>{author.bio}</p>}

      <div className={styles.memberDetailMeta}>
        {author.email && (
          <div className={styles.memberDetailMetaRow}>
            <Mail size={13} strokeWidth={1.8} />
            <a href={`mailto:${author.email}`} className={styles.memberDetailMetaLink}>{author.email}</a>
          </div>
        )}
        {author.location && (
          <div className={styles.memberDetailMetaRow}>
            <MapPin size={13} strokeWidth={1.8} />
            <span>{author.location}</span>
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

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={() => closeModal("member-detail")}>{L("닫기", "Close")}</Button>
          {/* 같은 푸터의 닫기가 텍스트 버튼이라 수정에서도 아이콘을 뺀다 — 편집 모달(취소/저장)도 텍스트다. */}
          {canEdit && (
            <Button variant="primary" size="sm" soundDisabled onClick={() => { closeModal("member-detail"); onEdit?.(); }}>
              {editLabel ?? L("수정", "Edit")}
            </Button>
          )}
        </>,
        footerEl,
      )}
    </div>
  );
}
