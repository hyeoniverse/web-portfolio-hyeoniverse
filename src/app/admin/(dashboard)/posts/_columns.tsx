import { ImageIcon, Download } from "lucide-react";
import T from "@/components/ui/T";
import HighlightedText from "@/components/ui/HighlightedText";
import { formatPostTitle } from "@/utils/post";
import MediaThumb from "@/components/admin/MediaThumb";
import {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import type { Post, Series } from "@/types/post";
import type { BilingualCategory } from "@/hooks/useCategories";
import { translateCategory } from "@/hooks/useCategories";
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
            <MediaThumb src={post.cover_image} fill sizes="48px" className={ts.thumbImg} />
          ) : (
            <div className={ts.thumbPlaceholder}>
              <ImageIcon size={16} strokeWidth={1.5} />
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
      render: (post) => <HighlightedText text={formatPostTitle(post) || t("admin.posts.untitled")} />,
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
    {
      key: "status",
      label: t("admin.posts.tableStatus"),
      className: ts.colMeta,
      render: (post) => {
        const isScheduled = !post.published && post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now();
        if (isScheduled) {
          return (
            <span className={`${ts.statusBadge} ${ts.scheduled}`} title={post.scheduled_at ?? ""}>
              {t("admin.posts.scheduled") || "Scheduled"}
            </span>
          );
        }
        return (
          <span className={`${ts.statusBadge} ${post.published ? ts.published : ts.draft}`}>
            {post.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
          </span>
        );
      },
      skeletonWidth: "50px",
    },
  ];
}

export function createTrashColumns(
  t: TFn,
  getDaysLeft: (deletedAt: string, purgeAfter?: string | null) => number,
  handleRestore: (id: string) => void,
  handlePurge: (id: string, title: string) => void,
  handleExtend: (id: string) => void,
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
            <MediaThumb src={post.cover_image} fill sizes="48px" className={st.thumbImg} />
          ) : (
            <div className={st.thumbPlaceholder}>
              <ImageIcon size={16} strokeWidth={1.5} />
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
        const daysLeft = getDaysLeft(post.deleted_at!, post.purge_after);
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
          <button type="button" className={st.actionBtn} onClick={() => handleExtend(post.id)} title={t("admin.posts.trashExtendTip")}>
            <T k="admin.posts.trashExtend" />
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
  handleExportSeries?: (seriesId: string) => void,
  language: "ko" | "en" = "ko",
  categories: BilingualCategory[] = [],
): SubTableColumn<Series>[] {
  return [
    {
      key: "num",
      label: "#",
      render: (_s, index) => <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>{index + 1}</span>,
      skeletonWidth: "20px",
    },
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: st.colThumbWrap,
      render: (s) => (
        <div className={st.colThumb}>
          {s.cover_image ? (
            <MediaThumb src={s.cover_image} fill sizes="48px" className={st.thumbImg} />
          ) : (
            <div className={st.thumbPlaceholder}>
              <ImageIcon size={16} strokeWidth={1.5} />
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
      render: (s) => s.category ? <span className={styles.seriesRowCat}>{translateCategory(s.category, language, categories)}</span> : <span>—</span>,
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
          {handleExportSeries && (
            <button type="button" className={st.exportIconBtn} title={t("admin.posts.exportMd")} onClick={() => handleExportSeries(s.id)}>
              <Download size={14} />
            </button>
          )}
        </>
      ),
    },
  ];
}
