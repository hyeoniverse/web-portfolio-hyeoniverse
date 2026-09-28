"use client";

import CreditsFooter from "@/components/layout/CreditsFooter/CreditsFooter";
import { useLanguage } from "@/providers/LanguageProvider";
import { ABOUT_CHAPTERS } from "@/data/about/chapters";
import { aboutPanelLabel } from "@/data/about/panels";
import { techStack } from "@/data/about/stack";
import { aboutProcess } from "@/data/generated/aboutContent";
import { useAboutConfig } from "../AboutConfig";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./CreditsPanel.module.css";
const styles = { ...frame, ...shell, ...local };

/* 엔딩 크레딧 — 챕터마다 거쳐 온 장면, 쓴 도구, 개발 기록 수치를 영화 끝 자막처럼 올린다.
   값은 모두 다른 패널과 같은 데이터에서 온다(챕터·패널 이름, Tech Stack, Build Process 기간·커밋·PR).
   화면보다 넓다 — 첫 화면은 크레딧, 오른쪽으로 더 넘기면 서명. 좁은 칸(60vw)이면 장면 전환 대상이 아니라서,
   앞 패널(Security)이 나가는 동안 화면에 붙잡혀 그 위를 덮은 채 끝나 크레딧이 보이지 않았다 */
export default function CreditsPanel() {
  const about = useAboutConfig();
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const hidden = new Set(about.hiddenPanels ?? []);

  const scenes = ABOUT_CHAPTERS.map((c) => ({
    title: c.title,
    panels: c.panels
      .filter((key) => !hidden.has(key))
      .map((key) => aboutPanelLabel(key, about.panelTitles?.[key]?.[language])),
  })).filter((c) => c.panels.length > 0);

  const tools = (about.techStack && about.techStack.length > 0 ? about.techStack : techStack).map((t) => t.name);

  // 개발 기록 — Build Process 단계의 기간·커밋·PR 을 합친다. 기간이 빠진 단계가 있으면 싣지 않는다
  const steps = about.process && about.process.length > 0 ? about.process : aboutProcess;
  const timed = steps.length > 0 && steps.every((s) => s.start && s.end);
  const record = timed
    ? {
        days: Math.round((Date.parse(steps[steps.length - 1].end!) - Date.parse(steps[0].start!)) / 86_400_000) + 1,
        commits: steps.reduce((n, s) => n + (Number(s.commits) || 0), 0),
        prs: steps.reduce((n, s) => n + (Number(s.prs) || 0), 0),
      }
    : null;

  return (
    <div className={`${styles.panel} ${styles.creditsPanel}`}>
      <div className={styles.creditsRoll}>
        <p className={styles.creditsEyebrow}>The Making of</p>
        <h2 className={styles.creditsTitle}>That&apos;s a wrap.</h2>

        <dl className={styles.creditsList}>
          {scenes.map((c) => (
            <div key={c.title}>
              <dt>{c.title}</dt>
              <dd>{c.panels.join(" · ")}</dd>
            </div>
          ))}
          <div>
            <dt>{L("사용한 도구", "Built with")}</dt>
            <dd>{tools.join(" · ")}</dd>
          </div>
          {record && (
            <div>
              <dt>{L("개발 기록", "On record")}</dt>
              <dd>
                {L(
                  `${record.days}일 · 커밋 ${record.commits.toLocaleString()} · PR ${record.prs.toLocaleString()}`,
                  `${record.days} days · ${record.commits.toLocaleString()} commits · ${record.prs.toLocaleString()} PRs`,
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* 서명 — 크레딧을 다 올린 뒤 오른쪽으로 더 넘기면 따로 나온다 */}
      <div className={styles.creditsSignArea}>
        <CreditsFooter variant="panel" className={styles.creditsSign} />
      </div>
    </div>
  );
}
