"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Reply, Heart, Bell } from "lucide-react";
import styles from "./Notifications.module.css";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, string>;
  read: boolean;
  created_at: string;
}

/* TODO(remove): UI 미리보기용 더미 데이터. 실제 알림이 들어오면 자연스럽게
   대체됨. UI 확정 후 이 블록 + 아래 fallback 로직 제거할 것. */
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: "demo-1",
    type: "comment",
    title: "새 댓글",
    message: "홍길동: 잘 읽었습니다. Next.js 정말 좋네요!",
    metadata: { url: "/posts/sample-post" },
    read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    type: "reply",
    title: "답글 알림",
    message: "민수: @관리자 답변 감사합니다. 추가 질문이 있는데...",
    metadata: { url: "/posts/sample-post" },
    read: false,
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    type: "like",
    title: "좋아요 +5",
    message: "최근 게시물 'GSAP ScrollTrigger 정리'에 좋아요가 늘었습니다.",
    metadata: { url: "/posts/gsap-scrolltrigger" },
    read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    type: "comment",
    title: "새 댓글",
    message: "익명: 이 부분 더 자세히 설명해주실 수 있나요?",
    metadata: { url: "/posts/another-post" },
    read: true,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-5",
    type: "system",
    title: "시스템 알림",
    message: "주간 백업이 정상적으로 완료되었습니다.",
    metadata: {},
    read: true,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // TODO(remove): 더미가 표시 중이면 로컬 상태로만 인터랙션 처리 — UI 미리보기용
  const [demoMode, setDemoMode] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        const list: Notification[] = data.notifications ?? [];
        if (list.length === 0) {
          setDemoMode(true);
          setNotifications(DUMMY_NOTIFICATIONS);
          setUnreadCount(DUMMY_NOTIFICATIONS.filter((n) => !n.read).length);
        } else {
          setDemoMode(false);
          setNotifications(list);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } else {
        // TODO(remove): API 실패 시에도 UI 미리보기 위해 더미 표시
        setDemoMode(true);
        setNotifications(DUMMY_NOTIFICATIONS);
        setUnreadCount(DUMMY_NOTIFICATIONS.filter((n) => !n.read).length);
      }
    } catch {
      setDemoMode(true);
      setNotifications(DUMMY_NOTIFICATIONS);
      setUnreadCount(DUMMY_NOTIFICATIONS.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (demoMode) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      return;
    }
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const handleDeleteAll = async () => {
    if (!confirm("Delete all notifications?")) return;
    if (demoMode) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    await fetch("/api/admin/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteAll: true }),
    });
    fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
    if (demoMode) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return;
    }
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchNotifications();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const typeIcon = (type: string) => {
    const common = {
      size: 18,
      strokeWidth: 1.6,
      "aria-hidden": true,
    };
    switch (type) {
      case "comment":
        return <MessageCircle {...common} />;
      case "reply":
        return <Reply {...common} />;
      case "like":
        return <Heart {...common} />;
      default:
        return <Bell {...common} />;
    }
  };

  /** 아이템 클릭 → 읽음 처리 + 관련 컨텐츠로 이동 */
  const handleItemClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.metadata?.url) {
      window.location.href = n.metadata.url;
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Notifications
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </h1>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button className={styles.actionBtn} onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className={styles.actionBtnDanger} onClick={handleDeleteAll}>
              Delete all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className={styles.empty}>No notifications</p>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => {
            const hasLink = !!n.metadata?.url;
            return (
              <div
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.itemUnread : ""} ${hasLink ? styles.itemClickable : ""}`}
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
                <span className={`${styles.icon} ${styles[`icon${n.type.charAt(0).toUpperCase() + n.type.slice(1)}`] ?? styles.iconSystem}`}>{typeIcon(n.type)}</span>
                <div className={styles.body}>
                  <div className={styles.itemTitle}>{n.title}</div>
                  <div className={styles.itemMessage}>{n.message}</div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemDate}>{formatDate(n.created_at)}</span>
                    {hasLink && <span className={styles.itemLink}>↗ View</span>}
                  </div>
                </div>
                {!n.read && <span className={styles.dot} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
