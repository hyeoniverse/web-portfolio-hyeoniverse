"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { formatDwell } from "@/utils/format";
import type { VisitJourneys } from "@/types";
import { List, ListItem } from "../components";
import dashStyles from "../Dashboard.module.css";
import local from "./Traffic.module.css";

const styles = { ...dashStyles, ...local };

/* 방문 경로 목록 — 시작 시각 · 유입(검색어) · 기기, 그리고 본 페이지를 순서대로 머문 시간과 함께.
   방문 흐름의 '최근 방문 경로' 와 IP 별 활동 경로가 같이 쓴다. */
export default function JourneyList({ journeys }: { journeys: VisitJourneys["recent"] }) {
  const { language } = useLanguage();
  return (
    <List>
      {/* 옛 방문 기록에서 옮긴 줄은 시각이 그날 0시라 시각 · 경로가 겹칠 수 있다 — 순서로 열쇠를 만든다 */}
      {journeys.map((j, i) => (
        <ListItem key={`${j.startedAt}-${i}`} layout="column">
          <span className={styles.journeyMeta}>
            {[
              new Date(j.startedAt).toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
                timeZone: "Asia/Seoul",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              j.referrer && j.searchTerm ? `${j.referrer} “${j.searchTerm}”` : j.referrer,
              j.device,
            ].filter(Boolean).join(" · ")}
          </span>
          <span className={styles.journeySteps}>
            {j.steps.map((step, i) => (
              <span key={i}>
                {i > 0 && " → "}
                {step.path}
                {step.ms != null && <span className={styles.journeyDwell}> ({formatDwell(step.ms, language)})</span>}
              </span>
            ))}
          </span>
        </ListItem>
      ))}
    </List>
  );
}
