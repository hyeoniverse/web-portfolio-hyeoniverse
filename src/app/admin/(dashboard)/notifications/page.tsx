"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Reply, Heart, Bell, Flag, RefreshCw } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import EmptyState from "@/components/ui/EmptyState/EmptyState";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { matchesSearch } from "@/lib/koSearch";
import ReportsList from "../reports/_components/ReportsList";
import styles from "./Notifications.module.css";

type TabKey = "all" | "comment" | "system" | "report";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, string>;
  read: boolean;
  created_at: string;
}

/* type 별 i18n 매핑 — type 가 i18n 키 prefix와 다를 수 있으므로 화이트리스트 */
const TYPE_KEYS: Record<string, string> = {
  comment: "admin.notifications.typeComment",
  reply: "admin.notifications.typeReply",
  like: "admin.notifications.typeLike",
  report: "admin.notifications.typeReport",
  system: "admin.notifications.typeSystem",
};

const PAGE_SIZE = 50;
const ZERO_COUNTS: Record<TabKey, number> = { all: 0, comment: 0, system: 0, report: 0 };

interface NotifResponse {
  notifications?: Notification[];
  unreadCount?: number;
  totalCount?: number;
  typeCounts?: Record<TabKey, number>;
  hasMore?: boolean;
}

export default function NotificationsPage() {
  const { language, t } = useLanguage();
  const { openModal } = useModalStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // 탭 카운트·전체 총계는 서버 실제 count (로드된 목록 길이가 아님). 목록은 더보기로 50개씩 누적.
  const [typeCounts, setTypeCounts] = useState<Record<TabKey, number>>(ZERO_COUNTS);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  // 탭 필터 + 검색 — comment 탭은 comment/reply/like 묶음, system 은 기타, report 는 report
  const filteredNotifs = useMemo(() => {
    let result = notifications;
    if (tab === "comment") {
      result = notifications.filter((n) => ["comment", "reply", "like"].includes(n.type));
    } else if (tab === "report") {
      result = notifications.filter((n) => n.type === "report");
    } else if (tab === "system") {
      result = notifications.filter((n) => !["comment", "reply", "like", "report"].includes(n.type));
    }
    const q = search.trim();
    if (!q) return result;
    return result.filter((n) => matchesSearch(q, n.title ?? "", n.message ?? ""));
  }, [notifications, tab, search]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?offset=0&limit=${PAGE_SIZE}&meta=1`);
      if (res.ok) {
        const data = (await res.json()) as NotifResponse;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setTotalCount(data.totalCount ?? 0);
        setTypeCounts(data.typeCounts ?? ZERO_COUNTS);
        setHasMore(!!data.hasMore);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
        setTypeCounts(ZERO_COUNTS);
        setHasMore(false);
      }
    } catch {
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
      setTypeCounts(ZERO_COUNTS);
      setHasMore(false);
    }
    setLoading(false);
  }, []);

  // 더보기 — 현재 로드된 개수를 offset 으로 다음 50개를 append.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/notifications?offset=${notifications.length}&limit=${PAGE_SIZE}&meta=1`);
      if (res.ok) {
        const data = (await res.json()) as NotifResponse;
        setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
        setUnreadCount(data.unreadCount ?? 0);
        setTotalCount(data.totalCount ?? 0);
        setTypeCounts(data.typeCounts ?? ZERO_COUNTS);
        setHasMore(!!data.hasMore);
      }
    } catch {
      /* noop */
    }
    setLoadingMore(false);
  }, [notifications.length]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  // alert/confirm 대신 공통 ModalConfirm
  const handleDeleteAll = () => {
    openModal(
      <ModalConfirm
        desc={t("admin.notifications.deleteConfirmDesc")}
        confirmText={t("admin.notifications.deleteConfirm")}
        danger
        onConfirm={async () => {
          await fetch("/api/admin/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleteAll: true }),
          });
          fetchNotifications();
        }}
      />,
      { id: "notif-delete-all", header: { title: t("admin.notifications.deleteConfirmTitle") }, closeButton: true, width: "400px" },
    );
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchNotifications();
  };

  // 다국어 상대시간 포맷터 — "방금 전 / N분 전 / N시간 전 / N일 전 / 절대 날짜"
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return language === "ko" ? "방금 전" : "just now";
    if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return language === "ko" ? `${days}일 전` : `${days}d ago`;
    return d.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const typeIcon = (type: string) => {
    const common = { size: 18, strokeWidth: 1.6, "aria-hidden": true } as const;
    switch (type) {
      case "comment": return <MessageCircle {...common} />;
      case "reply": return <Reply {...common} />;
      case "like": return <Heart {...common} />;
      case "report": return <Flag {...common} />;
      default: return <Bell {...common} />;
    }
  };

  // 타입 라벨 — DB가 한국어 title 을 저장 중일 수 있으므로 i18n 키가 있는 type 만 번역, 그 외는 원본
  const typeLabel = (type: string, fallback: string) => {
    const key = TYPE_KEYS[type];
    return key ? t(key) : fallback;
  };

  /** 아이템 클릭 → 읽음 처리 + 관련 컨텐츠로 이동 */
  const handleItemClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.metadata?.url) {
      window.location.href = n.metadata.url;
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className={styles.title}>
          <Bell size={26} strokeWidth={1.6} aria-hidden className={styles.titleIcon} />
          <T k="admin.notifications.title" />
          {!loading && unreadCount > 0 && (
            <Tooltip content={t("admin.notifications.tipUnread")} placement="bottom" delay={250}>
              <motion.span
                key={unreadCount}
                className={styles.badge}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {unreadCount}
              </motion.span>
            </Tooltip>
          )}
        </h1>
        <div className={styles.headerActions}>
          <Tooltip content={t("admin.notifications.tipReportsPage")} placement="bottom" delay={250}>
            <Button
              href="/admin/reports"
              variant="outline"
              size="md"
              icon={<Flag size={13} strokeWidth={1.8} />}
            >
              <T k="admin.notifications.reportsPage" />
            </Button>
          </Tooltip>
          <Tooltip content={t("admin.notifications.tipRefresh")} placement="bottom" delay={250}>
            <Button
              variant="outline"
              size="md"
              onClick={fetchNotifications}
              disabled={loading}
              icon={<RefreshCw size={13} strokeWidth={1.8} className={loading ? styles.refreshSpinning : undefined} />}
            >
              <T k="admin.notifications.refresh" />
            </Button>
          </Tooltip>
          {unreadCount > 0 && (
            <Tooltip content={t("admin.notifications.tipMarkAllRead")} placement="bottom" delay={250}>
              <Button variant="outline" size="md" onClick={handleMarkAllRead} disabled={loading}>
                <T k="admin.notifications.markAllRead" />
              </Button>
            </Tooltip>
          )}
          {notifications.length > 0 && (
            <Tooltip content={t("admin.notifications.tipDeleteAll")} placement="bottom" delay={250}>
              <Button variant="outline" size="md" tone="danger" onClick={handleDeleteAll} disabled={loading}>
                <T k="admin.notifications.deleteAll" />
              </Button>
            </Tooltip>
          )}
        </div>
      </motion.div>

      {/* Tabs — 전체 / 댓글 / 시스템 / 신고. 신고 탭은 ReportsList 컴포넌트로 위임.
         SortGroup button 내부에 Tooltip wrapper (T 컴포넌트) 넣으면 hover 이벤트 충돌 — t() 직접 사용 */}
      <div className={styles.tabsRow}>
        <SegmentedControl<TabKey>
          items={[
            { value: "all", label: <>{t("admin.notifications.tab.all")} <span className={styles.tabCount}>{typeCounts.all}</span></> },
            { value: "comment", label: <>{t("admin.notifications.tab.comment")} <span className={styles.tabCount}>{typeCounts.comment}</span></> },
            { value: "system", label: <>{t("admin.notifications.tab.system")} <span className={styles.tabCount}>{typeCounts.system}</span></> },
            { value: "report", label: <>{t("admin.notifications.tab.report")} <span className={styles.tabCount}>{typeCounts.report}</span></> },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab !== "report" && (
          <div className={styles.searchWrap}>
            <SearchCapsule
              search={search}
              onSearchChange={setSearch}
              placeholder={t("admin.notifications.searchPlaceholder")}
            />
          </div>
        )}
      </div>

      {tab === "report" ? (
        <ReportsList />
      ) : loading ? (
        <div className={styles.list} aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.item}>
              <SkeletonCircle className={styles.icon} size={36} />
              <div className={styles.skelBody}>
                <SkeletonLine width="40%" height="var(--skeleton-h-line-lg)" />
                <SkeletonLine width="85%" />
                <SkeletonLine width="20%" height="var(--skeleton-h-line-sm)" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifs.length === 0 ? (
        <EmptyState circle>
          <span className={styles.emptyTitle}>
            <T k={search ? "admin.notifications.searchEmpty" : "admin.notifications.empty"} />
          </span>
          {!search && <span className={styles.emptyHint}><T k="admin.notifications.emptyHint" /></span>}
        </EmptyState>
      ) : (
        <motion.div
          className={styles.list}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
        >
          <AnimatePresence initial={false}>
            {filteredNotifs.map((n) => {
              const hasLink = !!n.metadata?.url;
              const tipContent = hasLink
                ? t("admin.notifications.tipItemClick")
                : typeLabel(n.type, n.title);
              return (
                <Tooltip
                  key={n.id}
                  content={tipContent}
                  placement="left"
                  delay={400}
                  wrapperStyle={{ display: "block", width: "100%" }}
                >
                  <motion.div
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className={`${styles.item} ${!n.read ? styles.itemUnread : ""} ${hasLink ? styles.itemClickable : ""}`}
                    data-clickable="true"
                    onClick={() => handleItemClick(n)}
                    role={hasLink ? "link" : undefined}
                    tabIndex={hasLink ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (hasLink && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleItemClick(n);
                      }
                    }}
                  >
                    <span className={`${styles.icon} ${styles[`icon${n.type.charAt(0).toUpperCase() + n.type.slice(1)}`] ?? styles.iconSystem}`}>
                      {typeIcon(n.type)}
                    </span>
                    <div className={styles.body}>
                      <div className={styles.itemTitle}>{typeLabel(n.type, n.title)}</div>
                      <div className={styles.itemMessage}>{n.message}</div>
                      <div className={styles.itemMeta}>
                        <span className={styles.itemDate}>{formatDate(n.created_at)}</span>
                        {hasLink && <span className={styles.itemLink}>↗ <T k="admin.notifications.view" /></span>}
                      </div>
                    </div>
                    {!n.read && <span className={styles.dot} />}
                  </motion.div>
                </Tooltip>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {tab !== "report" && !loading && hasMore && (
        <div className={styles.loadMoreRow}>
          <Button variant="outline" size="md" onClick={loadMore} loading={loadingMore} loadingVariant="wave">
            <T k="admin.notifications.loadMore" />
          </Button>
          <span className={styles.loadMoreCount}>{notifications.length} / {totalCount}</span>
        </div>
      )}
    </div>
  );
}
