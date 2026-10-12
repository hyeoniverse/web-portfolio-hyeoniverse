"use client";

import type { ReactNode } from "react";
import { HelpCircle, ExternalLink } from "@/components/icons";
import Popover from "@/components/ui/Popover";
import { useLanguage } from "@/providers/LanguageProvider";
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
          {t("admin.inline.giscusHelp.idsCopyHint")}
          <Kbd>data-repo-id</Kbd> · <Kbd>data-category-id</Kbd>
          {t("admin.inline.giscusHelp.attributesOfTheScript")}
        </p>

        <section className={styles.sec}>
          <span className={styles.secTitle}>{t("admin.inline.giscusHelp.setupTitle")}</span>
          <ol className={styles.steps}>
            <li>
              {t("admin.inline.giscusHelp.makeSureTheComment")}
              <Hl>Public</Hl>
              {t("admin.inline.giscusHelp.fragAndThat")}
              <Hl>Discussions</Hl>
              {t("admin.inline.giscusHelp.isEnabled")}
              <Kbd>{t("admin.inline.giscusHelp.settingsGeneralFeaturesDiscussions")}</Kbd>
              {t("admin.inline.giscusHelp.text")}
            </li>
            <li>
              <b>{t("admin.inline.giscusHelp.installTheGiscusApp")}</b>
              {t("admin.inline.giscusHelp.fragGoTo")}
              <Ext href="https://github.com/apps/giscus">github.com/apps/giscus</Ext>
              {t("admin.inline.giscusHelp.fragAndClick")}
              <Kbd>Install</Kbd>{t("admin.inline.giscusHelp.fragOr")}<Kbd>Configure</Kbd>{t("admin.inline.giscusHelp.ifAlreadyInstalledChoose")}
              <Kbd>Only select repositories</Kbd>
              {t("admin.inline.giscusHelp.fragPickRepo")}
              <Kbd>All repositories</Kbd>
              {t("admin.inline.giscusHelp.fragGrantAccess")}
              <Kbd>Install / Save</Kbd>
              {t("admin.inline.giscusHelp.fragPeriod")}
            </li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{t("admin.inline.giscusHelp.optionAuto")}</span>
          <ol className={styles.steps} start={3}>
            <li>
              {t("admin.inline.giscusHelp.fragInThe")}
              <Kbd>{t("admin.inline.giscusHelp.repository")}</Kbd>
              {t("admin.inline.giscusHelp.fieldEnter")}
              <Kbd>owner/repository-name</Kbd>
              {t("admin.inline.giscusHelp.andClick")}
              <Kbd>{t("admin.inline.giscusHelp.loadRepository")}</Kbd>
              {t("admin.inline.giscusHelp.requires")}
              <Kbd>GITHUB_TOKEN</Kbd>
              {t("admin.inline.giscusHelp.fragCloseParen")}
            </li>
            <li>{t("admin.inline.giscusHelp.autoFillHint")}</li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{t("admin.inline.giscusHelp.optionManual")}</span>
          <ol className={styles.steps} start={3}>
            <li>
              {t("admin.inline.giscusHelp.goToTheGiscus")}
              <Ext href="https://giscus.app/ko">giscus.app</Ext>
              {t("admin.inline.giscusHelp.fragCloseParenPeriod")}
            </li>
            <li>
              {t("admin.inline.giscusHelp.fragEnterRepo")}
              <Kbd>{t("admin.inline.giscusHelp.repoFormat")}</Kbd>
              {t("admin.inline.giscusHelp.fragPeriod2")}
            </li>
            <li>
              {t("admin.inline.giscusHelp.fragChooseCategory")}
              <Hl>Announcements</Hl>
              {t("admin.inline.giscusHelp.fragCloseParenPeriod2")}
            </li>
            <li>
              {t("admin.inline.giscusHelp.findTheGenerated")}
              <Kbd>&lt;script&gt;</Kbd>
              {t("admin.inline.giscusHelp.tagInTheEnable")}
            </li>
            <li>
              {t("admin.inline.giscusHelp.copy")}
              <Kbd>data-repo-id</Kbd> · <Kbd>data-category-id</Kbd>
              {t("admin.inline.giscusHelp.fromTheScriptInto")}
            </li>
          </ol>
        </section>

        <p className={styles.caution}>
          {t("admin.inline.giscusHelp.aCustomCssUrl")}
        </p>
      </div>
    </Popover>
  );
}
