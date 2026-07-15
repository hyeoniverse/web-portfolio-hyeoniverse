"use client";

import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Author } from "@/types/author";
import Field from "./SettingsFormFields";
import SocialLinksEditor from "./SocialLinksEditor";
import styles from "../Settings.module.css";

interface Props {
  authors: Author[];
  onChange: (authors: Author[]) => void;
}

/** site.config authors 목록 CRUD — 각 작성자: 이름/아바타/역할/소개/링크. 게시물은 author_ids 로 참조. */
export default function AuthorsEditor({ authors, onChange }: Props) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

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
