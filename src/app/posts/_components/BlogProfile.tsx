"use client";

import MongSticker from "./MongSticker";
import AuthorAvatar from "@/components/ui/AuthorAvatar/AuthorAvatar";
import { useState } from "react";
import { Check, Link2, Mail, SocialBrandIcon } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { COPY_FEEDBACK_MS } from "@/constants";
import { showToast } from "@/stores/toastStore";
import { useContactStore } from "@/stores/contactStore";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import { localizeAuthor } from "@/utils/localizeAuthor";
import { formatCount } from "@/utils/format";
import styles from "./BlogSidebar.module.css";

/* 글 목록 사이드바의 소개 카드 — 인스타그램 프로필처럼 [아바타 | 이름 · 글 · 태그 · 시리즈 수] 다음 역할 · 소개 ·
   소셜 아이콘 버튼. 소유자 작성자(site.config authors) 기준이고, 소개가 비면 Profile 페이지의 한 줄 소개를 쓴다.
   compact — 좁은 화면(1024 이하)에서 글 목록 위에 서는 한 줄 프로필. 사이드바가 본문 아래로 내려가는 크기라,
   사이드바의 소개 카드는 그때 숨기고 이 한 줄이 대신 맨 위에서 블로그 주인을 알린다 */
export default function BlogProfile({ stats, compact = false }: { stats: { label: string; value: number }[]; compact?: boolean }) {
  const { language } = useLanguage();
  const siteConf = useSiteConfig();
  const { openForm } = useContactStore();
  const owner = findOwnerAuthor(siteConf.authors ?? []);
  if (!owner) return null;
  const lang = language === "en" ? "en" : "ko";
  const author = localizeAuthor(owner, lang);
  const intro = author.bio || (lang === "en" ? siteConf.profile?.intro : siteConf.profile?.intro_ko) || "";
  const links = (author.links ?? []).filter((l) => l.url);

  return (
    <section className={compact ? styles.profileCompact : styles.profile}>
      {/* 소개 카드 오른쪽 위에서 손 흔드는 몽이 */}
      {!compact && <MongSticker pose="wave-left" flat className={styles.profileMong} />}
      <div className={styles.profileTop}>
        <span className={styles.profileRing}>
          <AuthorAvatar value={author.avatar} name={author.name} size={compact ? 48 : 72} className={styles.profileAvatar} />
        </span>
        <div className={styles.profileHead}>
          <strong className={styles.profileName}>{author.name}</strong>
          <dl className={styles.profileStats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.profileStat}>
                <dt className={styles.profileStatLabel}>{s.label}</dt>
                <dd className={styles.profileStatValue}>{formatCount(s.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {!compact && author.role && <span className={styles.profileRole}>{author.role}</span>}
      {!compact && intro && <p className={styles.profileIntro}>{intro}</p>}
      {(links.length > 0 || author.email) && (
        <div className={styles.profileLinks}>
          {links.map((l) => {
            /* 블로그 링크는 여기가 그 블로그라 이동 대신 주소 복사 */
            if (l.platform === "blog") return <BlogLinkCopy key={l.url} url={l.url} lang={lang} />;
            const label = SOCIAL_ICONS[l.platform]?.label ?? l.platform;
            return (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={styles.profileLink} aria-label={label} title={label}>
                {SOCIAL_ICONS[l.platform]
                  ? <SocialBrandIcon name={l.platform} className={styles.profileLinkIcon} />
                  : <SocialBrandIcon name="custom" className={styles.profileLinkIcon} />}
              </a>
            );
          })}
          {author.email && (
            /* 이메일 — mailto 대신 사이트의 문의 창(ContactDrawer)을 연다 */
            <Pressable className={styles.profileLink} aria-label={lang === "en" ? "Contact" : "문의하기"} title={author.email} onClick={openForm}>
              <Mail size={16} />
            </Pressable>
          )}
        </div>
      )}
    </section>
  );
}

/** 블로그 주소 복사 — 소개 카드의 블로그 링크 자리. 누르면 주소를 복사하고 잠깐 체크 표시 */
function BlogLinkCopy({ url, lang }: { url: string; lang: "ko" | "en" }) {
  const [copied, setCopied] = useState(false);
  const label = lang === "en" ? "Copy blog link" : "블로그 주소 복사";
  return (
    <Pressable
      className={styles.profileLink}
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          showToast(lang === "en" ? "Blog link copied" : "블로그 주소를 복사했어요", "success");
          setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        } catch {
          /* 클립보드를 쓸 수 없는 환경 */
        }
      }}
    >
      {copied ? <Check size={16} /> : <Link2 size={16} />}
    </Pressable>
  );
}
