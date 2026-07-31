"use client";

import { useCallback, useEffect, useState } from "react";
import type { Outcome } from "../_types";
import { Plus, Trash2, Pencil, Clock, UserPlus } from "@/components/icons";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { RoleBadge, ProviderChips } from "@/components/admin/MemberBadges";
import type { Author } from "@/types/author";
import type { Member, MembersResponse, PendingMember } from "@/types/member";
import MemberEditModal from "./MemberEditModal";
import MemberDetailModal from "./MemberDetailModal";
import styles from "../Settings.module.css";
import mStyles from "@/components/admin/MembersList.module.css";

interface Props {
  authors: Author[];
  onChange: (authors: Author[]) => void;
}

/** 멤버 관리 (이슈 #334) — 작성자 프로필 + 로그인 접근을 리스트로 표시.
 *  owner = 전체 관리(추가/초대/권한/삭제). 비owner = 목록 열람 + 본인 프로필만 수정.
 *  작성자와 연결 안 된 로그인 계정(owner 등)은 "그 외 로그인 계정" 그룹으로 표시. */
export default function AuthorsEditor({ authors, onChange }: Props) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { openModal } = useModalStore();

  interface Ctx {
    email: string | null;
    authorId: string | null;
    isOwner: boolean;
    ownerEmail: string | null; // 소문자
    myName: string | null; // GitHub 등에서 유도한 현재 사용자 이름
    myAvatar: string | null;
    myGithubUrl: string | null; // 현재 사용자의 GitHub 프로필 URL (소셜 자동추가용)
    ownerName: string | null; // 소유자 이름/아바타 — 프로필 없어도 "소유자" 행 생성용
    ownerAvatar: string | null;
    memberAuthorIds: string[];
    memberEmails: string[]; // 소문자
  }
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = ctx?.isOwner ?? false;

  const LEVELS = [
    { value: "1", label: L("자기 글만 (작성자)", "Own posts (Author)") },
    { value: "2", label: L("모든 글 (편집자)", "All posts (Editor)") },
  ];

  // owner 전용 상세 멤버 데이터 (배지/상태/미연결 그룹/관리)
  const refetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/authors/members");
      if (!res.ok) return;
      const data = (await res.json()) as MembersResponse;
      setMembers(data.members ?? []);
      setPending(data.pendingInvites ?? []);
    } catch {
      /* noop */
    }
  }, []);

  // 컨텍스트(누구인지·owner 인지·owner 이메일·실제 가입멤버) — 비owner 도 접근. owner 면 상세 멤버도 로드.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/authors/context");
        if (!res.ok) return;
        const c = (await res.json()) as Ctx;
        setCtx(c);
        if (c.isOwner) refetchMembers();
      } catch {
        /* noop */
      }
    })();
  }, [refetchMembers]);

  const ownerEmail = ctx?.ownerEmail ?? null;
  const memberAuthorIdSet = new Set(ctx?.memberAuthorIds ?? []);
  const memberEmailSet = new Set(ctx?.memberEmails ?? []);

  const isOwnerAuthor = (a: Author) => !!ownerEmail && !!a.email && a.email.toLowerCase() === ownerEmail;
  const isJoinedMember = (a: Author) =>
    memberAuthorIdSet.has(a.id) || (!!a.email && memberEmailSet.has(a.email.toLowerCase()));
  const isMine = (a: Author) => {
    // 소유자 프로필은 소유자 본인에게만 "내 프로필" — 과거의 잘못된 author_id 링크가 owner 프로필을 가리켜도 무시
    if (isOwnerAuthor(a)) return ctx?.isOwner ?? false;
    return (
      (!!ctx?.authorId && a.id === ctx.authorId) ||
      (!!ctx?.email && !!a.email && a.email.toLowerCase() === ctx.email.toLowerCase())
    );
  };
  const isMineMember = (m: Member) =>
    (!!ctx?.authorId && m.authorId === ctx.authorId) ||
    (!!ctx?.email && !!m.email && m.email.toLowerCase() === ctx.email.toLowerCase());

  const memberByAuthorId = new Map(members.filter((m) => m.authorId).map((m) => [m.authorId as string, m]));
  const memberByEmail = new Map(members.filter((m) => m.email).map((m) => [m.email.toLowerCase(), m]));
  const pendingByEmail = new Map(pending.map((p) => [p.email.toLowerCase(), p]));

  // 작성자 프로필 ↔ 로그인 계정 매칭: author_id 우선, 없으면 이메일.
  // 단 소유자 프로필은 소유자 계정(이메일)만 매칭 — 잘못된 author_id 링크(다른 계정)가 붙는 것 방지.
  const memberForAuthor = (a: Author): Member | undefined => {
    if (isOwnerAuthor(a)) return a.email ? memberByEmail.get(a.email.toLowerCase()) : undefined;
    return memberByAuthorId.get(a.id) ?? (a.email ? memberByEmail.get(a.email.toLowerCase()) : undefined);
  };

  const matchedIds = new Set<string>();
  authors.forEach((a) => { const m = memberForAuthor(a); if (m) matchedIds.add(m.id); });
  // 본인은 "내 프로필" 행으로 따로 다루므로 "그 외 로그인 계정" 에서 제외
  const unlinked = members.filter((m) => !matchedIds.has(m.id) && !isMineMember(m));

  const relative = (iso: string | null) => {
    if (!iso) return L("로그인 기록 없음", "never signed in");
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return L("방금 전", "just now");
    if (mins < 60) return L(`${mins}분 전`, `${mins}m ago`);
    const h = Math.floor(mins / 60);
    if (h < 24) return L(`${h}시간 전`, `${h}h ago`);
    const d = Math.floor(h / 24);
    if (d < 7) return L(`${d}일 전`, `${d}d ago`);
    return new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  /** 프로필 draft 를 config 에 upsert (id 기준). */
  const saveAuthor = (author: Author) =>
    onChange(authors.some((x) => x.id === author.id) ? authors.map((x) => (x.id === author.id ? author : x)) : [...authors, author]);

  /** 초대(또는 재전송) — 결과 메시지 반환. */
  const inviteAuthor = async (a: Author, level: number): Promise<Outcome> => {
    try {
      const res = await fetch("/api/admin/authors/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: a.email, author_id: a.id, permission_level: level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, msg: data.reason || data.error || L("초대에 실패했습니다.", "The invite failed.") };
      const parts = [
        data.appliedNow ? L("기존 계정에 권한을 부여했습니다.", "Granted access to the existing account.") : L("초대를 등록했습니다.", "The invite has been created."),
        data.emailed
          ? L("초대 메일을 발송했습니다.", "The invite email was sent.")
          : data.emailReason === "no_api_key"
            ? L("RESEND_API_KEY 가 없어 메일은 발송하지 못했습니다.", "The email was not sent because RESEND_API_KEY is missing.")
            : `${L("메일을 발송하지 못했습니다.", "The email could not be sent.")}${data.emailReason ? ` (${data.emailReason})` : ""}`,
      ];
      await refetchMembers();
      return { ok: !!data.emailed || data.appliedNow, msg: parts.join(" ") };
    } catch {
      return { ok: false, msg: L("오류가 발생했습니다.", "An error occurred.") };
    }
  };

  /** 가입된 멤버의 권한 레벨 변경 (+ 이메일로만 매칭된 계정은 author_id 로 정식 연결). */
  const changeMemberLevel = async (memberId: string, authorId: string, level: number): Promise<Outcome> => {
    try {
      const res = await fetch("/api/admin/authors/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, author_id: authorId, permission_level: level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, msg: data.reason || data.error || L("권한을 변경하지 못했습니다.", "Failed to change access.") };
      await refetchMembers();
      return { ok: true, msg: L("권한을 변경했습니다.", "Access level updated.") };
    } catch {
      return { ok: false, msg: L("오류가 발생했습니다.", "An error occurred.") };
    }
  };

  /** 프로필 없이 로그인만 한 계정을 작성자 프로필과 연결 + 권한 부여. */
  const linkMember = async (memberId: string, authorId: string, level: number): Promise<Outcome> => {
    try {
      const res = await fetch("/api/admin/authors/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, author_id: authorId, permission_level: level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, msg: data.reason || data.error || L("연결하지 못했습니다.", "Failed to link.") };
      await refetchMembers();
      return { ok: true, msg: L("프로필과 연결하고 권한을 부여했습니다.", "Linked to the profile and granted access.") };
    } catch {
      return { ok: false, msg: L("오류가 발생했습니다.", "An error occurred.") };
    }
  };

  const deleteAccount = async (memberId: string) => {
    const res = await fetch(`/api/admin/authors/members?id=${encodeURIComponent(memberId)}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || L("삭제하지 못했습니다.", "Delete failed.")); }
  };

  const pickAvatar = (): Promise<string | null> =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data: { url?: string } = await res.json().catch(() => ({}));
          resolve(res.ok && data.url ? data.url : null);
        } catch {
          resolve(null);
        }
      };
      input.click();
    });

  const openEditor = (
    a: Author,
    opts?: { isNew?: boolean; linkMemberId?: string; title?: string; githubInfo?: { name: string | null; avatar: string | null; url: string | null } },
  ) => {
    setNotice(null);
    const m = memberForAuthor(a);
    const githubInfo =
      opts?.githubInfo ??
      (m
        ? { name: m.name, avatar: m.avatar, url: m.githubUrl }
        : isMine(a)
          ? { name: ctx?.myName ?? null, avatar: ctx?.myAvatar ?? null, url: ctx?.myGithubUrl ?? null }
          : undefined);
    openModal(
      <MemberEditModal
        initial={a}
        member={m}
        invited={a.email ? pendingByEmail.get(a.email.toLowerCase()) : undefined}
        linkMemberId={opts?.linkMemberId}
        levels={LEVELS}
        onSaveProfile={saveAuthor}
        onInvite={inviteAuthor}
        onChangeLevel={changeMemberLevel}
        onLink={linkMember}
        uploadAvatar={pickAvatar}
        canManageAccess={isOwner}
        githubInfo={githubInfo}
      />,
      {
        id: "member-edit",
        header: { title: opts?.title ?? (opts?.isNew ? L("멤버 추가", "Add member") : (a.name || L("멤버 편집", "Edit member"))) },
        closeButton: true,
        width: "560px",
      },
    );
  };

  const openAdd = () =>
    openEditor({ id: `author-${Date.now().toString(36)}`, name: "", avatar: "", role: "", email: "", bio: "", links: [] }, { isNew: true });

  // GitHub URL 있으면 GitHub 소셜 링크로 pre-fill (OAuth 로그인 계정 자동 추가)
  const ghLinks = (url: string | null | undefined) => (url ? [{ platform: "github", url }] : []);

  /** 프로필 없는 로그인 계정을 GitHub 데이터로 pre-fill 해 멤버로 등록(프로필 생성 + 계정 연결). */
  const registerMember = (m: Member) =>
    openEditor(
      { id: `author-${Date.now().toString(36)}`, name: m.name ?? "", avatar: m.avatar ?? "", role: "", email: m.email ?? "", bio: "", links: ghLinks(m.githubUrl) },
      { linkMemberId: m.id, title: L("멤버로 등록", "Register member"), githubInfo: { name: m.name, avatar: m.avatar, url: m.githubUrl } },
    );

  /** 프로필 없는 본인(비owner) 이 GitHub 정보로 자기 프로필을 생성. 이메일 매칭으로 연결됨(권한은 owner 가 부여). */
  const openMyProfile = () =>
    openEditor(
      { id: `author-${Date.now().toString(36)}`, name: ctx?.myName ?? "", avatar: ctx?.myAvatar ?? "", role: "", email: ctx?.email ?? "", bio: "", links: ghLinks(ctx?.myGithubUrl) },
      { isNew: true, title: L("내 프로필", "My profile"), githubInfo: { name: ctx?.myName ?? null, avatar: ctx?.myAvatar ?? null, url: ctx?.myGithubUrl ?? null } },
    );

  /** 프로필 행 클릭 → 상세 모달. 권한 있으면 "수정" 으로 편집 모달 전환. */
  const openDetail = (a: Author) =>
    openModal(
      <MemberDetailModal
        author={a}
        member={memberForAuthor(a)}
        isOwnerProfile={isOwnerAuthor(a)}
        showAccess={isOwner}
        canEdit={isOwner || (isMine(a) && !isOwnerAuthor(a))}
        onEdit={() => openEditor(a)}
      />,
      { id: "member-detail", header: { title: L("멤버 상세", "Member") }, closeButton: true, width: "480px" },
    );

  /** 미생성(합성) 행 클릭 → GitHub 정보 기반 상세. 본인/owner 면 "만들기" 로 생성 모달 전환. */
  const openSyntheticDetail = (kind: "me" | "owner") => {
    const isMe = kind === "me";
    const canCreate = isMe || iAmOwner; // owner 합성행은 owner 본인일 때만 생성
    const ghUrl = canCreate ? ctx?.myGithubUrl ?? null : null;
    const author: Author = {
      id: "",
      name: (isMe ? ctx?.myName : ctx?.ownerName) ?? "",
      avatar: (isMe ? ctx?.myAvatar : ctx?.ownerAvatar) ?? "",
      role: "",
      email: (isMe ? ctx?.email : ctx?.ownerEmail) ?? "",
      bio: "",
      links: ghLinks(ghUrl),
    };
    openModal(
      <MemberDetailModal
        author={author}
        isOwnerProfile={kind === "owner"}
        showAccess={false}
        canEdit={canCreate}
        onEdit={openMyProfile}
      />,
      { id: "member-detail", header: { title: L("멤버 상세", "Member") }, closeButton: true, width: "480px" },
    );
  };

  /** 삭제 — 연결 계정/대기 초대가 있으면 확인 후 정리, 프로필은 config 에서 제거(저장 필요). */
  const removeAuthor = (a: Author) => {
    const member = memberForAuthor(a);
    const invited = a.email ? pendingByEmail.get(a.email.toLowerCase()) : undefined;
    // owner 계정은 삭제 불가 — 프로필만 제거
    if (member?.role === "owner") {
      onChange(authors.filter((x) => x.id !== a.id));
      return;
    }
    if (!member && !invited) {
      onChange(authors.filter((x) => x.id !== a.id));
      return;
    }
    openModal(
      <ModalConfirm
        desc={
          member
            ? L("이 작성자와 연결된 로그인 계정이 완전히 삭제됩니다. 되돌릴 수 없습니다.", "The linked login account will be permanently deleted. This cannot be undone.")
            : L("이 작성자에게 보낸 초대가 취소됩니다.", "The pending invite for this author will be cancelled.")
        }
        confirmText={L("삭제", "Delete")}
        danger
        onConfirm={async () => {
          try {
            if (member) await deleteAccount(member.id);
            else if (invited) await fetch(`/api/admin/authors/invite?email=${encodeURIComponent(invited.email)}`, { method: "DELETE" });
            onChange(authors.filter((x) => x.id !== a.id));
            await refetchMembers();
          } catch (e) {
            setNotice(e instanceof Error ? e.message : L("삭제하지 못했습니다.", "Delete failed."));
          }
        }}
      />,
      { id: "delete-author", header: { title: L("멤버 삭제", "Remove member") }, closeButton: true, width: "420px" },
    );
  };

  /** 미연결 로그인 계정 삭제 (owner 제외). */
  const removeUnlinked = (m: Member) => {
    openModal(
      <ModalConfirm
        desc={L("이 로그인 계정이 완전히 삭제됩니다. 되돌릴 수 없습니다.", "This login account will be permanently deleted. This cannot be undone.")}
        confirmText={L("삭제", "Delete")}
        danger
        onConfirm={async () => {
          try {
            await deleteAccount(m.id);
            await refetchMembers();
          } catch (e) {
            setNotice(e instanceof Error ? e.message : L("삭제하지 못했습니다.", "Delete failed."));
          }
        }}
      />,
      { id: "delete-account", header: { title: L("계정 삭제", "Delete account") }, closeButton: true, width: "420px" },
    );
  };

  const statusBadge = (a: Author, member?: Member, invited?: PendingMember) => {
    if (isOwnerAuthor(a)) return <RoleBadge role="owner" />; // 소유자는 누구에게나 최우선 표시
    if (!isOwner) return null; // 그 외 상태(역할/초대)는 owner 만
    if (member) return <RoleBadge role={member.role} />;
    return (
      <span className={`${mStyles.role} ${mStyles.rolePendingBadge}`}>
        {invited ? L("초대됨 · 미가입", "Invited · pending") : L("미초대", "Not invited")}
      </span>
    );
  };

  // 비owner 에게는 실제 멤버(소유자/가입자) + 본인 프로필만 노출 — 초대만 하고 미가입인 사람은 숨김
  const visibleAuthors = isOwner
    ? authors
    : authors.filter((a) => isOwnerAuthor(a) || isJoinedMember(a) || isMine(a));

  const hasMyProfile = authors.some(isMine);
  const ownerHasProfile = authors.some(isOwnerAuthor);
  const iAmOwner = ctx?.isOwner ?? false;
  // 소유자 프로필이 없어도 "소유자" 는 항상 노출 (프로필 유무 무관) — context 의 소유자 정보로 합성
  const showSyntheticOwner = !!ctx && !ownerHasProfile && !!ownerEmail;
  // 비owner 본인이 프로필 없으면 "내 프로필 만들기" 행 (owner 는 위 소유자 행이 곧 본인 것)
  const showMyProfile = !!ctx && !!ctx.email && !hasMyProfile && !iAmOwner;

  // 소유자는 항상 최상단 — 소유자 프로필을 분리
  const ownerProfile = visibleAuthors.find(isOwnerAuthor);
  const restAuthors = visibleAuthors.filter((a) => !isOwnerAuthor(a));

  const renderAuthorRow = (a: Author) => {
    const member = memberForAuthor(a);
    const invited = a.email ? pendingByEmail.get(a.email.toLowerCase()) : undefined;
    return (
      <li
        key={a.id}
        className={`${mStyles.row} ${mStyles.rowClickable}`}
        role="button"
        tabIndex={0}
        onClick={() => openDetail(a)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(a); } }}
        title={L("상세 보기", "View details")}
      >
        <span className={mStyles.avatar}>
          {a.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar} alt="" className={mStyles.avatarImg} />
          ) : (
            <span className={mStyles.avatarInitial} aria-hidden>
              {(a.name || a.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className={mStyles.info}>
          <div className="tw:flex tw:items-center tw:flex-wrap tw:gap-2xs">
            <span className={mStyles.name}>{a.name || L("(이름 없음)", "(unnamed)")}</span>
            {statusBadge(a, member, invited)}
          </div>
          <div className={mStyles.meta}>
            <span className={mStyles.email}>{a.email || L("이메일 없음", "no email")}</span>
            {member?.lastSignInAt && (
              <span className={mStyles.since}>
                <Clock size={11} strokeWidth={2} />
                {relative(member.lastSignInAt)}
              </span>
            )}
          </div>
        </div>
        {/* owner 관리뷰: OAuth(GitHub) 연결 여부 표시 */}
        {isOwner && (
          <div className={mStyles.providers}>
            {member?.providers.includes("github") ? (
              <ProviderChips providers={member.providers} />
            ) : (
              <span className={`${mStyles.role} ${mStyles.rolePendingBadge}`} title={L("GitHub OAuth 미연결", "GitHub OAuth not linked")}>
                {L("OAuth 미연결", "OAuth not linked")}
              </span>
            )}
          </div>
        )}
        {/* 액션 영역 클릭은 상세 모달로 전파되지 않게 stopPropagation */}
        {isOwner ? (
          <div className={mStyles.rowActions} onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="xs" icon={<Pencil size={13} />} onClick={() => openEditor(a)}>
              {L("수정", "Edit")}
            </Button>
            {/* 소유자 프로필은 삭제 불가 */}
            {!isOwnerAuthor(a) && (
              <Button variant="ghost" size="xs" tone="danger" icon={<Trash2 size={13} />} onClick={() => removeAuthor(a)}>
                {L("삭제", "Delete")}
              </Button>
            )}
          </div>
        ) : isMine(a) && !isOwnerAuthor(a) ? (
          <div className={mStyles.rowActions} onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="xs" icon={<Pencil size={13} />} onClick={() => openEditor(a)}>
              {L("수정", "Edit")}
            </Button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className={styles.authorsEditor}>
      {(visibleAuthors.length > 0 || showSyntheticOwner || showMyProfile) && (
        <ul className={mStyles.list}>
          {/* 소유자 — 항상 최상단. 프로필 있으면 그 행, 없으면 GitHub 정보로 합성 */}
          {ownerProfile ? (
            renderAuthorRow(ownerProfile)
          ) : showSyntheticOwner ? (
            <li
              className={`${mStyles.row} ${mStyles.rowClickable}`}
              role="button"
              tabIndex={0}
              onClick={() => openSyntheticDetail("owner")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSyntheticDetail("owner"); } }}
              title={L("상세 보기", "View details")}
            >
              <span className={mStyles.avatar}>
                {ctx?.ownerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ctx.ownerAvatar} alt="" className={mStyles.avatarImg} />
                ) : (
                  <span className={mStyles.avatarInitial} aria-hidden>
                    {(ctx?.ownerName || ctx?.ownerEmail || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <div className={mStyles.info}>
                <div className="tw:flex tw:items-center tw:flex-wrap tw:gap-2xs">
                  <span className={mStyles.name}>{ctx?.ownerName || ctx?.ownerEmail}</span>
                  <RoleBadge role="owner" />
                </div>
                <div className={mStyles.meta}>
                  <span className={mStyles.email}>{ctx?.ownerEmail}</span>
                </div>
              </div>
              {iAmOwner && (
                <div className={mStyles.rowActions} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="xs" icon={<Pencil size={13} />} onClick={openMyProfile}>
                    {L("수정", "Edit")}
                  </Button>
                </div>
              )}
            </li>
          ) : null}
          {/* 비owner 본인 프로필 — 클릭 시 GitHub 상세, "수정" 으로 편집/생성 */}
          {showMyProfile && (
            <li
              className={`${mStyles.row} ${mStyles.rowClickable}`}
              role="button"
              tabIndex={0}
              onClick={() => openSyntheticDetail("me")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSyntheticDetail("me"); } }}
              title={L("상세 보기", "View details")}
            >
              <span className={mStyles.avatar}>
                {ctx?.myAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ctx.myAvatar} alt="" className={mStyles.avatarImg} />
                ) : (
                  <span className={mStyles.avatarInitial} aria-hidden>
                    {(ctx?.myName || ctx?.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <div className={mStyles.info}>
                <div className="tw:flex tw:items-center tw:flex-wrap tw:gap-2xs">
                  <span className={mStyles.name}>{ctx?.myName || ctx?.email}</span>
                </div>
                <div className={mStyles.meta}>
                  <span className={mStyles.email}>{ctx?.email}</span>
                </div>
              </div>
              <div className={mStyles.rowActions} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="xs" icon={<Pencil size={13} />} onClick={openMyProfile}>
                  {L("수정", "Edit")}
                </Button>
              </div>
            </li>
          )}
          {restAuthors.map(renderAuthorRow)}
        </ul>
      )}

      {/* 추가는 owner 만 */}
      {isOwner && (
        <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={openAdd}>
          {L("멤버 추가", "Add member")}
        </Button>
      )}

      {notice && <span className={styles.authorInviteErr}>{notice}</span>}

      {/* 작성자 프로필과 연결 안 된 로그인 계정 (owner 본인·고아 계정) — owner 만 표시 */}
      {isOwner && unlinked.length > 0 && (
        <div className={styles.authorUnlinked}>
          <div className={mStyles.header}>
            <span className={mStyles.title}>{L("그 외 로그인 계정", "Other login accounts")}</span>
            <span className={mStyles.count}>{unlinked.length}</span>
          </div>
          <ul className={mStyles.list}>
            {unlinked.map((m) => (
              <li key={m.id} className={mStyles.row}>
                <span className={mStyles.avatar}>
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className={mStyles.avatarImg} />
                  ) : (
                    <span className={mStyles.avatarInitial} aria-hidden>
                      {(m.name || m.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className={mStyles.info}>
                  <div className="tw:flex tw:items-center tw:flex-wrap tw:gap-2xs">
                    <span className={mStyles.name}>{m.name || m.email}</span>
                    <RoleBadge role={m.role} />
                  </div>
                  <div className={mStyles.meta}>
                    {m.name && <span className={mStyles.email}>{m.email}</span>}
                    <span className={mStyles.since}>
                      <Clock size={11} strokeWidth={2} />
                      {relative(m.lastSignInAt)}
                    </span>
                  </div>
                </div>
                <div className={mStyles.providers}><ProviderChips providers={m.providers} /></div>
                {m.role !== "owner" && (
                  <div className={mStyles.rowActions}>
                    <Button variant="ghost" size="xs" icon={<UserPlus size={13} />} onClick={() => registerMember(m)}>
                      {L("등록", "Register")}
                    </Button>
                    <Button variant="ghost" size="xs" tone="danger" icon={<Trash2 size={13} />} onClick={() => removeUnlinked(m)}>
                      {L("삭제", "Delete")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
