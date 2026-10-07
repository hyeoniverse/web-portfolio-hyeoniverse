"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { sendAction } from "@/lib/sendAction";
import type { TrafficData } from "@/types";
import { List, ListItem } from "../components";
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
  const ko = language === "ko";
  const [pending, setPending] = useState<string | null>(null);

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
      ko ? "내 IP 설정을 바꾸지 못했습니다." : "Could not update your IP setting.",
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
          <span className={styles.ipCurrentLabel}>{ko ? "지금 접속한 IP" : "Your current IP"}</span>
          <span className={styles.ipMasked}>{currentIp.masked}</span>
          {currentIp.excluded ? (
            <>
              <span className={styles.ipCurrentState}>{ko ? "내 IP · 집계 제외 중" : "Marked as yours · excluded"}</span>
              <Button
                variant="outline"
                loading={pending === "current"}
                onClick={() => toggle({ current: true }, false, "current")}
              >
                {ko ? "해제" : "Unmark"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              loading={pending === "current"}
              onClick={() => toggle({ current: true }, true, "current")}
            >
              {ko ? "내 IP 로 등록" : "Mark as mine"}
            </Button>
          )}
        </div>
      )}

      {ipVisitors.length === 0 ? (
        <p className={styles.muted}>
          {ko ? "기간 내 IP 방문 기록이 없습니다." : "No IP visits in this period."}
        </p>
      ) : (
        <List>
          {ipVisitors.map((v) => (
            <ListItem key={v.key} layout="grid" className={styles.ipRow}>
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
                <span className={styles.referrerPct}>{ko ? `${v.days}일` : `${v.days}d`}</span>
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
                {ko ? "내 IP" : "Mine"}
              </Button>
            </ListItem>
          ))}
        </List>
      )}

      {excludedIps.length > 0 && (
        <div className={styles.ipExcluded}>
          <span className={styles.ipCurrentLabel}>{ko ? "집계에서 제외된 IP" : "Excluded IPs"}</span>
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
