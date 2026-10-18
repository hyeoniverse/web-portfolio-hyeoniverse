"use client";

import type { ReactNode } from "react";
import { HelpCircle, ExternalLink } from "@/components/icons";
import Popover from "@/components/ui/Popover";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillRich } from "@/utils/fillRich";
import styles from "./GiscusHelp.module.css";
import Pressable from "@/components/ui/Pressable";

/* 안내문 본문에 쓰는 인라인 조각 셋. 컴포넌트 밖에 둔다 —
   렌더 안에서 정의하면 렌더할 때마다 다른 컴포넌트가 되어 React 가 매번 새로 마운트한다.
   셋 다 styles 와 props 만 쓰므로 밖에 있어도 그대로 동작한다. */
const Kbd = ({ children }: { children: ReactNode }) => <kbd className={styles.kbd}>{children}</kbd>;
const Hl = ({ children }: { children: ReactNode }) => <b className={styles.hl}>{children}</b>;
const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className={styles.inlineLink} href={href} target="_blank" rel="noopener noreferrer">
    {children}<ExternalLink size={11} />
  </a>
);

/** giscus 설정 방법(단계) Popover — 핵심 단어 highlight + kbd 칩 + 외부 링크. 값·옵션 설명은 필드 ? 툴팁. */
export default function GiscusHelp() {
  const { t } = useLanguage();
  /* 단계 글은 문장 하나가 한 키 — 칩 · 강조 · 링크는 자리표시로 끼운다(언어마다 어순이 달라 조각으로 나누지 않는다) */
  const k = (key: string, slots: Record<string, ReactNode>) => fillRich(t(`admin.inline.giscusHelp.${key}`), slots);

  return (
    <Popover
      placement="bottom-start"
      contentClassName={styles.popover}
      trigger={
        <Pressable className={styles.trigger}>
          <HelpCircle size={13} />
          {t("admin.inline.giscusHelp.setupGuide")}
        </Pressable>
      }
    >
      <div className={styles.panel}>
        <div className={styles.titleRow}>
          <h4 className={styles.title}>{t("admin.inline.giscusHelp.howToSetUp")}</h4>
          <Ext href="https://giscus.app/ko">giscus.app</Ext>
        </div>

        <p className={styles.intro}>
          {k("intro", { repoId: <Kbd>data-repo-id</Kbd>, categoryId: <Kbd>data-category-id</Kbd> })}
        </p>

        <section className={styles.sec}>
          <span className={styles.secTitle}>{t("admin.inline.giscusHelp.setupTitle")}</span>
          <ol className={styles.steps}>
            <li>
              {k("stepRepo", {
                public: <Hl>Public</Hl>,
                discussions: <Hl>Discussions</Hl>,
                path: <Kbd>{t("admin.inline.giscusHelp.discussionsPath")}</Kbd>,
              })}
            </li>
            <li>
              {k("stepInstall", {
                title: <b>{t("admin.inline.giscusHelp.installApp")}</b>,
                link: <Ext href="https://github.com/apps/giscus">github.com/apps/giscus</Ext>,
                install: <Kbd>Install</Kbd>,
                configure: <Kbd>Configure</Kbd>,
                only: <Kbd>Only select repositories</Kbd>,
                all: <Kbd>All repositories</Kbd>,
                save: <Kbd>Install / Save</Kbd>,
              })}
            </li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{t("admin.inline.giscusHelp.optionAuto")}</span>
          <ol className={styles.steps} start={3}>
            <li>
              {k("autoLoad", {
                field: <Kbd>{t("admin.inline.giscusHelp.repository")}</Kbd>,
                format: <Kbd>owner/repository-name</Kbd>,
                load: <Kbd>{t("admin.inline.giscusHelp.loadRepository")}</Kbd>,
                token: <Kbd>GITHUB_TOKEN</Kbd>,
              })}
            </li>
            <li>{t("admin.inline.giscusHelp.autoFillHint")}</li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{t("admin.inline.giscusHelp.optionManual")}</span>
          <ol className={styles.steps} start={3}>
            <li>{k("manualOpen", { link: <Ext href="https://giscus.app/ko">giscus.app</Ext> })}</li>
            <li>{k("manualRepo", { format: <Kbd>{t("admin.inline.giscusHelp.repoFormat")}</Kbd> })}</li>
            <li>{k("manualCategory", { example: <Hl>Announcements</Hl> })}</li>
            <li>{k("manualScript", { tag: <Kbd>&lt;script&gt;</Kbd> })}</li>
            <li>{k("manualCopy", { repoId: <Kbd>data-repo-id</Kbd>, categoryId: <Kbd>data-category-id</Kbd> })}</li>
          </ol>
        </section>

        <p className={styles.caution}>
          {t("admin.inline.giscusHelp.cssUrlCaution")}
        </p>
      </div>
    </Popover>
  );
}
