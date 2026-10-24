"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { content, lastUpdatedDate, type Language, type Section } from "@/data/privacy";
import DetailLayout from "@/components/layout/DetailLayout";
import LanguageToggle from "@/components/ui/LanguageToggle";
import styles from "./Privacy.module.css";

/* 등장 연출은 CSS 가 서버 HTML 부터 돌린다(Privacy.module.css 의 .fadeUp · .section). 예전에는 framer 가 투명에서 시작해
   하이드레이션이 끝나야 본문이 보였다 — 느린 4G · CPU 4배에서 본문(LCP)이 5초 넘게 비어 있었다 */
const fadeUp = (delay: number) => ({ className: styles.fadeUp, style: { animationDelay: `${delay}s` } });

/** 첫 화면 아래의 섹션만 숨겨 두었다가 화면에 들어오면 보인다 — 첫 화면의 섹션은 서버 HTML 그대로 둔다 */
function useRevealBelowFold(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const sections = [...(root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [])];
    if (!sections.length || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.reveal = "shown";
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -60px 0px" });
    for (const el of sections) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue;
      el.dataset.reveal = "wait";
      io.observe(el);
    }
    return () => io.disconnect();
  }, [root]);
}

function SectionContent({ section }: { section: Section }) {
  const siteConfig = useSiteConfig();
  return (
    <>
      <h2>{section.title}</h2>
      <p>
        {section.contentParts
          ? section.contentParts.map((part, i) =>
              typeof part === "string" ? (
                <span key={i}>{part}</span>
              ) : (
                <span key={i} className="highlighted-text">
                  {part.highlight}
                </span>
              ),
            )
          : section.content}
        {section.email && (
          <a href={`mailto:${siteConfig.contact.email}`}>
            {siteConfig.contact.email}
          </a>
        )}
      </p>
      {section.list && (
        <ul>
          {section.list.map((item, i) => (
            <li key={i}>
              {item.strong && (
                <span className="highlighted-text">{item.strong}</span>
              )}{" "}
              {item.text}
              {item.link && (
                <>
                  {" "}
                  <a
                    href={item.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.link.text}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PrivacyClient() {
  const sectionsRef = useRef<HTMLDivElement>(null);
  useRevealBelowFold(sectionsRef);
  const [lang, setLang] = useState<Language>("ko");
  const t = content[lang];

  const formatDate = (locale: string) => {
    // 항상 실제 최종 개정일 기준. 로컬 자정으로 파싱(날짜 문자열만 넘기면 UTC 로 해석돼 하루 밀릴 수 있음).
    return new Date(`${lastUpdatedDate}T00:00:00`).toLocaleDateString(
      locale === "ko" ? "ko-KR" : "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );
  };

  return (
    <DetailLayout
      backHref="/"
      backLabel={t.backLink}
      contentClassName={styles.wrapper}
    >
      <div {...fadeUp(0.1)} className={`${styles.header} ${styles.fadeUp}`}>
        <p className={styles.lastUpdated}>
          {t.lastUpdated}: {formatDate(lang)}
        </p>
        <LanguageToggle lang={lang} onLangChange={setLang} />
      </div>

      <h1 {...fadeUp(0.2)} className={`${styles.title} ${styles.fadeUp}`}>{t.title}</h1>
      <div {...fadeUp(0.3)} className={`${styles.divider} ${styles.fadeUp}`} />

      <div ref={sectionsRef}>
        {t.sections.map((section, index) => (
          <section key={index} className={styles.section} data-reveal="">
            <SectionContent section={section} />
          </section>
        ))}
      </div>
    </DetailLayout>
  );
}
