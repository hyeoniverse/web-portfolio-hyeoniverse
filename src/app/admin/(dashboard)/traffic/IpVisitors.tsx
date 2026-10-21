"use client";

import { Fragment, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { sendAction } from "@/lib/sendAction";
import type { TrafficData } from "@/types";
import { List, ListItem } from "../components";
import JourneyList from "./JourneyList";
import { countryName, flagEmoji } from "../_components/countryDisplay";
import dashStyles from "../Dashboard.module.css";
import local from "./Traffic.module.css";

const styles = { ...dashStyles, ...local };

type Props = Pick<TrafficData, "ipVisitors" | "currentIp" | "excludedIps"> & {
  /** '내 IP' 지정·해제 뒤 — 집계가 바뀌므로 페이지가 다시 불러온다 */
  onChanged: () => void;
};

/* IP 분석(#1169) — 마스킹된 IP 별 방문 일수·첫/최근 방문·국가·기기.
   '내 IP' 로 지정하면 그 IP 의 방문은 기록되지 않고 이미 쌓인 방문도 집계에서 빠진다. */
export default function IpVisitors({ ipVisitors, currentIp, excludedIps, onChanged }: Props) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState<string | null>(null);
  // 활동 경로를 펼친 IP 의 키
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = async (target: { key: string } | { current: true }, exclude: boolean, pendingId: string) => {
    setPending(pendingId);
    const res = await sendAction(
      "/api/admin/traffic/excluded-ips",
      {
        method: exclude ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      },
      t,
      t("admin.inline.ipVisitors.updateFailed"),
    );
    setPending(null);
    if (res) onChanged();
  };

  const maxDays = Math.max(1, ...ipVisitors.map((v) => v.days));
  const shortDate = (d: string) => d.slice(5).replace("-", ".");

  return (
    <div className={styles.ipAnalysis}>
      {currentIp && (
        <div className={styles.ipCurrent}>
          <span className={styles.ipCurrentLabel}>{t("admin.inline.ipVisitors.currentIp")}</span>
          <span className={styles.ipMasked}>{currentIp.masked}</span>
          {currentIp.excluded ? (
            <>
              <span className={styles.ipCurrentState}>{t("admin.inline.ipVisitors.excludedState")}</span>
              <Button
                variant="outline"
                loading={pending === "current"}
                onClick={() => toggle({ current: true }, false, "current")}
              >
                {t("admin.inline.ipVisitors.unmark")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              loading={pending === "current"}
              onClick={() => toggle({ current: true }, true, "current")}
            >
              {t("admin.inline.ipVisitors.markMine")}
            </Button>
          )}
        </div>
      )}

      {ipVisitors.length === 0 ? (
        <p className={styles.muted}>
          {t("admin.inline.ipVisitors.empty")}
        </p>
      ) : (
        <List>
          {ipVisitors.map((v) => (
            <Fragment key={v.key}>
            <ListItem layout="grid" className={styles.ipRow}>
              <span className={styles.ipIdentity}>
                <span className={styles.ipMasked}>{v.masked}</span>
                <span className={styles.utmDetail}>
                  {[
                    v.country ? `${flagEmoji(v.country)} ${countryName(v.country, language)}` : null,
                    v.browser,
                    v.os,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <div className={styles.bar} aria-hidden>
                <div
                  className={`${styles.barFill} ${styles.barFillSoft}`}
                  style={{ width: `${(v.days / maxDays) * 100}%` }}
                />
              </div>
              <span className={styles.referrerMeta}>
                <span className={styles.referrerPct}>{fillTemplate(t("admin.inline.ipVisitors.days"), { n: v.days })}</span>
                <span className={styles.ipDates}>
                  {v.firstDate === v.lastDate
                    ? shortDate(v.lastDate)
                    : `${shortDate(v.firstDate)}–${shortDate(v.lastDate)}`}
                </span>
              </span>
              <Button
                variant="ghost"
                loading={pending === v.key}
                onClick={() => toggle({ key: v.key }, true, v.key)}
              >
                {t("admin.inline.ipVisitors.mine")}
              </Button>
              <Button
                variant="ghost"
                disabled={v.journeys.length === 0}
                aria-expanded={openKey === v.key}
                onClick={() => setOpenKey((k) => (k === v.key ? null : v.key))}
              >
                {fillTemplate(t(openKey === v.key ? "admin.inline.ipVisitors.hidePaths" : "admin.inline.ipVisitors.showPaths"), {
                  n: v.journeys.length,
                })}
              </Button>
            </ListItem>
            {openKey === v.key && (
              <div className={styles.ipJourneys}>
                <JourneyList journeys={v.journeys} />
              </div>
            )}
            </Fragment>
          ))}
        </List>
      )}

      {excludedIps.length > 0 && (
        <div className={styles.ipExcluded}>
          <span className={styles.ipCurrentLabel}>{t("admin.inline.ipVisitors.excludedIps")}</span>
          {excludedIps.map((e) => (
            <Chip key={e.key} onRemove={() => toggle({ key: e.key }, false, e.key)}>
              <span className={styles.ipMasked}>{e.masked}</span>
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
