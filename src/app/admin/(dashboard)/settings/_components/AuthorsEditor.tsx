"use client";

import { useState } from "react";
import { Plus, Trash2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Author } from "@/types/author";
import Field from "./SettingsFormFields";
import SocialLinksEditor from "./SocialLinksEditor";
import styles from "../Settings.module.css";

interface Props {
  authors: Author[];
  onChange: (authors: Author[]) => void;
}

/** site.config authors 목록 CRUD — 각 작성자: 이름/아바타/역할/소개/링크. 게시물은 author_ids 로 참조.
 *  + 이메일로 초대(이슈 #334) — GitHub OAuth 로그인 시 이 이메일 매칭으로 권한 부여. */
export default function AuthorsEditor({ authors, onChange }: Props) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  // 초대 상태 (author id 별)
  const [levels, setLevels] = useState<Record<string, string>>({}); // 권한 레벨 선택값
  const [inviting, setInviting] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const LEVELS = [
    { value: "1", label: L("자기 글만 (작성자)", "Own posts (Author)") },
    { value: "2", label: L("모든 글 (편집자)", "All posts (Editor)") },
  ];

  const invite = async (a: Author) => {
    if (!a.email) { setStatus((s) => ({ ...s, [a.id]: { ok: false, msg: L("이메일을 먼저 입력해 주세요.", "Please enter an email first.") } })); return; }
    setInviting(a.id);
    setStatus((s) => ({ ...s, [a.id]: { ok: true, msg: L("초대하고 있습니다…", "Sending the invite…") } }));
    try {
      const res = await fetch("/api/admin/authors/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: a.email, author_id: a.id, permission_level: Number(levels[a.id] ?? "1") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus((s) => ({ ...s, [a.id]: { ok: false, msg: data.reason || data.error || L("초대에 실패했습니다.", "The invite failed.") } })); return; }
      const parts = [
        data.appliedNow ? L("기존 계정에 권한을 부여했습니다.", "Granted access to the existing account.") : L("초대를 등록했습니다.", "The invite has been created."),
        data.emailed
          ? L("초대 메일을 발송했습니다.", "The invite email was sent.")
          : data.emailReason === "no_api_key"
            ? L("RESEND_API_KEY 가 없어 메일은 발송하지 못했습니다.", "The email was not sent because RESEND_API_KEY is missing.")
            : `${L("메일을 발송하지 못했습니다.", "The email could not be sent.")}${data.emailReason ? ` (${data.emailReason})` : ""}`,
      ];
      setStatus((s) => ({ ...s, [a.id]: { ok: !!data.emailed || data.appliedNow, msg: parts.join(" ") } }));
    } catch {
      setStatus((s) => ({ ...s, [a.id]: { ok: false, msg: L("오류가 발생했습니다.", "An error occurred.") } }));
    } finally {
      setInviting(null);
    }
  };

  const patch = (idx: number, p: Partial<Author>) =>
    onChange(authors.map((a, i) => (i === idx ? { ...a, ...p } : a)));
  const add = () =>
    onChange([
      ...authors,
      { id: `author-${Date.now().toString(36)}`, name: "", avatar: "", role: "", email: "", bio: "", links: [] },
    ]);
  const remove = (idx: number) => onChange(authors.filter((_, i) => i !== idx));

  // 이미지 클릭 → 파일 선택 → /api/upload → 반환 URL 을 avatar 로
  const uploadAvatar = (idx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data: { url?: string } = await res.json().catch(() => ({}));
        if (res.ok && data.url) patch(idx, { avatar: data.url });
      } catch {
        /* noop */
      }
    };
    input.click();
  };

  return (
    <div className={styles.authorsEditor}>
      {authors.map((a, idx) => (
        <div key={a.id} className={styles.authorCard}>
          <div className={styles.authorCardHead}>
            <button
              type="button"
              className={styles.authorAvatarUpload}
              onClick={() => uploadAvatar(idx)}
              title={L("이미지 업로드", "Upload image")}
              aria-label={L("아바타 이미지 업로드", "Upload avatar image")}
            >
              {a.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar} alt="" className={styles.authorAvatarImg} />
              ) : (
                <span className={styles.authorAvatarInitial} aria-hidden>
                  {(a.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className={styles.authorAvatarPlus} aria-hidden>
                <Plus size={12} strokeWidth={2.5} />
              </span>
            </button>
            <span className={styles.authorCardName}>{a.name || L("(이름 없음)", "(unnamed)")}</span>
            <Button
              variant="ghost"
              size="xs"
              tone="danger"
              className={styles.authorRemoveBtn}
              icon={<Trash2 size={13} />}
              onClick={() => remove(idx)}
            >
              {L("삭제", "Remove")}
            </Button>
          </div>

          <div className={styles.authorCardFields}>
            <Field label={L("이름", "Name")} value={a.name} onChange={(v) => patch(idx, { name: v })} />
            <Field
              label={L("아바타 URL", "Avatar URL")}
              value={a.avatar}
              onChange={(v) => patch(idx, { avatar: v })}
              placeholder="https://..."
              maxHint={null}
            />
            <Field
              label={L("역할", "Role")}
              value={a.role}
              onChange={(v) => patch(idx, { role: v })}
              placeholder={L("예: 프론트엔드 개발자", "e.g. Frontend Developer")}
            />
            <Field
              label={L("이메일", "Email")}
              value={a.email}
              onChange={(v) => patch(idx, { email: v })}
              placeholder="name@example.com"
              maxHint={null}
            />
            <Field label={L("소개", "Bio")} value={a.bio} onChange={(v) => patch(idx, { bio: v })} multiline />
          </div>

          {/* 접근 권한 — 이메일로 초대. GitHub OAuth 로그인 시 이 이메일 매칭으로 권한 부여(이슈 #334). */}
          <div className={styles.authorInvite}>
            <span className={styles.fieldLabel}>{L("접근 권한 (초대)", "Access (invite)")}</span>
            <div className={styles.authorInviteRow}>
              <Select
                value={levels[a.id] ?? "1"}
                options={LEVELS}
                size="sm"
                onChange={(v) => setLevels((s) => ({ ...s, [a.id]: v }))}
              />
              <Button
                variant="outline"
                size="sm"
                icon={<Mail size={14} />}
                disabled={inviting === a.id || !a.email}
                onClick={() => invite(a)}
              >
                {inviting === a.id ? L("초대하고 있습니다…", "Sending…") : L("이메일로 초대", "Invite by email")}
              </Button>
              {status[a.id] && (
                <span className={status[a.id].ok ? styles.authorInviteOk : styles.authorInviteErr}>
                  {status[a.id].msg}
                </span>
              )}
            </div>
            <span className={styles.fieldHint}>
              {L("이 이메일과 동일한 GitHub 계정으로 로그인하면 권한이 부여됩니다.", "Access is granted when they sign in with the GitHub account that uses this email.")}
            </span>
          </div>

          <div className={styles.authorLinksEditor}>
            <span className={styles.fieldLabel}>{L("링크", "Links")}</span>
            <SocialLinksEditor links={a.links} onChange={(links) => patch(idx, { links })} max={8} />
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={add}>
        {L("작성자 추가", "Add author")}
      </Button>
    </div>
  );
}
