"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/admin/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, []);

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

  const handleDeleteAll = async () => {
    if (!confirm("Delete all notifications?")) return;
    await fetch("/api/admin/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteAll: true }),
    });
    fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
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
    switch (type) {
      case "comment": return "\u{1F4AC}";
      case "reply": return "\u{21A9}\uFE0F";
      case "like": return "\u{2764}\uFE0F";
      default: return "\u{1F514}";
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
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.item} ${!n.read ? styles.itemUnread : ""}`}
              onClick={() => !n.read && handleMarkRead(n.id)}
            >
              <span className={styles.icon}>{typeIcon(n.type)}</span>
              <div className={styles.body}>
                <div className={styles.itemTitle}>{n.title}</div>
                <div className={styles.itemMessage}>{n.message}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemDate}>{formatDate(n.created_at)}</span>
                  {n.metadata?.url && (
                    <a href={n.metadata.url} className={styles.itemLink}>View</a>
                  )}
                </div>
              </div>
              {!n.read && <span className={styles.dot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
