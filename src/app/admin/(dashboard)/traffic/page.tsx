"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import { SkeletonLine } from "@/components/ui/Skeleton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { TrafficData } from "@/types";
import type { DeviceKind } from "@/lib/api/dashboardAggregates";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { Section, Panel, PanelTitle, List, ListItem } from "../components";
import dashStyles from "../Dashboard.module.css";
import local from "./Traffic.module.css";
import TrafficChannels from "../_components/TrafficChannels";
import DevicesBreakdown from "../_components/DevicesBreakdown";
import VisitHeatmap from "../_components/VisitHeatmap";
import VisitsTrend from "../_components/VisitsTrend";
import { countryName, flagEmoji } from "../_components/countryDisplay";
import { makeDemoTrafficData } from "./demoData";
import UtmBuilder, { UtmHelpButton } from "./UtmBuilder";
import { errorFromResponse, errorText } from "@/lib/apiError";
import Link from "next/link";

const styles = { ...dashStyles, ...local };

type Days = "7" | "14" | "30" | "90";

/* 직전 동기간 대비 증감 배지 — 이전 값이 0(null)이면 비교가 성립 안 해 아무것도 안 그린다 */
function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  const up = pct > 0;
  return (
    <span
      className={`${styles.trendBadge} ${up ? styles.trendUp : styles.trendDown}`}
      title={undefined}
    >
      {up ? (
        <TrendingUp size={11} strokeWidth={2.5} />
      ) : (
        <TrendingDown size={11} strokeWidth={2.5} />
      )}
      {Math.abs(pct)}%
    </span>
  );
}

/* ── 트래픽 전용 페이지(#1161) — 대시보드의 간략 세트(요약·채널·기기)에 더해
   국가·랜딩·방문 시간대·UTM 까지 전체 분석을 가진다 ── */

export default function AdminTrafficPage() {
  const { language, t } = useLanguage();
  useStaticPageScroll();

  const [data, setData] = useState<TrafficData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceDrillKind, setDeviceDrillKind] = useState<DeviceKind | null>(null);
  const [days, setDays] = useState<Days>("30");

  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let alive = true;
    /* ?demo=1 — 실데이터가 쌓이기 전 UI 전체 확인용. DB·API 안 거치고 생성 더미를 쓴다.
       searchParams 훅 대신 effect 에서 읽는다 — 값이 effect 전용이면 그걸로 충분하다 */
    if (new URLSearchParams(window.location.search).has("demo")) {
      // 데모도 fetch 응답처럼 다음 틱에 심는다 — effect 안 동기 setState 는 연쇄 렌더를 만든다
      const id = setTimeout(() => {
        if (!alive) return;
        setIsDemo(true);
        setData(makeDemoTrafficData(Number(days)));
      }, 0);
      return () => {
        alive = false;
        clearTimeout(id);
      };
    }
    (async () => {
      try {
        const res = await fetch(`/api/admin/traffic?days=${days}`);
        if (!res.ok) throw await errorFromResponse(res);
        const body = (await res.json()) as TrafficData;
        if (alive) setData(body);
      } catch (e) {
        if (alive) {
          setError(
            errorText(
              e,
              t,
              language === "ko"
                ? "트래픽 데이터를 불러오지 못했습니다."
                : "Failed to load traffic data.",
            ),
          );
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [language, t, days]);

  return (
    <div className={styles.trafficContainer}>
      <header className={styles.trafficHeader}>
        <h1 className={styles.trafficTitle}>
          <TrendingUp size={26} strokeWidth={1.6} aria-hidden className={styles.trafficTitleIcon} />
          <T k="admin.dashboard.groupTraffic" />
          {isDemo && (
            /* 실데이터와 헷갈리지 않게 — ?demo=1 일 때만 */
            <span className={styles.trafficDemoBadge}>DEMO</span>
          )}
        </h1>
        {/* 기간 선택 — 페이지 전체(요약·추이·채널·기기·국가·랜딩·시간대)가 같이 바뀐다 */}
        <SegmentedControl<Days>
          items={[
            { value: "7", label: "7d" },
            { value: "14", label: "14d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
          value={days}
          onChange={setDays}
        />
      </header>

      {error ? (
        <p className={styles.muted}>{error}</p>
      ) : !data ? (
        <div className={styles.trafficSkeleton} aria-hidden>
          <SkeletonLine width="40%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="70%" />
        </div>
      ) : (
        <>
          {/* ── 방문 요약 ── */}
          <Section>
            <Panel className={styles.panelCell}>
              <div className={styles.trafficSummary}>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.visits" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.visitSummary.visits30.toLocaleString()}
                    <ChangeBadge pct={data.changes.visits} />
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.newVisitors" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.newVsReturning.newCount.toLocaleString()}
                    <ChangeBadge pct={data.changes.newVisitors} />
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.returningVisitors" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.newVsReturning.returningCount.toLocaleString()}
                    <span className={styles.trafficStatSub}>
                      {data.newVsReturning.returningPct}%
                    </span>
                    <ChangeBadge pct={data.changes.returning} />
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.viewsPerVisit" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.visitSummary.viewsPerVisit.toLocaleString()}
                  </span>
                </span>
                {data.botVisits > 0 && (
                  <span className={styles.trafficStat}>
                    <span className={styles.trafficStatLabel}>
                      <T k="admin.dashboard.botsExcluded" />
                    </span>
                    <span className={styles.trafficStatValue}>
                      {data.botVisits.toLocaleString()}
                    </span>
                  </span>
                )}
              </div>
            </Panel>

            {/* ── 일별 방문 추이 ── */}
            {data.dailyVisits.length > 1 && (
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.visitsTrend" />
                </PanelTitle>
                <VisitsTrend data={data.dailyVisits} language={language} />
              </Panel>
            )}

            {/* ── 유입 채널 + 기기 분석 ── */}
            <Panel
              variant="grid"
              className={`${styles.twoCol} ${deviceDrillKind ? styles.twoColExpanded : ""}`}
            >
              <Panel
                className={`${styles.panelCell} ${deviceDrillKind ? styles.panelCollapsed : ""}`}
                aria-hidden={!!deviceDrillKind}
              >
                <PanelTitle>
                  <T k="admin.dashboard.trafficSources" />
                </PanelTitle>
                {data.channels.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko" ? "아직 방문 데이터가 없습니다." : "No visit data yet."}
                  </p>
                ) : (
                  <TrafficChannels channels={data.channels} language={language} />
                )}
              </Panel>
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.devices" />
                </PanelTitle>
                {data.devices.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko" ? "아직 방문 데이터가 없습니다." : "No visit data yet."}
                  </p>
                ) : (
                  <DevicesBreakdown
                    deviceTypes={data.devices}
                    operatingSystems={data.operatingSystems}
                    browsers={data.browsers}
                    deviceModels={data.deviceModels}
                    language={language}
                    drillKind={deviceDrillKind}
                    onDrillChange={setDeviceDrillKind}
                  />
                )}
              </Panel>
            </Panel>

            {/* ── 국가별 방문 + 랜딩 페이지 — 마이그레이션 전엔 수집 안내만 ── */}
            <Panel variant="grid" className={styles.twoCol}>
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.countries" />
                </PanelTitle>
                {data.countries.length === 0 ? (
                  <p className={styles.muted}>
                    <T k="admin.dashboard.analyticsPending" />
                  </p>
                ) : (
                  <List>
                    {data.countries.map((c) => (
                      <ListItem key={c.code} layout="grid" className={styles.referrerRow}>
                        <span className={styles.referrerSource}>
                          <span aria-hidden>{flagEmoji(c.code)}</span>
                          {countryName(c.code, language)}
                        </span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerPct}>{c.pct}%</span>
                          <span className={styles.referrerCount}>
                            {c.count.toLocaleString()}
                          </span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Panel>
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.landingPages" />
                </PanelTitle>
                {data.landingPages.length === 0 ? (
                  <p className={styles.muted}>
                    <T k="admin.dashboard.analyticsPending" />
                  </p>
                ) : (
                  <List>
                    {data.landingPages.map((p) => (
                      <ListItem key={p.path} layout="grid" className={styles.referrerRow}>
                        {/* 고정 폭 라벨 칸에서 긴 경로는 말줄임 — 전체는 title 로 */}
                        <span
                          className={`${styles.referrerSource} ${styles.landingPath}`}
                          title={p.path}
                        >
                          {p.path}
                        </span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerPct}>{p.pct}%</span>
                          <span className={styles.referrerCount}>
                            {p.count.toLocaleString()}
                          </span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Panel>
            </Panel>

            {/* ── 기간 내 인기 콘텐츠 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.topContent" />
              </PanelTitle>
                {data.topContent.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko"
                      ? "기간 내 조회 기록이 없습니다."
                      : "No views in this period."}
                  </p>
                ) : (
                  <List>
                    {data.topContent.map((p, i) => (
                      <ListItem key={p.id} layout="grid" className={styles.referrerRow}>
                        <span className={`${styles.referrerSource} ${styles.topContentTitle}`}>
                          <span className={styles.topContentRank}>{i + 1}</span>
                          <Link
                            href={`/posts/${p.slug}`}
                            className={styles.topContentLink}
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                        </span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerPct}>{p.pct}%</span>
                          <span className={styles.referrerCount}>
                            {p.count.toLocaleString()}
                          </span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
                )}
            </Panel>

            {/* ── 방문 시간대 히트맵 ── */}
            {data.visitHeatmap.max > 0 && (
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.visitHeatmap" />
                </PanelTitle>
                <VisitHeatmap
                  matrix={data.visitHeatmap.matrix}
                  max={data.visitHeatmap.max}
                  language={language}
                />
              </Panel>
            )}

            {/* ── UTM 캠페인 — 성과 목록 + 링크 생성기가 한 섹션. 만든 링크의 결과가
               바로 옆에 쌓이는 구조라 생성기는 여기 산다 ── */}
            <Panel variant="grid" className={styles.twoCol}>
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.utmCampaigns" />
                </PanelTitle>
                {data.utmCampaigns.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko"
                      ? "아직 UTM 링크로 들어온 방문이 없습니다."
                      : "No visits from UTM links yet."}
                  </p>
                ) : (
                  <List>
                    {data.utmCampaigns.map((u) => (
                      <ListItem
                        key={`${u.source}-${u.medium}-${u.campaign}`}
                        layout="grid"
                        className={styles.referrerRow}
                      >
                        <span className={styles.referrerSource}>
                          {u.source}
                          {(u.medium || u.campaign) && (
                            <span className={styles.utmDetail}>
                              {[u.medium, u.campaign].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                        <span aria-hidden />
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerCount}>
                            {u.count.toLocaleString()}
                          </span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Panel>
              <Panel className={styles.panelCell}>
                <PanelTitle className={styles.utmPanelTitle}>
                  <T k="admin.dashboard.utmBuilder" />
                  <UtmHelpButton language={language} />
                </PanelTitle>
                <UtmBuilder language={language} siteUrl={data.siteUrl} />
              </Panel>
            </Panel>
          </Section>
        </>
      )}
    </div>
  );
}
