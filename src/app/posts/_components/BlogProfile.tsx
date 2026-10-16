"use client";

import MongSticker from "./MongSticker";
import AuthorAvatar from "@/components/ui/AuthorAvatar/AuthorAvatar";
import { Mail, SocialBrandIcon } from "@/components/icons";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import { localizeAuthor } from "@/utils/localizeAuthor";
import { formatCount } from "@/utils/format";
import styles from "./BlogSidebar.module.css";

/* 글 목록 사이드바의 소개 카드 — 인스타그램 프로필처럼 [아바타 | 이름 · 글 · 태그 · 시리즈 수] 다음 역할 · 소개 ·
   소셜 아이콘 버튼. 소유자 작성자(site.config authors) 기준이고, 소개가 비면 Profile 페이지의 한 줄 소개를 쓴다. */
export default function BlogProfile({ stats }: { stats: { label: string; value: number }[] }) {
  const { language } = useLanguage();
  const siteConf = useSiteConfig();
  const owner = findOwnerAuthor(siteConf.authors ?? []);
  if (!owner) return null;
  const lang = language === "en" ? "en" : "ko";
  const author = localizeAuthor(owner, lang);
  const intro = author.bio || (lang === "en" ? siteConf.profile?.intro : siteConf.profile?.intro_ko) || "";
  const links = (author.links ?? []).filter((l) => l.url);

  return (
    <section className={styles.profile}>
      {/* 소개 카드 오른쪽 위에서 손 흔드는 몽이 */}
      <MongSticker pose="wave-left" flat className={styles.profileMong} />
      <div className={styles.profileTop}>
        <span className={styles.profileRing}>
          <AuthorAvatar value={author.avatar} name={author.name} size={72} className={styles.profileAvatar} />
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
      {author.role && <span className={styles.profileRole}>{author.role}</span>}
      {intro && <p className={styles.profileIntro}>{intro}</p>}
      {(links.length > 0 || author.email) && (
        <div className={styles.profileLinks}>
          {links.map((l) => {
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
            <a href={`mailto:${author.email}`} className={styles.profileLink} aria-label="Email" title={author.email}>
              <Mail size={16} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
