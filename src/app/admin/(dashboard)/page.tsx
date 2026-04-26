"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Settings, Bell, TrendingUp, TrendingDown, MessageSquare, Eye, Heart, Globe, Smartphone, Monitor, Tablet, ChevronRight } from "lucide-react";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import CloseIcon from "@/components/ui/CloseIcon";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import { ModalAlert } from "@/components/ui/ModalTemplates";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { useModalStore } from "@/stores/modalStore";
import styles from "./Dashboard.module.css";

interface DashboardData {
  posts: {
    total: number;
    drafts: number;
    published: number;
    recent: Array<{ id: string; title: string; slug: string; published: boolean; view_count: number; created_at: string; updated_at: string }>;
  };
  works: {
    total: number;
    drafts: number;
    published: number;
    recent: Array<{ id: string; title: string; slug: string; published: boolean; created_at: string; updated_at: string }>;
  };
  comments: {
    total: number;
    recent: Array<{ id: string; nickname: string; content: string; is_admin: boolean; created_at: string; post_title: string; post_slug: string }>;
  };
  notifications: {
    unreadCount: number;
    recent: Array<{ id: string; type: string; title: string; message: string; read: boolean; created_at: string }>;
  };
  stats: {
    totalPostViews: number;
    popularPosts: Array<{
      id: string;
      title: string;
      slug: string;
      view_count: number;
      like_count: number;
      category?: string | null;
      created_at?: string;
      comment_count?: number;
    }>;
    dailyViews: Array<{ day: string; views: number }>;
    categories: Array<{ name: string; postCount: number; views: number }>;
    tags: Array<{ tag: string; count: number }>;
    /** 유입 경로 top — referrer 호스트 단위 집계 (site_visits.referrer 필요 — 마이그레이션 후 활성) */
    referrers?: Array<{ source: string; count: number; pct: number }>;
    /** 기기 분석 — UA 파싱 후 desktop/mobile/tablet 비율 (site_visits.user_agent 필요) */
    devices?: Array<{ kind: "desktop" | "mobile" | "tablet"; count: number; pct: number }>;
    /** OS 분포 — UA에서 OS 추출 (macOS / Windows / iOS / Android / Linux) */
    operatingSystems?: Array<{ name: string; count: number; pct: number }>;
    /** 브라우저 분포 — UA에서 브라우저 추출 (Chrome / Safari / Firefox / Edge ...) */
    browsers?: Array<{ name: string; count: number; pct: number }>;
    /** 디바이스 종류별 모델 분포 — drill-down 용 (desktop=Mac/PC, mobile=iPhone/Pixel 8/SM-S921N..., tablet=iPad/Galaxy Tab...) */
    deviceModels?: {
      desktop: Array<{ model: string; count: number; pct: number }>;
      mobile: Array<{ model: string; count: number; pct: number }>;
      tablet: Array<{ model: string; count: number; pct: number }>;
    };
  };
  services: Record<string, "configured" | "missing">;
}

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const searchParams = useSearchParams();
  const mockMode = searchParams.get("mock") === "true";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Devices drill-down 선택 상태 — 부모로 끌어올려서 Traffic Sources 패널을 접고 Devices를 풀폭으로 확장 가능
  const [deviceDrillKind, setDeviceDrillKind] = useState<"desktop" | "mobile" | "tablet" | null>(null);
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

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => clearTimeout(timer);
  }, [setInfinite, lenis, stop, start]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Mock mode: ?mock=true 로 접속 시 더미 데이터로 UI 미리보기 (DB 무관)
      if (mockMode) {
        setData(buildMockDashboard());
        setError(null);
        return;
      }
      const res = await fetch("/api/admin/dashboard");
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
  }, [mockMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <h1 className={styles.title}><T k="admin.dashboard.title" /></h1>
        <p className={styles.error}>{error ?? t("admin.dashboard.loadError")}</p>
      </div>
    );
  }

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return language === "ko" ? "방금 전" : "just now";
      if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return language === "ko" ? `${days}일 전` : `${days}d ago`;
      return d.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}><T k="admin.dashboard.title" /></h1>
        <button type="button" className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          {loading ? <T k="admin.dashboard.loading" /> : <T k="admin.dashboard.refresh" />}
        </button>
      </header>

      {/* ── Quick Actions — 공통 Button 컴포넌트 사용, .actionBtn 은 표 셀 스타일 override ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.dashboard.quickActions" /></h2>
        <div className={styles.quickActions}>
          <Button href="/admin/posts/new" variant="ghost" size="md" fullWidth icon={<Plus size={18} strokeWidth={1.6} />} className={styles.actionBtn}>
            <T k="admin.dashboard.newPost" />
          </Button>
          <Button href="/admin/works/new" variant="ghost" size="md" fullWidth icon={<Plus size={18} strokeWidth={1.6} />} className={styles.actionBtn}>
            <T k="admin.dashboard.newWork" />
          </Button>
          <Button href="/admin/settings" variant="ghost" size="md" fullWidth icon={<Settings size={18} strokeWidth={1.6} />} className={styles.actionBtn}>
            <T k="admin.dashboard.openSettings" />
          </Button>
          <Button href="/admin/notifications" variant="ghost" size="md" fullWidth icon={<Bell size={18} strokeWidth={1.6} />} className={styles.actionBtn}>
            <T k="admin.dashboard.viewNotifications" />
            {data.notifications.unreadCount > 0 && (
              <span className={styles.badgeWrap} aria-label={`${data.notifications.unreadCount} unread`}>
                <span className={styles.badgePulse} aria-hidden />
                <span className={styles.badge}>{data.notifications.unreadCount}</span>
              </span>
            )}
          </Button>
        </div>
      </section>

      {/* ── Stats: Hero (Total Views) + 보조 3개 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.dashboard.stats" /></h2>

        {/* Hero — Total Views: 큰 숫자 + sparkline + WoW. accent 그라데이션 배경 */}
        <div className={styles.heroStat}>
          <div className={styles.heroLeft}>
            <span className={styles.heroLabel}><T k="admin.dashboard.totalViews" /></span>
            <div className={styles.heroValueRow}>
              <span className={styles.heroValue}><CountUp value={data.stats.totalPostViews} duration={1400} /></span>
              {wow && (
                <span
                  className={`${styles.trendBadge} ${styles.trendBadgeLg} ${wow.direction === "up" ? styles.trendUp : styles.trendDown}`}
                  title={t("admin.dashboard.trendVsPrev7")}
                >
                  {wow.direction === "up" ? <TrendingUp size={13} strokeWidth={2.5} /> : <TrendingDown size={13} strokeWidth={2.5} />}
                  {Math.abs(wow.pct)}%
                </span>
              )}
            </div>
            <span className={styles.heroMeta}>
              {(() => {
                const recent7 = data.stats.dailyViews.slice(-7).reduce((s, d) => s + d.views, 0);
                return language === "ko" ? `최근 7일 ${recent7.toLocaleString()}회` : `${recent7.toLocaleString()} last 7d`;
              })()}
            </span>
          </div>
          <div className={styles.heroSparkWrap} aria-hidden>
            <Sparkline values={data.stats.dailyViews.slice(-14).map((d) => d.views)} />
          </div>
        </div>

        <div className={styles.statsGrid}>
          <Link href="/admin/posts" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.posts" /></span>
            <span className={styles.statValue}><CountUp value={data.posts.total} /></span>
            <span className={styles.statMeta}>
              {data.posts.published} <T k="admin.dashboard.published" /> · {data.posts.drafts} <T k="admin.dashboard.drafts" />
            </span>
            <RatioBar published={data.posts.published} total={data.posts.total} />
          </Link>
          <Link href="/admin/works" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.works" /></span>
            <span className={styles.statValue}><CountUp value={data.works.total} /></span>
            <span className={styles.statMeta}>
              {data.works.published} <T k="admin.dashboard.published" /> · {data.works.drafts} <T k="admin.dashboard.drafts" />
            </span>
            <RatioBar published={data.works.published} total={data.works.total} />
          </Link>
          <Link href="/admin/comments" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.comments" /></span>
            <span className={styles.statValue}><CountUp value={data.comments.total} /></span>
            <span className={styles.statMeta}>
              {data.posts.published > 0
                ? `${(data.comments.total / data.posts.published).toFixed(1)} ${language === "ko" ? "/ 게시물" : "/ post"}`
                : " "}
            </span>
            <CommentDots count={data.comments.recent.length} />
          </Link>
        </div>
      </section>

      {/* ── Daily Views Chart (full-width) ── */}
      <section className={styles.section}>
        <DailyViewsChart data={data.stats.dailyViews} language={language} t={t} mockMode={mockMode} />
      </section>

      {/* ── Popular Posts + Recent Comments — 2-col ── */}
      <section className={styles.twoCol}>
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.popularPosts" /></h2>
          {data.stats.popularPosts.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noPopular" /></p>
          ) : (
            <ul className={styles.popularList}>
              {data.stats.popularPosts.map((p, i) => (
                <li key={p.id} className={styles.popularItem}>
                  {/* L1: rank + 메인 stats (commentMeta 와 mirror 구조) */}
                  <div className={styles.popularHeader}>
                    <span className={styles.popularRank}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.popularStats}>
                      <span className={styles.popularStat} title={language === "ko" ? "조회" : "views"}>
                        <Eye size={11} strokeWidth={2} />
                        {p.view_count.toLocaleString()}
                      </span>
                      {(p.like_count ?? 0) > 0 && (
                        <span className={styles.popularStat} title={language === "ko" ? "좋아요" : "likes"}>
                          <Heart size={11} strokeWidth={2} />
                          {p.like_count}
                        </span>
                      )}
                      {(p.comment_count ?? 0) > 0 && (
                        <span className={styles.popularStat} title={language === "ko" ? "댓글" : "comments"}>
                          <MessageSquare size={11} strokeWidth={2} />
                          {p.comment_count}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* L2: 제목 */}
                  <Link href={`/posts/${p.slug}`} className={styles.popularTitle}>{p.title}</Link>
                  {/* L3: 카테고리 + 날짜 — 빈 데이터일 때도 placeholder 로 동일 height 유지 */}
                  <div className={styles.popularMeta}>
                    {p.category && <span className={styles.popularCat}>{p.category}</span>}
                    {p.created_at ? (
                      <span className={styles.popularDate}>{fmtDate(p.created_at)}</span>
                    ) : !p.category ? <span>&nbsp;</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.recentComments" /></h2>
          {data.comments.recent.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noComments" /></p>
          ) : (
            <ul className={styles.list}>
              {data.comments.recent.map((c) => (
                <li key={c.id} className={styles.commentItem}>
                  {/* L1: author + time */}
                  <div className={styles.commentMeta}>
                    <span className={`${styles.commentAuthor} ${c.is_admin ? styles.commentAuthorAdmin : ""}`}>
                      {c.is_admin ? "Admin" : c.nickname}
                    </span>
                    <span className={styles.timeAgo}>{fmtDate(c.created_at)}</span>
                  </div>
                  {/* L2: content */}
                  <p className={styles.commentBody}>{c.content}</p>
                  {/* L3: 출처 게시물 링크 — 없을 때도 placeholder 로 동일 height 유지 */}
                  {c.post_slug ? (
                    <Link href={`/posts/${c.post_slug}`} className={styles.commentSource}>
                      ↗ {c.post_title}
                    </Link>
                  ) : (
                    <span className={styles.commentSource}>&nbsp;</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Content Analytics — 카테고리 도넛 + 태그 클라우드 ── */}
      <section className={styles.twoCol}>
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.topCategories" /></h2>
          {data.stats.categories.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noCategories" /></p>
          ) : (
            <CategoryDonut data={data.stats.categories} language={language} t={t} />
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.topTags" /></h2>
          {data.stats.tags.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noTags" /></p>
          ) : (
            <div className={styles.tagCloud}>
              {data.stats.tags.map(({ tag, count }) => (
                <span key={tag} className={styles.tagPill} title={`${count}`}>
                  {tag}
                  <span className={styles.tagPillCount}>{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recent Posts + Recent Works — 2-col ── */}
      <section className={styles.twoCol}>
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.recentPosts" /></h2>
          {data.posts.recent.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noPosts" /></p>
          ) : (
            <ul className={styles.list}>
              {data.posts.recent.map((p) => (
                <li key={p.id} className={styles.listItem}>
                  <span className={p.published ? styles.statusPub : styles.statusDraft}>
                    {p.published ? <T k="admin.dashboard.published" /> : <T k="admin.dashboard.draft" />}
                  </span>
                  <Link href={`/admin/posts/${p.id}`} className={styles.itemTitle}>{p.title}</Link>
                  <span className={styles.itemDate}>{fmtDate(p.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.recentWorks" /></h2>
          {data.works.recent.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noWorks" /></p>
          ) : (
            <ul className={styles.list}>
              {data.works.recent.map((w) => (
                <li key={w.id} className={styles.listItem}>
                  <span className={w.published ? styles.statusPub : styles.statusDraft}>
                    {w.published ? <T k="admin.dashboard.published" /> : <T k="admin.dashboard.draft" />}
                  </span>
                  <Link href={`/admin/works/${w.id}`} className={styles.itemTitle}>{w.title}</Link>
                  <span className={styles.itemDate}>{fmtDate(w.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Traffic Sources + Device Breakdown — 2-col, 기기 drill-down 시 Traffic 접히고 Devices 풀폭 확장 ── */}
      {(data.stats.referrers || data.stats.devices) && (
        <section
          ref={devicesSectionRef}
          className={`${styles.twoCol} ${deviceDrillKind ? styles.twoColExpanded : ""}`}
          data-expanded={deviceDrillKind ? "devices" : undefined}
        >
          {data.stats.referrers && (
            <div className={`${styles.panel} ${deviceDrillKind ? styles.panelCollapsed : ""}`} aria-hidden={!!deviceDrillKind}>
              <h2 className={styles.sectionTitle}><T k="admin.dashboard.trafficSources" /></h2>
              <ul className={styles.referrerList}>
                {data.stats.referrers.map((r) => (
                  <li key={r.source} className={styles.referrerRow}>
                    <span className={styles.referrerSource}>
                      <Globe size={11} strokeWidth={2} />
                      {r.source}
                    </span>
                    <div className={styles.referrerBarTrack} aria-hidden>
                      <div className={styles.referrerBar} style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className={styles.referrerMeta}>
                      <span className={styles.referrerPct}>{r.pct}%</span>
                      <span className={styles.referrerCount}>{r.count.toLocaleString()}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.stats.devices && (
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}><T k="admin.dashboard.devices" /></h2>
              <DevicesBreakdown
                deviceTypes={data.stats.devices}
                operatingSystems={data.stats.operatingSystems}
                browsers={data.stats.browsers}
                deviceModels={data.stats.deviceModels}
                language={language}
                drillKind={deviceDrillKind}
                onDrillChange={setDeviceDrillKind}
              />
            </div>
          )}
        </section>
      )}


      {/* ── Service Status ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.dashboard.serviceStatus" /></h2>
        <div className={styles.serviceGrid}>
          {Object.entries(data.services).map(([key, status]) => (
            <div key={key} className={styles.serviceItem}>
              <span className={`${styles.statusDot} ${status === "configured" ? styles.dotOk : styles.dotMissing}`} aria-hidden />
              <span className={styles.serviceName}>{key}</span>
              <span className={styles.serviceStatus}>
                {status === "configured" ? <T k="admin.dashboard.configured" /> : <T k="admin.dashboard.missing" />}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.helperText}>
          <T k="admin.dashboard.dbConnected" />
        </p>
      </section>
    </div>
  );
}

/* ── 더미 데이터 생성기 — ?mock=true 모드에서 차트 UI 미리보기용 (DB 무관) ── */
function buildMockDashboard(): DashboardData {
  // 90일치 일별 조회수 — 점진적 증가 + 주말 dip + 약간의 잡음 (클라이언트에서 7/14/30/90 슬라이스)
  const dailyViews = Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    const dow = date.getDay(); // 0=일, 6=토
    const trend = 30 + i * 1.2; // 점진적 증가
    const weekendDip = (dow === 0 || dow === 6) ? -15 : 0;
    const noise = Math.round((Math.random() - 0.5) * 25);
    const views = Math.max(0, Math.round(trend + weekendDip + noise));
    return { day: date.toISOString().slice(0, 10), views };
  });

  const totalPostViews = dailyViews.reduce((s, d) => s + d.views, 0) + 4823;

  return {
    posts: {
      total: 24,
      drafts: 5,
      published: 19,
      recent: [
        { id: "p1", title: "Mock — 디자인 시스템 토큰 3-layer 구조 정리", slug: "design-tokens", published: true,  view_count: 412, created_at: iso(-2),  updated_at: iso(-2) },
        { id: "p2", title: "Mock — Lenis + GSAP ScrollTrigger 무한 가로 스크롤", slug: "infinite-h-scroll", published: true,  view_count: 318, created_at: iso(-5),  updated_at: iso(-5) },
        { id: "p3", title: "Mock — Plate.js 에디터 커스텀 각주 만들기",         slug: "plate-footnote",     published: false, view_count: 0,   created_at: iso(-7),  updated_at: iso(-1) },
        { id: "p4", title: "Mock — Supabase RLS 패턴 (single-admin)",            slug: "supabase-rls",       published: true,  view_count: 256, created_at: iso(-9),  updated_at: iso(-9) },
        { id: "p5", title: "Mock — Three.js R3F 코피잔 + 라떼아트 만들기",      slug: "r3f-coffee",         published: true,  view_count: 198, created_at: iso(-11), updated_at: iso(-10) },
      ],
    },
    works: {
      total: 12,
      drafts: 2,
      published: 10,
      recent: [
        { id: "w1", title: "Arc Portfolio v3", slug: "arc-portfolio", published: true,  created_at: iso(-3), updated_at: iso(-1) },
        { id: "w2", title: "Plate Editor Suite", slug: "plate-editor",  published: true,  created_at: iso(-6), updated_at: iso(-6) },
        { id: "w3", title: "Cylinder Gallery (WIP)", slug: "cylinder",       published: false, created_at: iso(-8), updated_at: iso(-2) },
        { id: "w4", title: "Latte Art Generator",  slug: "latte-art",      published: true,  created_at: iso(-12), updated_at: iso(-12) },
      ],
    },
    comments: {
      total: 87,
      recent: [
        { id: "c1", nickname: "guest_42",    content: "이 디자인 시스템 정리 정말 깔끔하네요. 토큰 3-layer 구조가 너무 인상적이에요.", is_admin: false, created_at: iso(0, 12),  post_title: "Mock — 디자인 시스템 토큰 3-layer 구조 정리", post_slug: "design-tokens" },
        { id: "c2", nickname: "Admin",       content: "감사합니다! 다음 글에서 context layer 패턴을 더 자세히 풀어보겠습니다.",       is_admin: true,  created_at: iso(0, 8),   post_title: "Mock — 디자인 시스템 토큰 3-layer 구조 정리", post_slug: "design-tokens" },
        { id: "c3", nickname: "dev_reader",  content: "Lenis + GSAP 조합 진짜 매끈하게 동작하네요. velocity 활용 팁 더 부탁드려요!",   is_admin: false, created_at: iso(-1, 6),  post_title: "Mock — Lenis + GSAP ScrollTrigger 무한 가로 스크롤", post_slug: "infinite-h-scroll" },
        { id: "c4", nickname: "user_anon",   content: "RLS 정책 예시 코드가 큰 도움이 됐습니다.",                                      is_admin: false, created_at: iso(-2, 14), post_title: "Mock — Supabase RLS 패턴 (single-admin)",       post_slug: "supabase-rls" },
        { id: "c5", nickname: "designer_yj", content: "라떼아트 커스텀 가능한가요?",                                                  is_admin: false, created_at: iso(-3, 10), post_title: "Mock — Three.js R3F 코피잔 + 라떼아트 만들기", post_slug: "r3f-coffee" },
      ],
    },
    notifications: { unreadCount: 3, recent: [] },
    stats: {
      totalPostViews,
      popularPosts: [
        { id: "p1", title: "Mock — 디자인 시스템 토큰 3-layer 구조 정리",         slug: "design-tokens",      view_count: 412, like_count: 38, category: "Design",      created_at: iso(-30), comment_count: 12 },
        { id: "p2", title: "Mock — Lenis + GSAP ScrollTrigger 무한 가로 스크롤",  slug: "infinite-h-scroll",  view_count: 318, like_count: 24, category: "Tech",        created_at: iso(-45), comment_count: 8 },
        { id: "p4", title: "Mock — Supabase RLS 패턴 (single-admin)",             slug: "supabase-rls",       view_count: 256, like_count: 19, category: "Engineering", created_at: iso(-60), comment_count: 5 },
        { id: "p5", title: "Mock — Three.js R3F 코피잔 + 라떼아트 만들기",        slug: "r3f-coffee",         view_count: 198, like_count: 31, category: "Tech",        created_at: iso(-22), comment_count: 14 },
        { id: "p6", title: "Mock — PageTransitionProvider 모핑 효과 분해",         slug: "page-transition",    view_count: 143, like_count: 12, category: "Tech",        created_at: iso(-15), comment_count: 3 },
      ],
      dailyViews,
      categories: [
        { name: "Tech",        postCount: 12, views: 1842 },
        { name: "Design",      postCount: 7,  views: 1356 },
        { name: "Engineering", postCount: 5,  views: 982 },
        { name: "Process",     postCount: 3,  views: 542 },
        { name: "Performance", postCount: 2,  views: 318 },
        { name: "DevOps",      postCount: 1,  views: 142 },
      ],
      tags: [
        { tag: "React",         count: 18 },
        { tag: "Next.js",       count: 14 },
        { tag: "TypeScript",    count: 12 },
        { tag: "CSS",           count: 9 },
        { tag: "GSAP",          count: 7 },
        { tag: "Three.js",      count: 5 },
        { tag: "Framer Motion", count: 4 },
        { tag: "Plate.js",      count: 4 },
        { tag: "Supabase",      count: 3 },
        { tag: "Performance",   count: 3 },
        { tag: "RLS",           count: 2 },
        { tag: "Lenis",         count: 2 },
      ],
      referrers: [
        { source: "google.com",          count: 1248, pct: 47 },
        { source: "github.com",          count: 524,  pct: 20 },
        { source: "twitter.com",         count: 312,  pct: 12 },
        { source: "Direct",              count: 268,  pct: 10 },
        { source: "linkedin.com",        count: 156,  pct: 6 },
        { source: "Other",               count: 132,  pct: 5 },
      ],
      devices: [
        { kind: "desktop", count: 1834, pct: 69 },
        { kind: "mobile",  count: 658,  pct: 25 },
        { kind: "tablet",  count: 148,  pct: 6 },
      ],
      operatingSystems: [
        { name: "macOS",   count: 1042, pct: 39 },
        { name: "Windows", count: 712,  pct: 27 },
        { name: "iOS",     count: 524,  pct: 20 },
        { name: "Android", count: 282,  pct: 11 },
        { name: "Linux",   count: 80,   pct: 3 },
      ],
      browsers: [
        { name: "Chrome",           count: 1418, pct: 53 },
        { name: "Safari",           count: 692,  pct: 26 },
        { name: "Edge",             count: 264,  pct: 10 },
        { name: "Firefox",          count: 158,  pct: 6 },
        { name: "Samsung Internet", count: 86,   pct: 3 },
        { name: "Other",            count: 22,   pct: 2 },
      ],
      deviceModels: {
        desktop: [
          { model: "Mac",          count: 1042, pct: 57 },
          { model: "PC",           count: 712,  pct: 39 },
          { model: "Linux PC",     count: 60,   pct: 3 },
          { model: "Chromebook",   count: 20,   pct: 1 },
        ],
        mobile: [
          { model: "iPhone",       count: 286, pct: 43 },
          { model: "Pixel 8",      count: 96,  pct: 15 },
          { model: "SM-S921N",     count: 78,  pct: 12 },
          { model: "SM-G998N",     count: 64,  pct: 10 },
          { model: "OnePlus 11",   count: 48,  pct: 7 },
          { model: "Pixel 7a",     count: 42,  pct: 6 },
          { model: "Android Phone",count: 44,  pct: 7 },
        ],
        tablet: [
          { model: "iPad",         count: 92, pct: 62 },
          { model: "Galaxy Tab S9",count: 32, pct: 22 },
          { model: "SM-T970",      count: 14, pct: 9 },
          { model: "Android Tablet",count: 10, pct: 7 },
        ],
      },
    },
    services: {
      NANOBANANA_API_KEY:        "configured",
      HUGGINGFACE_API_KEY:       "configured",
      GEMINI_API_KEY:            "configured",
      OPENAI_API_KEY:            "missing",
      ANTHROPIC_API_KEY:         "configured",
      DEEPL_API_KEY:             "configured",
      GOOGLE_TRANSLATE_API_KEY:  "missing",
      RESEND_API_KEY:            "configured",
    },
  };
}

/** N 일 전 (option: hour offset) → ISO string */
function iso(daysAgo: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAgo);
  d.setHours(d.getHours() - hourOffset);
  return d.toISOString();
}

/* ── Animated count-up — RAF 로 0 에서 target 까지 easeOutCubic 트윈 (1.2s) ── */
function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
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
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
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
    { id: "type", label: language === "ko" ? "기기" : "Type", available: deviceTypes.length > 0 },
    { id: "os", label: language === "ko" ? "OS" : "OS", available: !!operatingSystems?.length },
    { id: "browser", label: language === "ko" ? "브라우저" : "Browser", available: !!browsers?.length },
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

  let items: { name: string; count: number; pct: number; icon?: typeof Monitor; kind?: DeviceKind }[] = [];
  if (activeTab === "type") {
    const labels = {
      desktop: language === "ko" ? "데스크탑" : "Desktop",
      mobile: language === "ko" ? "모바일" : "Mobile",
      tablet: language === "ko" ? "태블릿" : "Tablet",
    };
    const icons = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
    items = deviceTypes.map((d) => ({ name: labels[d.kind], count: d.count, pct: d.pct, icon: icons[d.kind], kind: d.kind }));
  } else if (activeTab === "os" && operatingSystems) {
    items = operatingSystems.map((o) => ({ name: o.name, count: o.count, pct: o.pct }));
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
      {/* 탭 — capsule 형태, hover indicator */}
      <div className={styles.deviceTabs} role="tablist">
        {tabs.filter((t) => t.available).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`${styles.deviceTab} ${activeTab === t.id ? styles.deviceTabActive : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.devicesWrap} key={activeTab /* 탭 변경 시 fade-in 재실행 */}>
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
                <title>{arc.name} · {arc.count.toLocaleString()} ({arc.pct}%)</title>
              </path>
            ))
          )}
          <text x={70} y={66} textAnchor="middle" className={styles.donutCenterValue}>
            {total.toLocaleString()}
          </text>
          <text x={70} y={82} textAnchor="middle" className={styles.donutCenterLabel}>
            {language === "ko" ? "방문" : "visits"}
          </text>
        </svg>
        <ul className={styles.deviceLegend}>
          {arcs.map((arc, i) => {
            const Icon = arc.icon;
            const drillable = activeTab === "type" && !!arc.kind && !!deviceModels?.[arc.kind];
            const isOpen = drillable && drillKind === arc.kind;
            const content = (
              <>
                <span className={styles.deviceLegendSwatch} style={{ background: arc.color }} aria-hidden />
                {Icon && <Icon size={13} strokeWidth={2} className={styles.deviceLegendIcon} />}
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
              <li key={`${arc.name}-${i}`} className={styles.deviceLegendItem}>
                {drillable ? (
                  <button
                    type="button"
                    className={`${styles.deviceLegendBtn} ${isOpen ? styles.deviceLegendBtnActive : ""}`}
                    onClick={() => onDrillChange(isOpen ? null : (arc.kind as DeviceKind))}
                    aria-expanded={isOpen}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={styles.deviceLegendBtn}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
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
    <div className={styles.deviceDrill} key={kind /* kind 바뀌면 fade-in 재실행 */}>
      <div className={styles.deviceDrillHeader}>
        <span className={styles.deviceDrillTitle}>
          {kindLabels[kind]} · {language === "ko" ? "기기 모델" : "Top devices"}
        </span>
        <button
          type="button"
          className={styles.deviceDrillClose}
          onClick={onClose}
          aria-label={language === "ko" ? "닫기" : "Close"}
          data-close-trigger
        >
          <CloseIcon />
        </button>
      </div>
      {models.length === 0 ? (
        <p className={styles.deviceDrillEmpty}>
          {language === "ko" ? "데이터가 없습니다." : "No data yet."}
        </p>
      ) : (
        <ul className={styles.deviceDrillList}>
          {models.map((m, i) => (
            <li
              key={`${m.model}-${i}`}
              className={styles.deviceDrillRow}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={styles.deviceDrillName} title={m.model}>{m.model}</span>
              <span className={styles.deviceDrillBarTrack}>
                <span
                  className={styles.deviceDrillBarFill}
                  style={{ width: `${(m.count / max) * 100}%` }}
                />
              </span>
              <span className={styles.deviceDrillCount}>{m.count.toLocaleString()}</span>
              <span className={styles.deviceDrillPct}>{m.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── 시각화 컴포넌트 ── */
function RatioBar({ published, total }: { published: number; total: number }) {
  if (total === 0) return <div className={styles.ratioBar} aria-hidden />;
  const pct = Math.max(0, Math.min(100, (published / total) * 100));
  return (
    <div className={styles.ratioBar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className={styles.ratioBarFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CommentDots({ count }: { count: number }) {
  return (
    <div className={styles.dotIndicator} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? styles.dotActive : ""} />
      ))}
    </div>
  );
}

/** 일별 조회수 — SVG 면적 차트. 시작일/종료일 기반 날짜 범위 선택. 부드러운 스플라인 + 그라데이션 fill.
 *  점/하단 라벨 클릭 시 해당 날짜의 상세 분석 패널이 펼쳐짐. */
function DailyViewsChart({
  data: rawData,
  language,
  t,
  mockMode,
}: {
  data: { day: string; views: number }[];
  language: "ko" | "en";
  t: (key: string) => string;
  mockMode: boolean;
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

  // 시작일이 종료일보다 늦으면 자동 swap (사용자가 거꾸로 골랐을 때 보정)
  const [normStart, normEnd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  // 범위 변경 시 인덱스 리셋
  useEffect(() => {
    setSelectedIdx(null);
    setHoveredIdx(null);
  }, [normStart, normEnd]);

  // rawData 에서 [normStart, normEnd] 구간만 슬라이스
  const data = useMemo(
    () => rawData.filter((d) => d.day >= normStart && d.day <= normEnd),
    [rawData, normStart, normEnd],
  );

  // 같은 길이의 직전 구간과 비교한 변화율
  const wow = useMemo(() => {
    if (data.length === 0) return null;
    const startIdxInRaw = rawData.findIndex((d) => d.day === data[0].day);
    if (startIdxInRaw <= 0) return null; // 직전 구간 없음
    const prevSlice = rawData.slice(Math.max(0, startIdxInRaw - data.length), startIdxInRaw);
    if (prevSlice.length === 0) return null;
    const cur = data.reduce((s, d) => s + d.views, 0);
    const prev = prevSlice.reduce((s, d) => s + d.views, 0);
    if (prev === 0 && cur === 0) return null;
    if (prev === 0) return { pct: 100, direction: "up" as const };
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { pct, direction: pct >= 0 ? ("up" as const) : ("down" as const) };
  }, [rawData, data]);

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
    const desc = language === "ko"
      ? reason === "future"
        ? "미래 날짜는 선택할 수 없어 오늘로 자동 보정됐어요."
        : "최대 2주(14일)까지만 선택 가능해 자동으로 보정됐어요."
      : reason === "future"
        ? "Future dates aren't allowed — adjusted to today."
        : "Max range is 2 weeks (14 days) — auto-adjusted.";
    openModal(<ModalAlert desc={desc} confirmText={language === "ko" ? "확인" : "OK"} />, {
      header: { title: language === "ko" ? "날짜 범위 안내" : "Date range notice" },
    });
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
  /* 점이 컨테이너 양 끝(0, W)까지 균등 분포 → area 좌우 가장자리가 직각으로 떨어짐
     라벨은 absolute + translateX(-50%) 로 같은 위치에 정렬 */
  const stepX = W / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: H - PAD_B - (d.views / max) * (H - PAD_T - PAD_B),
    v: d.views,
    day: d.day,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${W},${H - PAD_B} L0,${H - PAD_B} Z`;
  const todayPt = points[points.length - 1];
  // active indicator — hover 우선, 없으면 selected. 같은 element 가 left/top transition 으로 부드럽게 슬라이드
  const activeIdx = hoveredIdx ?? selectedIdx;
  const activePt = activeIdx !== null ? points[activeIdx] : null;

  // 라벨 culling — 90일이면 모든 라벨이 빽빽하므로 ~10개 정도로 추리기
  const labelStep = data.length <= 14 ? 1 : Math.ceil(data.length / 10);
  const showLabel = (i: number) => i === 0 || i === data.length - 1 || i % labelStep === 0;

  const toggle = (i: number) => setSelectedIdx((cur) => (cur === i ? null : i));

  return (
    <div className={styles.dailyChart}>
      <div className={styles.dailyChartHeader}>
        {/* 좌측: 제목 + 날짜 범위 선택기 (시작일/종료일) */}
        <div className={styles.dailyChartHeaderLeft}>
          <h2 className={styles.sectionTitle}>{t("admin.dashboard.dailyViewsTitle")}</h2>
          <div className={styles.periodRange}>
            <DateRangeTrigger
              label={language === "ko" ? "시작일" : "Start"}
              date={startDate}
              isOpen={openPicker === "start"}
              onOpen={() => setOpenPicker((cur) => (cur === "start" ? null : "start"))}
              onClose={() => setOpenPicker(null)}
              onSelect={handleStartChange}
              language={language}
            />
            <span className={styles.periodRangeSep} aria-hidden>—</span>
            <DateRangeTrigger
              label={language === "ko" ? "종료일" : "End"}
              date={endDate}
              isOpen={openPicker === "end"}
              onOpen={() => setOpenPicker((cur) => (cur === "end" ? null : "end"))}
              onClose={() => setOpenPicker(null)}
              onSelect={handleEndChange}
              language={language}
            />
          </div>
        </div>

        {/* 우측: 기간 합계 + 직전 동일 기간 대비 변화율 */}
        <div className={styles.dailyChartStats}>
          <div className={styles.dailyChartStatItem}>
            <span className={styles.dailyChartStatLabel}>
              {language === "ko" ? "기간 합계" : "Total"}
            </span>
            <span className={styles.dailyChartTotal}>{total.toLocaleString()}</span>
          </div>
          {wow && (
            <div className={styles.dailyChartStatItem}>
              <span className={styles.dailyChartStatLabel}>
                {language === "ko" ? "직전 기간 대비" : "vs prev"}
              </span>
              <span
                className={`${styles.trendBadge} ${wow.direction === "up" ? styles.trendUp : styles.trendDown}`}
              >
                {wow.direction === "up" ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
                {Math.abs(wow.pct)}%
              </span>
            </div>
          )}
        </div>
      </div>
      <div
        className={styles.areaWrap}
        role="img"
        aria-label={t("admin.dashboard.dailyViewsTitle")}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* path 만 SVG — 늘어나도 곡선 형태는 자연스러움 */}
        <div className={styles.chartArea}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.areaSvg}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--color-accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#areaGrad)" />
            <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
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
            const isHoveringElsewhere = hoveredIdx !== null && hoveredIdx !== i;
            // 다른 날짜 선택 / 다른 dot hover 중이면 오늘 dot 숨김 (active indicator 가 이동했으므로)
            const showAsToday = isToday && selectedIdx === null && !isHoveringElsewhere;
            // 다른 dot 을 hover 중이면 selected dot 도 숨김 — indicator 가 hover 위치로 이동한 느낌
            const showAsSelected = isSelected && !isHoveringElsewhere;
            const isEmphasized = showAsToday || showAsSelected || isHovered;
            return (
              <button
                key={i}
                type="button"
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
              </button>
            );
          })}
        </div>
        {/* 하단 day 라벨 — absolute 포지션, 점과 같은 X 위치(0%~100%)에 중앙 정렬.
            indicator 는 hovered → selected → today 순으로 위치, smooth slide */}
        <div className={styles.areaDays}>
          {/* Sliding circle indicator — 라벨 뒤 배경 */}
          {(() => {
            const targetIdx = hoveredIdx ?? selectedIdx ?? data.length - 1;
            const leftPct = (targetIdx / Math.max(data.length - 1, 1)) * 100;
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
            const dow = date.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { weekday: "short" });
            const isToday = i === data.length - 1;
            const isSelected = selectedIdx === i;
            const leftPct = (i / Math.max(data.length - 1, 1)) * 100;
            return (
              <button
                key={d.day}
                type="button"
                className={`${styles.areaDay} ${isToday ? styles.areaDayToday : ""} ${isSelected ? styles.areaDaySelected : ""}`}
                style={{ left: `${leftPct}%` }}
                title={`${d.day} · ${d.views.toLocaleString()}`}
                onClick={() => toggle(i)}
                onMouseEnter={() => setHoveredIdx(i)}
              >
                {dn}
                <span className={styles.areaDayDow}>{dow}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* 선택된 날짜 상세 패널 */}
      {selectedIdx !== null && (
        <DayDetailPanel
          data={data}
          selectedIdx={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          language={language}
          mockMode={mockMode}
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

  return (
    <div className={styles.periodTrigger}>
      <button
        type="button"
        className={`${styles.periodTriggerBtn} ${isOpen ? styles.periodTriggerBtnActive : ""}`}
        onClick={onOpen}
        aria-label={`${label}: ${formatted}`}
      >
        <span className={styles.periodTriggerLabel}>{label}</span>
        <span className={styles.periodTriggerDate}>{formatted}</span>
      </button>
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
  mockMode,
}: {
  data: { day: string; views: number }[];
  selectedIdx: number;
  onClose: () => void;
  language: "ko" | "en";
  mockMode: boolean;
}) {
  const [topPosts, setTopPosts] = useState<DayTopPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const sel = data[selectedIdx];

  // 선택 날짜 변경 시 인기 게시물 fetch (mock mode 면 결정적 mock 데이터)
  useEffect(() => {
    let cancelled = false;
    if (mockMode) {
      setTopPosts(buildMockDayTopPosts(sel.day, sel.views));
      setLoadingPosts(false);
      return;
    }
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
    return () => { cancelled = true; };
  }, [sel.day, sel.views, mockMode]);

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

  const diffPct = (cur: number, base: number): { pct: number; dir: "up" | "down" | "flat" } | null => {
    if (base === 0) return cur > 0 ? { pct: 100, dir: "up" } : null;
    const pct = Math.round(((cur - base) / base) * 100);
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  };

  const vsAvg = diffPct(sel.views, Math.round(avg));
  const vsSameWeekday = sameWeekday ? diffPct(sel.views, sameWeekday.views) : null;
  const vsPrev = prevDay ? diffPct(sel.views, prevDay.views) : null;

  const fullDate = selDate.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "long",
  });

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });

  // 행 데이터 — staggered animation index 부여 위해 배열로
  const periodLabel = language === "ko" ? `${data.length}일` : `${data.length}d`;
  const rows = [
    vsAvg && {
      id: "avg",
      label: language === "ko" ? `${periodLabel} 평균 대비` : `vs ${periodLabel} average`,
      diff: vsAvg,
      ctx: Math.round(avg).toLocaleString(),
    },
    vsSameWeekday && sameWeekday && {
      id: "weekday",
      label: language === "ko"
        ? `이전 ${selDate.toLocaleDateString("ko-KR", { weekday: "short" })}요일 대비 (${fmtShort(sameWeekday.day)})`
        : `vs last ${selDate.toLocaleDateString("en-US", { weekday: "short" })} (${fmtShort(sameWeekday.day)})`,
      diff: vsSameWeekday,
      ctx: sameWeekday.views.toLocaleString(),
    },
    vsPrev && prevDay && {
      id: "prev",
      label: language === "ko" ? `전일 대비 (${fmtShort(prevDay.day)})` : `vs previous day (${fmtShort(prevDay.day)})`,
      diff: vsPrev,
      ctx: prevDay.views.toLocaleString(),
    },
  ].filter(Boolean) as { id: string; label: string; diff: { pct: number; dir: "up" | "down" | "flat" }; ctx: string }[];

  return (
    <div
      className={styles.dayDetail}
      role="region"
      aria-label="day detail"
      key={selectedIdx /* 다른 날짜 클릭 시 애니메이션 재실행 */}
    >
      <header className={styles.dayDetailHeader}>
        <div className={styles.dayDetailHeading}>
          <span className={styles.dayDetailDate}>{fullDate}</span>
          <span className={styles.dayDetailRank}>
            {language === "ko" ? `${rank}위 / ${data.length}일` : `Rank ${rank} of ${data.length}`}
          </span>
        </div>
        <button type="button" className={styles.dayDetailClose} onClick={onClose} aria-label="close" data-close-trigger>
          <CloseIcon />
        </button>
      </header>

      {/* 메인: 좌(숫자+비교+분포) | 우(인기 게시물) — 2-col 으로 압축 */}
      <div className={styles.dayDetailMain}>
        <div className={styles.dayDetailLeft}>
          <div className={styles.dayDetailValue}>
            <span className={styles.dayDetailNumber}>
              <CountUp value={sel.views} duration={700} />
            </span>
            <span className={styles.dayDetailUnit}>{language === "ko" ? "조회" : "views"}</span>
          </div>

          <ul className={styles.dayDetailComparisons}>
            {rows.map((row, i) => (
              <li
                key={row.id}
                className={styles.dayDetailRow}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span className={styles.dayDetailLabel}>{row.label}</span>
                <DiffBadge diff={row.diff} />
                <span className={styles.dayDetailContext}>{row.ctx}</span>
              </li>
            ))}
          </ul>

          <div className={styles.dayDetailRange} style={{ animationDelay: `${120 + rows.length * 70 + 40}ms` }}>
            <RangePosition
              values={allViews}
              selectedValue={sel.views}
              label={language === "ko" ? `${periodLabel} 분포 내 위치` : `Position in ${periodLabel} range`}
            />
          </div>
        </div>

        {/* 그날 인기 게시물 — 우측 컬럼, top 5 만 컴팩트하게 */}
        <div
          className={styles.dayDetailTop}
          style={{ animationDelay: `${120 + rows.length * 70 + 200}ms` }}
        >
          <span className={styles.dayDetailTopHeading}>
            {language === "ko" ? "그날 인기 게시물" : "Top posts that day"}
          </span>
          {loadingPosts ? (
            <p className={styles.muted}>{language === "ko" ? "불러오는 중..." : "Loading..."}</p>
          ) : topPosts.length === 0 ? (
            <p className={styles.muted}>
              {language === "ko" ? "이날 조회된 게시물이 없습니다." : "No posts viewed this day."}
            </p>
          ) : (
            <ol className={styles.dayDetailTopList}>
              {topPosts.slice(0, 5).map((p, i) => {
                const max = topPosts[0].views;
                const pct = (p.views / max) * 100;
                return (
                  <li key={p.id} className={styles.dayDetailTopItem}>
                    <span className={styles.dayDetailTopRank}>{String(i + 1).padStart(2, "0")}</span>
                    <Link href={`/posts/${p.slug}`} className={styles.dayDetailTopTitle}>
                      {p.title}
                    </Link>
                    <span className={styles.dayDetailTopBarTrack} aria-hidden>
                      <span
                        className={styles.dayDetailTopBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className={styles.dayDetailTopViews}>
                      {p.views.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/** mock 모드용 — 날짜를 시드로 결정적인(매번 같은) 가짜 인기 게시물 생성 */
function buildMockDayTopPosts(date: string, totalViews: number): DayTopPost[] {
  // date 문자열을 간단한 해시로 시드 사용
  let seed = 0;
  for (let i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const pool = [
    { id: "p1", title: "디자인 시스템 토큰 3-layer 구조 정리",      slug: "design-tokens" },
    { id: "p2", title: "Lenis + GSAP ScrollTrigger 무한 가로 스크롤", slug: "infinite-h-scroll" },
    { id: "p3", title: "Plate.js 에디터 커스텀 각주 만들기",          slug: "plate-footnote" },
    { id: "p4", title: "Supabase RLS 패턴 (single-admin)",            slug: "supabase-rls" },
    { id: "p5", title: "Three.js R3F 코피잔 + 라떼아트 만들기",        slug: "r3f-coffee" },
    { id: "p6", title: "PageTransitionProvider 모핑 효과 분해",         slug: "page-transition" },
    { id: "p7", title: "Lighthouse 60→98 — 번들/이미지 최적화 케이스 스터디", slug: "lighthouse-perf" },
  ];
  // 5개 랜덤 선택 + 가중치 분포
  const shuffled = [...pool].sort(() => rand() - 0.5).slice(0, 5);
  let remaining = totalViews;
  return shuffled.map((p, i) => {
    const portion = i === shuffled.length - 1 ? remaining : Math.round(remaining * (0.35 + rand() * 0.2));
    remaining = Math.max(0, remaining - portion);
    return { ...p, views: Math.max(1, portion) };
  }).sort((a, b) => b.views - a.views);
}

function DiffBadge({ diff }: { diff: { pct: number; dir: "up" | "down" | "flat" } }) {
  const cls = diff.dir === "up" ? styles.trendUp : diff.dir === "down" ? styles.trendDown : styles.trendFlat;
  const sign = diff.dir === "up" ? "+" : diff.dir === "down" ? "" : "±";
  return (
    <span className={`${styles.trendBadge} ${cls}`}>
      {diff.dir === "up" && <TrendingUp size={11} strokeWidth={2.5} />}
      {diff.dir === "down" && <TrendingDown size={11} strokeWidth={2.5} />}
      {sign}{diff.pct}%
    </span>
  );
}

/** min~max 범위 안에서 선택된 값의 위치를 보여주는 미니 슬라이더 */
function RangePosition({ values, selectedValue, label }: { values: number[]; selectedValue: number; label: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const pct = range > 0 ? ((selectedValue - min) / range) * 100 : 50;

  return (
    <div className={styles.rangePos}>
      <span className={styles.rangePosLabel}>{label}</span>
      <div className={styles.rangePosTrack} aria-hidden>
        <div className={styles.rangePosFill} style={{ width: `${pct}%` }} />
        <div className={styles.rangePosMarker} style={{ left: `${pct}%` }} />
      </div>
      <div className={styles.rangePosBounds}>
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

/** Catmull-Rom 보간으로 cubic bezier path 생성 (부드러운 곡선) */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const tension = 0.4;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 2;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 2;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 2;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 2;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** 카테고리 분포 — interactive 도넛: wedge 또는 범례 항목 hover 시 중앙 라벨 + 해당 wedge 강조 */
function CategoryDonut({
  data,
  language,
  t,
}: {
  data: { name: string; postCount: number; views: number }[];
  language: "ko" | "en";
  t: (key: string) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.views, 0);
  const palette = [
    "var(--color-accent)",
    "var(--color-accent-dark)",
    "var(--color-accent-light)",
    "var(--color-accent-alpha-70)",
    "var(--color-accent-alpha-50)",
    "var(--color-accent-alpha-30)",
  ];

  const cx = 70, cy = 70;
  const outerR = 60;
  const innerR = 38;

  let acc = 0;
  const arcs = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.views;
    const end = (acc / total) * 360;
    return { d, color: palette[i % palette.length], start, end, pct: total > 0 ? (d.views / total) * 100 : 0 };
  });

  const hovered = hoverIdx !== null ? arcs[hoverIdx] : null;
  const centerValue = hovered ? hovered.d.views.toLocaleString() : total.toLocaleString();
  const centerLabel = hovered
    ? hovered.d.name
    : (language === "ko" ? "조회" : "views");

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutSvg} aria-label={t("admin.dashboard.topCategories")}>
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
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <title>{arc.d.name} · {arc.d.views.toLocaleString()} ({arc.pct.toFixed(0)}%)</title>
              </path>
            );
          })
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" className={styles.donutCenterValue}>
          {centerValue}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className={styles.donutCenterLabel}>
          {centerLabel}
        </text>
      </svg>
      <ul className={styles.donutLegend}>
        {arcs.map((arc, i) => {
          const isHover = hoverIdx === i;
          return (
            <li
              key={arc.d.name}
              className={`${styles.donutLegendItem} ${isHover ? styles.donutLegendItemActive : ""}`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span className={styles.donutLegendSwatch} style={{ background: arc.color }} aria-hidden />
              <span className={styles.donutLegendName}>{arc.d.name}</span>
              <span className={styles.donutLegendMeta}>
                <span className={styles.donutLegendPct}>{arc.pct.toFixed(0)}%</span>
                <span className={styles.donutLegendCount}>{arc.d.postCount}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 도넛 wedge path (start/end 각도는 0=12시 시계방향, deg 단위) */
function describeDonutArc(cx: number, cy: number, oR: number, iR: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sa = toRad(startAngle), ea = toRad(endAngle);
  const ox1 = cx + oR * Math.cos(sa), oy1 = cy + oR * Math.sin(sa);
  const ox2 = cx + oR * Math.cos(ea), oy2 = cy + oR * Math.sin(ea);
  const ix1 = cx + iR * Math.cos(ea), iy1 = cy + iR * Math.sin(ea);
  const ix2 = cx + iR * Math.cos(sa), iy2 = cy + iR * Math.sin(sa);
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
  if (values.length === 0) return <div className={styles.sparkline} aria-hidden />;
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

/* ── Skeleton state — 실제 레이아웃을 그대로 미러링 ── */
function DashboardSkeleton() {
  return (
    <div className={styles.container} aria-busy="true" aria-live="polite">
      <header className={styles.header}>
        <SkeletonLine width={180} height={32} />
        <Skeleton width={84} height={32} borderRadius="var(--radius-capsule)" />
      </header>

      <section className={styles.section}>
        <SkeletonLine width={100} height={14} />
        <div className={styles.quickActions}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={56} borderRadius="var(--radius-capsule)" />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SkeletonLine width={60} height={14} />
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={92} borderRadius="var(--radius-2xl)" />
          ))}
        </div>
      </section>

      <section className={styles.twoCol}>
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} className={styles.panel}>
            <SkeletonLine width={120} height={14} />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} width={i % 2 === 0 ? "85%" : "65%"} />
            ))}
          </div>
        ))}
      </section>

      <section className={styles.twoCol}>
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} className={styles.panel}>
            <SkeletonLine width={120} height={14} />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} width={i % 2 === 0 ? "75%" : "55%"} />
            ))}
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <SkeletonLine width={100} height={14} />
        <div className={styles.serviceGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLine key={i} width="80%" />
          ))}
        </div>
      </section>
    </div>
  );
}
