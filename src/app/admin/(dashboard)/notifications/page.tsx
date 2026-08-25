"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Reply, Heart, Bell, Flag, RefreshCw, Key, Monitor, ListChecks, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import NotificationDetail from "./_components/NotificationDetail";
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
import type { StatusFilter } from "../reports/_types";
import { isPending } from "@/lib/notificationTypes";
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
  access_request: "admin.notifications.typeAccessRequest",
  device_login: "admin.notifications.typeDeviceLogin",
};

const PAGE_SIZE = 50;
const ZERO_COUNTS: Record<TabKey, number> = { all: 0, comment: 0, system: 0, report: 0 };

interface NotifResponse {
  notifications?: Notification[];
  unreadCount?: number;
  totalCount?: number;
  typeCounts?: Record<TabKey, number>;
  pendingReportCount?: number;
  hasMore?: boolean;
}

export default function NotificationsPage() {
  const { language, t } = useLanguage();
  const { openModal, closeModal } = useModalStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // 탭 카운트·전체 총계는 서버 실제 count (로드된 목록 길이가 아님). 목록은 더보기로 50개씩 누적.
  const [typeCounts, setTypeCounts] = useState<Record<TabKey, number>>(ZERO_COUNTS);
  const [totalCount, setTotalCount] = useState(0);
  /** 처리 대기 신고 건수 — 신고 탭은 알림이 아니라 comment_reports 를 보여준다. */
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownTab, setOwnTab] = useState<TabKey>("all");
  /* 신고 탭의 상태 필터 — 탭의 하위 세그먼트로 그리므로 여기서 쥔다. */
  const [reportFilter, setReportFilter] = useState<StatusFilter>("pending");
  const [ownSearch, setOwnSearch] = useState("");

  /* 네비게이션 알림 팝업에서 넘어온 항목 — ?id 로 지목된다.
     목록에서 어느 것인지 알아볼 수 있게 활성 표시를 걸고 거기로 스크롤한다. */
  const targetId = useSearchParams().get("id");

  /* ?id 로 지목된 항목을 반드시 보여줘야 하므로, 그 동안에는 탭·검색을 무시하고 전체를 쓴다.
     사용자가 탭을 바꾸면 그때 지목이 풀린다(아래 dismissed 와 같은 규칙). */
  const tab: TabKey = targetId ? "all" : ownTab;
  const search = targetId ? "" : ownSearch;
  const setTab = (v: TabKey) => { setDismissed(targetId); setOwnTab(v); };
  const setSearch = (v: string) => { setDismissed(targetId); setOwnSearch(v); };
  /* 강조는 다음 조작이 있을 때까지 남는다. 해제한 대상 id 를 기억해 두면
     팝업에서 다른 알림을 다시 눌렀을 때 새 지목이 그대로 살아난다. */
  const [dismissed, setDismissed] = useState<string | null>(null);
  const activeId = targetId && dismissed !== targetId ? targetId : null;
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const scrolledToRef = useRef<string | null>(null);

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

  /* 결정을 내려야 하는 미처리 항목은 시간순과 무관하게 맨 위에 모은다. 정보성 알림이 계속
     쌓이면 권한 요청은 며칠만 지나도 아래로 밀려 보이지 않는다 — 전용 탭을 만드는 대신
     목록 안에서 위로 끌어올려 해결한다. 묶음 안에서는 시간순을 유지한다. */
  const [pendingNotifs, restNotifs] = useMemo(() => {
    const pending: Notification[] = [];
    const rest: Notification[] = [];
    for (const n of filteredNotifs) (isPending(n) ? pending : rest).push(n);
    return [pending, rest];
  }, [filteredNotifs]);

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
        setPendingReportCount(data.pendingReportCount ?? 0);
        setHasMore(!!data.hasMore);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
        setTypeCounts(ZERO_COUNTS);
        setPendingReportCount(0);
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
        setPendingReportCount(data.pendingReportCount ?? 0);
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

  /* 지목된 항목이 탭·검색에 걸려 목록에서 빠지면 스크롤할 대상이 없다 — 보이는 상태로 되돌린다.
     탭·검색을 상태로 두되 ?id 가 붙어 있는 동안에는 그 값을 무시한다. 효과 안에서 되돌리면
     렌더 → setState → 렌더가 한 번 더 돈다. */

  /* 목록은 50개씩 끊어 온다. 오래된 알림은 첫 페이지에 없으므로 찾을 때까지 더 가져온다. */
  useEffect(() => {
    if (!targetId || loading || loadingMore || !hasMore) return;
    if (notifications.some((n) => n.id === targetId)) return;
    loadMore();
  }, [targetId, loading, loadingMore, hasMore, notifications, loadMore]);

  /* 조작이 들어오면 강조를 끈다. 스크롤은 트리거로 쓰지 않는다 —
     도착 직후 scrollIntoView 가 스스로 스크롤을 일으켜 곧바로 꺼져 버린다. */
  useEffect(() => {
    if (!activeId) return;
    const dismiss = () => setDismissed(activeId);
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [activeId]);

  /* 렌더된 뒤에 스크롤한다. 한 대상당 한 번만 — 더보기로 목록이 늘어날 때마다 다시 튀지 않게. */
  useEffect(() => {
    if (!targetId || scrolledToRef.current === targetId) return;
    const el = itemRefs.current.get(targetId);
    if (!el) return;
    scrolledToRef.current = targetId;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetId, filteredNotifs]);

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
      case "access_request": return <Key {...common} />;
      case "device_login": return <Monitor {...common} />;
      default: return <Bell {...common} />;
    }
  };

  // 타입 라벨 — DB가 한국어 title 을 저장 중일 수 있으므로 i18n 키가 있는 type 만 번역, 그 외는 원본
  const typeLabel = (type: string, fallback: string) => {
    const key = TYPE_KEYS[type];
    return key ? t(key) : fallback;
  };

  /** 아이템 클릭 → 읽음 처리 + 상세 열기.
   *  예전에는 링크가 붙은 알림만 클릭이 동작하고 바로 이동했다. 나머지 알림은 목록에서
   *  잘린 본문 말고는 볼 방법이 없었고, metadata 는 아예 드러나지 않았다.
   *  이동은 상세 안의 "바로가기" 로 옮긴다. */
  const handleItemClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    const url = n.metadata?.url;
    openModal(
      <NotificationDetail
        data={{
          type: n.type,
          typeLabel: typeLabel(n.type, n.title),
          title: n.title,
          message: n.message,
          metadata: n.metadata ?? {},
          createdAt: formatDate(n.created_at),
          read: n.read,
        }}
        icon={typeIcon(n.type)}
        onGo={url ? () => { window.location.href = url; } : undefined}
        onResolve={
          n.type === "access_request"
            ? async (action) => {
                try {
                  const res = await fetch(`/api/admin/notifications/${n.id}/resolve`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action }),
                  });
                  if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    return { ok: false, reason: body?.error ?? `HTTP ${res.status}` };
                  }
                  closeModal();
                  await fetchNotifications();
                  return { ok: true };
                } catch (e) {
                  return { ok: false, reason: e instanceof Error ? e.message : undefined };
                }
              }
            : undefined
        }
      />,
      {
        id: "notification-detail",
        header: { title: t("admin.notifications.detailTitle") },
        closeButton: true,
        width: "480px",
      },
    );
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
          {/* 헤더의 버튼은 전부 아이콘+텍스트로 맞춘다 — 일부만 아이콘이 있으면 한 줄 안에서
              무게가 달라 보인다 */}
          {unreadCount > 0 && (
            <Tooltip content={t("admin.notifications.tipMarkAllRead")} placement="bottom" delay={250}>
              <Button
                variant="outline"
                size="md"
                onClick={handleMarkAllRead}
                disabled={loading}
                icon={<ListChecks size={13} strokeWidth={1.8} />}
              >
                <T k="admin.notifications.markAllRead" />
              </Button>
            </Tooltip>
          )}
          {notifications.length > 0 && (
            <Tooltip content={t("admin.notifications.tipDeleteAll")} placement="bottom" delay={250}>
              <Button
                variant="outline"
                size="md"
                tone="danger"
                onClick={handleDeleteAll}
                disabled={loading}
                icon={<Trash2 size={13} strokeWidth={1.8} />}
              >
                <T k="admin.notifications.deleteAll" />
              </Button>
            </Tooltip>
          )}
        </div>
      </motion.div>

      {/* Tabs — 전체 / 댓글 / 시스템 / 신고. 신고 탭은 ReportsList 컴포넌트로 위임.
         SortGroup button 내부에 Tooltip wrapper (T 컴포넌트) 넣으면 hover 이벤트 충돌 — t() 직접 사용 */}
      <div className={styles.tabsRow}>
        <SegmentedControl<TabKey, StatusFilter>
          items={[
            { value: "all", label: <>{t("admin.notifications.tab.all")} <span className={styles.tabCount}>{typeCounts.all}</span></> },
            { value: "comment", label: <>{t("admin.notifications.tab.comment")} <span className={styles.tabCount}>{typeCounts.comment}</span></> },
            { value: "system", label: <>{t("admin.notifications.tab.system")} <span className={styles.tabCount}>{typeCounts.system}</span></> },
            /* 신고 배지는 처리 대기 건수다 — 알림 개수를 쓰면 다 처리해도 숫자가 남는다.
               상태 필터는 하위 세그먼트로 붙는다 — 탭 줄 아래에 또 하나의 세그먼트가 생기면
               둘 중 무엇이 상위인지 읽히지 않는다. */
            {
              value: "report",
              label: <>{t("admin.notifications.tab.report")} <span className={styles.tabCount}>{pendingReportCount}</span></>,
              subItems: [
                { value: "pending", label: t("admin.reports.filter.pending") },
                { value: "resolved", label: t("admin.reports.filter.resolved") },
                { value: "dismissed", label: t("admin.reports.filter.dismissed") },
                { value: "all", label: t("admin.reports.filter.all") },
              ] as const,
            },
          ]}
          value={tab}
          onChange={setTab}
          subValue={reportFilter}
          onSubChange={setReportFilter}
          onBack={() => setTab("all")}
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
        <ReportsList filter={reportFilter} onFilterChange={setReportFilter} />
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
            {/* 미처리 항목을 위로 모아 놓았으니 어디까지가 그 묶음인지 밝힌다.
                묶음이 목록 전체일 때(=처리 필요 탭에서 전부 미처리)는 구분선이 의미 없어 생략. */}
            {pendingNotifs.length > 0 && restNotifs.length > 0 && (
              <div key="head-pending" className={`${styles.groupHead} ${styles.groupHeadPending}`}>
                <Key size={13} strokeWidth={2} aria-hidden />
                <T k="admin.notifications.groupPending" />
                <span className={styles.groupCount}>{pendingNotifs.length}</span>
              </div>
            )}
            {[...pendingNotifs, ...restNotifs].map((n, idx) => {
              const pending = isPending(n);
              const isFirstRest = pendingNotifs.length > 0 && idx === pendingNotifs.length;
              const hasLink = !!n.metadata?.url;
              /* 링크 유무와 무관하게 클릭하면 상세가 열린다 — 안내 문구도 그에 맞춘다. */
              const tipContent = t("admin.notifications.tipItemDetail");
              return (
                <Fragment key={n.id}>
                {isFirstRest && (
                  <div className={styles.groupHead}>
                    <T k="admin.notifications.groupRest" />
                  </div>
                )}
                <Tooltip
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
                    ref={(el) => {
                      if (el) itemRefs.current.set(n.id, el);
                      else itemRefs.current.delete(n.id);
                    }}
                    className={`${styles.item} ${!n.read ? styles.itemUnread : ""} ${styles.itemClickable} ${pending ? styles.itemPending : ""} ${activeId === n.id ? styles.itemActive : ""}`}
                    data-clickable="true"
                    onClick={() => handleItemClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
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
                </Fragment>
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
