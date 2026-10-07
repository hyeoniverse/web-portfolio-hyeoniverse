"use client";

import { useContext, useRef, useState } from "react";
import type { SelectOption } from "@/types";
import type { Outcome } from "../_types";
import { createPortal } from "react-dom";
import { Plus, Trash2, Mail, Clock } from "@/components/icons";
import { SiGithub } from "react-icons/si";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useModalStore } from "@/stores/modalStore";
import { ModalFooterContext } from "@/components/ui/Modal";
import EmojiPicker from "@/components/ui/EmojiPicker";
import AuthorAvatar from "@/components/ui/AuthorAvatar";
import { useLanguage } from "@/providers/LanguageProvider";
import { RoleBadge, ProviderChips } from "@/components/admin/MemberBadges";
import type { Author } from "@/types/author";
import type { SaveResult } from "../_types";
import type { Member, PendingMember } from "@/types/member";
import Field from "./SettingsFormFields";
import FieldRow from "@/components/ui/FieldRow";
import SocialLinksEditor from "./SocialLinksEditor";
import { JOB_TITLE_PRESETS } from "@/data/jobTitles";
import { HintLines } from "./EnvKeyHint";
import styles from "./MemberEditModal.module.css";
import shared from "../Settings.module.css";
import mStyles from "@/components/admin/MembersList.module.css";
import Pressable from "@/components/ui/Pressable";
import { errorText } from "@/lib/apiError";

interface Props {
  initial: Author;
  member?: Member;
  invited?: PendingMember;
  /** 프로필 없이 로그인만 한 계정을 이 프로필에 연결할 때의 대상 계정 id (GitHub 데이터로 pre-fill). */
  linkMemberId?: string;
  levels: SelectOption[];
  onSaveProfile: (author: Author) => Promise<SaveResult> | void;
  onInvite: (author: Author, level: number) => Promise<Outcome>;
  onChangeLevel: (memberId: string, authorId: string, level: number) => Promise<Outcome>;
  /** 기존 로그인 계정을 프로필과 연결 + 권한 부여. */
  onLink?: (memberId: string, authorId: string, level: number) => Promise<Outcome>;
  /** EmojiPicker 의 커스텀 이미지 탭용 — File 을 받아 저장 후 URL 을 돌려준다. */
  uploadAvatarFile?: (file: File) => Promise<string>;
  /**
   * 이미 다른 멤버가 쓴 값 — 표기가 제각각이 되는 걸 줄이는 자동완성 후보.
   * 자유 입력 필드 중 같은 뜻을 다르게 적기 쉬운 것들에만 붙인다
   * (역할: "프론트엔드" / "Frontend" / "프론트엔드 개발자").
   */
  suggestions?: { role?: string[]; location?: string[] };
  /** 접근 권한(초대/권한변경/연결) 관리 표시 여부 — owner 만 true. 비owner 는 프로필만 편집. */
  canManageAccess?: boolean;
  /** GitHub(OAuth) 프로필 정보 — "GitHub 에서 불러오기" 버튼으로 이름/아바타/소셜 채움. */
  githubInfo?: { name: string | null; avatar: string | null; url: string | null };
}

/** 멤버(작성자 프로필 + 로그인 접근) 편집 모달. draft 기반 — 저장 시 config 반영, 취소 시 폐기.
 *  접근(초대/권한/연결)은 API 반영하고 모달 내부 상태로 표시 갱신. (이슈 #334) */
export default function MemberEditModal({
  initial, member, invited, linkMemberId, levels, onSaveProfile, onInvite, onChangeLevel, onLink, uploadAvatarFile, suggestions, canManageAccess = true, githubInfo,
}: Props) {
  const { language, t } = useLanguage();
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
  /* 프로필 글(이름·직무·지역·소개)을 어느 언어로 적는지 — 기본 필드가 한국어, *_en 이 영어.
     영어 칸이 비어 있으면 영어 화면과 작업물 팀원 연결에서 한국어 값을 대신 쓴다(localizeAuthor) */
  const [profileLang, setProfileLang] = useState<"ko" | "en">("ko");
  const en = profileLang === "en";
  const jobValue = (en ? draft.role_en ?? "" : draft.role).trim();
  const commitJob = (raw: string) => {
    const v = raw.trim();
    const preset = JOB_TITLE_PRESETS.find((j) => j.ko === v || j.en === v);
    if (!preset) { set(en ? { role_en: v } : { role: v }); return; }
    set(en
      ? { role_en: preset.en, ...(draft.role.trim() ? {} : { role: preset.ko }) }
      : { role: preset.ko, ...(draft.role_en?.trim() ? {} : { role_en: preset.en }) });
  };
  /* 반대쪽 언어 값 — 비어 있는 칸의 placeholder 와 Tab 채우기에 쓴다 */
  const other = (v: string | undefined) => v?.trim() || undefined;

  /* 아바타는 이미지 URL 뿐 아니라 이모지·아이콘도 될 수 있다. EmojiPicker 가 돌려주는 값을
     그대로 담고, 그리는 쪽은 AuthorAvatar 가 판별한다. 빈 값이면 이름 첫 글자로 돌아간다. */
  const [emojiOpen, setEmojiOpen] = useState(false);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  const ghHasData = !!githubInfo && (!!githubInfo.name || !!githubInfo.avatar || !!githubInfo.url);
  const [ghLoading, setGhLoading] = useState(false);
  /* GitHub 값과 이미 적은 값이 다른 칸 — pick 은 적용할 쪽(기본은 지금 값) */
  type GhConflict = { key: string; label: string; current: string; incoming: string; pick: "current" | "github" };
  const [ghConflicts, setGhConflicts] = useState<GhConflict[] | null>(null);

  /**
   * GitHub 계정 정보로 프로필을 채운다.
   *
   * 화면이 들고 있는 githubInfo 에는 이름·아바타·프로필 주소뿐이다 — Supabase identity 에
   * 담기는 값이 그게 전부이기 때문이다. 소개·소속·블로그·트위터는 GitHub 공개 API 를 읽어야
   * 나오므로 서버에 물어본다. 실패하면 갖고 있던 값만으로 채운다.
   *
   * 빈 칸만 바로 채운다. 이미 적어 둔 값이 GitHub 값과 다르면 덮어쓰지 않고 ghConflicts 에 모아
   * 두 값을 나란히 보여 준 뒤 칸마다 고르게 한다.
   */
  const loadGithub = async () => {
    setGhLoading(true);
    setStatus(null);
    let fetched: Partial<Author> & { enriched?: boolean } | null = null;
    /* 서버가 거절한 사유(예: GitHub 로 로그인한 계정이 아님) — 화면 언어로 보인다(#862) */
    let failure: unknown = null;
    try {
      const res = await fetch("/api/admin/authors/github-profile");
      if (res.ok) fetched = await res.json();
      else failure = await res.json().catch(() => null);
    } catch {
      /* 네트워크 실패 — 아래에서 githubInfo 로 대체한다 */
    }
    setGhLoading(false);

    if (!fetched && !githubInfo) {
      setStatus({ ok: false, msg: errorText(failure, t, L("GitHub 정보를 불러오지 못했습니다.", "Could not load from GitHub.")) });
      return;
    }

    /* 칸별로 GitHub 값을 견준다 — 비어 있거나 같으면 바로 넣고, 다르면 고를 목록에 넣는다 */
    const incoming: { key: keyof Author; label: string; value: string }[] = [
      { key: "name", label: L("이름", "Name"), value: fetched?.name || githubInfo?.name || "" },
      { key: "avatar", label: L("아바타", "Avatar"), value: fetched?.avatar || githubInfo?.avatar || "" },
      { key: "role", label: L("직무", "Job title"), value: fetched?.role ?? "" },
      { key: "email", label: L("이메일", "Email"), value: fetched?.email ?? "" },
      { key: "bio", label: L("소개", "Bio"), value: fetched?.bio ?? "" },
      { key: "location", label: L("지역", "Location"), value: fetched?.location ?? "" },
    ];
    const fill: Partial<Author> = {};
    const conflicts: GhConflict[] = [];
    for (const f of incoming) {
      const value = f.value.trim();
      if (!value) continue;
      const current = String(draft[f.key] ?? "").trim();
      if (!current) (fill as Record<string, string>)[f.key] = value;
      else if (current !== value) conflicts.push({ key: f.key, label: f.label, current, incoming: value, pick: "current" });
    }
    /* 링크는 플랫폼 단위로 합친다 — 직접 적어 둔 다른 링크를 날리지 않기 위해서다. 같은 플랫폼에 다른 주소가 있으면 고르게 한다 */
    const links = fetched?.links ?? (githubInfo?.url ? [{ platform: "github", url: githubInfo.url }] : []);
    const merged = [...draft.links];
    for (const link of links) {
      const at = merged.findIndex((l) => l.platform === link.platform);
      if (at < 0) merged.push(link);
      else if (!merged[at].url.trim()) merged[at] = { ...merged[at], url: link.url };
      else if (merged[at].url.trim() !== link.url.trim()) {
        conflicts.push({ key: `link:${link.platform}`, label: `${L("링크", "Link")} · ${link.platform}`, current: merged[at].url, incoming: link.url, pick: "current" });
      }
    }
    if (merged.length !== draft.links.length || merged.some((l, k) => l !== draft.links[k])) fill.links = merged;
    set(fill);
    setGhConflicts(conflicts.length > 0 ? conflicts : null);

    setStatus({
      ok: true,
      msg: conflicts.length > 0
        ? L("빈 칸을 채웠습니다. 이미 적은 값과 다른 칸은 아래에서 고르세요.", "Filled the empty fields. Pick a value below where GitHub differs.")
        : fetched?.enriched
        ? L("GitHub 계정 정보로 채웠습니다.", "Filled from your GitHub account.")
        : L("GitHub 공개 프로필을 읽지 못해 기본 정보만 채웠습니다.", "Could not read the public GitHub profile, so only basic fields were filled."),
    });
  };

  /* 고른 값만 반영한다 — 지금 값을 고른 칸은 그대로 둔다 */
  const applyGhConflicts = () => {
    if (!ghConflicts) return;
    const patch: Partial<Author> = {};
    let links = draft.links;
    for (const c of ghConflicts) {
      if (c.pick !== "github") continue;
      if (c.key.startsWith("link:")) {
        const platform = c.key.slice(5);
        links = links.map((l) => (l.platform === platform ? { ...l, url: c.incoming } : l));
      } else (patch as Record<string, string>)[c.key] = c.incoming;
    }
    if (links !== draft.links) patch.links = links;
    set(patch);
    setGhConflicts(null);
  };

  const save = async () => {
    if (!draft.name.trim()) { setStatus({ ok: false, msg: L("이름을 입력해 주세요.", "Please enter a name.") }); return; }
    /* 이메일은 초대·계정 매칭의 열쇠다. 비어 있으면 이 프로필에 계정을 연결할 방법이 없다. */
    if (!draft.email.trim()) { setStatus({ ok: false, msg: L("이메일을 입력해 주세요.", "Please enter an email.") }); return; }
    /* 저장이 끝날 때까지 모달을 닫지 않는다 — 닫고 나서 실패하면 알릴 자리가 없다. */
    setBusy(true);
    let result: SaveResult | void;
    try {
      result = await onSaveProfile(draft);
    } finally {
      setBusy(false);
    }
    if (result && !result.ok) {
      setStatus({
        ok: false,
        msg: result.reason
          ? `${L("저장하지 못했습니다.", "Could not save.")} ${result.reason}`
          : L("저장하지 못했습니다.", "Could not save."),
      });
      return;
    }
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
        {/* 아바타(선택)와 모서리 배지(추가/제거)는 각각 버튼이다 — 버튼 안에 버튼을 넣을 수 없고,
            설정된 이미지가 있을 때 "+" 를 두면 무엇이 일어나는지 어긋난다. */}
        <span className={styles.authorAvatarWrap}>
          <Pressable
            ref={avatarBtnRef}
            className={styles.authorAvatarUpload}
            onClick={() => setEmojiOpen((v) => !v)}
            title={L("프로필 이미지 선택", "Choose profile image")}
            aria-label={L("프로필 이미지 선택", "Choose profile image")}
          >
            <AuthorAvatar
              value={draft.avatar}
              name={draft.name}
              size={40}
              imgClassName={styles.authorAvatarImg}
              initialClassName={styles.authorAvatarInitial}
            />
          </Pressable>
          {draft.avatar ? (
            <Pressable
              className={`${styles.authorAvatarBadge} ${styles.authorAvatarBadgeRemove}`}
              onClick={() => set({ avatar: "" })}
              title={L("프로필 이미지 제거", "Remove profile image")}
              aria-label={L("프로필 이미지 제거", "Remove profile image")}
            >
              <Trash2 size={11} strokeWidth={2.2} aria-hidden />
            </Pressable>
          ) : (
            <Pressable
              className={styles.authorAvatarBadge}
              onClick={() => setEmojiOpen((v) => !v)}
              tabIndex={-1}
              aria-hidden
            >
              <Plus size={12} strokeWidth={2.5} />
            </Pressable>
          )}
        </span>
        <EmojiPicker
          open={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          onSelect={(v) => { set({ avatar: v }); setEmojiOpen(false); }}
          currentValue={draft.avatar}
          onImageUpload={uploadAvatarFile}
          getAnchorRect={() => avatarBtnRef.current?.getBoundingClientRect() ?? null}
        />
        <span className={styles.authorCardName}>{draft.name || L("(이름 없음)", "(unnamed)")}</span>
      </div>

      {/* 동작(GitHub 불러오기 · 입력 언어)은 한 줄에, 설명은 그 아래 따로 */}
      <div className={styles.profileActions}>
        {ghHasData && (
          <Button variant="outline" icon={<SiGithub size={13} />} onClick={loadGithub} disabled={ghLoading} loading={ghLoading}>
            {L("GitHub 정보 불러오기", "Load from GitHub")}
          </Button>
        )}
        <span className={styles.profileActionsLang}>
          <LanguageToggle lang={profileLang} onLangChange={(l) => setProfileLang(l === "en" ? "en" : "ko")} size="sm" />
        </span>
      </div>
      <HintLines lines={[
        ghHasData && L("GitHub 정보 불러오기는 이름·아바타·소개·소속·링크를 GitHub 계정 정보로 채웁니다.", "Load from GitHub fills name, avatar, bio, company and links from your GitHub account."),
        ghHasData && L("이미 적은 값이 GitHub 값과 다르면 바꾸지 않고, 두 값을 비교해 고를 수 있게 보여 줍니다.", "Where a field already differs from GitHub, both values are shown so you can pick one."),
        L("이름·직무·지역·소개는 KO/EN 으로 바꿔 한국어와 영어를 따로 적을 수 있습니다.", "Switch KO/EN to write name, job title, location and bio in Korean and English separately."),
        L("영어 칸이 비어 있으면 한국어 값을 씁니다. 빈 칸에서 Tab 을 누르면 흐리게 보이는 다른 언어 값을 그대로 넣습니다.", "Empty English fields fall back to Korean. Press Tab in an empty field to copy the other language's value shown in grey."),
      ]} />

      {ghConflicts && (
        <div className={styles.ghCompare}>
          <span className={shared.fieldLabel}>{L("GitHub 값과 다른 칸", "Fields that differ from GitHub")}</span>
          <div className={styles.ghCompareHead} aria-hidden>
            <span />
            <span>{L("지금 값", "Current")}</span>
            <span>GitHub</span>
          </div>
          {ghConflicts.map((c) => (
            <div key={c.key} className={styles.ghCompareRow} role="radiogroup" aria-label={c.label}>
              <span className={styles.ghCompareLabel}>{c.label}</span>
              {(["current", "github"] as const).map((side) => {
                const v = side === "current" ? c.current : c.incoming;
                const on = c.pick === side;
                return (
                  <Pressable
                    key={side}
                    role="radio"
                    aria-checked={on}
                    className={`${styles.ghCompareOption} ${on ? styles.ghCompareOptionOn : ""}`}
                    onClick={() => setGhConflicts((list) => list?.map((x) => (x.key === c.key ? { ...x, pick: side } : x)) ?? null)}
                  >
                    {c.key === "avatar" && <AuthorAvatar value={v} name={draft.name} size={20} imgClassName={styles.ghCompareAvatar} initialClassName={styles.ghCompareAvatar} />}
                    <span className={styles.ghCompareValue}>{v}</span>
                  </Pressable>
                );
              })}
            </div>
          ))}
          <div className={styles.ghCompareActions}>
            <Button variant="outline" onClick={() => setGhConflicts(null)}>{L("지금 값 모두 유지", "Keep all current")}</Button>
            <Button variant="primary" onClick={applyGhConflicts}>{L("고른 값 적용", "Apply selection")}</Button>
          </div>
        </div>
      )}

      <div className={styles.authorCardFields}>
        {/* 이름·직무·지역·소개는 입력 언어(KO/EN)를 칸 안 배지로 보인다. 비어 있으면 반대쪽 언어 값을
            placeholder 로 보이고, Tab 을 누르면 그 값을 그대로 넣는다(없으면 예시만) */}
        {en
          ? <Field label={L("이름", "Name")} langBadge="en" value={draft.name_en ?? ""} tabFill={other(draft.name)} onChange={(v) => set({ name_en: v })} placeholder={other(draft.name)} />
          : <Field label={L("이름", "Name")} langBadge="ko" value={draft.name} tabFill={other(draft.name_en)} onChange={(v) => set({ name: v })} placeholder={other(draft.name_en)} required />}
        <Field label={L("아바타 URL", "Avatar URL")} value={draft.avatar} onChange={(v) => set({ avatar: v })} placeholder="https://..." maxHint={null} />
        {/* 직무 — 공통 Select combobox. 칸에 바로 적거나(직접 입력), 펼쳐서 프리셋(src/data/jobTitles)을 고른다.
            프리셋을 고르면 지금 언어 칸에 넣고, 다른 언어 칸이 비어 있으면 짝도 채운다 */}
        <FieldRow
          className={styles.authorCardFieldWide}
          label={<>{L("직무", "Job title")}<span className={styles.labelLangBadge}>{profileLang.toUpperCase()}</span></>}
        >
          <span
            className={styles.jobCombo}
            onKeyDownCapture={(e) => {
              /* 빈 칸에서 Tab — 다른 언어 값을 그대로 넣는다(다른 칸과 같은 동작) */
              const fill = other(en ? draft.role : draft.role_en);
              if (e.key !== "Tab" || e.shiftKey || e.nativeEvent.isComposing || jobValue || !fill) return;
              e.preventDefault();
              set(en ? { role_en: fill } : { role: fill });
            }}
          >
            <Select
              combobox="split"
              width="full"
              dropAlign="below"
              /* 왼쪽 선택은 지금 값과 같은 프리셋, 없으면 "직접 입력" */
              value={JOB_TITLE_PRESETS.some((j) => (en ? j.en : j.ko) === jobValue) ? jobValue : ""}
              inputValue={en ? draft.role_en ?? "" : draft.role}
              onInputChange={(v) => set(en ? { role_en: v } : { role: v })}
              onChange={commitJob}
              options={JOB_TITLE_PRESETS.map((j) => ({ value: en ? j.en : j.ko, label: en ? j.en : j.ko }))}
              placeholder={other(en ? draft.role : draft.role_en) ?? (en ? "Frontend Developer" : "프론트엔드 개발자")}
            />
          </span>
        </FieldRow>
        <Field label={L("이메일", "Email")} value={draft.email} onChange={(v) => set({ email: v })} placeholder="name@example.com" maxHint={null} required />
        {en
          ? <Field label={L("지역", "Location")} langBadge="en" value={draft.location_en ?? ""} tabFill={other(draft.location)} onChange={(v) => set({ location_en: v })} placeholder={other(draft.location) ?? "Seoul, South Korea"} />
          : <Field label={L("지역", "Location")} langBadge="ko" value={draft.location ?? ""} tabFill={other(draft.location_en)} onChange={(v) => set({ location: v })} placeholder={other(draft.location_en) ?? "서울, 대한민국"} suggestions={suggestions?.location} />}
        {/* 소개는 여러 줄 입력이라 반 칸에 두면 한 줄에 몇 글자 못 들어간다 — 두 열을 다 쓴다. */}
        <div className={styles.authorCardFieldWide}>
          {en
            ? <Field label={L("소개", "Bio")} langBadge="en" value={draft.bio_en ?? ""} tabFill={other(draft.bio)} onChange={(v) => set({ bio_en: v })} placeholder={other(draft.bio)} multiline />
            : <Field label={L("소개", "Bio")} langBadge="ko" value={draft.bio} tabFill={other(draft.bio_en)} onChange={(v) => set({ bio: v })} placeholder={other(draft.bio_en)} multiline />}
        </div>
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
                <Select value={memberLevel} options={levels} disabled={busy} onChange={changeLevel} />
              </div>
            )}
          </>
        ) : linkMemberId ? (
          <>
            <span className={shared.fieldHint}>
              {L("이미 로그인한 계정입니다. 저장하면 이 프로필과 연결하고 권한을 부여합니다.", "This account has already signed in. Saving links it to this profile and grants access.")}
            </span>
            <div className={styles.authorInviteRow}>
              <Select value={inviteLevel} options={levels} disabled={busy} onChange={setInviteLevel} />
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
              <Select value={inviteLevel} options={levels} onChange={setInviteLevel} />
              <Button variant="outline" icon={<Mail size={14} />} disabled={busy || !draft.email} onClick={invite}>
                {busy ? L("초대하고 있습니다…", "Sending…") : localInvited ? L("초대 다시 보내기", "Resend invite") : L("이메일로 초대", "Invite by email")}
              </Button>
              {localInvited && (
                <span className={`${mStyles.role} ${mStyles.rolePendingBadge}`}>{L("초대됨 · 미가입", "Invited · pending")}</span>
              )}
            </div>
          </>
        )}

      </div>
      )}

      <div className={styles.authorLinksEditor}>
        <span className={shared.fieldLabel}>{L("링크", "Links")}</span>
        <SocialLinksEditor links={draft.links} onChange={(links) => set({ links })} max={8} />
      </div>

      {/* 저장·초대 결과. 권한 블록(owner 전용) 안에 있으면 비owner 에게는 실패 이유가
          나올 자리가 없다 — 본인 프로필 저장이 막혀도 아무 반응이 없어 보인다. */}
      {status && (
        <span className={status.ok ? styles.authorInviteOk : shared.authorInviteErr}>{status.msg}</span>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="outline" soundDisabled onClick={() => closeModal("member-edit")}>{L("취소", "Cancel")}</Button>
          <Button variant="primary" soundDisabled disabled={busy || !draft.name.trim()} onClick={save}>{L("저장", "Save")}</Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
