"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/types";
import type { Report } from "./reports/_types";
import {
  Plus,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Eye,
  Heart,
  LayoutDashboard,
  Flag,
  UserRound,
} from "@/components/icons";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { useLanguage} from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import {
  Section,
  SectionHeader,
  Panel,
  PanelTitle,
  Item,
  List,
  ListItem,
} from "./components";
import MembersList from "@/components/admin/MembersList";
import styles from "./Dashboard.module.css";
import { formatRelativeTime } from "@/utils/relativeTime";
import { useNow } from "@/hooks/useNow";
import { CountUp } from "./_components/CountUp";
import Sparkline from "./_components/Sparkline";
import DashboardSkeleton from "./_components/DashboardSkeleton";
import CategoryDonut from "./_components/CategoryDonut";
import DailyViewsChart from "./_components/DailyViewsChart";
import DevicesBreakdown from "./_components/DevicesBreakdown";
import TrafficChannels from "./_components/TrafficChannels";
import { errorFromResponse, errorText } from "@/lib/apiError";


export default function AdminDashboard() {
  const { t, language } = useLanguage();
  /* 상대시간 기준 시각. 렌더에서 현재 시각을 직접 읽으면 매 렌더 값이 달라진다. */
  const now = useNow();
  const router = useRouter();
  useStaticPageScroll();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 멤버 섹션 표시 여부 — MembersList 가 owner 아님(403)을 확인하면 false 로 섹션째 숨김
  const [membersVisible, setMembersVisible] = useState(true);
  // Devices drill-down 선택 상태 — 부모로 끌어올려서 Traffic Sources 패널을 접고 Devices를 풀폭으로 확장 가능
  const [deviceDrillKind, setDeviceDrillKind] = useState<
    "desktop" | "mobile" | "tablet" | null
  >(null);
  // Devices section 외부에서 클릭/스크롤 등 인터랙션 발생 시 drill-down 자동 닫기 위한 ref
  const devicesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!deviceDrillKind) return;
    const onPointerDown = (e: PointerEvent) => {
      const ref = devicesSectionRef.current;
      if (ref && !ref.contains(e.target as Node)) setDeviceDrillKind(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [deviceDrillKind]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      /* 대시보드는 사이트 전체 통계·중재 데이터라 admin 등급 이상만 볼 수 있다.
         저자 계정이 /admin 으로 들어오면 에러 화면 대신 자기 작업 공간으로 보낸다. */
      if (res.status === 403) {
        router.replace("/admin/posts");
        return;
      }
      if (!res.ok) throw await errorFromResponse(res);
      const json = (await res.json()) as DashboardData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(errorText(e, t, t("admin.dashboard.loadError")));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 댓글 신고 — 대시보드 미리보기 + pending 배지. 기존 /api/admin/reports 재사용(대시보드 API 와 분리).
  const [reports, setReports] = useState<Report[]>([]);
  const [reportPendingCount, setReportPendingCount] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/reports?status=pending")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setReports((j.reports ?? []) as Report[]);
        setReportPendingCount(j.pendingCount ?? 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* Total Views 카드용 WoW (week-over-week) — 최근 7일 vs 이전 7일.
     Rules of Hooks: 반드시 early return 앞에서 호출. (Daily Chart 의 WoW 는 차트 내부에서 따로 계산 — 기간 선택에 따라 달라지므로) */
  const wow = useMemo(() => {
    const dv = data?.stats.dailyViews ?? [];
    if (dv.length < 14) return null;
    const last7 = dv.slice(-7).reduce((s, d) => s + d.views, 0);
    const prev7 = dv.slice(-14, -7).reduce((s, d) => s + d.views, 0);
    if (prev7 === 0 && last7 === 0) return null;
    if (prev7 === 0) return { pct: 100, direction: "up" as const };
    const pct = Math.round(((last7 - prev7) / prev7) * 100);
    return { pct, direction: pct >= 0 ? ("up" as const) : ("down" as const) };
  }, [data]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          <LayoutDashboard size={26} strokeWidth={1.6} aria-hidden className={styles.titleIcon} />
          <T k="admin.dashboard.title" />
        </h1>
        <p className={styles.error}>
          {error ?? t("admin.dashboard.loadError")}
        </p>
      </div>
    );
  }

  const fmtDate = (iso: string) => formatRelativeTime(iso, now, language);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <LayoutDashboard size={26} strokeWidth={1.6} aria-hidden className={styles.titleIcon} />
          <T k="admin.dashboard.title" />
        </h1>
        <Tooltip
          content={
            language === "ko"
              ? "최신 데이터 다시 불러오기"
              : "Reload latest data"
          }
          placement="bottom"
          delay={200}
        >
          <Button
            variant="subtle"
            size="xs"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? (
              <T k="admin.dashboard.loading" />
            ) : (
              <T k="admin.dashboard.refresh" />
            )}
          </Button>
        </Tooltip>
      </header>

      {/* ── Quick Actions — 공통 Button 컴포넌트 사용, .actionBtn 은 표 셀 스타일 override.
           각 버튼은 Tooltip 으로 감싸 hover 영역이 셀 전체로 확장됨 (wrapperStyle block + 100%) ── */}
      <Section>
        <SectionHeader>
          <T k="admin.dashboard.quickActions" />
        </SectionHeader>
        <Panel variant="grid" className={styles.quickActions}>
          <Tooltip
            content={
              language === "ko"
                ? "새 게시물 작성 페이지로 이동"
                : "Open new post editor"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/posts/new"
              variant="ghost"
              size="md"
              fullWidth
              icon={<Plus size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              <T k="admin.dashboard.newPost" />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? "새 프로젝트 작성 페이지로 이동"
                : "Open new project editor"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/works/new"
              variant="ghost"
              size="md"
              fullWidth
              icon={<Plus size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              <T k="admin.dashboard.newWork" />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? "사이트 환경 설정 (브랜드/카테고리/시리즈/계정)"
                : "Site settings (brand, categories, series, account)"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/settings"
              variant="ghost"
              size="md"
              fullWidth
              icon={<Settings size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              <T k="admin.dashboard.openSettings" />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? "계정 편집 (이메일·비밀번호·멤버)"
                : "Edit account (email, password, members)"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/settings?tab=account"
              variant="ghost"
              size="md"
              fullWidth
              icon={<UserRound size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              {language === "ko" ? "계정 편집" : "Edit account"}
            </Button>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? "댓글 신고 관리 페이지로 이동"
                : "Open comment reports"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/reports"
              variant="ghost"
              size="md"
              fullWidth
              icon={<Flag size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              <T k="admin.dashboard.viewReports" />
              {reportPendingCount > 0 && (
                <span
                  className={styles.badgeWrap}
                  aria-label={`${reportPendingCount} pending`}
                >
                  <span className={styles.badgePulse} aria-hidden />
                  <span className={styles.badge}>{reportPendingCount}</span>
                </span>
              )}
            </Button>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? "댓글/시스템 알림 보기"
                : "View comments and system notifications"
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Button
              href="/admin/notifications"
              variant="ghost"
              size="md"
              fullWidth
              icon={<Bell size={18} strokeWidth={1.6} />}
              className={styles.actionBtn}
            >
              <T k="admin.dashboard.viewNotifications" />
              {data.notifications.unreadCount > 0 && (
                <span
                  className={styles.badgeWrap}
                  aria-label={`${data.notifications.unreadCount} unread`}
                >
                  <span className={styles.badgePulse} aria-hidden />
                  <span className={styles.badge}>
                    {data.notifications.unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </Tooltip>
        </Panel>
      </Section>

      {/* ── Stats: heroStat (총 조회수) + 프로젝트/게시물/댓글. 2-col 에선 2×2, 3-col 에선 heroStat full row + statCard 3개 ── */}
      <Section>
        <SectionHeader>
          <T k="admin.dashboard.stats" />
        </SectionHeader>

        <Panel variant="grid" cols="repeat(3, 1fr)" divided>
          {/* 1. 총 조회수 (heroStat) — 3-col: row 1 full span / 2-col: row 1 col 1 / 1-col: full */}
          <Item
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 320px)",
              gridColumn: "1 / -1",
              gap: "var(--spacing-xl)",
              alignItems: "center",
              padding: "var(--spacing-lg) var(--spacing-md)",
              position: "relative",
              overflow: "hidden",
              background: "var(--bg-primary)",
            }}
          >
            <div className={styles.heroLeft}>
              <Tooltip
                content={
                  language === "ko"
                    ? "발행된 모든 게시물의 누적 조회수 합계"
                    : "Cumulative view count across all published posts"
                }
                placement="top"
                delay={300}
              >
                <span className={styles.heroLabel}>
                  <T k="admin.dashboard.totalViews" />
                </span>
              </Tooltip>
              <div className={styles.heroValueRow}>
                <span className={styles.heroValue}>
                  <CountUp value={data.stats.totalPostViews} duration={1400} />
                </span>
                {wow && (
                  <Tooltip
                    content={t("admin.dashboard.wowTooltip")}
                    placement="top"
                    delay={200}
                  >
                    <span
                      className={`${styles.trendBadge} ${styles.trendBadgeLg} ${wow.direction === "up" ? styles.trendUp : styles.trendDown}`}
                    >
                      {wow.direction === "up" ? (
                        <TrendingUp size={13} strokeWidth={2.5} />
                      ) : (
                        <TrendingDown size={13} strokeWidth={2.5} />
                      )}
                      {Math.abs(wow.pct)}%
                    </span>
                  </Tooltip>
                )}
              </div>
              <span className={styles.heroMeta}>
                {(() => {
                  const recent7 = data.stats.dailyViews
                    .slice(-7)
                    .reduce((s, d) => s + d.views, 0);
                  return language === "ko"
                    ? `최근 7일 ${recent7.toLocaleString()}회`
                    : `${recent7.toLocaleString()} last 7d`;
                })()}
              </span>
            </div>
            <Tooltip
              content={
                language === "ko"
                  ? "최근 14일 일별 조회수 추세"
                  : "Daily view trend over the last 14 days"
              }
              placement="left"
              delay={300}
            >
              <div className={styles.heroSparkWrap} aria-hidden>
                <Sparkline
                  values={data.stats.dailyViews.slice(-14).map((d) => d.views)}
                />
              </div>
            </Tooltip>
          </Item>

          {/* 2. 프로젝트 */}
          <Tooltip
            content={
              language === "ko"
                ? `발행 ${data.works.published}개 · 초안 ${data.works.drafts}개 — 총 ${data.works.total}개\n클릭하면 프로젝트 관리로 이동`
                : `${data.works.published} published · ${data.works.drafts} draft — ${data.works.total} total\nClick to manage projects`
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Link href="/admin/works" className={styles.statCard}>
              <span className={styles.statLabel}>
                <T k="admin.dashboard.works" />
              </span>
              <span className={styles.statValue}>
                <CountUp value={data.works.total} />
              </span>
              <span className={styles.statMeta}>
                {data.works.published} <T k="admin.dashboard.published" /> ·{" "}
                {data.works.drafts} <T k="admin.dashboard.drafts" />
              </span>
            </Link>
          </Tooltip>
          <Tooltip
            content={
              language === "ko"
                ? `발행 ${data.posts.published}개 · 초안 ${data.posts.drafts}개 — 총 ${data.posts.total}개\n클릭하면 게시물 관리로 이동`
                : `${data.posts.published} published · ${data.posts.drafts} draft — ${data.posts.total} total\nClick to manage posts`
            }
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Link href="/admin/posts" className={styles.statCard}>
              <span className={styles.statLabel}>
                <T k="admin.dashboard.posts" />
              </span>
              <span className={styles.statValue}>
                <CountUp value={data.posts.total} />
              </span>
              <span className={styles.statMeta}>
                {data.posts.published} <T k="admin.dashboard.published" /> ·{" "}
                {data.posts.drafts} <T k="admin.dashboard.drafts" />
              </span>
            </Link>
          </Tooltip>
          <Tooltip
            content={(() => {
              const avg =
                data.posts.published > 0
                  ? (data.comments.total / data.posts.published).toFixed(1)
                  : "—";
              return language === "ko"
                ? `누적 댓글 ${data.comments.total}개 · 게시물당 평균 ${avg}개\n클릭하면 댓글 관리로 이동`
                : `${data.comments.total} total · ${avg} avg per post\nClick to manage`;
            })()}
            placement="top"
            delay={250}
            wrapperStyle={{ display: "block", width: "100%" }}
          >
            <Link href="/admin/comments" className={styles.statCard}>
              <span className={styles.statLabel}>
                <T k="admin.dashboard.comments" />
              </span>
              <span className={styles.statValue}>
                <CountUp value={data.comments.total} />
              </span>
              <span className={styles.statMeta}>
                {data.posts.published > 0
                  ? `${(data.comments.total / data.posts.published).toFixed(1)} ${language === "ko" ? "/ 게시물" : "/ post"}`
                  : " "}
              </span>
            </Link>
          </Tooltip>
        </Panel>

        {/* 5. 카테고리 분포 — 통계 섹션 안 */}
        {data.stats.categories.length === 0 ? (
          <p className={styles.muted}>
            <T k="admin.dashboard.noCategories" />
          </p>
        ) : (
          <CategoryDonut
            data={data.stats.categories}
            language={language}
            t={t}
          />
        )}

        {/* 6. 일별 조회수 — 통계 섹션 안 */}
        <DailyViewsChart
          data={data.stats.dailyViews}
          language={language}
          t={t}
        />
      </Section>

      {/* ━━━━━━━━━━ 그룹: 최신활동 ━━━━━━━━━━ */}
      {/* ── 최근 게시물 + 최근 프로젝트 — 2-col ── */}
      <Section>
        <SectionHeader>
          <T k="admin.dashboard.groupRecent" />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          <Panel className={styles.panelCell}>
            <PanelTitle href="/admin/posts">
              <T k="admin.dashboard.recentPosts" />
            </PanelTitle>
            {data.posts.recent.length === 0 ? (
              <p className={styles.muted}>
                <T k="admin.dashboard.noPosts" />
              </p>
            ) : (
              <List>
                {data.posts.recent.map((p) => (
                  <ListItem key={p.id}>
                    <Link
                      href={
                        p.published
                          ? `/posts/${p.slug}`
                          : `/admin/posts/${p.id}/edit`
                      }
                      className={styles.listItemLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className={
                          p.published ? styles.statusPub : styles.statusDraft
                        }
                      >
                        {p.published ? (
                          <T k="admin.dashboard.published" />
                        ) : (
                          <T k="admin.dashboard.draft" />
                        )}
                      </span>
                      <span className={styles.itemTitle}>{p.title}</span>
                      <span className={styles.itemDate}>
                        {fmtDate(p.updated_at)}
                      </span>
                    </Link>
                  </ListItem>
                ))}
              </List>
            )}
          </Panel>

          <Panel className={styles.panelCell}>
            <PanelTitle href="/admin/works">
              <T k="admin.dashboard.recentWorks" />
            </PanelTitle>
            {data.works.recent.length === 0 ? (
              <p className={styles.muted}>
                <T k="admin.dashboard.noWorks" />
              </p>
            ) : (
              <List>
                {data.works.recent.map((w) => (
                  <ListItem key={w.id}>
                    <span
                      className={
                        w.published ? styles.statusPub : styles.statusDraft
                      }
                    >
                      {w.published ? (
                        <T k="admin.dashboard.published" />
                      ) : (
                        <T k="admin.dashboard.draft" />
                      )}
                    </span>
                    <Link
                      href={`/admin/works/${w.id}`}
                      className={styles.itemTitle}
                    >
                      {w.title}
                    </Link>
                    <span className={styles.itemDate}>
                      {fmtDate(w.updated_at)}
                    </span>
                  </ListItem>
                ))}
              </List>
            )}
          </Panel>
        </Panel>

        {/* 최근 댓글 — 같은 섹션 (최근 활동) 안 third block */}
        <Panel className={styles.panelCell}>
          <PanelTitle href="/admin/comments">
            <T k="admin.dashboard.recentComments" />
          </PanelTitle>
          {data.comments.recent.length === 0 ? (
            <p className={styles.muted}>
              <T k="admin.dashboard.noComments" />
            </p>
          ) : (
            <List>
              {data.comments.recent.map((c) => (
                <ListItem key={c.id} layout="column">
                  <div className={styles.commentMeta}>
                    <span
                      className={`${styles.commentAuthor} ${c.is_admin ? styles.commentAuthorAdmin : ""}`}
                    >
                      {c.is_admin ? "Admin" : c.nickname}
                    </span>
                    <span className={styles.timeAgo}>
                      {fmtDate(c.created_at)}
                    </span>
                  </div>
                  <p className={styles.commentBody}>{c.content}</p>
                  {c.post_slug ? (
                    <Link
                      href={`/posts/${c.post_slug}`}
                      className={styles.commentSource}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↗ {c.post_title}
                    </Link>
                  ) : (
                    <span className={styles.commentSource}>&nbsp;</span>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 그룹: 신고 ━━━━━━━━━━ */}
      {/* ── 댓글 신고 내역 — pending 미리보기(표시) + 관리 페이지 링크(진입점) ── */}
      <Section>
        <SectionHeader href="/admin/reports">
          <T k="admin.dashboard.reports" />
          {reportPendingCount > 0 && (
            <span className={styles.headerBadge}>{reportPendingCount}</span>
          )}
        </SectionHeader>
        <Panel className={styles.panelCell}>
          {reports.length === 0 ? (
            <p className={styles.muted}>
              <T k="admin.dashboard.noPendingReports" />
            </p>
          ) : (
            <List>
              {reports.slice(0, 5).map((r) => (
                <ListItem key={r.id} layout="column">
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>
                      {r.comment?.nickname ?? "—"}
                    </span>
                    <span className={styles.timeAgo}>{fmtDate(r.created_at)}</span>
                  </div>
                  {r.comment?.content && (
                    <p className={styles.commentBody}>{r.comment.content}</p>
                  )}
                  {r.reason && (
                    <p className={styles.reportReason}>
                      <Flag size={11} strokeWidth={1.8} /> {r.reason}
                    </p>
                  )}
                  {r.comment?.parentSlug ? (
                    <Link
                      href={`/${r.comment_type === "work" ? "works" : "posts"}/${r.comment.parentSlug}`}
                      className={styles.commentSource}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↗ {r.comment.parentTitle}
                    </Link>
                  ) : (
                    <span className={styles.commentSource}>&nbsp;</span>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 그룹: 인기 ━━━━━━━━━━ */}
      {/* ── 인기 게시물 + 인기 태그 — 2-col ── */}
      <Section>
        <SectionHeader>
          <T k="admin.dashboard.groupPopular" />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          <Panel className={styles.panelCell}>
            {/* 목록의 인기 정렬로 딥링크 — 이 패널은 그 목록의 상위 5개 미리보기다 */}
            <PanelTitle href="/admin/posts?sort=popular">
              <T k="admin.dashboard.popularPosts" />
            </PanelTitle>
            {data.stats.popularPosts.length === 0 ? (
              <p className={styles.muted}>
                <T k="admin.dashboard.noPopular" />
              </p>
            ) : (
              <List>
                {data.stats.popularPosts.map((p, i) => (
                  <ListItem key={p.id} layout="column">
                    {/* L1: rank + 메인 stats (commentMeta 와 mirror 구조) */}
                    <div className={styles.popularHeader}>
                      <span className={styles.popularRank}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.popularStats}>
                        <span
                          className={styles.popularStat}
                          title={language === "ko" ? "조회" : "views"}
                        >
                          <Eye size={11} strokeWidth={2} />
                          {p.view_count.toLocaleString()}
                        </span>
                        {(p.like_count ?? 0) > 0 && (
                          <span
                            className={styles.popularStat}
                            title={language === "ko" ? "좋아요" : "likes"}
                          >
                            <Heart size={11} strokeWidth={2} />
                            {p.like_count}
                          </span>
                        )}
                        {(p.comment_count ?? 0) > 0 && (
                          <span
                            className={styles.popularStat}
                            title={language === "ko" ? "댓글" : "comments"}
                          >
                            <MessageSquare size={11} strokeWidth={2} />
                            {p.comment_count}
                          </span>
                        )}
                      </span>
                    </div>
                    {/* L2: 제목 */}
                    <Link
                      href={`/posts/${p.slug}`}
                      className={styles.popularTitle}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {p.title}
                    </Link>
                    {/* L3: 카테고리 + 날짜 — 빈 데이터일 때도 placeholder 로 동일 height 유지 */}
                    <div className={styles.popularMeta}>
                      {p.category && (
                        <span className={styles.popularCat}>{p.category}</span>
                      )}
                      {p.created_at ? (
                        <span className={styles.popularDate}>
                          {fmtDate(p.created_at)}
                        </span>
                      ) : !p.category ? (
                        <span>&nbsp;</span>
                      ) : null}
                    </div>
                  </ListItem>
                ))}
              </List>
            )}
          </Panel>

          <Panel className={styles.panelCell}>
            <PanelTitle href="/posts/tags" external>
              <T k="admin.dashboard.topTags" />
            </PanelTitle>
            {data.stats.tags.length === 0 ? (
              <p className={styles.muted}>
                <T k="admin.dashboard.noTags" />
              </p>
            ) : (
              <Item className={styles.tagsItem}>
                {data.stats.tags.slice(0, 10).map(({ tag, count }) => (
                  <Link
                    key={tag}
                    href={`/posts/tags/${encodeURIComponent(tag)}`}
                    className={styles.tagPill}
                    title={`${count}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tag}
                    <span className={styles.tagPillCount}>{count}</span>
                  </Link>
                ))}
              </Item>
            )}
          </Panel>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 그룹: 트래픽 (간략) — 전체 분석은 /admin/traffic(#1161) ━━━━━━━━━━ */}
      {/* ── 유입경로 + 기기분석 — 2-col, 기기 drill-down 시 유입경로 접히고 기기 풀폭 확장 ── */}
      {(data.stats.channels || data.stats.devices) && (
        <Section
          ref={devicesSectionRef}
          data-expanded={deviceDrillKind ? "devices" : undefined}
        >
          <SectionHeader href="/admin/traffic">
            <T k="admin.dashboard.groupTraffic" />
          </SectionHeader>
          <Panel
            variant="grid"
            className={`${styles.twoCol} ${deviceDrillKind ? styles.twoColExpanded : ""}`}
          >
            {data.stats.channels && (
              <Panel
                className={`${styles.panelCell} ${deviceDrillKind ? styles.panelCollapsed : ""}`}
                aria-hidden={!!deviceDrillKind}
              >
                <PanelTitle>
                  <T k="admin.dashboard.trafficSources" />
                </PanelTitle>
                {!data.stats.channels?.length ? (
                  <p className={styles.muted}>
                    {language === "ko"
                      ? "아직 방문 데이터가 없습니다."
                      : "No visit data yet."}
                  </p>
                ) : (
                  /* 호스트 나열 대신 채널(검색/SNS/커뮤니티/…) 묶음 + 드릴다운(#1161) */
                  <TrafficChannels
                    channels={data.stats.channels}
                    language={language}
                  />
                )}
              </Panel>
            )}
            {data.stats.devices && (
              <Panel className={styles.panelCell}>
                <PanelTitle>
                  <T k="admin.dashboard.devices" />
                </PanelTitle>
                {data.stats.devices.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko"
                      ? "아직 방문 데이터가 없습니다."
                      : "No visit data yet."}
                  </p>
                ) : (
                  <DevicesBreakdown
                    deviceTypes={data.stats.devices}
                    operatingSystems={data.stats.operatingSystems}
                    browsers={data.stats.browsers}
                    deviceModels={data.stats.deviceModels}
                    language={language}
                    drillKind={deviceDrillKind}
                    onDrillChange={setDeviceDrillKind}
                  />
                )}
              </Panel>
            )}
          </Panel>

          {/* ── 방문 요약 — 30일 방문·신규/재방문·방문당 조회 (#1161) ── */}
          {data.stats.visitSummary && data.stats.newVsReturning && (
            <Panel className={styles.panelCell}>
              <div className={styles.trafficSummary}>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.visits30" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.stats.visitSummary.visits30.toLocaleString()}
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.newVisitors" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.stats.newVsReturning.newCount.toLocaleString()}
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.returningVisitors" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.stats.newVsReturning.returningCount.toLocaleString()}
                    <span className={styles.trafficStatSub}>
                      {data.stats.newVsReturning.returningPct}%
                    </span>
                  </span>
                </span>
                <span className={styles.trafficStat}>
                  <span className={styles.trafficStatLabel}>
                    <T k="admin.dashboard.viewsPerVisit" />
                  </span>
                  <span className={styles.trafficStatValue}>
                    {data.stats.visitSummary.viewsPerVisit.toLocaleString()}
                  </span>
                </span>
              </div>
            </Panel>
          )}

        </Section>
      )}

      {/* ━━━━━━━━━━ 그룹: 멤버 ━━━━━━━━━━ */}
      {/* ── 인증된 관리자·작성자 (owner 전용 — 비owner 면 onResolved(false)로 섹션째 숨김) ── */}
      {membersVisible && (
        <Section>
          <SectionHeader href="/admin/settings?tab=account">
            {language === "ko" ? "멤버" : "Members"}
          </SectionHeader>
          <Panel className={styles.panelCell}>
            <MembersList limit={5} hideHeader onResolved={setMembersVisible} />
          </Panel>
        </Section>
      )}

      {/* ━━━━━━━━━━ 그룹: 시스템 ━━━━━━━━━━ */}
      {/* ── 서비스 상태 ── */}
      <Section>
        <SectionHeader>
          <T k="admin.dashboard.serviceStatus" />
        </SectionHeader>
        <Panel variant="grid" cols="repeat(2, 1fr)" insetItems>
          {Object.entries(data.services).map(([key, status]) => (
            <Item key={key} className={styles.serviceItem}>
              <span
                className={`${styles.statusDot} ${status === "configured" ? styles.dotOk : styles.dotMissing}`}
                aria-hidden
              />
              <span className={styles.serviceName}>{key}</span>
              <span className={styles.serviceStatus}>
                {status === "configured" ? (
                  <T k="admin.dashboard.configured" />
                ) : (
                  <T k="admin.dashboard.missing" />
                )}
              </span>
            </Item>
          ))}
        </Panel>
        <Item
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontSize: "var(--font-size-hint)",
            color: "var(--text-tertiary)",
          }}
        >
          <T k="admin.dashboard.dbConnected" />
        </Item>
      </Section>
    </div>
  );
}
