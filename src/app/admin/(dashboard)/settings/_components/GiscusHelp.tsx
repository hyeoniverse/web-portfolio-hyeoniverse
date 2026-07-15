"use client";

import type { ReactNode } from "react";
import { HelpCircle, ExternalLink } from "lucide-react";
import Popover from "@/components/ui/Popover";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./GiscusHelp.module.css";

/** giscus 설정 방법(단계) Popover — 핵심 단어 highlight + kbd 칩 + 외부 링크. 값·옵션 설명은 필드 ? 툴팁. */
export default function GiscusHelp() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const L = (k: string, e: string) => (ko ? k : e);
  const Kbd = ({ children }: { children: ReactNode }) => <kbd className={styles.kbd}>{children}</kbd>;
  const Hl = ({ children }: { children: ReactNode }) => <b className={styles.hl}>{children}</b>;
  const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
    <a className={styles.inlineLink} href={href} target="_blank" rel="noopener noreferrer">
      {children}<ExternalLink size={11} />
    </a>
  );

  return (
    <Popover
      placement="bottom-start"
      contentClassName={styles.popover}
      trigger={
        <button type="button" className={styles.trigger}>
          <HelpCircle size={13} />
          {L("설정 방법", "Setup guide")}
        </button>
      }
    >
      <div className={styles.panel}>
        <div className={styles.titleRow}>
          <h4 className={styles.title}>{L("giscus 설정 방법", "How to set up giscus")}</h4>
          <Ext href="https://giscus.app/ko">giscus.app</Ext>
        </div>

        <p className={styles.intro}>
          {L("레포지토리 ID와 카테고리 ID는 ", "The repo ID and category ID can be copied from the ")}
          <Kbd>data-repo-id</Kbd> · <Kbd>data-category-id</Kbd>
          {L(" 속성에서 복사해 확인할 수 있습니다. 이 값들은 giscus 홈페이지에서 저장소 이름을 입력하면 생성되는 스크립트 템플릿에 들어 있습니다.", " attributes of the script template giscus.app generates once you enter your repository name.")}
        </p>

        <section className={styles.sec}>
          <span className={styles.secTitle}>{L("설정하는 방법", "How to set it up")}</span>
          <ol className={styles.steps}>
            <li>
              {L("댓글을 달 저장소가 ", "Make sure the comment repository is ")}
              <Hl>Public</Hl>
              {L(" 이고, ", " and that ")}
              <Hl>Discussions</Hl>
              {L(" 기능(", " is enabled (")}
              <Kbd>{L("Settings → General → Features → Discussions", "Settings → General → Features → Discussions")}</Kbd>
              {L(")이 켜져 있는지 확인합니다.", ").")}
            </li>
            <li>
              <b>{L("giscus 앱 설치", "Install the giscus app")}</b>
              {L(" — ", " — go to ")}
              <Ext href="https://github.com/apps/giscus">github.com/apps/giscus</Ext>
              {ko ? " 에서 " : " and click "}
              <Kbd>Install</Kbd>{L("(이미 설치했다면 ", " (or ")}<Kbd>Configure</Kbd>{L(")을 누릅니다 → 계정 또는 조직을 선택합니다 → ", " if already installed) → choose the account or organization → under ")}
              <Kbd>Only select repositories</Kbd>
              {L(" 에서 댓글을 저장할 저장소를 선택(또는 ", " pick the repo for comments (or ")}
              <Kbd>All repositories</Kbd>
              {L(")하고 ", ") and grant access with ")}
              <Kbd>Install / Save</Kbd>
              {L(" 로 권한을 부여합니다.", ".")}
            </li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{L("방법 A — 자동 (권장)", "Option A — Automatic (recommended)")}</span>
          <ol className={styles.steps} start={3}>
            <li>
              {L("Admin 설정의 ", "In the ")}
              <Kbd>{L("저장소", "Repository")}</Kbd>
              {L(" 입력란에 ", " field, enter ")}
              <Kbd>owner/repository-name</Kbd>
              {L(" 을 입력하고 ", " and click ")}
              <Kbd>{L("저장소 불러오기", "Load repository")}</Kbd>
              {L(" 를 누릅니다. (", ". (requires ")}
              <Kbd>GITHUB_TOKEN</Kbd>
              {L(" 환경변수가 필요합니다.)", ")")}
            </li>
            <li>{L("repo ID 와 카테고리가 자동으로 채워지며, 카테고리는 드롭다운에서 선택합니다.", "The repo ID and categories fill in automatically, and you pick a category from the dropdown.")}</li>
          </ol>
        </section>

        <section className={styles.sec}>
          <span className={styles.subTitle}>{L("방법 B — 수동", "Option B — Manual")}</span>
          <ol className={styles.steps} start={3}>
            <li>
              {L("giscus 설정 페이지(", "Go to the giscus setup page (")}
              <Ext href="https://giscus.app/ko">giscus.app</Ext>
              {L(")로 이동합니다.", ").")}
            </li>
            <li>
              {L("저장소 입력란에 ", "Enter your repository as ")}
              <Kbd>{L("사용자명/저장소명", "username/repository-name")}</Kbd>
              {L(" 형식으로 입력합니다.", ".")}
            </li>
            <li>
              {L("Discussion 카테고리에서 댓글이 저장될 카테고리(예: ", "Under Discussion Category, choose where comments will be stored (e.g. ")}
              <Hl>Announcements</Hl>
              {L(")를 선택합니다.", ").")}
            </li>
            <li>
              {L("페이지 아래쪽 giscus 활성화 부분에 생성된 ", "Find the generated ")}
              <Kbd>&lt;script&gt;</Kbd>
              {L(" 태그를 확인합니다.", " tag in the 'Enable giscus' section near the bottom.")}
            </li>
            <li>
              {L("스크립트 안의 ", "Copy ")}
              <Kbd>data-repo-id</Kbd> · <Kbd>data-category-id</Kbd>
              {L(" 값을 복사해 각 칸에 붙여넣습니다.", " from the script into their fields.")}
            </li>
          </ol>
        </section>

        <p className={styles.caution}>
          {L("커스텀 CSS URL 은 배포된 공개 https 주소여야 하며, localhost·미배포 주소면 색이 깨져 안 보일 수 있습니다.", "A custom CSS URL must be a deployed public https address; a localhost or undeployed URL can break colors so text becomes invisible.")}
        </p>
      </div>
    </Popover>
  );
}
