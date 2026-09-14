import { ImageIcon, Download, ExternalLink } from "@/components/icons";
import type { TFunction } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import HighlightedText from "@/components/ui/HighlightedText";
import { formatPostTitle } from "@/utils/post";
import MediaThumb from "@/components/admin/MediaThumb";
import EditableRowNumber from "@/components/admin/AdminTable/EditableRowNumber";
import {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import type { Post, Series } from "@/types/post";
import type { BilingualCategory } from "@/hooks/useCategories";
import { translateCategory } from "@/hooks/useCategories";
import styles from "./AdminPosts.module.css";
import Pressable from "@/components/ui/Pressable";


export function createPostColumns(t: TFunction, onTogglePublished?: (post: Post) => void): AdminTableColumn<Post>[] {
  return [
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: ts.colThumbWrap,
      render: (post) => (
        <div className={ts.colThumb}>
          {post.cover_image ? (
            <MediaThumb src={post.cover_image} fill sizes="48px" unoptimized={false} className={ts.thumbImg} />
          ) : (
            <div className={ts.thumbPlaceholder}>
              <ImageIcon size={16} strokeWidth={1.5} />
            </div>
          )}
        </div>
      ),
      skeletonWidth: "48px",
      skeletonShape: "box",
    },
    {
      key: "title",
      label: t("admin.posts.tableTitle"),
      className: ts.colTitle,
      render: (post) => <HighlightedText text={formatPostTitle(post) || t("admin.posts.untitled")} />,
      skeletonWidth: "75%",
    },
    {
      key: "view",
      label: "",
      className: ts.colView,
      render: (post) =>
        post.published && post.slug ? (
          <a
            href={`/posts/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={ts.viewBtn}
            title={t("admin.posts.viewDetail")}
            aria-label={t("admin.posts.viewDetail")}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} strokeWidth={1.5} />
          </a>
        ) : null,
      skeletonWidth: "20px",
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
            <StatusBadge variant="scheduled" title={post.scheduled_at ?? ""}>
              {t("admin.posts.scheduled") || "Scheduled"}
            </StatusBadge>
          );
        }
        // 클릭 토글 — 발행/미발행 전환. onTogglePublished 없으면 정적 배지.
        if (!onTogglePublished) {
          return (
            <StatusBadge variant={post.published ? "published" : "draft"}>
              {post.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
            </StatusBadge>
          );
        }
        return (
          <StatusBadge
            variant={post.published ? "published" : "draft"}
            onClick={(e) => { e.stopPropagation(); onTogglePublished(post); }}
            title={post.published ? t("admin.posts.clickToUnpublish") : t("admin.posts.clickToPublish")}
          >
            {post.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
          </StatusBadge>
        );
      },
      skeletonWidth: "50px",
    },
  ];
}

export function createTrashColumns(
  t: TFunction,
  getDaysLeft: (deletedAt: string, purgeAfter?: string | null) => number,
  handleRestore: (id: string) => void,
  handlePurge: (id: string, title: string) => void,
  handleExtend: (id: string) => void,
): SubTableColumn<Post>[] {
  return [
    {
      key: "num",
      label: "#",
      className: `${st.colMeta} ${st.colNum}`,
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
            <MediaThumb src={post.cover_image} fill sizes="48px" unoptimized={false} className={st.thumbImg} />
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
          <Pressable className={st.actionBtn} onClick={() => handleRestore(post.id)}>
            <T k="admin.posts.trashRestore" />
          </Pressable>
          <Pressable className={st.actionBtn} onClick={() => handleExtend(post.id)} title={t("admin.posts.trashExtendTip")}>
            <T k="admin.posts.trashExtend" />
          </Pressable>
          <Pressable className={st.dangerBtn} onClick={() => handlePurge(post.id, formatPostTitle(post) || t("admin.posts.untitled"))}>
            <T k="admin.posts.trashPurge" />
          </Pressable>
        </>
      ),
    },
  ];
}

export function createSeriesColumns(
  t: TFunction,
  handleDeleteSeries: (s: Series) => void,
  handleExportSeries?: (seriesId: string) => void,
  language: "ko" | "en" = "ko",
  categories: BilingualCategory[] = [],
  // 순서(sort_order) 인라인 편집 — 메인 테이블처럼 # 클릭 시 input 으로 위치 변경.
  // 미지정(검색/필터/다른 정렬 중)이면 정적 순번만 표시.
  onReorder?: (s: Series, newOrder: number) => void | Promise<void>,
  rowMax?: number,
): SubTableColumn<Series>[] {
  return [
    {
      key: "num",
      label: "#",
      className: st.colNum,
      render: (s, index) =>
        onReorder ? (
          <EditableRowNumber value={s.sort_order} min={1} max={rowMax} onSave={(n) => onReorder(s, n)} />
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>{index + 1}</span>
        ),
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
        <StatusBadge variant={s.published ? "published" : "draft"}>
          {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
        </StatusBadge>
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
          <Pressable className={st.dangerBtn} onClick={() => handleDeleteSeries(s)}>
            <T k="admin.posts.delete" />
          </Pressable>
          {handleExportSeries && (
            <Pressable className={st.exportIconBtn} title={t("admin.posts.exportMd")} onClick={() => handleExportSeries(s.id)}>
              <Download size={14} />
            </Pressable>
          )}
        </>
      ),
    },
  ];
}
