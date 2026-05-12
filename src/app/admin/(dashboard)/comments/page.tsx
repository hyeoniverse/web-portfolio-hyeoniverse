"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import T from "@/components/ui/T";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Checkbox from "@/components/ui/Checkbox";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./Comments.module.css";

interface CommentRow {
  id: string;
  post_id?: string;
  work_id?: string;
  parent_id: string | null;
  nickname: string;
  content: string;
  is_admin: boolean;
  is_deleted: boolean;
  deleted_by: string | null;
  created_at: string;
  source: "posts" | "works";
  target_title: string;
  target_slug: string;
}

type SourceFilter = "all" | "posts" | "works";
type StatusFilter = "active" | "deleted" | "all";

const PAGE_SIZE = 20;

export default function CommentsModerationPage() {
  const { t, language } = useLanguage();
  useStaticPageScroll();
  const { openModal } = useModalStore();

  const [items, setItems] = useState<CommentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      source,
      status,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/comments?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    }
    setLoading(false);
  }, [source, status, search, page]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = (id: string, source: "posts" | "works") => {
    openModal(
      <ModalConfirm
        desc={t("admin.comments.deleteDesc")}
        cancelText={t("admin.posts.cancel")}
        confirmText={t("admin.posts.delete")}
        onConfirm={async () => {
          const path = source === "posts" ? `/api/comments/${id}` : `/api/work-comments/${id}`;
          await fetch(path, { method: "DELETE" });
          fetchComments();
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
      />,
      { id: "comment-delete", header: { title: t("admin.posts.delete") }, closeButton: true, width: "400px" },
    );
  };

  const handleBulkDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    openModal(
      <ModalConfirm
        desc={t("admin.comments.bulkDeleteDesc").replace("{{count}}", String(ids.length))}
        cancelText={t("admin.posts.cancel")}
        confirmText={t("admin.posts.delete")}
        onConfirm={async () => {
          await Promise.all(
            ids.map((id) => {
              const item = items.find((i) => i.id === id);
              const path = item?.source === "works" ? `/api/work-comments/${id}` : `/api/comments/${id}`;
              return fetch(path, { method: "DELETE" });
            }),
          );
          setSelected(new Set());
          fetchComments();
        }}
      />,
      { id: "comment-bulk-delete", header: { title: t("admin.posts.delete") }, closeButton: true, width: "400px" },
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (items.every((i) => selected.has(i.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = items.some((i) => selected.has(i.id)) && !allSelected;

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
    } catch { return iso; }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}><T k="admin.comments.title" /></h1>
      </header>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <Select
          value={source}
          options={[
            { value: "all", label: t("admin.comments.sourceAll") },
            { value: "posts", label: t("admin.comments.sourcePosts") },
            { value: "works", label: t("admin.comments.sourceWorks") },
          ]}
          onChange={(v) => { setSource(v as SourceFilter); setPage(1); }}
        />
        <Select
          value={status}
          options={[
            { value: "active", label: t("admin.comments.statusActive") },
            { value: "deleted", label: t("admin.comments.statusDeleted") },
            { value: "all", label: t("admin.comments.statusAll") },
          ]}
          onChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}
        />
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <SearchCapsule
            search={searchInput}
            onSearchChange={setSearchInput}
            placeholder={t("admin.comments.searchPlaceholder")}
          />
          <Button type="submit" variant="ghost" size="sm">
            <T k="admin.comments.search" />
          </Button>
        </form>
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{t("admin.comments.selectedCount").replace("{{count}}", String(selected.size))}</span>
          <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkDelete}>
            <T k="admin.posts.delete" />
          </button>
          <button className={styles.bulkCancelBtn} onClick={() => setSelected(new Set())} aria-label="Clear">✕</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.tableHeader}>
        <span className={styles.colCheck}>
          <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} shape="square" />
        </span>
        <span><T k="admin.comments.colSource" /></span>
        <span><T k="admin.comments.colAuthor" /></span>
        <span><T k="admin.comments.colContent" /></span>
        <span><T k="admin.comments.colTarget" /></span>
        <span><T k="admin.comments.colDate" /></span>
        <span></span>
      </div>

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.row}>
              <Skeleton width={16} height={16} borderRadius="3px" />
              <SkeletonLine width={50} />
              <SkeletonLine width={80} />
              <SkeletonLine width="80%" />
              <SkeletonLine width={120} />
              <SkeletonLine width={100} />
              <span />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={styles.empty}><T k="admin.comments.empty" /></p>
      ) : (
        <div className={styles.list}>
          {items.map((c) => (
            <div key={c.id} className={`${styles.row} ${c.is_deleted ? styles.rowDeleted : ""}`}>
              <span className={styles.colCheck}>
                <Checkbox checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} shape="square" />
              </span>
              <span className={`${styles.sourceBadge} ${c.source === "posts" ? styles.badgePosts : styles.badgeWorks}`}>
                {c.source === "posts" ? "Post" : "Work"}
              </span>
              <span className={styles.author}>
                {c.is_admin && <span className={styles.adminBadge}>Admin</span>}
                {c.nickname}
              </span>
              <span className={styles.content}>
                {c.is_deleted ? (
                  <em className={styles.deletedNote}>
                    {c.deleted_by === "admin" ? t("admin.comments.deletedByAdmin") : t("admin.comments.deletedBySelf")}
                  </em>
                ) : (
                  c.content.length > 120 ? c.content.slice(0, 120) + "…" : c.content
                )}
              </span>
              <span className={styles.target}>
                {c.target_slug ? (
                  <Link href={c.source === "posts" ? `/posts/${c.target_slug}` : `/works/${c.target_slug}`} className={styles.targetLink}>
                    {c.target_title || "—"}
                  </Link>
                ) : "—"}
              </span>
              <span className={styles.date}>{fmtDate(c.created_at)}</span>
              <span className={styles.actions}>
                {!c.is_deleted && (
                  <button className={styles.deleteBtn} onClick={() => handleDelete(c.id, c.source)} aria-label="Delete">
                    <Trash2 size={14} strokeWidth={1.6} />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ←
          </Button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            →
          </Button>
        </div>
      )}
    </div>
  );
}
