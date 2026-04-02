import Image from "next/image";
import T from "@/components/ui/T";
import { formatPostTitle } from "@/utils/post";
import {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import type { Post, Series } from "@/types/post";
import styles from "./AdminPosts.module.css";

type TFn = (key: string) => string;

export function createPostColumns(t: TFn): AdminTableColumn<Post>[] {
  return [
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: ts.colThumbWrap,
      render: (post) => (
        <div className={ts.colThumb}>
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt=""
              fill
              sizes="48px"
              className={ts.thumbImg}
              unoptimized
            />
          ) : (
            <div className={ts.thumbPlaceholder}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>
      ),
      skeletonWidth: "48px",
    },
    {
      key: "title",
      label: t("admin.posts.tableTitle"),
      className: ts.colTitle,
      render: (post) => formatPostTitle(post) || t("admin.posts.untitled"),
      skeletonWidth: "75%",
    },
    {
      key: "date",
      label: t("admin.posts.tableDate"),
      className: ts.colMeta,
      render: (post) => new Date(post.created_at).toLocaleDateString(),
      skeletonWidth: "80px",
    },
    {
      key: "views",
      label: t("admin.posts.tableViews"),
      className: ts.colMono,
      render: (post) => String(post.view_count),
      skeletonWidth: "30px",
    },
  ];
}

export function createTrashColumns(
  t: TFn,
  getDaysLeft: (deletedAt: string) => number,
  handleRestore: (id: string) => void,
  handlePurge: (id: string, title: string) => void,
): SubTableColumn<Post>[] {
  return [
    {
      key: "num",
      label: "#",
      className: st.colMeta,
      render: (post) => <span>{post.post_number ?? "—"}</span>,
      skeletonWidth: "24px",
    },
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: st.colThumbWrap,
      render: (post) => (
        <div className={st.colThumb}>
          {post.cover_image ? (
            <Image src={post.cover_image} alt="" fill sizes="48px" className={st.thumbImg} unoptimized />
          ) : (
            <div className={st.thumbPlaceholder}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>
      ),
      skeletonWidth: "48px",
    },
    {
      key: "title",
      label: t("admin.posts.tableTitle"),
      className: st.colTitle,
      render: (post) => formatPostTitle(post) || t("admin.posts.untitled"),
      skeletonWidth: "60%",
    },
    {
      key: "daysLeft",
      label: t("admin.posts.trashDaysLeftLabel"),
      className: st.colMeta,
      render: (post) => {
        const daysLeft = getDaysLeft(post.deleted_at!);
        return (
          <span className={st.colDaysLeft}>
            <span className={daysLeft <= 7 ? st.accentText : ""}>{daysLeft}<T k="admin.posts.trashDaysLeftUnit" /></span>
            <span className={st.colDaysSub}><T k="admin.posts.trashAutoDeleteShort" /></span>
          </span>
        );
      },
    },
    {
      key: "actions",
      label: t("admin.posts.actions"),
      className: st.colActions,
      render: (post) => (
        <>
          <button type="button" className={st.actionBtn} onClick={() => handleRestore(post.id)}>
            <T k="admin.posts.trashRestore" />
          </button>
          <button type="button" className={st.dangerBtn} onClick={() => handlePurge(post.id, formatPostTitle(post) || t("admin.posts.untitled"))}>
            <T k="admin.posts.trashPurge" />
          </button>
        </>
      ),
    },
  ];
}

export function createSeriesColumns(
  t: TFn,
  handleDeleteSeries: (s: Series) => void,
): SubTableColumn<Series>[] {
  return [
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: st.colThumbWrap,
      render: (s) => (
        <div className={st.colThumb}>
          {s.cover_image ? (
            <Image src={s.cover_image} alt="" fill sizes="48px" unoptimized className={st.thumbImg} />
          ) : (
            <div className={st.thumbPlaceholder}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>
      ),
      skeletonWidth: "48px",
    },
    {
      key: "title",
      label: t("admin.posts.tableTitle"),
      className: st.colTitle,
      render: (s) => (
        <a
          href={`/admin/settings?tab=content&sub=posts&series=${s.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.seriesRowLink}
        >
          {s.title || t("admin.posts.untitled")}
        </a>
      ),
      skeletonWidth: "60%",
    },
    {
      key: "category",
      label: t("admin.posts.tableCategory"),
      className: st.colMeta,
      render: (s) => s.category ? <span className={styles.seriesRowCat}>{s.category}</span> : <span>—</span>,
    },
    {
      key: "count",
      label: t("admin.posts.tablePostCount"),
      className: st.colMeta,
      render: (s) => <span>{s.post_count ?? 0}</span>,
    },
    {
      key: "status",
      label: t("admin.posts.tableStatus"),
      className: st.colMeta,
      render: (s) => (
        <span className={`${st.statusBadge} ${s.published ? st.published : st.draft}`}>
          {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("admin.posts.actions"),
      className: st.colActions,
      render: (s) => (
        <>
          <a
            href={`/admin/settings?tab=content&sub=posts&series=${s.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={st.actionBtn}
          >
            <T k="admin.posts.edit" />
          </a>
          <button type="button" className={st.dangerBtn} onClick={() => handleDeleteSeries(s)}>
            <T k="admin.posts.delete" />
          </button>
        </>
      ),
    },
  ];
}
