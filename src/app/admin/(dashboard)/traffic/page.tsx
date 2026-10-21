"use client";

import { blogHref } from "@/lib/siteHosts";
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
import UtmBuilder, { UtmHelpButton } from "./UtmBuilder";
import IpVisitors from "./IpVisitors";
import JourneyList from "./JourneyList";
import { errorFromResponse, errorText } from "@/lib/apiError";
import Link from "next/link";
import { formatDwell } from "@/utils/format";
import Badge from "@/components/ui/Badge";

const styles = { ...dashStyles, ...local };

type Days = "7" | "14" | "30" | "90";

/* 직전 동기간 대비 증감 배지 — 이전 값이 0(null)이면 비교가 성립 안 해 아무것도 안 그린다 */
function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  const up = pct > 0;
  return (
    <Badge tone={up ? "success" : "accent"} className={styles.trendBadge}>
      {up ? (
        <TrendingUp size={11} strokeWidth={2.5} />
      ) : (
        <TrendingDown size={11} strokeWidth={2.5} />
      )}
      {Math.abs(pct)}%
    </Badge>
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
  // '내 IP' 지정·해제 뒤 다시 불러오기 — 제외 IP 가 모든 집계에 반영된다
  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    let alive = true;
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
              t("admin.inline.trafficPage.failedToLoadTraffic"),
            ),
          );
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [language, t, days, reloadKey]);

  return (
    <div className={styles.trafficContainer}>
      <header className={styles.trafficHeader}>
        <h1 className={styles.trafficTitle}>
          <TrendingUp size={26} strokeWidth={1.6} aria-hidden className={styles.trafficTitleIcon} />
          <T k="admin.dashboard.groupTraffic" />
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

            {/* ── 페이지별 조회 · 머문 시간(#1399) — 마이그레이션 전엔 안내만 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.pageViewsTitle" />
              </PanelTitle>
              {!data.pageStats ? (
                <p className={styles.muted}>
                  <T k="admin.dashboard.pageViewsPending" />
                </p>
              ) : data.pageStats.total === 0 ? (
                <p className={styles.muted}>
                  <T k="admin.dashboard.noPageViews" />
                </p>
              ) : (
                <>
                  <div className={styles.trafficSummary}>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.pageViews" />
                      </span>
                      <span className={styles.trafficStatValue}>
                        {data.pageStats.total.toLocaleString()}
                      </span>
                    </span>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.avgDwell" />
                      </span>
                      <span className={styles.trafficStatValue}>
                        {data.pageStats.avgDurationMs != null ? formatDwell(data.pageStats.avgDurationMs, language) : "-"}
                      </span>
                    </span>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.pagesPerSession" />
                      </span>
                      <span className={styles.trafficStatValue}>
                        {data.pageStats.pagesPerSession != null ? data.pageStats.pagesPerSession.toLocaleString() : "-"}
                      </span>
                    </span>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.sessionDwell" />
                      </span>
                      <span className={styles.trafficStatValue}>
                        {data.pageStats.avgSessionMs != null ? formatDwell(data.pageStats.avgSessionMs, language) : "-"}
                      </span>
                    </span>
                  </div>
                  <List>
                    {data.pageStats.topPaths.map((p) => (
                      <ListItem key={p.path} layout="grid" className={styles.referrerRow}>
                        <span className={`${styles.referrerSource} ${styles.landingPath}`} title={p.path}>
                          {p.path}
                        </span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${Math.round((p.views / data.pageStats!.topPaths[0].views) * 100)}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          {/* 평균 머문 시간 — 못 잰 조회만 있으면 비운다 */}
                          <span className={styles.referrerPct}>
                            {p.avgMs != null ? formatDwell(p.avgMs, language) : "-"}
                          </span>
                          <span className={styles.referrerCount}>{p.views.toLocaleString()}</span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Panel>

            {/* ── 방문 흐름(#1399) — 들어와서 무엇을 봤는지: 다음 페이지 · 나간 페이지 · 최근 방문 경로 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.journeysTitle" />
              </PanelTitle>
              {data.journeys.sessions === 0 ? (
                <p className={styles.muted}>
                  <T k="admin.dashboard.noJourneys" />
                </p>
              ) : (
                <>
                  <div className={styles.trafficSummary}>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.visits" />
                      </span>
                      <span className={styles.trafficStatValue}>{data.journeys.sessions.toLocaleString()}</span>
                    </span>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.bounceRate" />
                      </span>
                      <span className={styles.trafficStatValue}>{data.journeys.bounceRate}%</span>
                    </span>
                  </div>
                  <Panel variant="grid" className={styles.twoCol}>
                    <Panel className={styles.panelCell}>
                      <PanelTitle>
                        <T k="admin.dashboard.nextPages" />
                      </PanelTitle>
                      {data.journeys.nextPages.length === 0 ? (
                        <p className={styles.muted}>
                          <T k="admin.dashboard.noNextPages" />
                        </p>
                      ) : (
                        <List>
                          {data.journeys.nextPages.map((n) => (
                            <ListItem key={`${n.from}>${n.to}`} layout="grid" className={styles.referrerRow}>
                              <span className={`${styles.referrerSource} ${styles.landingPath}`} title={`${n.from} → ${n.to}`}>
                                {n.from} → {n.to}
                              </span>
                              <div className={styles.bar} aria-hidden>
                                <div
                                  className={`${styles.barFill} ${styles.barFillSoft}`}
                                  style={{ width: `${Math.round((n.count / data.journeys.nextPages[0].count) * 100)}%` }}
                                />
                              </div>
                              <span className={styles.referrerMeta}>
                                <span className={styles.referrerCount}>{n.count.toLocaleString()}</span>
                              </span>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Panel>
                    <Panel className={styles.panelCell}>
                      <PanelTitle>
                        <T k="admin.dashboard.exitPages" />
                      </PanelTitle>
                      <List>
                        {data.journeys.exitPages.map((p) => (
                          <ListItem key={p.path} layout="grid" className={styles.referrerRow}>
                            <span className={`${styles.referrerSource} ${styles.landingPath}`} title={p.path}>
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
                              <span className={styles.referrerCount}>{p.count.toLocaleString()}</span>
                            </span>
                          </ListItem>
                        ))}
                      </List>
                    </Panel>
                  </Panel>
                  <PanelTitle>
                    <T k="admin.dashboard.recentJourneys" />
                  </PanelTitle>
                  <JourneyList journeys={data.journeys.recent} />
                </>
              )}
            </Panel>

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
                    {t("admin.inline.trafficPage.noVisitDataYet")}
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
                    {t("admin.inline.trafficPage.noVisitDataYet")}
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

            {/* ── 유입 검색어 — 검색 엔진이 referrer 에 검색어를 실어 준 방문만 셀 수 있다 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.searchTermsTitle" />
              </PanelTitle>
              {data.searchTerms.searchVisits === 0 ? (
                <p className={styles.muted}>
                  <T k="admin.dashboard.noSearchVisits" />
                </p>
              ) : (
                <>
                  <div className={styles.trafficSummary}>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.searchVisits" />
                      </span>
                      <span className={styles.trafficStatValue}>{data.searchTerms.searchVisits.toLocaleString()}</span>
                    </span>
                    <span className={styles.trafficStat}>
                      <span className={styles.trafficStatLabel}>
                        <T k="admin.dashboard.searchWithTerm" />
                      </span>
                      <span className={styles.trafficStatValue}>{data.searchTerms.withTerm.toLocaleString()}</span>
                    </span>
                  </div>
                  {data.searchTerms.top.length === 0 ? (
                    <p className={styles.muted}>
                      <T k="admin.dashboard.noSearchTerms" />
                    </p>
                  ) : (
                    <List>
                      {data.searchTerms.top.map((s) => (
                        <ListItem key={s.term} layout="grid" className={styles.referrerRow}>
                          <span className={styles.referrerSource} title={s.engines.join(", ")}>
                            {s.term}
                          </span>
                          <div className={styles.bar} aria-hidden>
                            <div
                              className={`${styles.barFill} ${styles.barFillSoft}`}
                              style={{ width: `${Math.round((s.count / data.searchTerms.top[0].count) * 100)}%` }}
                            />
                          </div>
                          <span className={styles.referrerMeta}>
                            <span className={styles.referrerPct}>{s.pct}%</span>
                            <span className={styles.referrerCount}>{s.count.toLocaleString()}</span>
                          </span>
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <p className={styles.muted}>
                    <T k="admin.dashboard.searchTermsNote" />
                  </p>
                </>
              )}
            </Panel>

            {/* ── IP 분석 — 마스킹된 IP 별 재방문 + 내 IP 제외 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.ipAnalysis" />
              </PanelTitle>
              <IpVisitors
                ipVisitors={data.ipVisitors}
                currentIp={data.currentIp}
                excludedIps={data.excludedIps}
                onChanged={() => setReloadKey((k) => k + 1)}
              />
            </Panel>

            {/* ── 기간 내 인기 콘텐츠 ── */}
            <Panel className={styles.panelCell}>
              <PanelTitle>
                <T k="admin.dashboard.topContent" />
              </PanelTitle>
                {data.topContent.length === 0 ? (
                  <p className={styles.muted}>
                    {t("admin.inline.trafficPage.noViewsInPeriod")}
                  </p>
                ) : (
                  <List>
                    {data.topContent.map((p, i) => (
                      <ListItem key={p.id} layout="grid" className={styles.referrerRow}>
                        <span className={`${styles.referrerSource} ${styles.topContentTitle}`}>
                          <span className={styles.topContentRank}>{i + 1}</span>
                          <Link
                            href={blogHref(`/posts/${p.slug}`)}
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
                    {t("admin.inline.trafficPage.noVisitsFromUtm")}
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
