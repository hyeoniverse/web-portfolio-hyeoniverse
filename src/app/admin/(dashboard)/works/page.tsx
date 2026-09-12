"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { QUERY_PARAM } from "@/constants";
import type { GithubImportResponse } from "@/types";
import { useRouter } from "next/navigation";
import MediaThumb from "@/components/admin/MediaThumb";
import HighlightedText from "@/components/ui/HighlightedText";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { ImageIcon, Trash2, Upload, Plus, Download, ExternalLink } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { getTrashDaysLeft } from "@/utils/trash";
import { downloadBlob, downloadFiles } from "@/utils/download";
import { formatProjectNumber } from "@/utils/formatProjectNumber";
import { usePreviewTooltip } from "@/hooks/usePreviewTooltip";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Work } from "@/types/work";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import HelpButton from "@/components/ui/HelpButton";
import AccessRequestModal from "@/components/admin/AccessRequestModal";
import { useMyRole } from "@/hooks/useMyRole";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import T from "@/components/ui/T";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import StickyGlassBar from "@/components/admin/StickyGlassBar/StickyGlassBar";
import AdminTable, {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import SubTable, { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { useModalStore } from "@/stores/modalStore";
import BulkCategoryModal from "@/components/admin/BulkCategoryModal";
import type { BilingualCategory } from "@/types/common";
import { parseMdWork } from "@/utils/mdParser";
import { uploadRandomCover } from "@/utils/uploadRandomCover";
import { sendAction, sendActions, notifyFailures, tryRequest } from "@/lib/sendAction";
import { CodedError } from "@/lib/apiError";
import styles from "./AdminWorks.module.css";
import MarkdownUploadGuide from "./_components/MarkdownUploadGuide";
import Pressable from "@/components/ui/Pressable";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];


/* ── Isolated tooltip to prevent parent re-renders from reaching AdminTable ── */
function PreviewTooltip({
  work,
  pos,
  imgError,
  onImgError,
  onDismiss,
  onNavigate,
}: {
  work: Work | null;
  pos: { top: number; left: number };
  imgError: boolean;
  onImgError: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const { t } = useLanguage();
  if (!work) return null;
  return (
    <>
      <div className={shell.previewBackdrop} onClick={onDismiss} />
      <div
        className={shell.previewTooltip}
        style={{ top: pos.top, left: pos.left }}
        onClick={onNavigate}
      >
        <div className={shell.previewImage}>
          {work.image && !imgError ? (
            <MediaThumb
              src={work.image}
              width={280}
              height={140}
              className={shell.previewImg}
              onError={onImgError}
            />
          ) : (
            <div className={shell.previewPlaceholder}>
              <ImageIcon size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className={shell.previewBody}>
          <p className={shell.previewTitle}>{work.title}</p>
          <p className={shell.previewExcerpt} style={!work.subtitle_ko ? { color: "var(--text-muted)", fontStyle: "italic" } : undefined}>{work.subtitle_ko || t("admin.common.noContent")}</p>
          {work.tech.length > 0 && (
            <div className={shell.previewTags}>
              {work.tech.map((tag) => (
                <span key={tag} className={shell.previewTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminWorksPage() {
  /* 목록은 로그인한 멤버 누구나 본다. 편집만 막는다 — 관리자이거나 그 작업물의 팀원이어야 한다.
     서버의 requirePostAccess 와 works_admin_update 정책이 같은 규칙(can_edit_work)을 쓴다.
     여기서 막는 것은 표시용이고, 인가 자체는 서버와 정책이 한다. */
  const myRole = useMyRole();
  const canEdit = (w: Work) => myRole.canEditWork(w.team_members);

  /** 편집할 수 없는 작업물 — 이유를 알리고 팀원 등록을 요청할 수 있게 한다. */
  const openDeniedModal = (blocked: Work[]) => {
    openModal(
      <AccessRequestModal
        endpoint="works"
        desc={t("admin.works.noPermissionDesc")}
        targets={blocked.map((w) => ({ id: w.id, title: w.title || t("admin.works.untitled") }))}
      />,
      { id: "no-permission", header: { title: t("admin.works.noPermissionTitle") }, closeButton: true, width: "440px" },
    );
  };
  /** id 목록을 현재 목록/휴지통에서 Work 로 되돌린다 — 일괄 작업이 id 만 넘기기 때문. */
  const worksByIds = (ids: string[]): Work[] => {
    const all = [...works, ...trashWorks];
    return ids.map((id) => all.find((w) => w.id === id)).filter((w): w is Work => Boolean(w));
  };

  const guardWritable = (targets: Work[]): boolean => {
    if (myRole.loading) return false;
    const blocked = targets.filter((w) => !canEdit(w));
    if (blocked.length === 0) return true;
    openDeniedModal(blocked);
    return false;
  };
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /* Filters & sort */
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [syntaxMode, setSyntaxMode] = useState<"prefix" | "regex">("prefix");
  const [sort, setSort] = useState("order");
  const [filterYear, setFilterYear] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterNature, _setFilterNature] = useState("");
  const [perPage, setPerPage] = useState(siteConf.works.adminPerPage ?? 20);
  const hasFilters = sort !== "order" || filterYear !== "" || filterCategory !== "" || filterNature !== "" || search;

  /* Trash */
  const [trashWorks, setTrashWorks] = useState<Work[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashSearch, setTrashSearch] = useState("");
  const [trashSearchType, setTrashSearchType] = useState<"all" | "title" | "content">("all");
  const [trashSortBy, setTrashSortBy] = useState<"deleted" | "created" | "name">("deleted");
  const [trashSortDir, setTrashSortDir] = useState<"asc" | "desc">("desc");
  const [trashPage, setTrashPage] = useState(1);
  const [trashPerPage, setTrashPerPage] = useState(10);

  /* Preview tooltip */
  const {
    tooltip,
    handleRowHover,
    handleRowLeave,
    handleRowClick,
    handleImgError,
    hideTooltip,
  } = usePreviewTooltip<Work>("/admin/works", { hasImage: (w) => !!(w as Work).image });

  /* Derived filter options from data */
  const yearOptions = useMemo(() => {
    const years = [...new Set(works.map((w) => w.year).filter(Boolean))];
    years.sort((a, b) => b.localeCompare(a));
    return years;
  }, [works]);

  const categoryOptions = useMemo(() => {
    const cats = new Map<string, string>();
    for (const w of works) {
      const ks = w.categories_ko ?? [];
      const es = w.categories_en ?? [];
      ks.forEach((k, i) => {
        if (k) cats.set(k, es[i] || k);
      });
    }
    return [...cats.entries()];
  }, [works]);

  const _natureOptions = useMemo(() => {
    const ns = new Map<string, string>();
    for (const w of works) {
      if (w.nature_ko) ns.set(w.nature_ko, w.nature_en || w.nature_ko);
    }
    return [...ns.entries()];
  }, [works]);

  // 일괄 카테고리 변경 모달용 — site.config + DB delta 머지된 전체 카테고리 목록
  const [worksCategories, setWorksCategories] = useState<BilingualCategory[]>([]);
  useEffect(() => {
    fetch("/api/works-categories")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setWorksCategories(data))
      .catch(() => {});
  }, []);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (filterCategory) params.set(QUERY_PARAM.category, filterCategory);
    if (filterNature) params.set("nature", filterNature);
    if (filterYear) params.set("year", filterYear);
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
      params.set("syntaxMode", syntaxMode);
    }
    const res = await fetch(`/api/works?${params}`);
    const data = await res.json();
    setWorks(data.works ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotalCount(data.total ?? data.works?.length ?? 0);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterNature, filterYear, search, searchType, syntaxMode]);

  const fetchTrash = useCallback(async () => {
    const res = await fetch("/api/works?trash=true&limit=100");
    const data = await res.json();
    setTrashWorks(data.works ?? []);
  }, []);

  useEffect(() => {
    fetchWorks();
    fetchTrash();
  }, [fetchWorks, fetchTrash]);

  /* ── MD Upload ── */
  const { openModal } = useModalStore();
  const mdInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const createWorks = useCallback(async (items: Record<string, unknown>[]) => {
    setUploading(true);
    for (const body of items) {
      if (!body.image) {
        const url = await uploadRandomCover();
        if (url) body.image = url;
      }
    }
    /* 하나씩 차례로 — 서버가 지금 최댓값 + 1 로 순서를 매긴다. 만들지 못한 파일은 알림으로 알린다(#868) */
    const created = await sendActions(
      items.map((body) => ({ input: "/api/works", init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } })),
      t, t("admin.common.importFailed"), { sequential: true },
    );
    setUploading(false);
    if (created > 0) fetchWorks();
  }, [fetchWorks, t]);

  const handleMdUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const parsed: Record<string, unknown>[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) continue;
      const raw = await file.text();
      parsed.push(parseMdWork(raw, file.name));
    }
    if (mdInputRef.current) mdInputRef.current.value = "";
    if (parsed.length === 0) return;
    await createWorks(parsed);
  }, [createWorks]);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const res = await sendAction("/api/works/export?all=true", undefined, t, t("admin.common.exportFailed"));
      if (!res) return;
      const { files } = await res.json() as GithubImportResponse;
      await downloadFiles(files);
    } finally {
      setExporting(false);
    }
  }, [t]);

  /* ── Filtered trash ── */
  const filteredTrash = useMemo(() => {
    let list = [...trashWorks];
    if (trashSearch) {
      const q = trashSearch.toLowerCase();
      list = list.filter((w) => {
        const title = (w.title || "").toLowerCase();
        const content = ((w.content_ko || "") + " " + (w.content_en || "")).toLowerCase();
        if (trashSearchType === "title") return title.includes(q);
        if (trashSearchType === "content") return content.includes(q);
        return title.includes(q) || content.includes(q);
      });
    }
    list.sort((a, b) => {
      if (trashSortBy === "name") {
        const r = (a.title || "").localeCompare(b.title || "");
        return trashSortDir === "asc" ? r : -r;
      }
      const field = trashSortBy === "created" ? a.created_at : a.deleted_at;
      const fieldB = trashSortBy === "created" ? b.created_at : b.deleted_at;
      const da = field ? new Date(field).getTime() : 0;
      const db = fieldB ? new Date(fieldB).getTime() : 0;
      return trashSortDir === "asc" ? da - db : db - da;
    });
    return list;
  }, [trashWorks, trashSearch, trashSearchType, trashSortBy, trashSortDir]);

  const trashFiltersChanged = useDepsChanged([trashSearch, trashSearchType, trashSortBy, trashSortDir]);
  if (trashFiltersChanged) setTrashPage(1);

  /* 실패하면 알림을 띄우고 목록은 그대로 둔다 — 예전에는 응답을 보지 않아 거절돼도 아무 표시가 없었다(#868) */
  const handleDelete = async (id: string) => {
    if (!(await sendAction(`/api/works/${id}`, { method: "DELETE" }, t, t("admin.common.deleteFailed")))) return;
    fetchWorks();
    if (trashOpen) fetchTrash();
  };

  const handleRestore = async (id: string) => {
    if (!(await sendAction(`/api/works/${id}/restore`, { method: "POST" }, t, t("admin.common.restoreFailed")))) return;
    fetchTrash();
    fetchWorks();
  };

  const handleExtend = async (id: string) => {
    if (await sendAction(`/api/works/${id}/extend-retention`, { method: "POST" }, t, t("admin.common.extendFailed"))) fetchTrash();
  };

  const handlePurge = async (id: string, title: string) => {
    if (!confirm(`"${title}" — ${t("admin.works.trashPurgeConfirm")}`)) return;
    if (await sendAction(`/api/works/${id}/purge`, { method: "DELETE" }, t, t("admin.common.purgeFailed"))) fetchTrash();
  };

  /* handleMove 는 useCallback 이라 guardWritable 을 의존성에 넣으면 매 렌더 재생성된다.
     ref 로 최신 함수만 참조한다. */
  const guardMoveRef = useRef<(w: Work) => boolean>(() => false);
  /* 쓰기는 렌더가 끝난 뒤에 한다 — 렌더 중에 ref 를 건드리면 동시 렌더에서 값이 엇갈린다. */
  useEffect(() => {
    guardMoveRef.current = (w) => guardWritable([w]);
  });

  const handleDragReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;

    /* 끌어 놓기는 옮긴 항목만이 아니라 그 사이 구간 전체의 sort_order 를 다시 매긴다.
       구간에 편집할 수 없는 작업물이 하나라도 있으면 그 행의 쓰기가 서버에서 막혀
       순서가 어긋난 채로 남는다. 구간 전체가 가능할 때만 진행한다. */
    if (!guardWritable(works.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1))) return;

    // page-position 기반 dense sort_order 재할당 — 기존 값에 0/duplicate 가 있어도 자동 정리.
    // 페이지 N (1-indexed) 의 row idx 의 global sort_order = (N-1)*perPage + idx + 1
    const pageOffset = (page - 1) * perPage;
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);

    const reordered = [...works];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const next = reordered.map((w, idx) => {
      if (idx >= lo && idx <= hi) {
        return { ...w, sort_order: pageOffset + idx + 1 };
      }
      return w;
    });
    setWorks(next);

    // 서버 동기화 — skipShift=true 로 batch (각 PATCH 가 normalize 안 함). 마지막에 fetchWorks 로 refresh.
    await sendActions(
      next.slice(lo, hi + 1).map((w) => ({
        input: `/api/works/${w.id}?skipShift=true`,
        init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: w.sort_order }) },
      })),
      t, t("admin.common.reorderFailed"),
    );
    fetchWorks();
  };

  /** 위치 이동 — popover 에서 선택한 newOrder 로 PATCH.
      서버가 다른 work 들 shift 처리 (skipShift=false) */
  const handleMove = useCallback(async (target: Work, newOrder: number) => {
    if (newOrder === target.sort_order) return;
    if (!guardMoveRef.current(target)) return;
    const res = await sendAction(`/api/works/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: newOrder }),
    }, t, t("admin.common.reorderFailed"));
    if (res) fetchWorks();
  }, [fetchWorks, t]);

  // 상태 배지 클릭 → 발행/미발행 토글 (낙관적 업데이트, 실패 시 롤백)
  const handleToggleWorkPublished = useCallback(async (work: Work) => {
    const next = !work.published;
    setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, published: next } : w)));
    const res = await sendAction(`/api/works/${work.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: next }),
    }, t, t("admin.common.publishFailed"));
    if (!res) setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, published: work.published } : w)));
  }, [t]);

  const columns: AdminTableColumn<Work>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: t("admin.works.tableThumb"),
        className: ts.colThumbWrap,
        render: (work) => (
          <div className={ts.colThumb}>
            {work.image ? (
              <MediaThumb src={work.image} fill sizes="48px" className={ts.thumbImg} />
            ) : (
              <div className={ts.thumbPlaceholder}>—</div>
            )}
          </div>
        ),
        skeletonWidth: "48px",
        skeletonShape: "box",
      },
      {
        key: "title",
        label: t("admin.works.tableTitle"),
        className: ts.colTitle,
        render: (work) => <HighlightedText text={work.title || t("admin.works.untitled")} />,
        skeletonWidth: "65%",
      },
      {
        key: "view",
        label: "",
        className: ts.colView,
        render: (work) =>
          work.published && (work.slug || work.id) ? (
            <a
              href={`/works/${work.slug || work.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={ts.viewBtn}
              title={t("admin.works.viewDetail")}
              aria-label={t("admin.works.viewDetail")}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          ) : null,
        skeletonWidth: "20px",
      },
      {
        key: "year",
        label: t("admin.works.tableYear"),
        className: ts.colMono,
        render: (work) => work.year,
        skeletonWidth: "40px",
      },
      {
        key: "status",
        label: t("admin.works.tableStatus"),
        className: ts.colMeta,
        render: (work) => (
          <StatusBadge
            variant={work.published ? "published" : "draft"}
            onClick={(e) => { e.stopPropagation(); handleToggleWorkPublished(work); }}
            title={work.published ? t("admin.posts.clickToUnpublish") : t("admin.posts.clickToPublish")}
          >
            {work.published ? t("admin.works.published") : t("admin.works.draft")}
          </StatusBadge>
        ),
        skeletonWidth: "50px",
      },
    ],
    [t, handleToggleWorkPublished],
  );

  const labels = useMemo(
    () => ({
      edit: t("admin.works.edit"),
      delete: t("admin.works.delete"),
      deleteConfirm: t("admin.works.deleteConfirm"),
      deleteConfirmInput: t("admin.works.deleteConfirmInput"),
      cancel: t("admin.works.cancel"),
      actions: t("admin.works.tableActions"),
      publishLabel: t("admin.works.publishLabel"),
      publishedTooltip: t("admin.works.publishedTooltip"),
      unpublishedTooltip: t("admin.works.unpublishedTooltip"),
      move: t("admin.common.moveToPosition"),
      moveCurrent: t("admin.common.moveCurrent"),
      moveToTop: t("admin.common.moveToTop"),
      moveToBottom: t("admin.common.moveToBottom"),
      apply: t("admin.common.apply"),
      exportItem: t("admin.works.exportMd"),
      noPermission: t("admin.works.noPermissionRow"),
    }),
    [t],
  );

  /* ── Trash Section ── */

  const trashIcon = <Trash2 size={13} />;

  const trashColumns: SubTableColumn<Work>[] = useMemo(() => [
    {
      key: "num",
      label: "#",
      className: st.colMeta,
      render: (work) => <span>{formatProjectNumber(work.sort_order) || "—"}</span>,
      skeletonWidth: "24px",
    },
    {
      key: "thumb",
      label: t("admin.works.tableThumb"),
      className: st.colThumbWrap,
      render: (work) => (
        <div className={st.colThumb}>
          {work.image ? (
            <MediaThumb src={work.image} fill sizes="48px" className={st.thumbImg} />
          ) : (
            <div className={st.thumbPlaceholder}>—</div>
          )}
        </div>
      ),
      skeletonWidth: "48px",
    },
    {
      key: "title",
      label: t("admin.works.tableTitle"),
      className: st.colTitle,
      render: (work) => work.title || t("admin.works.untitled"),
      skeletonWidth: "60%",
    },
    {
      key: "daysLeft",
      label: t("admin.works.trashDaysLeftLabel") ?? "",
      className: st.colMeta,
      render: (work) => {
        const daysLeft = work.deleted_at ? getTrashDaysLeft(work.deleted_at, work.purge_after) : 30;
        return (
          <span className={st.colDaysLeft}>
            <span className={daysLeft <= 7 ? st.accentText : ""}>{daysLeft}<T k="admin.works.trashDaysLeftUnit" /></span>
            <span className={st.colDaysSub}><T k="admin.works.trashAutoDeleteShort" /></span>
          </span>
        );
      },
    },
    {
      key: "actions",
      label: t("admin.works.actions"),
      className: st.colActions,
      render: (work) => (
        <>
          <Pressable className={st.actionBtn} onClick={() => handleRestore(work.id)}>
            <T k="admin.works.trashRestore" />
          </Pressable>
          <Pressable className={st.actionBtn} onClick={() => handleExtend(work.id)} title={t("admin.works.trashExtendTip")}>
            <T k="admin.works.trashExtend" />
          </Pressable>
          <Pressable className={st.dangerBtn} onClick={() => handlePurge(work.id, work.title || t("admin.works.untitled"))}>
            <T k="admin.works.trashPurge" />
          </Pressable>
        </>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

  const trashSection = (
    <div className={styles.trashSection}>
      <SubTable<Work>
        icon={trashIcon}
        title={<T k="admin.works.trash" />}
        count={trashWorks.length}
        hint={<T k="admin.works.trashAutoDelete" />}
        open={trashOpen}
        onToggle={() => { if (!trashOpen) fetchTrash(); setTrashOpen((v) => !v); }}
        allItems={filteredTrash}
        columns={trashColumns}
        gridTemplate="28px 64px 1fr 100px 180px"
        selected={new Set<string>()}
        onSelectChange={() => {}}
        page={trashPage}
        perPage={trashPerPage}
        onPageChange={setTrashPage}
        emptyMessage={t("admin.works.trashEmpty")}
        filterBar={
          <div className={shell.filterBar}>
            <SegmentedControl<"deleted" | "created" | "name">
              items={[
                { value: "deleted", label: t("admin.works.sortDeletedAt") },
                { value: "created", label: t("admin.works.sortCreatedAt") },
                { value: "name", label: t("admin.works.sortName") },
              ]}
              value={trashSortBy}
              sortDir={trashSortDir}
              onChange={(v) => {
                if (v === trashSortBy) {
                  setTrashSortDir((d) => d === "asc" ? "desc" : "asc");
                } else {
                  setTrashSortBy(v);
                  setTrashSortDir("desc");
                }
              }}
            />
            <SearchCapsule
              typeSelector={{
                value: trashSearchType,
                options: [
                  { value: "all", label: t("admin.works.searchAll") },
                  { value: "title", label: t("admin.works.searchTitle") },
                  { value: "content", label: t("admin.works.searchContent") },
                ],
                onChange: (v) => setTrashSearchType(v as "all" | "title" | "content"),
              }}
              search={trashSearch}
              onSearchChange={setTrashSearch}
              placeholder={t("admin.works.trashSearch")}
              className={shell.filterSearch}
            />
            <Select
              value={String(trashPerPage)}
              options={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }]}
              onChange={(v) => { setTrashPerPage(Number(v)); setTrashPage(1); }}
              className={shell.filterPageSize}
            />
          </div>
        }
      />
    </div>
  );

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <AdminListShell
      title={t("admin.works.title")}
      newHref="/admin/works/new"
      newLabel={t("admin.works.newWork")}
      afterTable={trashSection}
      headerExtra={
        <>
          <input ref={mdInputRef} type="file" accept=".md" multiple hidden onChange={handleMdUpload} />
          <HelpButton
            title={t("admin.works.uploadGuide")}
            aria-label={t("admin.works.uploadGuide")}
            onClick={() => {
              openModal(
                <MarkdownUploadGuide />,
                { header: { title: t("admin.works.uploadGuide") }, closeButton: true, width: "560px" },
              );
            }}
          />
          <ButtonGroup>
            <Button variant="outline" size="xs" title={t("admin.works.uploadMd")} onClick={() => mdInputRef.current?.click()} disabled={uploading} soundDisabled icon={<Upload size={14} />}>
              {uploading ? "..." : t("admin.works.uploadMd")}
            </Button>
            <Button variant="primary" size="xs" title={t("admin.works.newWork")} href="/admin/works/new" soundDisabled icon={<Plus size={14} strokeWidth={1.5} />}>
              {t("admin.works.newWork")}
            </Button>
          </ButtonGroup>
        </>
      }
    >
      {/* Filter bar — sort + filters + perPage 좌측, 검색은 우측 끝 (margin-left:auto) */}
      <StickyGlassBar className={shell.filterBar}>
        <SegmentedControl
          items={[
            { value: "order", label: t("admin.works.sortOrder") },
            { value: "date", label: t("admin.works.sortDate") },
            { value: "name", label: t("admin.works.sortName") },
          ]}
          value={sort === "newest" || sort === "oldest" ? "date" : sort}
          sortDir={sort === "oldest" ? "asc" : "desc"}
          onChange={(v) => {
            if (v === "date") {
              if (sort === "newest") setSort("oldest");
              else if (sort === "oldest") setSort("newest");
              else setSort("newest");
            } else {
              setSort(v);
            }
            setPage(1);
          }}
        />
        {yearOptions.length > 1 && (
          <Select
            value={filterYear}
            options={[
              { value: "", label: t("admin.works.allYears") },
              ...yearOptions.map((y) => ({ value: y, label: y })),
            ]}
            onChange={(v) => { setFilterYear(v); setPage(1); }}
            className={shell.filterItem}
          />
        )}
        {categoryOptions.length > 1 && (
          <Select
            value={filterCategory}
            options={[
              { value: "", label: t("admin.works.allCategories") },
              ...categoryOptions.map(([ko, en]) => ({
                value: ko,
                label: language === "en" ? en : ko,
              })),
            ]}
            onChange={(v) => { setFilterCategory(v); setPage(1); }}
            className={shell.filterItem}
          />
        )}
        {hasFilters && (
          <Pressable
            className={shell.filterReset}
            onClick={() => { setSearch(""); setSearchType("all"); setSort("order"); setFilterYear(""); setFilterCategory(""); setPage(1); }}
          >
            {t("admin.works.resetFilters")}
          </Pressable>
        )}
        <SearchCapsule
          typeSelector={{
            value: searchType,
            options: [
              { value: "all", label: t("admin.works.searchAll") },
              { value: "title", label: t("admin.works.searchTitle") },
              { value: "content", label: t("admin.works.searchContent") },
            ],
            onChange: (v) => { setSearchType(v); setPage(1); },
          }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t("admin.works.search")}
          align="left"
          className={shell.filterSearch}
          onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
        />
        <Select
          value={String(perPage)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
          className={shell.filterPageSize}
        />
      </StickyGlassBar>

      <AdminTable<Work>
        items={works}
        columns={columns}
        editBasePath="/admin/works"
        getTitle={(w) => w.title || t("admin.works.untitled")}
        onDelete={async (id) => {
          if (!guardWritable(worksByIds([id]))) return;
          await handleDelete(id);
        }}
        onBulkExport={async (ids) => {
          if (!guardWritable(worksByIds(ids))) return;
          const failures: CodedError[] = [];
          for (const id of ids) {
            const res = await tryRequest(`/api/works/export?id=${id}`);
            if (res instanceof CodedError) {
              failures.push(res);
              continue;
            }
            const text = await res.text();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="(.+)"/);
            const fileName = match?.[1] ?? `${id}.md`;
            downloadBlob(text, fileName);
            await new Promise((r) => setTimeout(r, 100));
          }
          notifyFailures(failures, ids.length, t, t("admin.common.exportFailed"));
        }}
        onBulkPublish={async (ids, published) => {
          if (!guardWritable(worksByIds(ids))) return;
          await sendActions(
            ids.map((id) => ({ input: `/api/works/${id}`, init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) } })),
            t, t("admin.common.publishFailed"),
          );
          fetchWorks();
        }}
        extraBulkActions={[
          {
            label: t("admin.common.changeCategory"),
            onClick: (ids) => {
              if (!guardWritable(worksByIds(ids))) return;
              openModal(
                <BulkCategoryModal
                  count={ids.length}
                  categories={worksCategories}
                  onConfirm={async (cat) => {
                    await sendActions(
                      ids.map((id) => ({
                        input: `/api/works/${id}`,
                        init: {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            // bulk 변경은 단일 카테고리로 통째로 교체 (덮어쓰기)
                            categories_ko: cat?.ko ? [cat.ko] : [],
                            categories_en: cat?.en ? [cat.en] : [],
                          }),
                        },
                      })),
                      t, t("admin.common.categoryFailed"),
                    );
                    fetchWorks();
                  }}
                />,
                { id: "bulk-category-works", header: { title: t("admin.common.changeCategory") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        onReorder={sort === "order" && !filterYear && !filterCategory ? handleDragReorder : undefined}
        onMove={sort === "order" && !filterYear && !filterCategory ? handleMove : undefined}
        onRowLabelEdit={sort === "order" && !filterYear && !filterCategory ? async (target, newOrder) => {
          if (newOrder === target.sort_order) return;
          const res = await sendAction(`/api/works/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: newOrder }),
          }, t, t("admin.common.reorderFailed"));
          if (res) fetchWorks();
        } : undefined}
        rowLabelMax={totalCount || works.length}
        gridTemplate="64px 1fr 40px 100px 100px 180px"
        showRowNumbers
        getRowLabel={(w) => String(w.sort_order)}
        loading={loading}
        emptyMessage={t("admin.works.noWorksYet")}
        skeletonRows={4}
        labels={labels}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowHover={handleRowHover}
        onRowLeave={handleRowLeave}
        onRowClick={(w: Work, e) => { if (guardWritable([w])) handleRowClick(w, e); }}
        rowDisabled={(w: Work) => !canEdit(w)}
        onDenied={(w: Work) => openDeniedModal([w])}
        footerExtra={
          <Button variant="ghost" size="xs" title={t("admin.works.exportMdAll")} onClick={handleExportAll} disabled={exporting} soundDisabled icon={<Download size={14} />}>
            {exporting ? "..." : t("admin.works.exportMdAll")}
          </Button>
        }
      />

      {/* Hover / Tap preview tooltip — key 가 바뀔 때마다 새로 그린다 */}
      <PreviewTooltip
        key={tooltip.key}
        work={tooltip.item}
        pos={tooltip.pos}
        imgError={tooltip.imgError}
        onImgError={handleImgError}
        onDismiss={hideTooltip}
        onNavigate={() => {
          const work = tooltip.item;
          if (work) {
            hideTooltip();
            router.push(`/admin/works/${work.id}/edit`);
          }
        }}
      />

    </AdminListShell>
    </SearchHighlightProvider>
  );
}
