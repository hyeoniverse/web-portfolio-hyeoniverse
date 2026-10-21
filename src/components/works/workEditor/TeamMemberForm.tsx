"use client";

/**
 * 팀원 입력 폼 — 목록 아래(새 팀원) 또는 그 팀원 줄 자리(편집)에 놓인다.
 *
 * 편집 화면 원칙(docs/editor-ui.md)을 따른다 — 적는 칸은 모두 밑줄, 고르는 것(역할 · 링크 고르기 · 계정 연결)만 알약, 판 없음.
 * 넓은 화면은 한 격자 [사진 | KO | EN] — 사진은 목록 줄의 얼굴 자리 그대로, 나머지 줄은 모두 KO · EN 두 열을 같이 써서
 * 칸의 시작 · 가운데 선이 줄마다 맞는다. 이름 · 소개 · 역할 · 역할별 작업 모두 KO 와 EN 을 한 화면에서 적는다.
 */
import { useRef, useState, type ReactNode } from "react";
import { Plus, User, X } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { ControlSizeScope } from "@/components/ui/controlSize";
import type { useTeamMembers } from "@/hooks/useTeamMembers";
import { getMemberInitial } from "@/utils/teamMemberAvatar";
import { pairContributionGroups, splitRoleList } from "@/utils/teamRoles";
import { ROLE_PRESETS_EN, ROLE_PRESETS_KO, useRoleMultiPicker } from "./roleMultiPicker";
import styles from "./TeamMemberForm.module.css";

type Lang = "ko" | "en";


/** 줄 수만큼 자라는 글상자 — 한 줄로 시작해 적는 만큼 늘어난다(크기 조절 손잡이 · 글자 수 없이) */
function GrowTextarea({ value, onChange, placeholder, label, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label: string; autoFocus?: boolean;
}) {
  const fit = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea
      ref={fit}
      className={styles.input}
      rows={1}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => { onChange(e.target.value); fit(e.currentTarget); }}
    />
  );
}

/** 밑줄 칸 하나 — 왼쪽에 작은 언어 표시(KO · EN). 한 줄 · 여러 줄 모두 같은 모양 */
function Field({ badge, children }: { badge?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      {badge && <span className={styles.fieldBadge}>{badge}</span>}
      {children}
    </label>
  );
}

/** 역할별 작업 묶음 한 칸 — [이름 · 지우기] 아래 칸 */
function GroupCell({ name, lines, onChange, onRemove, badge, removeLabel, placeholder, autoFocus }: {
  name: string;
  lines: string[];
  onChange: (lines: string[]) => void;
  onRemove: () => void;
  badge: string;
  removeLabel: string;
  placeholder: string;
  autoFocus: boolean;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.groupName}>
        {name}
        <Pressable className={styles.groupRemove} onClick={onRemove} aria-label={`${removeLabel}: ${name}`} title={removeLabel}>
          <X size={12} strokeWidth={2} />
        </Pressable>
      </span>
      <Field badge={badge}>
        <GrowTextarea label={`${name} ${badge}`} value={lines.join("\n")} onChange={(v) => onChange(v.split("\n"))} placeholder={placeholder} autoFocus={autoFocus} />
      </Field>
    </div>
  );
}

export interface TeamMemberFormProps {
  team: ReturnType<typeof useTeamMembers>;
  badgeOf: (lang: Lang) => string;
  tw: (key: string) => string;
  avatarPreview: string | null | undefined;
  avatarUploading: boolean;
  onAvatarFile: (file: File) => void;
  /** 연결한 사이트 계정의 프로필 링크 — 있으면 링크 칸 아래 알약으로 골라 넣는다 */
  linkOptions: { value: string; label: string }[];
  /** 꼬리 줄 왼쪽 — 사이트 계정 연결 */
  footerStart?: ReactNode;
  /** 꼬리 줄 오른쪽 — 취소 · 저장 */
  footerEnd: ReactNode;
}

export default function TeamMemberForm({
  team, badgeOf, tw, avatarPreview, avatarUploading, onAvatarFile, linkOptions, footerStart, footerEnd,
}: TeamMemberFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  /* 역할 — KO · EN 각자 고른다. 기본 역할(기획 ↔ Planning …)은 한쪽에서 넣거나 빼면 다른 쪽도 따라간다 */
  const roleOf = { ko: team.memberRoleKo, en: team.memberRoleEn };
  const setRoleOf = { ko: team.setMemberRoleKo, en: team.setMemberRoleEn };
  const presetsOf = { ko: ROLE_PRESETS_KO, en: ROLE_PRESETS_EN };
  const changeRole = (lang: Lang) => (next: string) => {
    const other: Lang = lang === "ko" ? "en" : "ko";
    const before = splitRoleList(roleOf[lang]);
    const after = splitRoleList(next);
    let otherTokens = splitRoleList(roleOf[other]);
    const mapped = (t: string) => presetsOf[other][presetsOf[lang].indexOf(t)];
    for (const t of after) if (!before.includes(t) && mapped(t) && !otherTokens.includes(mapped(t))) otherTokens = [...otherTokens, mapped(t)];
    for (const t of before) if (!after.includes(t) && mapped(t)) otherTokens = otherTokens.filter((x) => x !== mapped(t));
    setRoleOf[lang](next);
    // 다른 쪽이 바뀔 때만 다시 적는다 — 손대지 않은 쪽의 원래 표기("기획 · 디자인")를 쉼표로 바꾸지 않게
    if (otherTokens.join("\u0000") !== splitRoleList(roleOf[other]).join("\u0000")) setRoleOf[other](otherTokens.join(", "));
  };
  const roleKo = useRoleMultiPicker({ value: team.memberRoleKo, onChange: changeRole("ko"), presets: ROLE_PRESETS_KO, placeholder: tw("memberRole") });
  const roleEn = useRoleMultiPicker({ value: team.memberRoleEn, onChange: changeRole("en"), presets: ROLE_PRESETS_EN, placeholder: tw("memberRole") });
  const pickerOf = { ko: roleKo, en: roleEn };

  const contribOf = {
    ko: team.memberContribsKo as Record<string, string[]>,
    en: team.memberContribsEn as Record<string, string[]>,
  };
  const setContribOf = { ko: team.setMemberContribsKo, en: team.setMemberContribsEn };
  const rolesOf = { ko: splitRoleList(roleOf.ko), en: splitRoleList(roleOf.en) };
  /* KO 묶음과 EN 묶음을 한 줄씩 짝지어 두 열을 나란히 읽게 한다(저장 값은 언어별 그대로, 보여 주는 순서만) */
  const pairs = pairContributionGroups(Object.keys(contribOf.ko), Object.keys(contribOf.en), rolesOf.ko, rolesOf.en, presetsOf);
  const [opened, setOpened] = useState<{ lang: Lang; key: string } | null>(null);
  const openGroup = (lang: Lang, key: string) => {
    setOpened({ lang, key });
    if (!(key in contribOf[lang])) setContribOf[lang]({ ...contribOf[lang], [key]: [""] });
  };
  const removeGroup = (lang: Lang, key: string) => {
    const next = { ...contribOf[lang] };
    delete next[key];
    setContribOf[lang](next);
  };
  /* 짝이 비었을 때 새로 열 묶음 이름 — 상대 묶음이 역할이면 같은 자리의 이 언어 역할, 기본 역할이면 그 대응, 아니면 상대 이름 그대로 */
  const counterpartName = (lang: Lang, otherKey: string) => {
    const other: Lang = lang === "ko" ? "en" : "ko";
    const byRole = rolesOf[lang][rolesOf[other].indexOf(otherKey)];
    const byPreset = presetsOf[lang][presetsOf[other].indexOf(otherKey)];
    return byRole ?? byPreset ?? otherKey;
  };
  const offered = { ko: new Set<string>(), en: new Set<string>() };
  for (const pr of pairs) {
    if (!pr.ko && pr.en) offered.ko.add(counterpartName("ko", pr.en));
    if (!pr.en && pr.ko) offered.en.add(counterpartName("en", pr.ko));
  }
  // 아직 아무 쪽에도 적지 않은 역할 — 맨 아래 줄에 "+ 역할" 알약
  const pendingOf = {
    ko: rolesOf.ko.filter((r) => !(r in contribOf.ko) && !offered.ko.has(r)),
    en: rolesOf.en.filter((r) => !(r in contribOf.en) && !offered.en.has(r)),
  };
  const hasContribRow = pairs.length > 0 || pendingOf.ko.length > 0 || pendingOf.en.length > 0;
  const addPick = (lang: Lang, name: string) => (
    <Pressable key={name} className={styles.addPick} onClick={() => openGroup(lang, name)}>
      <Plus size={12} strokeWidth={2} />
      {name}
    </Pressable>
  );


  /* ── 공통 조각 ── */
  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onAvatarFile(file);
        e.target.value = "";
      }}
    />
  );
  const avatar = (
    <Pressable
      className={styles.avatar}
      onClick={() => !avatarUploading && fileRef.current?.click()}
      aria-label={tw("memberAvatarUpload")}
      title={tw("memberAvatarUpload")}
      data-busy={avatarUploading || undefined}
    >
      {avatarPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarPreview} alt="" className={styles.avatarImg} loading="lazy" />
      ) : team.memberName.trim() ? (
        <span className={styles.avatarInitial}>{getMemberInitial(team.memberName)}</span>
      ) : (
        <User size={18} strokeWidth={1.5} />
      )}
      <span className={styles.avatarBadge} aria-hidden="true"><Plus size={10} strokeWidth={2.5} /></span>
    </Pressable>
  );
  const nameInput = (lang: Lang) => (
    <Field badge={badgeOf(lang)}>
      <input
        className={styles.input}
        value={lang === "ko" ? team.memberName : team.memberNameEn}
        onChange={(e) => (lang === "ko" ? team.setMemberName : team.setMemberNameEn)(e.target.value)}
        placeholder={lang === "ko" ? "홍길동" : "Gildong Hong"}
        aria-label={`${tw("memberName")} ${badgeOf(lang)}`}
      />
    </Field>
  );
  const bioInput = (lang: Lang) => (
    <Field badge={badgeOf(lang)}>
      <GrowTextarea
        label={`${tw("memberBioLabel")} ${badgeOf(lang)}`}
        value={lang === "ko" ? team.memberBioKo : team.memberBioEn}
        onChange={lang === "ko" ? team.setMemberBioKo : team.setMemberBioEn}
        placeholder={tw(lang === "ko" ? "memberBioPlaceholderKo" : "memberBioPlaceholderEn")}
      />
    </Field>
  );
  const roleLine = (lang: Lang) => (
    <div className={styles.roles}>
      <span className={styles.fieldBadge}>{badgeOf(lang)}</span>
      {rolesOf[lang].map((r) => (
        <span key={r} className={styles.roleChip}>
          {r}
          <Pressable
            className={styles.roleChipRemove}
            onClick={() => changeRole(lang)(rolesOf[lang].filter((x) => x !== r).join(", "))}
            aria-label={`${tw("roleRemove")}: ${r}`}
            title={tw("roleRemove")}
          >
            <X size={12} strokeWidth={2} />
          </Pressable>
        </span>
      ))}
      {/* 고르기 칸도 칩과 같은 28(sm) — 같은 줄에서 높이가 달라 보이지 않게 */}
      <div className={styles.roleSelect}><ControlSizeScope size="sm">{pickerOf[lang].selectNode}</ControlSizeScope></div>
    </div>
  );
  const emailInput = (
    <Field>
      <input className={styles.input} type="email" value={team.memberEmail} onChange={(e) => team.setMemberEmail(e.target.value)} placeholder="name@example.com" aria-label={tw("memberEmailLabel")} />
    </Field>
  );
  const urlInput = (
    <div className={styles.cell}>
      <Field>
        <input className={styles.input} type="url" value={team.memberUrl} onChange={(e) => team.setMemberUrl(e.target.value)} placeholder={tw("memberUrlPlaceholder")} aria-label={tw("memberUrlLabel")} />
      </Field>
      {linkOptions.length > 0 && (
        <div className={styles.picks}>
          {linkOptions.map((o) => (
            <Pressable key={o.value} className={styles.pick} data-active={team.memberUrl === o.value || undefined} onClick={() => team.setMemberUrl(o.value)} title={o.value}>
              {o.label}
            </Pressable>
          ))}
        </div>
      )}
    </div>
  );
  const contribRows = (
    <div className={styles.contribRows}>
      {pairs.map((pr) => (
        <div key={`${pr.ko ?? ""}|${pr.en ?? ""}`} className={styles.contribRow}>
          {(["ko", "en"] as const).map((lang) => {
            const key = pr[lang];
            const otherKey = pr[lang === "ko" ? "en" : "ko"];
            if (key) {
              return (
                <GroupCell
                  key={lang}
                  name={key}
                  lines={contribOf[lang][key] ?? []}
                  onChange={(lines) => setContribOf[lang]({ ...contribOf[lang], [key]: lines })}
                  onRemove={() => removeGroup(lang, key)}
                  badge={badgeOf(lang)}
                  removeLabel={tw("remove")}
                  placeholder={tw("memberContribPlaceholderShort")}
                  autoFocus={opened?.lang === lang && opened.key === key}
                />
              );
            }
            // 이 언어 쪽이 빈 줄 — 짝 이름으로 바로 열 수 있다
            return <div key={lang} className={styles.picks}>{otherKey && addPick(lang, counterpartName(lang, otherKey))}</div>;
          })}
        </div>
      ))}
      {(pendingOf.ko.length > 0 || pendingOf.en.length > 0) && (
        <div className={styles.contribRow}>
          {(["ko", "en"] as const).map((lang) => (
            <div key={lang} className={styles.picks}>{pendingOf[lang].map((r) => addPick(lang, r))}</div>
          ))}
        </div>
      )}
    </div>
  );
  const colHead = (
    <div className={styles.colHead} aria-hidden="true">
      <span>{tw("memberColKo")}</span>
      <span>{tw("memberColEn")}</span>
    </div>
  );
  /* 시트 한 줄 — [라벨 | KO | EN] 또는 [라벨 | 두 열을 다 쓰는 값] */
  const row = (label: ReactNode, cells: ReactNode, span = false) => (
    <div className={styles.sheetRow} data-span={span || undefined}>
      <span className={styles.sheetLabel}>{label}</span>
      {cells}
    </div>
  );

  return (
    <div className={styles.form}>
      {fileInput}

      {/* 시트 — 왼쪽 라벨 열 + KO · EN 값. 맨 위 열 머리가 언어를 한 번만 알린다 */}
      <div className={styles.sheet}>
        {row(null, colHead, true)}
        {row(tw("memberName"), <>{nameInput("ko")}{nameInput("en")}</>)}
        {row(tw("memberPhoto"), <div>{avatar}</div>)}
        {row(tw("memberRole"), <>{roleLine("ko")}{roleLine("en")}</>)}
        {row(tw("memberEmailLabel"), emailInput)}
        {row(tw("memberUrlLabel"), urlInput)}
        {row(tw("memberBioLabel"), <>{bioInput("ko")}{bioInput("en")}</>)}
        {hasContribRow && <div className={styles.sheetDivider} />}
        {hasContribRow && row(tw("memberContribByRole"), contribRows, true)}
      </div>

      {/* 꼬리 줄 — 계정 연결은 왼쪽, 취소 · 저장은 오른쪽(원칙 2-8) */}
      <div className={styles.footer}>
        <div className={styles.footerStart}>{footerStart}</div>
        <div className={styles.footerEnd}>{footerEnd}</div>
      </div>
    </div>
  );
}
