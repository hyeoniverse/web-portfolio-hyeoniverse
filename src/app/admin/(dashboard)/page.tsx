"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type CSSProperties,
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
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ChevronLeft,
  ChevronRight,
  LineChart,
  CalendarDays,
  LayoutDashboard,
  Flag,
  UserRound,
} from "@/components/icons";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tooltip from "@/components/ui/Tooltip";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import { ModalAlert } from "@/components/ui/ModalTemplates";
import {
  SkeletonLine,
  SkeletonCircle,
  SkeletonPill,
  SkeletonBlock,
} from "@/components/ui/Skeleton";
import { useModalStore } from "@/stores/modalStore";
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
import Pressable from "@/components/ui/Pressable";
import { formatRelativeTime } from "@/utils/relativeTime";
import { useNow } from "@/hooks/useNow";


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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as DashboardData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

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
                    content={
                      language === "ko"
                        ? "최근 7일 vs 직전 7일 변화율"
                        : "Last 7 days vs previous 7 days"
                    }
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
            <PanelTitle>
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
            <PanelTitle>
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
          <PanelTitle>
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
            <PanelTitle href="/admin/posts">
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

      {/* ━━━━━━━━━━ 그룹: 트래픽 ━━━━━━━━━━ */}
      {/* ── 유입경로 + 기기분석 — 2-col, 기기 drill-down 시 유입경로 접히고 기기 풀폭 확장 ── */}
      {(data.stats.referrers || data.stats.devices) && (
        <Section
          ref={devicesSectionRef}
          data-expanded={deviceDrillKind ? "devices" : undefined}
        >
          <SectionHeader>
            <T k="admin.dashboard.groupTraffic" />
          </SectionHeader>
          <Panel
            variant="grid"
            className={`${styles.twoCol} ${deviceDrillKind ? styles.twoColExpanded : ""}`}
          >
            {data.stats.referrers && (
              <Panel
                className={`${styles.panelCell} ${deviceDrillKind ? styles.panelCollapsed : ""}`}
                aria-hidden={!!deviceDrillKind}
              >
                <PanelTitle>
                  <T k="admin.dashboard.trafficSources" />
                </PanelTitle>
                {data.stats.referrers.length === 0 ? (
                  <p className={styles.muted}>
                    {language === "ko"
                      ? "아직 방문 데이터가 없습니다."
                      : "No visit data yet."}
                  </p>
                ) : (
                  <List>
                    {data.stats.referrers.map((r) => (
                      <ListItem
                        key={r.source}
                        layout="grid"
                        className={styles.referrerRow}
                      >
                        <span className={styles.referrerSource}>
                          <Globe size={11} strokeWidth={2} />
                          {r.source}
                        </span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerPct}>{r.pct}%</span>
                          <span className={styles.referrerCount}>
                            {r.count.toLocaleString()}
                          </span>
                        </span>
                      </ListItem>
                    ))}
                  </List>
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

/* ── Animated count-up — RAF 로 0 에서 target 까지 easeOutCubic 트윈 (1.2s) ── */
function CountUp({
  value,
  duration = 1200,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(
        Math.round(fromRef.current + (value - fromRef.current) * eased),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ── Devices Breakdown — Type / OS / Browser 탭, 각 탭마다 도넛 + 범례 ── */
type DeviceTab = "type" | "os" | "browser";

type DeviceKind = "desktop" | "mobile" | "tablet";

function DevicesBreakdown({
  deviceTypes,
  operatingSystems,
  browsers,
  deviceModels,
  language,
  drillKind,
  onDrillChange,
}: {
  deviceTypes: { kind: DeviceKind; count: number; pct: number }[];
  operatingSystems?: { name: string; count: number; pct: number }[];
  browsers?: { name: string; count: number; pct: number }[];
  deviceModels?: {
    desktop: { model: string; count: number; pct: number }[];
    mobile: { model: string; count: number; pct: number }[];
    tablet: { model: string; count: number; pct: number }[];
  };
  language: "ko" | "en";
  drillKind: DeviceKind | null;
  onDrillChange: (k: DeviceKind | null) => void;
}) {
  const tabs: { id: DeviceTab; label: string; available: boolean }[] = [
    {
      id: "type",
      label: language === "ko" ? "기기" : "Type",
      available: deviceTypes.length > 0,
    },
    {
      id: "os",
      label: language === "ko" ? "OS" : "OS",
      available: !!operatingSystems?.length,
    },
    {
      id: "browser",
      label: language === "ko" ? "브라우저" : "Browser",
      available: !!browsers?.length,
    },
  ];
  const [activeTab, setActiveTab] = useState<DeviceTab>("type");

  // 탭이 바뀌면 drill-down 자동 닫기 (Type 탭이 아닌 곳에서는 모델 분포 의미 없음)
  useEffect(() => {
    if (activeTab !== "type") onDrillChange(null);
  }, [activeTab, onDrillChange]);

  // 탭별 데이터 준비
  const palette = [
    "var(--color-accent)",
    "var(--color-accent-dark)",
    "var(--color-accent-light)",
    "var(--color-accent-alpha-70)",
    "var(--color-accent-alpha-50)",
    "var(--color-accent-alpha-30)",
    "var(--color-accent-alpha-15)",
  ];

  let items: {
    name: string;
    count: number;
    pct: number;
    icon?: typeof Monitor;
    kind?: DeviceKind;
  }[] = [];
  if (activeTab === "type") {
    const labels = {
      desktop: language === "ko" ? "데스크탑" : "Desktop",
      mobile: language === "ko" ? "모바일" : "Mobile",
      tablet: language === "ko" ? "태블릿" : "Tablet",
    };
    const icons = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
    items = deviceTypes.map((d) => ({
      name: labels[d.kind],
      count: d.count,
      pct: d.pct,
      icon: icons[d.kind],
      kind: d.kind,
    }));
  } else if (activeTab === "os" && operatingSystems) {
    items = operatingSystems.map((o) => ({
      name: o.name,
      count: o.count,
      pct: o.pct,
    }));
  } else if (activeTab === "browser" && browsers) {
    items = browsers.map((b) => ({ name: b.name, count: b.count, pct: b.pct }));
  }

  const total = items.reduce((s, d) => s + d.count, 0);
  let acc = 0;
  const arcs = items.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.count;
    const end = (acc / total) * 360;
    return { ...d, color: palette[i % palette.length], start, end };
  });

  return (
    <>
      {/* 탭 — capsule 형태, hover indicator. 각 탭에 분류 기준 툴팁 */}
      <div className={styles.deviceTabs} role="tablist">
        {tabs
          .filter((t) => t.available)
          .map((tab) => {
            const tipMap: Record<DeviceTab, string> =
              language === "ko"
                ? {
                    type: "기기 종류 (데스크탑 / 모바일 / 태블릿) — 클릭 시 모델 분포",
                    os: "운영체제 (macOS / Windows / iOS / Android ...)",
                    browser: "브라우저 (Chrome / Safari / Firefox ...)",
                  }
                : {
                    type: "Device kind — click to see specific models",
                    os: "Operating system breakdown",
                    browser: "Browser breakdown",
                  };
            return (
              <Tooltip
                key={tab.id}
                content={tipMap[tab.id]}
                placement="top"
                delay={300}
              >
                <Pressable
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`${styles.deviceTab} ${activeTab === tab.id ? styles.deviceTabActive : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Pressable>
              </Tooltip>
            );
          })}
      </div>

      <div
        className={styles.devicesWrap}
        key={activeTab /* 탭 변경 시 fade-in 재실행 */}
      >
        <svg viewBox="0 0 140 140" className={styles.donutSvg}>
          {arcs.length === 1 ? (
            <>
              <circle cx={70} cy={70} r={60} fill={arcs[0].color} />
              <circle cx={70} cy={70} r={38} fill="var(--bg-primary)" />
            </>
          ) : (
            arcs.map((arc, i) => (
              <path
                key={`${arc.name}-${i}`}
                d={describeDonutArc(70, 70, 60, 38, arc.start, arc.end)}
                fill={arc.color}
              >
                <title>
                  {arc.name} · {arc.count.toLocaleString()} ({arc.pct}%)
                </title>
              </path>
            ))
          )}
          <text
            x={70}
            y={66}
            textAnchor="middle"
            className={styles.donutCenterValue}
          >
            {total.toLocaleString()}
          </text>
          <text
            x={70}
            y={82}
            textAnchor="middle"
            className={styles.donutCenterLabel}
          >
            {language === "ko" ? "방문" : "visits"}
          </text>
        </svg>
        <List className={styles.deviceLegend}>
          {arcs.map((arc, i) => {
            const Icon = arc.icon;
            const drillable =
              activeTab === "type" && !!arc.kind && !!deviceModels?.[arc.kind];
            const isOpen = drillable && drillKind === arc.kind;
            const content = (
              <>
                <span
                  className={styles.deviceLegendSwatch}
                  style={{ background: arc.color }}
                  aria-hidden
                />
                {Icon && (
                  <Icon
                    size={13}
                    strokeWidth={2}
                    className={styles.deviceLegendIcon}
                  />
                )}
                <span className={styles.deviceLegendName}>{arc.name}</span>
                <span className={styles.deviceLegendPct}>{arc.pct}%</span>
                {drillable && (
                  <ChevronRight
                    size={13}
                    strokeWidth={2}
                    className={`${styles.deviceLegendChevron} ${isOpen ? styles.deviceLegendChevronOpen : ""}`}
                    aria-hidden
                  />
                )}
              </>
            );
            return (
              <ListItem
                key={`${arc.name}-${i}`}
                className={styles.deviceLegendItem}
              >
                {drillable ? (
                  <Pressable
                    className={`${styles.deviceLegendBtn} ${isOpen ? styles.deviceLegendBtnActive : ""}`}
                    onClick={() =>
                      onDrillChange(isOpen ? null : (arc.kind as DeviceKind))
                    }
                    aria-expanded={isOpen}
                  >
                    {content}
                  </Pressable>
                ) : (
                  <div className={styles.deviceLegendBtn}>{content}</div>
                )}
              </ListItem>
            );
          })}
        </List>
      </div>

      {/* Drill-down — Type 탭에서 데스크탑/모바일/태블릿 클릭 시 모델별 분포 */}
      {activeTab === "type" && drillKind && deviceModels?.[drillKind] && (
        <DeviceModelsPanel
          kind={drillKind}
          models={deviceModels[drillKind]}
          language={language}
          onClose={() => onDrillChange(null)}
        />
      )}
    </>
  );
}

/* ── Drill-down panel — 선택한 디바이스 종류의 모델별 분포 (가로 막대 리스트) ── */
function DeviceModelsPanel({
  kind,
  models,
  language,
  onClose,
}: {
  kind: DeviceKind;
  models: { model: string; count: number; pct: number }[];
  language: "ko" | "en";
  onClose: () => void;
}) {
  const kindLabels = {
    desktop: language === "ko" ? "데스크탑" : "Desktop",
    mobile: language === "ko" ? "모바일" : "Mobile",
    tablet: language === "ko" ? "태블릿" : "Tablet",
  };
  const max = Math.max(...models.map((m) => m.count), 1);

  return (
    <div
      className={styles.deviceDrill}
      key={kind /* kind 바뀌면 fade-in 재실행 */}
    >
      <div className={styles.deviceDrillHeader}>
        <span className={styles.deviceDrillTitle}>
          {kindLabels[kind]} · {language === "ko" ? "기기 모델" : "Top devices"}
        </span>
        <CloseButton
          onClick={onClose}
          ariaLabel={language === "ko" ? "닫기" : "Close"}
        />
      </div>
      {models.length === 0 ? (
        <p className={styles.deviceDrillEmpty}>
          {language === "ko" ? "데이터가 없습니다." : "No data yet."}
        </p>
      ) : (
        <List className={styles.deviceDrillList}>
          {models.map((m, i) => (
            <ListItem
              key={`${m.model}-${i}`}
              layout="grid"
              className={styles.deviceDrillRow}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={styles.deviceDrillName} title={m.model}>
                {m.model}
              </span>
              <span className={`${styles.bar} ${styles.barTertiaryBg}`}>
                <span
                  className={`${styles.barFill} ${styles.barFillGradient} ${styles.barFillEnter}`}
                  style={{ width: `${(m.count / max) * 100}%` }}
                />
              </span>
              <span className={styles.deviceDrillCount}>
                {m.count.toLocaleString()}
              </span>
              <span className={styles.deviceDrillPct}>{m.pct}%</span>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}

/* ── 시각화 컴포넌트 ── */
/** 일별 조회수 — SVG 면적 차트. 시작일/종료일 기반 날짜 범위 선택. 부드러운 스플라인 + 그라데이션 fill.
 *  점/하단 라벨 클릭 시 해당 날짜의 상세 분석 패널이 펼쳐짐. */
function DailyViewsChart({
  data: rawData,
  language,
  t,
}: {
  data: { day: string; views: number }[];
  language: "ko" | "en";
  t: TFunction;
}) {
  // 기본 범위: 최근 14일 (rawData 의 마지막 14개)
  const defaultRange = useMemo(() => {
    if (rawData.length === 0) return { start: "", end: "" };
    const end = rawData[rawData.length - 1].day;
    const startIdx = Math.max(0, rawData.length - 14);
    const start = rawData[startIdx].day;
    return { start, end };
  }, [rawData]);

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"line" | "calendar">("line");

  // 캘린더 모드의 focus month (year + month-index). rawData 의 마지막 날 기준 default.
  const [focusYM, setFocusYM] = useState<{ year: number; month: number }>(
    () => {
      const last = rawData[rawData.length - 1]?.day;
      if (last) {
        const [y, m] = last.split("-").map(Number);
        return { year: y, month: m - 1 };
      }
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    },
  );

  /* 마우스 drag-to-scroll — chartScroll 영역에서 mousedown + 이동하면 가로 스크롤.
     touch 는 native pan-x 가 이미 동작. drag 가 임계값 (>5px) 넘으면 click 차단.
     dragging state 로 cursor: grabbing 토글. */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScroll - dx;
  };
  const handlePointerUp = () => {
    dragState.current.active = false;
    setIsDragging(false);
  };
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  // 시작일이 종료일보다 늦으면 자동 swap (사용자가 거꾸로 골랐을 때 보정)
  const [normStart, normEnd] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  // 범위 변경 시 인덱스 리셋
  useEffect(() => {
    setSelectedIdx(null);
    setHoveredIdx(null);
  }, [normStart, normEnd]);

  // chartScroll 위에서 wheel — vertical wheel 을 horizontal scroll 로 변환, 페이지 세로 scroll 차단.
  // React onWheel 은 passive 라 preventDefault 불가 → native addEventListener (passive: false)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // rawData 에서 [normStart, normEnd] 구간만 슬라이스
  const data = useMemo(
    () => rawData.filter((d) => d.day >= normStart && d.day <= normEnd),
    [rawData, normStart, normEnd],
  );

  // 같은 길이의 직전 구간과 비교한 변화율 (line mode)
  const wow = useMemo(() => {
    if (data.length === 0) return null;
    const startIdxInRaw = rawData.findIndex((d) => d.day === data[0].day);
    if (startIdxInRaw <= 0) return null; // 직전 구간 없음
    const prevSlice = rawData.slice(
      Math.max(0, startIdxInRaw - data.length),
      startIdxInRaw,
    );
    if (prevSlice.length === 0) return null;
    const cur = data.reduce((s, d) => s + d.views, 0);
    const prev = prevSlice.reduce((s, d) => s + d.views, 0);
    if (prev === 0 && cur === 0) return null;
    if (prev === 0) return { pct: 100, direction: "up" as const };
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { pct, direction: pct >= 0 ? ("up" as const) : ("down" as const) };
  }, [rawData, data]);

  // 캘린더 모드: 현재 focus month 의 데이터 + 직전 달 대비 변화율
  const monthStats = useMemo(() => {
    const monthPrefix = `${focusYM.year}-${String(focusYM.month + 1).padStart(2, "0")}-`;
    const curMonthData = rawData.filter((d) => d.day.startsWith(monthPrefix));
    const curTotal = curMonthData.reduce((s, d) => s + d.views, 0);

    const prev =
      focusYM.month === 0
        ? { year: focusYM.year - 1, month: 11 }
        : { year: focusYM.year, month: focusYM.month - 1 };
    const prevPrefix = `${prev.year}-${String(prev.month + 1).padStart(2, "0")}-`;
    const prevMonthData = rawData.filter((d) => d.day.startsWith(prevPrefix));
    const prevTotal = prevMonthData.reduce((s, d) => s + d.views, 0);

    let mom: { pct: number; direction: "up" | "down" } | null = null;
    if (prevMonthData.length > 0) {
      if (prevTotal === 0 && curTotal === 0) mom = null;
      else if (prevTotal === 0) mom = { pct: 100, direction: "up" as const };
      else {
        const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
        mom = { pct, direction: pct >= 0 ? "up" : "down" };
      }
    }

    return { total: curTotal, mom };
  }, [rawData, focusYM]);

  // rawData 의 첫 날짜 / 마지막 날짜 — picker 의 min/max 안내용 (maxDate = 오늘, 미래 선택 차단)
  const minDate = rawData[0]?.day ?? "";
  const maxDate = rawData[rawData.length - 1]?.day ?? "";

  // 최대 선택 가능 범위: 2주(14일)
  const MAX_RANGE_DAYS = 14;
  const addDays = (iso: string, days: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // 잘못된 선택을 감지해서 모달로 안내. (오늘 picker 가 raw iso 를 그대로 넘겨주므로 detect 가능)
  const { openModal } = useModalStore();
  const notifyClamp = (reason: "future" | "range") => {
    const desc =
      language === "ko"
        ? reason === "future"
          ? "오늘 이후 날짜는 선택할 수 없습니다. 오늘 날짜로 변경했습니다."
          : "최대 14일까지만 선택 가능합니다. 14일 범위로 변경했습니다."
        : reason === "future"
          ? "Future dates aren't selectable. Adjusted to today."
          : "Up to 14 days can be selected. Adjusted to a 14-day range.";
    openModal(
      <ModalAlert
        desc={desc}
        confirmText={language === "ko" ? "확인" : "OK"}
      />,
      {
        header: {
          title: language === "ko" ? "날짜 범위 안내" : "Date range notice",
        },
      },
    );
  };

  // 시작일 변경 — 미래(>maxDate) 또는 14일 초과면 modal 안내 + 자동 보정
  const handleStartChange = (iso: string) => {
    const wasFuture = iso > maxDate;
    const newStart = iso > maxDate ? maxDate : iso < minDate ? minDate : iso;
    const maxAllowedEnd = addDays(newStart, MAX_RANGE_DAYS - 1);
    const wasOverRange = endDate > maxAllowedEnd;

    setStartDate(newStart);
    if (endDate > maxAllowedEnd || endDate < newStart) {
      setEndDate(maxAllowedEnd > maxDate ? maxDate : maxAllowedEnd);
    }
    setOpenPicker(null);

    if (wasFuture) notifyClamp("future");
    else if (wasOverRange) notifyClamp("range");
  };

  // 종료일 변경 — 미래 차단 + 14일 초과면 modal 안내 + 자동 보정
  const handleEndChange = (iso: string) => {
    const wasFuture = iso > maxDate;
    const newEnd = iso > maxDate ? maxDate : iso < minDate ? minDate : iso;
    const minAllowedStart = addDays(newEnd, -(MAX_RANGE_DAYS - 1));
    const wasOverRange = startDate < minAllowedStart;

    setEndDate(newEnd);
    if (startDate < minAllowedStart || startDate > newEnd) {
      setStartDate(minAllowedStart < minDate ? minDate : minAllowedStart);
    }
    setOpenPicker(null);

    if (wasFuture) notifyClamp("future");
    else if (wasOverRange) notifyClamp("range");
  };

  const max = Math.max(...data.map((d) => d.views), 1);
  const total = data.reduce((s, d) => s + d.views, 0);
  const W = 800;
  const H = 360;
  const PAD_T = 28;
  const PAD_B = 40;
  /* 첫/마지막 dot 이 chartScroll 의 overflow 에 잘리는 문제 방지용 horizontal inset.
     dot 이 translateX(-50%) 로 중앙정렬되니까 양 끝 dot 이 SVG edge 밖으로 반쯤 튀어나옴 → clip.
     이 값만큼 좌표계 안쪽으로 밀어서 dot 이 viewport 안에 완전히 들어옴. */
  const PAD_X = 16;
  const stepX = (W - 2 * PAD_X) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: H - PAD_B - (d.views / max) * (H - PAD_T - PAD_B),
    v: d.views,
    day: d.day,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${W - PAD_X},${H - PAD_B} L${PAD_X},${H - PAD_B} Z`;
  const todayPt = points[points.length - 1];
  // active indicator — hover 우선, 없으면 selected. 같은 element 가 left/top transition 으로 부드럽게 슬라이드
  const activeIdx = hoveredIdx ?? selectedIdx;
  const activePt = activeIdx !== null ? points[activeIdx] : null;

  // 라벨 culling — 30일 이하면 모두 표시. 그 이상은 ~14개 정도로 추리기
  const labelStep = data.length <= 30 ? 1 : Math.ceil(data.length / 14);
  const showLabel = (i: number) =>
    i === 0 || i === data.length - 1 || i % labelStep === 0;

  const toggle = (i: number) => setSelectedIdx((cur) => (cur === i ? null : i));

  return (
    <div className={styles.dailyChart}>
      {/* Row 1: 제목 + 우측 stats/toggle — 너비 변해도 일관된 단일 행 */}
      <header className={styles.panelHeader}>
        <PanelTitle variant="inset">
          {t("admin.dashboard.dailyViewsTitle")}
        </PanelTitle>
        <div className={styles.dailyChartStatItem}>
          <span className={styles.dailyChartStatLabel}>
            {viewMode === "calendar"
              ? language === "ko"
                ? "이 달 합계"
                : "Month total"
              : language === "ko"
                ? "기간 합계"
                : "Total"}
          </span>
          <span className={styles.dailyChartTotal}>
            {(viewMode === "calendar"
              ? monthStats.total
              : total
            ).toLocaleString()}
          </span>
        </div>
        {(() => {
          const trend = viewMode === "calendar" ? monthStats.mom : wow;
          if (!trend) return null;
          return (
            <div className={styles.dailyChartStatItem}>
              <span className={styles.dailyChartStatLabel}>
                {viewMode === "calendar"
                  ? language === "ko"
                    ? "직전 달 대비"
                    : "vs prev month"
                  : language === "ko"
                    ? "직전 기간 대비"
                    : "vs prev"}
              </span>
              <span
                className={`${styles.trendBadge} ${trend.direction === "up" ? styles.trendUp : styles.trendDown}`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp size={11} strokeWidth={2.5} />
                ) : (
                  <TrendingDown size={11} strokeWidth={2.5} />
                )}
                {Math.abs(trend.pct)}%
              </span>
            </div>
          );
        })()}
        <SegmentedControl<"line" | "calendar">
          items={[
            { value: "line", label: <LineChart size={13} strokeWidth={2} /> },
            {
              value: "calendar",
              label: <CalendarDays size={13} strokeWidth={2} />,
            },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </header>

      {/* Row 2: 날짜 범위 선택기 (line mode 만) — 별도 행으로 분리해서 너비 변해도 row1 영향 X */}
      {viewMode === "line" && (
        <div className={styles.dailyChartHeaderSub}>
          <div className={styles.periodRange}>
            <DateRangeTrigger
              label={language === "ko" ? "시작일" : "Start"}
              date={startDate}
              isOpen={openPicker === "start"}
              onOpen={() =>
                setOpenPicker((cur) => (cur === "start" ? null : "start"))
              }
              onClose={() => setOpenPicker(null)}
              onSelect={handleStartChange}
              language={language}
              minDate={minDate}
              maxDate={maxDate}
            />
            <span className={styles.periodRangeSep} aria-hidden>
              —
            </span>
            <DateRangeTrigger
              label={language === "ko" ? "종료일" : "End"}
              date={endDate}
              isOpen={openPicker === "end"}
              onOpen={() =>
                setOpenPicker((cur) => (cur === "end" ? null : "end"))
              }
              onClose={() => setOpenPicker(null)}
              onSelect={handleEndChange}
              language={language}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>
        </div>
      )}
      {viewMode === "calendar" ? (
        <CalendarHeatmap
          data={rawData}
          language={language}
          focus={focusYM}
          setFocus={setFocusYM}
          onSelectDay={(day) => {
            // 캘린더에서 선택한 날짜를 line mode 의 selectedIdx 로 연결 (DayDetailPanel 표시).
            // data 가 슬라이스라 범위 밖이면 line mode 의 startDate/endDate 를 조정해서 포함시킴.
            const idx = data.findIndex((d) => d.day === day);
            if (idx >= 0) {
              setSelectedIdx(idx);
            } else {
              // 선택한 날짜가 현재 line slice 밖이면 startDate/endDate 를 그 날 중심으로 14일 조정
              const dayIdxRaw = rawData.findIndex((d) => d.day === day);
              if (dayIdxRaw >= 0) {
                const halfRange = Math.floor(MAX_RANGE_DAYS / 2);
                const startIdx = Math.max(0, dayIdxRaw - halfRange);
                const endIdx = Math.min(
                  rawData.length - 1,
                  startIdx + MAX_RANGE_DAYS - 1,
                );
                setStartDate(rawData[startIdx].day);
                setEndDate(rawData[endIdx].day);
                setSelectedIdx(dayIdxRaw - startIdx);
                setViewMode("line");
              }
            }
          }}
        />
      ) : (
        // 모바일에서 일수가 많으면 가로 스크롤 — children 의 min-width 가 일당 24px 정도로 늘어나 scroll 발생.
        // desktop 에서는 width: 100% 로 fit-to-container, scroll 안 일어남.
        // 마우스 drag-to-scroll + wheel 도 가로로 변환 (chart 위 wheel 시 페이지 세로 scroll 막음).
        <div
          ref={scrollRef}
          className={`${styles.chartScroll} ${isDragging ? styles.chartScrollDragging : ""}`}
          style={{ ["--_days" as string]: String(data.length) }}
          role="img"
          aria-label={t("admin.dashboard.dailyViewsTitle")}
          onMouseLeave={() => setHoveredIdx(null)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={handleClickCapture}
        >
          {/* path 만 SVG — 늘어나도 곡선 형태는 자연스러움 */}
          <div className={styles.chartArea}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className={styles.areaSvg}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0.35"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* 오늘/선택된 날짜 vertical reference — dot 위치에서 baseline 까지만 (dot 위쪽으로는 안 그려짐) */}
            <span
              className={styles.todayLine}
              style={{
                left: `${(todayPt.x / W) * 100}%`,
                top: `${(todayPt.y / H) * 100}%`,
                bottom: `${(PAD_B / H) * 100}%`,
              }}
              aria-hidden
            />
            {activePt && (
              <span
                className={styles.selectedLine}
                style={{
                  left: `${(activePt.x / W) * 100}%`,
                  top: `${(activePt.y / H) * 100}%`,
                  bottom: `${(PAD_B / H) * 100}%`,
                }}
                aria-hidden
              />
            )}
            {/* 각 날짜의 세로 컬럼 전체가 hit area — 점 위/아래 어디 클릭해도 해당 날짜 선택.
              hoveredIdx 는 chartArea 의 dotColumn 뿐 아니라 areaDays 의 라벨 hover 로도 set 되므로
              dot 표시는 state 기반 .dotHovered 클래스로 통일 */}
            {points.map((p, i) => {
              const isToday = i === points.length - 1;
              const isSelected = selectedIdx === i;
              const isHovered = hoveredIdx === i;
              const isHoveringElsewhere =
                hoveredIdx !== null && hoveredIdx !== i;
              // 다른 날짜 선택 / 다른 dot hover 중이면 오늘 dot 숨김 (active indicator 가 이동했으므로)
              const showAsToday =
                isToday && selectedIdx === null && !isHoveringElsewhere;
              // 다른 dot 을 hover 중이면 selected dot 도 숨김 — indicator 가 hover 위치로 이동한 느낌
              const showAsSelected = isSelected && !isHoveringElsewhere;
              const isEmphasized = showAsToday || showAsSelected || isHovered;
              return (
                <Pressable
                  key={i}
                  className={styles.dotColumn}
                  style={{
                    left: `${(p.x / W) * 100}%`,
                    width: `${(stepX / W) * 100}%`,
                  }}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  aria-label={`${data[i].day}: ${data[i].views} views`}
                >
                  {/* 각 dot 위 숫자 label — today/selected/hover 시 강조 */}
                  <span
                    className={`${styles.dotValue} ${isEmphasized ? styles.dotValueEmphasized : ""}`}
                    style={{ top: `${(p.y / H) * 100}%` }}
                  >
                    {p.v.toLocaleString()}
                  </span>
                  <span
                    className={`${styles.dotCircle} ${showAsToday ? styles.dotToday : ""} ${showAsSelected ? styles.dotSelected : ""} ${isHovered ? styles.dotHovered : ""}`}
                    style={{ top: `${(p.y / H) * 100}%` }}
                  />
                </Pressable>
              );
            })}
          </div>
          {/* 하단 day 라벨 — absolute 포지션, 점과 같은 X 위치(0%~100%)에 중앙 정렬.
            indicator 는 hovered → selected → today 순으로 위치, smooth slide */}
          <div className={styles.areaDays}>
            {/* Sliding circle indicator — 라벨 뒤 배경 */}
            {(() => {
              const targetIdx = hoveredIdx ?? selectedIdx ?? data.length - 1;
              /* points 의 x (PAD_X inset 적용된 값) 기반 → SVG dot 과 라벨이 동일 위치 정렬 */
              const leftPct = (points[targetIdx].x / W) * 100;
              const isOnSelected = hoveredIdx === null && selectedIdx !== null;
              const isOnHovered = hoveredIdx !== null;
              return (
                <span
                  className={`${styles.dayIndicator} ${isOnSelected ? styles.dayIndicatorSelected : ""} ${isOnHovered ? styles.dayIndicatorHover : ""}`}
                  style={{ left: `${leftPct}%` }}
                  aria-hidden
                />
              );
            })()}
            {data.map((d, i) => {
              // 30/90일은 라벨 너무 많아 culling — 0/마지막/labelStep 단위만 표시
              if (!showLabel(i)) return null;
              const date = new Date(d.day);
              const dn = date.getDate();
              const dow = date.toLocaleDateString(
                language === "ko" ? "ko-KR" : "en-US",
                { weekday: "short" },
              );
              const isToday = i === data.length - 1;
              const isSelected = selectedIdx === i;
              const leftPct = (points[i].x / W) * 100;
              return (
                <Pressable
                  key={d.day}
                  className={`${styles.areaDay} ${isToday ? styles.areaDayToday : ""} ${isSelected ? styles.areaDaySelected : ""}`}
                  style={{ left: `${leftPct}%` }}
                  title={`${d.day} · ${d.views.toLocaleString()}`}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoveredIdx(i)}
                >
                  {dn}
                  <span className={styles.areaDayDow}>{dow}</span>
                </Pressable>
              );
            })}
          </div>
        </div>
      )}
      {/* 선택된 날짜 상세 패널 */}
      {selectedIdx !== null && (
        <DayDetailPanel
          data={data}
          selectedIdx={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          language={language}
          t={t}
        />
      )}
    </div>
  );
}

/* ── 날짜 범위 trigger — 클릭 시 DatePickerPopover 열림 ── */
function DateRangeTrigger({
  label,
  date,
  isOpen,
  onOpen,
  onClose,
  onSelect,
  language,
}: {
  label: string;
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (iso: string) => void;
  language: "ko" | "en";
  minDate: string;
  maxDate: string;
}) {
  const [y, m, d] = date.split("-");
  const formatted = (() => {
    if (!date) return "—";
    const dt = new Date(date);
    return dt.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  })();

  const tooltipText =
    language === "ko"
      ? "최대 14일 범위, 미래 날짜는 선택 불가"
      : "Up to 14-day range, future dates not allowed";

  return (
    <div className={styles.periodTrigger}>
      <Tooltip content={tooltipText} placement="bottom" delay={300}>
        <Button
          type="button"
          variant="outline"
          size="2xs"
          active={isOpen}
          className={styles.periodTriggerBtn}
          onClick={onOpen}
          aria-label={`${label}: ${formatted}`}
        >
          <span className={styles.periodTriggerLabel}>{label}</span>
          <span className={styles.periodTriggerDate}>{formatted}</span>
        </Button>
      </Tooltip>
      {isOpen && (
        <DatePickerPopover
          year={y}
          month={m}
          day={d}
          format="date"
          onSelect={(yy, mm, dd) => {
            // raw iso 그대로 부모에 전달 — 부모에서 modal 안내 + auto-clamp 처리
            const iso = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
            onSelect(iso);
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

type DayTopPost = { id: string; title: string; slug: string; views: number };

/** 선택된 날짜의 분석 패널 — 순위, 평균 대비, 같은 요일 대비, 전일 대비, 그날 인기 게시물 */
function DayDetailPanel({
  data,
  selectedIdx,
  onClose,
  language,
}: {
  data: { day: string; views: number }[];
  selectedIdx: number;
  onClose: () => void;
  language: "ko" | "en";
  t: TFunction;
}) {
  const [topPosts, setTopPosts] = useState<DayTopPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const sel = data[selectedIdx];

  // 선택 날짜 변경 시 인기 게시물 fetch
  useEffect(() => {
    let cancelled = false;
    setLoadingPosts(true);
    fetch(`/api/admin/dashboard/day?date=${sel.day}`)
      .then((r) => r.json())
      .then((d: { topPosts?: DayTopPost[] }) => {
        if (!cancelled) {
          setTopPosts(d.topPosts ?? []);
          setLoadingPosts(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopPosts([]);
          setLoadingPosts(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sel.day]);

  const selDate = new Date(sel.day);
  const allViews = data.map((d) => d.views);
  const avg = allViews.reduce((s, v) => s + v, 0) / allViews.length;
  const sortedDesc = [...allViews].sort((a, b) => b - a);
  const rank = sortedDesc.indexOf(sel.views) + 1;

  // 이전 같은 요일 (14일 안에서)
  const dow = selDate.getDay();
  let sameWeekday: { day: string; views: number } | null = null;
  for (let i = selectedIdx - 1; i >= 0; i--) {
    if (new Date(data[i].day).getDay() === dow) {
      sameWeekday = data[i];
      break;
    }
  }
  const prevDay = selectedIdx > 0 ? data[selectedIdx - 1] : null;

  const diffPct = (
    cur: number,
    base: number,
  ): { pct: number; dir: "up" | "down" | "flat" } | null => {
    if (base === 0) return cur > 0 ? { pct: 100, dir: "up" } : null;
    const pct = Math.round(((cur - base) / base) * 100);
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  };

  const vsAvg = diffPct(sel.views, Math.round(avg));
  const vsSameWeekday = sameWeekday
    ? diffPct(sel.views, sameWeekday.views)
    : null;
  const vsPrev = prevDay ? diffPct(sel.views, prevDay.views) : null;

  const fullDate = selDate.toLocaleDateString(
    language === "ko" ? "ko-KR" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "long",
    },
  );

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
    });

  // 행 데이터 — staggered animation index 부여 위해 배열로.
  // baseline 조회수 (ctx) 는 label 괄호 안에 inline 표기 — 별도 컬럼 없이도 비교 기준이 명확함.
  const periodLabel =
    language === "ko" ? `${data.length}일` : `${data.length}d`;
  const fmtViews = (n: number) =>
    language === "ko"
      ? `${n.toLocaleString()}회`
      : `${n.toLocaleString()} views`;
  const rows = [
    vsAvg && {
      id: "avg",
      label:
        language === "ko"
          ? `${periodLabel} 평균 대비 (${fmtViews(Math.round(avg))})`
          : `vs ${periodLabel} average (${fmtViews(Math.round(avg))})`,
      diff: vsAvg,
    },
    vsSameWeekday &&
      sameWeekday && {
        id: "weekday",
        label:
          language === "ko"
            ? `이전 ${selDate.toLocaleDateString("ko-KR", { weekday: "short" })}요일 대비 (${fmtShort(sameWeekday.day)}, ${fmtViews(sameWeekday.views)})`
            : `vs last ${selDate.toLocaleDateString("en-US", { weekday: "short" })} (${fmtShort(sameWeekday.day)}, ${fmtViews(sameWeekday.views)})`,
        diff: vsSameWeekday,
      },
    vsPrev &&
      prevDay && {
        id: "prev",
        label:
          language === "ko"
            ? `전일 대비 (${fmtShort(prevDay.day)}, ${fmtViews(prevDay.views)})`
            : `vs previous day (${fmtShort(prevDay.day)}, ${fmtViews(prevDay.views)})`,
        diff: vsPrev,
      },
  ].filter(Boolean) as {
    id: string;
    label: string;
    diff: { pct: number; dir: "up" | "down" | "flat" };
  }[];

  return (
    <Panel
      variant="grid"
      cols="1fr 1fr"
      divided
      className={styles.dayDetailPanel}
      role="region"
      aria-label="day detail"
      key={selectedIdx /* 다른 날짜 클릭 시 애니메이션 재실행 */}
    >
      <header className={styles.panelHeader} style={{ gridColumn: "1 / -1" }}>
        <div className={styles.dayDetailHeading}>
          <span className={styles.dayDetailDate}>{fullDate}</span>
          <span className={styles.dayDetailRank}>
            {language === "ko"
              ? `${rank}위 / ${data.length}일`
              : `Rank ${rank} of ${data.length}`}
          </span>
        </div>
        <CloseButton onClick={onClose} ariaLabel="close" />
      </header>

      {/* 좌측 컬럼 — 숫자 + 비교 List + range 분포 (Panel 로 그룹핑, DayDetail grid 의 col 1) */}
      <Panel>
        <Item
          style={{
            display: "flex",
            gap: "var(--spacing-xs)",
            alignItems: "baseline",
            paddingTop: "var(--spacing-2xs)",
            paddingBottom: "var(--spacing-2xs)",
            height: "calc(var(--font-size-3xl) + var(--spacing-xs))",
            flexShrink: 0,
            overflow: "visible",
          }}
        >
          <div className={styles.dayDetailNumber}>
            <CountUp value={sel.views} duration={700} />
          </div>
          <span className={styles.dayDetailUnit}>
            {language === "ko" ? "조회" : "views"}
          </span>
        </Item>

        <List>
          {rows.map((row) => (
            <ListItem
              key={row.id}
              layout="grid"
              style={{ gridTemplateColumns: "1fr auto", height: "var(--control-h-xl)", flexShrink: 0 }}
            >
              <span className={styles.dayDetailLabel}>{row.label}</span>
              <DiffBadge diff={row.diff} />
            </ListItem>
          ))}
        </List>

        <RangePosition
          values={allViews}
          selectedValue={sel.views}
          label={
            language === "ko"
              ? `${periodLabel} 분포 내 위치`
              : `Position in ${periodLabel} range`
          }
        />
      </Panel>

      {/* 그날 인기 게시물 — 우측 컬럼, top 5 만 컴팩트하게 */}
      <Panel style={{ animationDelay: `${120 + rows.length * 70 + 200}ms` }}>
        <PanelTitle
          variant="inset"
          style={{
            height: "calc(var(--font-size-3xl) + var(--spacing-xs))",
            paddingTop: "var(--spacing-2xs)",
            paddingBottom: "var(--spacing-2xs)",
            display: "flex",
            alignItems: "end",
            flexShrink: 0,
          }}
        >
          {language === "ko" ? "그날 인기 게시물" : "Top posts that day"}
        </PanelTitle>
        {loadingPosts ? (
          <p className={styles.muted}>
            {language === "ko" ? "불러오는 중..." : "Loading..."}
          </p>
        ) : topPosts.length === 0 ? (
          <p className={styles.muted}>
            {language === "ko"
              ? "이날 조회된 게시물이 없습니다."
              : "No posts viewed this day."}
          </p>
        ) : (
          <List>
            {topPosts.slice(0, 5).map((p, i) => {
              const max = topPosts[0].views;
              const pct = (p.views / max) * 100;
              return (
                <ListItem
                  key={p.id}
                  layout="grid"
                  style={{
                    gridTemplateColumns:
                      "auto minmax(0, 1.4fr) minmax(60px, 1fr) auto",
                    height: "var(--control-h-xl)",
                    flexShrink: 0,
                  }}
                >
                  <span className={styles.dayDetailTopRank}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/posts/${p.slug}`}
                    className={styles.itemTitle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </Link>
                  <span className={styles.bar} aria-hidden>
                    <span
                      className={`${styles.barFill} ${styles.barFillGradient} ${styles.barFillEnter}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className={styles.dayDetailTopViews}>
                    {p.views.toLocaleString()}
                  </span>
                </ListItem>
              );
            })}
          </List>
        )}
      </Panel>
    </Panel>
  );
}

function DiffBadge({
  diff,
}: {
  diff: { pct: number; dir: "up" | "down" | "flat" };
}) {
  const cls =
    diff.dir === "up"
      ? styles.trendUp
      : diff.dir === "down"
        ? styles.trendDown
        : styles.trendFlat;
  const sign = diff.dir === "up" ? "+" : diff.dir === "down" ? "" : "±";
  return (
    <span className={`${styles.trendBadge} ${cls}`}>
      {diff.dir === "up" && <TrendingUp size={11} strokeWidth={2.5} />}
      {diff.dir === "down" && <TrendingDown size={11} strokeWidth={2.5} />}
      {sign}
      {diff.pct}%
    </span>
  );
}

/** min~max 범위 안에서 선택된 값의 위치를 보여주는 미니 슬라이더 */
function RangePosition({
  values,
  selectedValue,
  label,
}: {
  values: number[];
  selectedValue: number;
  label: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const pct = range > 0 ? ((selectedValue - min) / range) * 100 : 50;

  return (
    <Item>
      <span className={styles.rangePosLabel}>{label}</span>
      <div
        className={styles.rangePosTrack}
        aria-hidden
        style={{ ["--_pct" as string]: pct } as CSSProperties}
      >
        <div className={styles.rangePosFill} />
        <div className={styles.rangePosMarker} />
      </div>
      <div className={styles.rangePosBounds}>
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </Item>
  );
}

/** Catmull-Rom 보간으로 cubic bezier path 생성 (부드러운 곡선) */
/** Monotone cubic Hermite interpolation (Fritsch-Carlson).
   Catmull-Rom 의 overshoot 없이 자연스러운 smooth curve 보장 — baseline 아래로 dip 안 함. */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;

  // 1. 인접 segment slopes
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    m.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
  }

  // 2. 각 point 의 tangent (Fritsch-Carlson: 부호 다르면 0, 같으면 weighted harmonic)
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      const dx1 = pts[i].x - pts[i - 1].x;
      const dx2 = pts[i + 1].x - pts[i].x;
      const common = dx1 + dx2;
      t[i] = (3 * common) / ((common + dx2) / m[i - 1] + (common + dx1) / m[i]);
    }
  }

  // 3. tangent → cubic Bezier control points
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const cp1x = pts[i].x + dx / 3;
    const cp1y = pts[i].y + (t[i] * dx) / 3;
    const cp2x = pts[i + 1].x - dx / 3;
    const cp2y = pts[i + 1].y - (t[i + 1] * dx) / 3;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

/** GitHub-style 캘린더 히트맵 — 7행(요일) × N열(주). 각 셀은 그날 조회수에 따라 4단계 accent 농도. */
/** 월별 캘린더 뷰 — 일반적인 달력 모양 (7-col 요일 × 6-row 주). 한 달치를 한 번에 보여줌.
 *  focus month state 는 DailyViewsChart 가 소유 — stat 패널 (이 달 합계 / 직전 달 대비) 과 동기화. */
function CalendarHeatmap({
  data,
  language,
  onSelectDay,
  focus,
  setFocus,
}: {
  data: { day: string; views: number }[];
  language: "ko" | "en";
  onSelectDay?: (day: string) => void;
  focus: { year: number; month: number };
  setFocus: (f: { year: number; month: number }) => void;
}) {
  const lastDay = data[data.length - 1]?.day;

  // 해당 month 의 1일 요일 + 일수
  const firstDayDow = new Date(focus.year, focus.month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(focus.year, focus.month + 1, 0).getDate();

  // ISO 변환 (KST 기준 YYYY-MM-DD)
  const isoOf = (d: number) =>
    `${focus.year}-${String(focus.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 데이터 lookup
  const dataMap = useMemo(
    () => new Map(data.map((d) => [d.day, d.views])),
    [data],
  );

  // Quantile coloring (data 전체 기준)
  const nonZero = useMemo(
    () =>
      data
        .filter((d) => d.views > 0)
        .map((d) => d.views)
        .sort((a, b) => a - b),
    [data],
  );
  const q = (p: number) =>
    nonZero.length === 0 ? 0 : (nonZero[Math.floor(nonZero.length * p)] ?? 0);
  const lvl1 = q(0.33);
  const lvl2 = q(0.66);
  const colorFor = (v: number): string => {
    // 0 조회 cell 은 section bg 와 동일 색 — grid 의 hairline (1px gap) 만 보이고 cell 자체는 비어있게.
    // color-mix 로 accent + bg-primary 를 비율별로 섞어 opaque 단계 생성.
    // accent-alpha-XX 같은 alpha 색을 쓰면 grid bg (border-light-color, 30% alpha 어두운 색) 가 비쳐 탁해짐.
    if (v <= 0) return "var(--bg-primary)";
    if (v <= lvl1)
      return "color-mix(in srgb, var(--color-accent) 22%, var(--bg-primary))";
    if (v <= lvl2)
      return "color-mix(in srgb, var(--color-accent) 50%, var(--bg-primary))";
    return "var(--color-accent)";
  };

  // 6행×7열 grid — 첫 일주의 빈 cell 부터 시작
  const CELLS = 42;
  const cells: Array<{ day: number; iso: string; views: number } | null> =
    Array.from({ length: CELLS }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = firstDayDow + d - 1;
    if (idx >= CELLS) break;
    const iso = isoOf(d);
    cells[idx] = { day: d, iso, views: dataMap.get(iso) ?? 0 };
  }

  // Navigation bounds — 데이터 범위 내에서만 이동
  const firstDataDay = data[0]?.day;
  const firstYM = firstDataDay
    ? {
        year: Number(firstDataDay.slice(0, 4)),
        month: Number(firstDataDay.slice(5, 7)) - 1,
      }
    : null;
  const lastYM = lastDay
    ? {
        year: Number(lastDay.slice(0, 4)),
        month: Number(lastDay.slice(5, 7)) - 1,
      }
    : null;
  const cmpYM = (
    a: { year: number; month: number },
    b: { year: number; month: number },
  ) => (a.year !== b.year ? a.year - b.year : a.month - b.month);
  const canPrev = firstYM ? cmpYM(focus, firstYM) > 0 : false;
  const canNext = lastYM ? cmpYM(focus, lastYM) < 0 : false;

  const goPrev = () => {
    if (focus.month === 0) setFocus({ year: focus.year - 1, month: 11 });
    else setFocus({ year: focus.year, month: focus.month - 1 });
  };
  const goNext = () => {
    if (focus.month === 11) setFocus({ year: focus.year + 1, month: 0 });
    else setFocus({ year: focus.year, month: focus.month + 1 });
  };

  const monthLabel = new Date(focus.year, focus.month, 1).toLocaleDateString(
    language === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long" },
  );
  const dowLabels =
    language === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={styles.calendarHeatmap}>
      <header className={styles.calendarHeader}>
        <Button
          variant="ghost"
          shape="square"
          size="xs"
          icon={<ChevronLeft size={14} strokeWidth={2} />}
          onClick={goPrev}
          disabled={!canPrev}
          aria-label={language === "ko" ? "이전 달" : "Previous month"}
        />
        <span className={styles.calendarMonth}>{monthLabel}</span>
        <Button
          variant="ghost"
          shape="square"
          size="xs"
          icon={<ChevronRight size={14} strokeWidth={2} />}
          onClick={goNext}
          disabled={!canNext}
          aria-label={language === "ko" ? "다음 달" : "Next month"}
        />
      </header>

      <div className={styles.calendarDowRow}>
        {dowLabels.map((d, i) => (
          <span key={i} className={styles.calendarDow}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {cells.map((cell, i) => (
          <Pressable
            key={i}
            className={`${styles.calendarCell} ${!cell ? styles.calendarCellEmpty : ""}`}
            style={cell ? { background: colorFor(cell.views) } : undefined}
            onClick={cell ? () => onSelectDay?.(cell.iso) : undefined}
            disabled={!cell}
            title={cell ? `${cell.iso} · ${cell.views.toLocaleString()}` : ""}
            aria-label={cell ? `${cell.iso}: ${cell.views} views` : "empty"}
          >
            {cell && (
              <>
                <span className={styles.calendarCellDay}>{cell.day}</span>
                <span className={styles.calendarCellViews}>
                  {cell.views > 0 ? cell.views.toLocaleString() : ""}
                </span>
              </>
            )}
          </Pressable>
        ))}
      </div>

      <div className={styles.calendarLegend}>
        <span className={styles.calendarLegendLabel}>
          {language === "ko" ? "적음" : "Less"}
        </span>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={styles.calendarLegendCell}
            style={{
              background: [
                "var(--bg-primary)",
                "color-mix(in srgb, var(--color-accent) 22%, var(--bg-primary))",
                "color-mix(in srgb, var(--color-accent) 50%, var(--bg-primary))",
                "var(--color-accent)",
              ][i],
            }}
          />
        ))}
        <span className={styles.calendarLegendLabel}>
          {language === "ko" ? "많음" : "More"}
        </span>
      </div>
    </div>
  );
}

type CategoryPost = {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  published: boolean;
  updated_at: string;
};

/** 카테고리 분포 — interactive 도넛: wedge 또는 범례 항목 hover 시 중앙 라벨 + 해당 wedge 강조.
 *  범례 클릭 시 그 카테고리의 게시물 top 10 inline expand. */
function CategoryDonut({
  data,
  language,
  t,
}: {
  data: { name: string; postCount: number; views: number }[];
  language: "ko" | "en";
  t: TFunction;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<CategoryPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // 카테고리 토글 — 같은 카테고리 누르면 닫힘, 다른 카테고리 누르면 갈아끼움
  const toggleCategory = (name: string) => {
    if (expandedCat === name) {
      setExpandedCat(null);
      setExpandedPosts([]);
      return;
    }
    setExpandedCat(name);
    setLoadingPosts(true);
    fetch(`/api/admin/dashboard/category?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d: { posts?: CategoryPost[] }) => {
        setExpandedPosts(d.posts ?? []);
        setLoadingPosts(false);
      })
      .catch(() => {
        setExpandedPosts([]);
        setLoadingPosts(false);
      });
  };

  const total = data.reduce((s, d) => s + d.views, 0);
  const palette = [
    "var(--color-accent)",
    "var(--color-accent-dark)",
    "var(--color-accent-light)",
    "var(--color-accent-alpha-70)",
    "var(--color-accent-alpha-50)",
    "var(--color-accent-alpha-30)",
  ];

  const cx = 70,
    cy = 70;
  const outerR = 60;
  const innerR = 38;

  let acc = 0;
  const arcs = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.views;
    const end = (acc / total) * 360;
    return {
      d,
      color: palette[i % palette.length],
      start,
      end,
      pct: total > 0 ? (d.views / total) * 100 : 0,
    };
  });

  const hovered = hoverIdx !== null ? arcs[hoverIdx] : null;
  const centerValue = hovered
    ? hovered.d.views.toLocaleString()
    : total.toLocaleString();
  const centerLabel = hovered
    ? hovered.d.name
    : language === "ko"
      ? "조회"
      : "views";

  return (
    <Panel
      variant="grid"
      cols="auto 1fr"
      style={{ columnGap: "var(--spacing-md)", alignItems: "stretch" }}
    >
      <svg
        viewBox="0 0 140 140"
        className={styles.donutSvg}
        aria-label={t("admin.dashboard.topCategories")}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {arcs.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={outerR} fill={arcs[0].color} />
            <circle cx={cx} cy={cy} r={innerR} fill="var(--bg-primary)" />
          </>
        ) : (
          arcs.map((arc, i) => {
            const isHover = hoverIdx === i;
            const isOther = hoverIdx !== null && !isHover;
            return (
              <path
                key={arc.d.name}
                d={describeDonutArc(cx, cy, outerR, innerR, arc.start, arc.end)}
                fill={arc.color}
                className={`${styles.donutWedge} ${isHover ? styles.donutWedgeActive : ""} ${isOther ? styles.donutWedgeDim : ""}`}
                /* onMouseLeave 는 SVG 레벨에만 두고 wedge 단위는 enter 만 — 인접 wedge 경계의
                   anti-aliasing edge 에서 leave→enter 사이 잠깐 null 되는 깜빡임 방지 */
                onMouseEnter={() => setHoverIdx(i)}
              >
                <title>
                  {arc.d.name} · {arc.d.views.toLocaleString()} (
                  {arc.pct.toFixed(0)}%)
                </title>
              </path>
            );
          })
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className={styles.donutCenterValue}
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className={styles.donutCenterLabel}
        >
          {centerLabel}
        </text>
      </svg>
      <List
        style={{
          flex: 1,
          minWidth: 140,
          height: 140,
          display: "grid",
          gridAutoRows: "1fr",
        }}
      >
        {arcs.map((arc, i) => {
          const isHover = hoverIdx === i;
          const isExpanded = expandedCat === arc.d.name;
          return (
            <ListItem
              key={arc.d.name}
              className={`${styles.donutLegendItem} ${isHover ? styles.donutLegendItemActive : ""} ${isExpanded ? styles.donutLegendItemExpanded : ""}`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => toggleCategory(arc.d.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCategory(arc.d.name);
                }
              }}
              aria-expanded={isExpanded}
            >
              <span className={styles.donutLegendLeft}>
                <span
                  className={styles.donutLegendSwatch}
                  style={{ background: arc.color }}
                  aria-hidden
                />
                <span className={styles.donutLegendName}>{arc.d.name}</span>
              </span>
              <span className={styles.donutLegendMeta}>
                <span className={styles.donutLegendPct}>
                  {arc.pct.toFixed(2)}%
                </span>
              </span>
            </ListItem>
          );
        })}
      </List>
      {expandedCat && (
        <Panel
          style={{ gridColumn: "1 / -1", borderTop: "var(--border-light)" }}
        >
          <header className={styles.panelHeader}>
            <PanelTitle variant="inset">
              {language === "ko"
                ? `${expandedCat} 게시물`
                : `${expandedCat} posts`}
            </PanelTitle>
            <CloseButton
              onClick={() => {
                setExpandedCat(null);
                setExpandedPosts([]);
              }}
              ariaLabel={language === "ko" ? "닫기" : "Close"}
            />
          </header>
          {loadingPosts ? (
            <p className={styles.muted}>
              {language === "ko" ? "불러오는 중..." : "Loading..."}
            </p>
          ) : expandedPosts.length === 0 ? (
            <p className={styles.muted}>
              {language === "ko" ? "게시물이 없습니다." : "No posts."}
            </p>
          ) : (
            <List>
              {expandedPosts.map((p) => (
                <ListItem key={p.id}>
                  <Link
                    href={`/posts/${p.slug}`}
                    className={styles.itemTitle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </Link>
                  <span className={styles.itemDate}>
                    <Eye size={11} strokeWidth={2} />
                    {p.view_count.toLocaleString()}
                  </span>
                </ListItem>
              ))}
            </List>
          )}
        </Panel>
      )}
    </Panel>
  );
}

/** 도넛 wedge path (start/end 각도는 0=12시 시계방향, deg 단위) */
function describeDonutArc(
  cx: number,
  cy: number,
  oR: number,
  iR: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sa = toRad(startAngle),
    ea = toRad(endAngle);
  const ox1 = cx + oR * Math.cos(sa),
    oy1 = cy + oR * Math.sin(sa);
  const ox2 = cx + oR * Math.cos(ea),
    oy2 = cy + oR * Math.sin(ea);
  const ix1 = cx + iR * Math.cos(ea),
    iy1 = cy + iR * Math.sin(ea);
  const ix2 = cx + iR * Math.cos(sa),
    iy2 = cy + iR * Math.sin(sa);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M${ox1.toFixed(2)},${oy1.toFixed(2)}`,
    `A${oR},${oR} 0 ${large} 1 ${ox2.toFixed(2)},${oy2.toFixed(2)}`,
    `L${ix1.toFixed(2)},${iy1.toFixed(2)}`,
    `A${iR},${iR} 0 ${large} 0 ${ix2.toFixed(2)},${iy2.toFixed(2)}`,
    `Z`,
  ].join(" ");
}

/** SVG sparkline — 일별 조회수 추세. 14개 값(최근 14일) 받아서 폭에 맞춰 그림. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0)
    return <div className={styles.sparkline} aria-hidden />;
  const max = Math.max(...values, 1);
  const w = 100; // viewBox 기준 비율
  const h = 28;
  const stepX = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * h * 0.9 - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const areaPath = `M0,${h} L${points.join(" L")} L${w},${h} Z`;
  const linePath = `M${points.join(" L")}`;
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} className={styles.sparkArea} />
      <path d={linePath} className={styles.sparkLine} fill="none" />
    </svg>
  );
}

/* ── Skeleton state — 실제 dashboard 의 Section/Panel/List 추상화를 그대로 미러링 ── */
function DashboardSkeleton() {
  return (
    <div className={styles.container} aria-busy="true" aria-live="polite">
      {/* Header — title + refresh button */}
      <header className={styles.header}>
        <SkeletonLine width={180} height="var(--font-size-2xl)" />
        <SkeletonPill width={84} />
      </header>

      {/* Quick Actions — 4 buttons */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.quickActions}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} height={56} />
          ))}
        </Panel>
      </Section>

      {/* Stats — heroStat + 3 statCards + CategoryDonut + DailyViewsChart */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={60} />
        </SectionHeader>
        <Panel variant="grid" className={styles.statsGrid}>
          {/* heroStat — full row span at 3-col */}
          <div className={styles.heroStat}>
            <div className={styles.heroLeft}>
              <SkeletonLine width={80} height="var(--skeleton-h-line-sm)" />
              <div className={styles.heroValueRow}>
                <SkeletonLine width={140} height={48} />
                <SkeletonPill width={56} height={20} />
              </div>
              <SkeletonLine width={120} height="var(--skeleton-h-line-sm)" />
            </div>
            <SkeletonBlock width={180} height={56} />
          </div>
          {/* 3 stat cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.statCard}>
              <SkeletonLine width={60} height="var(--skeleton-h-line-sm)" />
              <SkeletonLine width={80} height={28} />
              <SkeletonLine width={100} height="var(--skeleton-h-line-sm)" />
            </div>
          ))}
        </Panel>

        {/* Category Donut + legend */}
        <Panel className={styles.donutWrap}>
          <SkeletonCircle size={140} />
          <List
            style={{
              flex: 1,
              minWidth: 140,
              height: 140,
              display: "grid",
              gridAutoRows: "1fr",
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItem key={i}>
                <SkeletonCircle size={10} />
                <SkeletonLine width={`${70 - i * 8}%`} />
              </ListItem>
            ))}
          </List>
        </Panel>

        {/* Daily Views Chart — header (title + stats + toggle) + chart area */}
        <Panel className={styles.dailyChart}>
          <header className={styles.panelHeader}>
            <PanelTitle variant="inset">
              <SkeletonLine width={120} />
            </PanelTitle>
            <SkeletonLine width={80} />
            <SkeletonPill width={56} height={20} />
            <SkeletonPill width={56} />
          </header>
          <SkeletonBlock height={220} />
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 최근 활동 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={120} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {Array.from({ length: 2 }).map((_, p) => (
            <Panel key={p} className={styles.panelCell}>
              <PanelTitle>
                <SkeletonLine width={100} />
              </PanelTitle>
              <List>
                {Array.from({ length: 5 }).map((_, i) => (
                  <ListItem key={i}>
                    <SkeletonPill width={48} height={18} />
                    <SkeletonLine width={`${60 - (i % 3) * 8}%`} />
                    <SkeletonLine
                      width={56}
                      height="var(--skeleton-h-line-sm)"
                    />
                  </ListItem>
                ))}
              </List>
            </Panel>
          ))}
        </Panel>
        {/* Recent Comments — same section */}
        <Panel className={styles.panelCell}>
          <PanelTitle>
            <SkeletonLine width={120} />
          </PanelTitle>
          <List>
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItem key={i} layout="column">
                <div className={styles.commentMeta}>
                  <SkeletonLine width={70} height="var(--skeleton-h-line-sm)" />
                  <SkeletonLine width={50} height="var(--skeleton-h-line-sm)" />
                </div>
                <SkeletonLine width={i % 2 === 0 ? "92%" : "70%"} />
                <SkeletonLine width={120} height="var(--skeleton-h-line-sm)" />
              </ListItem>
            ))}
          </List>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 인기 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {/* Popular Posts */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={120} />
            </PanelTitle>
            <List>
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItem key={i} layout="column">
                  <div className={styles.popularHeader}>
                    <SkeletonLine
                      width={28}
                      height="var(--skeleton-h-line-sm)"
                    />
                    <div className={styles.popularStats}>
                      <SkeletonLine
                        width={32}
                        height="var(--skeleton-h-line-sm)"
                      />
                      <SkeletonLine
                        width={28}
                        height="var(--skeleton-h-line-sm)"
                      />
                    </div>
                  </div>
                  <SkeletonLine width={`${85 - (i % 3) * 10}%`} />
                  <div className={styles.popularMeta}>
                    <SkeletonLine
                      width={50}
                      height="var(--skeleton-h-line-sm)"
                    />
                    <SkeletonLine
                      width={70}
                      height="var(--skeleton-h-line-sm)"
                    />
                  </div>
                </ListItem>
              ))}
            </List>
          </Panel>
          {/* Top Tags */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={80} />
            </PanelTitle>
            <Item className={styles.tagsItem}>
              {[68, 84, 56, 100, 72, 92, 60, 76, 88, 64, 96, 70].map((w, i) => (
                <SkeletonPill key={i} width={w} />
              ))}
            </Item>
          </Panel>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 트래픽 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {/* Traffic Sources — bar list */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={120} />
            </PanelTitle>
            <List>
              {Array.from({ length: 6 }).map((_, i) => (
                <ListItem key={i} layout="grid" className={styles.referrerRow}>
                  <SkeletonLine width={70} />
                  <SkeletonPill height={6} />
                  <SkeletonLine width={50} />
                </ListItem>
              ))}
            </List>
          </Panel>
          {/* Devices — 3 small charts */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={80} />
            </PanelTitle>
            <div className={styles.skelDevicesRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} height={80} />
              ))}
            </div>
          </Panel>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 시스템 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={100} />
        </SectionHeader>
        <Panel variant="grid" cols="repeat(2, 1fr)" insetItems>
          {Array.from({ length: 8 }).map((_, i) => (
            <Item key={i} className={styles.serviceItem}>
              <SkeletonCircle size={8} />
              <SkeletonLine width="60%" />
              <SkeletonLine width={40} height="var(--skeleton-h-line-sm)" />
            </Item>
          ))}
        </Panel>
      </Section>
    </div>
  );
}
