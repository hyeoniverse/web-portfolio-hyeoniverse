"use client";

import AuthorAvatar from "@/components/ui/AuthorAvatar/AuthorAvatar";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import { localizeAuthor } from "@/utils/localizeAuthor";
import styles from "./BlogSidebar.module.css";

/* blog 레이아웃 사이드바의 소개 카드 — 소유자 작성자(site.config authors)의 아바타 · 이름 · 역할 · 소개 · 링크.
   소개가 비어 있으면 Profile 페이지의 한 줄 소개(profile.intro)를 쓴다. */
export default function BlogProfile() {
  const { language } = useLanguage();
  const siteConf = useSiteConfig();
  const owner = findOwnerAuthor(siteConf.authors ?? []);
  if (!owner) return null;
  const lang = language === "en" ? "en" : "ko";
  const author = localizeAuthor(owner, lang);
  const intro = author.bio || (lang === "en" ? siteConf.profile?.intro : siteConf.profile?.intro_ko) || "";
  const links = [
    ...(author.links ?? []).filter((l) => l.url).map((l) => ({ label: l.platform, href: l.url })),
    ...(author.email ? [{ label: "email", href: `mailto:${author.email}` }] : []),
  ];

  return (
    <section className={styles.profile}>
      <AuthorAvatar value={author.avatar} name={author.name} size={64} className={styles.profileAvatar} />
      <div className={styles.profileText}>
        <strong className={styles.profileName}>{author.name}</strong>
        {author.role && <span className={styles.profileRole}>{author.role}</span>}
      </div>
      {intro && <p className={styles.profileIntro}>{intro}</p>}
      {links.length > 0 && (
        <div className={styles.profileLinks}>
          {links.map((l) => (
            <a key={l.href} href={l.href} target={l.href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" className={styles.profileLink}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
