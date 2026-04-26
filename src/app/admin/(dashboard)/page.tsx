"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Settings, Bell } from "lucide-react";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
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
    popularPosts: Array<{ id: string; title: string; slug: string; view_count: number; like_count: number }>;
    dailyViews: Array<{ day: string; views: number }>;
  };
  services: Record<string, "configured" | "missing">;
}

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

      {/* ── Quick Actions ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.dashboard.quickActions" /></h2>
        <div className={styles.quickActions}>
          <Link href="/admin/posts/new" className={styles.actionBtn}>
            <Icon name="plus" />
            <span className={styles.actionLabel}><T k="admin.dashboard.newPost" /></span>
          </Link>
          <Link href="/admin/works/new" className={styles.actionBtn}>
            <Icon name="plus" />
            <span className={styles.actionLabel}><T k="admin.dashboard.newWork" /></span>
          </Link>
          <Link href="/admin/settings" className={styles.actionBtn}>
            <Icon name="settings" />
            <span className={styles.actionLabel}><T k="admin.dashboard.openSettings" /></span>
          </Link>
          <Link href="/admin/notifications" className={styles.actionBtn}>
            <Icon name="bell" />
            <span className={styles.actionLabel}>
              <T k="admin.dashboard.viewNotifications" />
              {data.notifications.unreadCount > 0 && (
                <span className={styles.badge}>{data.notifications.unreadCount}</span>
              )}
            </span>
          </Link>
        </div>
      </section>

      {/* ── Stats Cards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.dashboard.stats" /></h2>
        <div className={styles.statsGrid}>
          <Link href="/admin/posts" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.posts" /></span>
            <span className={styles.statValue}>{data.posts.total}</span>
            <span className={styles.statMeta}>
              {data.posts.published} <T k="admin.dashboard.published" /> · {data.posts.drafts} <T k="admin.dashboard.drafts" />
            </span>
            <RatioBar published={data.posts.published} total={data.posts.total} />
          </Link>
          <Link href="/admin/works" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.works" /></span>
            <span className={styles.statValue}>{data.works.total}</span>
            <span className={styles.statMeta}>
              {data.works.published} <T k="admin.dashboard.published" /> · {data.works.drafts} <T k="admin.dashboard.drafts" />
            </span>
            <RatioBar published={data.works.published} total={data.works.total} />
          </Link>
          <Link href="/admin/comments" className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.comments" /></span>
            <span className={styles.statValue}>{data.comments.total}</span>
            <span className={styles.statMeta}>
              {data.posts.published > 0
                ? `${(data.comments.total / data.posts.published).toFixed(1)} ${language === "ko" ? "/ 게시물" : "/ post"}`
                : " "}
            </span>
            <CommentDots count={data.comments.recent.length} />
          </Link>
          <div className={styles.statCard}>
            <span className={styles.statLabel}><T k="admin.dashboard.totalViews" /></span>
            <span className={styles.statValue}>{data.stats.totalPostViews.toLocaleString()}</span>
            <span className={styles.statMeta}>
              {(() => {
                const recent7 = data.stats.dailyViews.slice(-7).reduce((s, d) => s + d.views, 0);
                return language === "ko" ? `최근 7일 ${recent7}회` : `${recent7} last 7d`;
              })()}
            </span>
            <Sparkline values={data.stats.dailyViews.map((d) => d.views)} />
          </div>
        </div>
      </section>

      {/* ── Popular Posts + Recent Comments — 2-col ── */}
      <section className={styles.twoCol}>
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}><T k="admin.dashboard.popularPosts" /></h2>
          {data.stats.popularPosts.length === 0 ? (
            <p className={styles.muted}><T k="admin.dashboard.noPopular" /></p>
          ) : (
            <ul className={styles.list}>
              {data.stats.popularPosts.map((p, i) => (
                <li key={p.id} className={styles.listItem}>
                  <span className={styles.rank}>{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/posts/${p.slug}`} className={styles.itemTitle}>{p.title}</Link>
                  <span className={styles.itemMeta}>
                    {p.view_count.toLocaleString()} <T k="admin.dashboard.views" />
                    {p.like_count > 0 && <> · {p.like_count} <T k="admin.dashboard.likes" /></>}
                  </span>
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
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>{c.is_admin ? "Admin" : c.nickname}</span>
                    <span className={styles.timeAgo}>{fmtDate(c.created_at)}</span>
                  </div>
                  <p className={styles.commentBody}>{c.content}</p>
                  {c.post_slug && (
                    <Link href={`/posts/${c.post_slug}`} className={styles.commentSource}>
                      ↗ {c.post_title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
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
                  <Link href={`/admin/posts/${p.id}`} className={styles.itemTitle}>{p.title}</Link>
                  <span className={styles.itemMeta}>
                    <span className={p.published ? styles.statusPub : styles.statusDraft}>
                      {p.published ? <T k="admin.dashboard.published" /> : <T k="admin.dashboard.draft" />}
                    </span>
                    {" · "}{fmtDate(p.updated_at)}
                  </span>
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
                  <Link href={`/admin/works/${w.id}`} className={styles.itemTitle}>{w.title}</Link>
                  <span className={styles.itemMeta}>
                    <span className={w.published ? styles.statusPub : styles.statusDraft}>
                      {w.published ? <T k="admin.dashboard.published" /> : <T k="admin.dashboard.draft" />}
                    </span>
                    {" · "}{fmtDate(w.updated_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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

/* ── 아이콘 (Lucide-style stroke icons) ── */
function Icon({ name }: { name: "plus" | "settings" | "bell" }) {
  const props = {
    className: styles.actionIcon,
    size: 18,
    strokeWidth: 1.6,
    "aria-hidden": true,
  };
  if (name === "plus") {
    return <Plus {...props} />;
  }
  if (name === "settings") {
    return <Settings {...props} />;
  }
  return <Bell {...props} />;
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
