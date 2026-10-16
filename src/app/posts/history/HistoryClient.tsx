"use client";

import { useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Pressable from "@/components/ui/Pressable";
import { History as HistoryIcon } from "@/components/icons";
import type { HistoryEntry } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import PostsSubnav from "../_components/PostsSubnav";
import MongSticker from "../_components/MongSticker";
import index from "../_components/IndexPage.module.css";
import HistoryTrail from "./HistoryTrail";
import HistoryRiver from "./HistoryRiver";
import styles from "./History.module.css";

/* /posts/history — 모든 글을 시간순으로 훑는 아카이브. 보기 둘을 견줘 고르는 중:
   - 길(trail): 세로 한 줄 길을 몽이가 걸어 내려가며 지금 연 · 월을 알려 준다
   - 강(river): 세로 스크롤을 가로로 바꿔 과거 → 지금으로 흐르는 강 위에 글이 떠 있다
   TIL 글은 두 보기 모두 ✦ TIL 꼬리표를 달고 한 단계 옅게 보인다 */
export default function HistoryClient({ posts, tilTag }: { posts: HistoryEntry[]; tilTag: string }) {
  const { t, language, dateLocale } = useLanguage();
  const lang = language === "en" ? "en" : "ko";
  const [view, setView] = useState<"trail" | "river">("trail");
  const titleOf = (p: HistoryEntry) => (lang === "en" && p.title_en) || p.title;
  const monthLabel = (y: number, m: number) =>
    new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString(dateLocale, { year: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className={index.container}>
      <PostsSubnav />
      <header className={index.header}>
        <div className={index.headerTitleRow}>
          <PageTitle icon={<HistoryIcon size={40} strokeWidth={1.6} aria-hidden />}>History.</PageTitle>
          <MongSticker pose="sleep-front" float flat className={index.headerMong} />
        </div>
        <p className={styles.subtitle}>{t("postsPage.historySubtitle")}</p>
        <div className={styles.toolbar}>
          <div className={styles.viewSwitch} role="tablist" aria-label={t("historyPage.viewLabel")}>
            {(["trail", "river"] as const).map((v) => (
              <Pressable
                key={v}
                noTapScale
                role="tab"
                aria-selected={view === v}
                className={`${styles.viewTab} ${view === v ? styles.viewTabOn : ""}`}
                onClick={() => setView(v)}
              >
                {v === "trail" ? t("historyPage.viewTrail") : t("historyPage.viewRiver")}
              </Pressable>
            ))}
          </div>
          <p className={styles.legend}>
            <span className={styles.tilTag}>✦ TIL</span> {t("historyPage.tilLegend")}
          </p>
        </div>
      </header>
      {view === "trail" ? (
        <HistoryTrail
          posts={posts}
          tilTag={tilTag}
          titleOf={titleOf}
          monthLabel={monthLabel}
          countLabel={(n) => fillTemplate(t("historyPage.count"), { n })}
        />
      ) : (
        <HistoryRiver posts={posts} tilTag={tilTag} titleOf={titleOf} monthLabel={monthLabel} hint={t("historyPage.riverHint")} />
      )}
    </div>
  );
}
