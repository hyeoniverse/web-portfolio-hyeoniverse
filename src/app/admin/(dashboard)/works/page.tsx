"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload, Plus, Download } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePreviewTooltip } from "@/hooks/usePreviewTooltip";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Work } from "@/types/work";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import T from "@/components/ui/T";
import AdminTable, {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import SubTable, { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import MoveDialog from "@/components/admin/MoveDialog";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { useModalStore } from "@/stores/modalStore";
import BulkCategoryModal from "@/components/admin/BulkCategoryModal";
import type { BilingualCategory } from "@/types/common";
import { parseMdWork } from "@/utils/mdParser";
import { uploadRandomCover } from "@/utils/uploadRandomCover";
import styles from "./AdminWorks.module.css";

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
            <Image
              src={work.image}
              alt=""
              width={280}
              height={140}
              className={shell.previewImg}
              unoptimized
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
          <p className={shell.previewExcerpt} style={!work.subtitle_ko ? { color: "var(--text-muted)", fontStyle: "italic" } : undefined}>{work.subtitle_ko || "내용 없음"}</p>
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
  const [sort, setSort] = useState("order");
  const [filterYear, setFilterYear] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [perPage, setPerPage] = useState(siteConf.works.adminPerPage ?? 20);
  const hasFilters = sort !== "order" || filterYear !== "" || filterCategory !== "" || search;

  /* Trash */
  const [trashWorks, setTrashWorks] = useState<Work[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashSearch, setTrashSearch] = useState("");
  const [trashSearchType, setTrashSearchType] = useState<"all" | "title" | "content">("all");
  const [trashSort, setTrashSort] = useState<"newest" | "oldest">("newest");
  const [trashPage, setTrashPage] = useState(1);
  const [trashPerPage, setTrashPerPage] = useState(10);

  /* Preview tooltip — use refs + minimal state to avoid re-rendering AdminTable */
  const {
    hoveredRef: hoveredWorkRef,
    tooltipKey,
    tooltipPosRef,
    imgErrorRef,
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
      if (w.category_ko) cats.set(w.category_ko, w.category_en || w.category_ko);
    }
    return [...cats.entries()];
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
    if (filterCategory) params.set("category", filterCategory);
    if (filterYear) params.set("year", filterYear);
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
    }
    const res = await fetch(`/api/works?${params}`);
    const data = await res.json();
    setWorks(data.works ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotalCount(data.total ?? data.works?.length ?? 0);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterYear, search, searchType]);

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
    let created = 0;
    for (const body of items) {
      if (!body.image) {
        const url = await uploadRandomCover();
        if (url) body.image = url;
      }
      const res = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) created++;
    }
    setUploading(false);
    if (created > 0) fetchWorks();
  }, [fetchWorks]);

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
      const res = await fetch("/api/works/export?all=true");
      if (!res.ok) return;
      const { files } = await res.json() as { files: { fileName: string; content: string }[] };
      for (const file of files) {
        const blob = new Blob([file.content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 100));
      }
    } finally {
      setExporting(false);
    }
  }, []);

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
      const da = new Date(a.deleted_at!).getTime();
      const db = new Date(b.deleted_at!).getTime();
      return trashSort === "newest" ? db - da : da - db;
    });
    return list;
  }, [trashWorks, trashSearch, trashSearchType, trashSort]);

  useEffect(() => { setTrashPage(1); }, [trashSearch, trashSearchType, trashSort]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/works/${id}`, { method: "DELETE" });
    fetchWorks();
    if (trashOpen) fetchTrash();
  };

  const handleRestore = async (id: string) => {
    await fetch(`/api/works/${id}/restore`, { method: "POST" });
    fetchTrash();
    fetchWorks();
  };

  const handlePurge = async (id: string, title: string) => {
    if (!confirm(`"${title}" — ${t("admin.works.trashPurgeConfirm")}`)) return;
    await fetch(`/api/works/${id}/purge`, { method: "DELETE" });
    fetchTrash();
  };

  const handleDragReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;

    // 영향 범위 내 sort_order 값들을 정렬해서 새 슬롯에 재배치
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const sortOrders = works
      .slice(lo, hi + 1)
      .map((w) => w.sort_order)
      .sort((a, b) => a - b);

    // 1) 순서 재배치
    const reordered = [...works];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // 2) immutable 하게 sort_order 재할당 (객체 새로 복제) → React 가 정상 reconcile
    const next = reordered.map((w, idx) => {
      if (idx >= lo && idx <= hi) {
        return { ...w, sort_order: sortOrders[idx - lo] };
      }
      return w;
    });
    setWorks(next);

    // 서버 동기화 — 실패 시에만 reload. skipShift=true 로 client-batch 모드 알림 (서버 자동 shift 비활성)
    try {
      await Promise.all(
        next.slice(lo, hi + 1).map((w) =>
          fetch(`/api/works/${w.id}?skipShift=true`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: w.sort_order }),
          }),
        ),
      );
    } catch {
      fetchWorks();
    }
  };

  /** 위치 이동 dialog 핸들러 — 맨 앞 / 맨 뒤 / 특정 위치로 이동.
      서버 PATCH 가 자동으로 다른 work 들 shift 처리 (skipShift=false) */
  const handleMove = useCallback((target: Work) => {
    openModal(
      <MoveDialog
        currentOrder={target.sort_order}
        totalCount={totalCount || works.length}
        onMove={async (newOrder) => {
          if (newOrder === target.sort_order) return;
          await fetch(`/api/works/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: newOrder }),
          });
          fetchWorks();
        }}
      />,
      { id: "work-move", header: { title: t("admin.works.moveTitle") }, closeButton: true, width: "360px" },
    );
  }, [openModal, totalCount, works.length, fetchWorks, t]);


  const columns: AdminTableColumn<Work>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: t("admin.works.tableThumb"),
        className: ts.colThumbWrap,
        render: (work) => (
          <div className={ts.colThumb}>
            {work.image ? (
              <Image
                src={work.image}
                alt=""
                fill
                sizes="48px"
                className={ts.thumbImg}
                unoptimized
              />
            ) : (
              <div className={ts.thumbPlaceholder}>—</div>
            )}
          </div>
        ),
        skeletonWidth: "48px",
      },
      {
        key: "title",
        label: t("admin.works.tableTitle"),
        className: ts.colTitle,
        render: (work) => work.title || t("admin.works.untitled"),
        skeletonWidth: "65%",
      },
      {
        key: "year",
        label: t("admin.works.tableYear"),
        className: ts.colMono,
        render: (work) => work.year,
        skeletonWidth: "40px",
      },
    ],
    [t],
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
    }),
    [t],
  );

  /* ── Trash Section ── */
  const TRASH_RETENTION_DAYS = 30;
  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt).getTime();
    const expiresAt = deleted + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  };

  const trashIcon = <Trash2 size={13} />;

  const trashColumns: SubTableColumn<Work>[] = useMemo(() => [
    {
      key: "num",
      label: "#",
      className: st.colMeta,
      render: (work) => <span>{work.number || "—"}</span>,
      skeletonWidth: "24px",
    },
    {
      key: "thumb",
      label: t("admin.works.tableThumb"),
      className: st.colThumbWrap,
      render: (work) => (
        <div className={st.colThumb}>
          {work.image ? (
            <Image src={work.image} alt="" fill sizes="48px" className={st.thumbImg} unoptimized />
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
        const daysLeft = work.deleted_at ? getDaysLeft(work.deleted_at) : 30;
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
          <button type="button" className={st.actionBtn} onClick={() => handleRestore(work.id)}>
            <T k="admin.works.trashRestore" />
          </button>
          <button type="button" className={st.dangerBtn} onClick={() => handlePurge(work.id, work.title || t("admin.works.untitled"))}>
            <T k="admin.works.trashPurge" />
          </button>
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
          <div className={styles.subFilterBar}>
            <Select
              value={String(trashPerPage)}
              options={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }]}
              onChange={(v) => { setTrashPerPage(Number(v)); setTrashPage(1); }}
              className={styles.subPageSize}
            />
            <Select
              value={trashSort}
              options={[
                { value: "newest", label: t("admin.works.sortNewestDeleted") },
                { value: "oldest", label: t("admin.works.sortOldestDeleted") },
              ]}
              onChange={(v) => setTrashSort(v as "newest" | "oldest")}
              className={styles.subFilterSelect}
            />
            <SearchCapsule
              searchType={trashSearchType}
              searchTypeOptions={[
                { value: "all", label: t("admin.works.searchAll") },
                { value: "title", label: t("admin.works.searchTitle") },
                { value: "content", label: t("admin.works.searchContent") },
              ]}
              onSearchTypeChange={(v) => setTrashSearchType(v as "all" | "title" | "content")}
              search={trashSearch}
              onSearchChange={setTrashSearch}
              placeholder={t("admin.works.trashSearch")}
              className={styles.subFilterSearch}
            />
          </div>
        }
      />
    </div>
  );

  return (
    <AdminListShell
      title={t("admin.works.title")}
      newHref="/admin/works/new"
      newLabel={t("admin.works.newWork")}
      afterTable={trashSection}
      headerExtra={
        <>
          <input ref={mdInputRef} type="file" accept=".md" multiple hidden onChange={handleMdUpload} />
          <button
            className={shell.helpBtn}
            title={t("admin.works.uploadGuide")}
            onClick={() => {
              openModal(
                <div className={styles.uploadGuide}>
                  <h4>기본 사용법</h4>
                  <p><code>.md</code> 파일을 선택하면 각 파일이 <strong>비공개 초안</strong>으로 생성됩니다.</p>
                  <ul>
                    <li>파일명이 작업물 제목으로 사용됩니다 (확장자 제외)</li>
                    <li>파일 내용이 <code>content_ko</code>로 들어갑니다</li>
                    <li>대표 이미지가 없으면 랜덤 프리셋이 생성됩니다</li>
                  </ul>

                  <h4>Frontmatter</h4>
                  <p>파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동 반영됩니다.</p>
                  <table>
                    <thead><tr><th>필드</th><th>타입</th><th>설명</th></tr></thead>
                    <tbody>
                      <tr><td><code>title</code></td><td>string</td><td>프로젝트명</td></tr>
                      <tr><td><code>subtitle</code></td><td>string</td><td>부제목</td></tr>
                      <tr><td><code>category</code></td><td>string</td><td>카테고리</td></tr>
                      <tr><td><code>year</code></td><td>string</td><td>연도</td></tr>
                      <tr><td><code>tech</code></td><td>string[]</td><td>기술 스택 (예: [React, TS])</td></tr>
                      <tr><td><code>description</code></td><td>string</td><td>프로젝트 설명</td></tr>
                      <tr><td><code>role</code></td><td>string</td><td>역할</td></tr>
                      <tr><td><code>image</code></td><td>string</td><td>대표 이미지 URL</td></tr>
                      <tr><td><code>live_url</code></td><td>string</td><td>라이브 URL</td></tr>
                      <tr><td><code>github_url</code></td><td>string</td><td>GitHub URL</td></tr>
                    </tbody>
                  </table>

                  <h4>예시</h4>
                  <pre><code>{`---
title: 포트폴리오 웹사이트
subtitle: 인터랙티브 웹 포트폴리오
category: 웹
year: 2024
tech: [Next.js, TypeScript, GSAP]
description: GSAP 가로 스크롤 + Three.js 3D
role: 풀스택 개발
---

## 프로젝트 개요

본문 내용...`}</code></pre>
                </div>,
                { header: { title: t("admin.works.uploadGuide") }, closeButton: true, width: "560px" },
              );
            }}
          >
            ?
          </button>
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
      {/* Filter bar */}
      <div className={shell.filterBar}>
        <SearchCapsule
          searchType={searchType}
          searchTypeOptions={[
            { value: "all", label: t("admin.works.searchAll") },
            { value: "title", label: t("admin.works.searchTitle") },
            { value: "content", label: t("admin.works.searchContent") },
          ]}
          onSearchTypeChange={(v) => { setSearchType(v); setPage(1); }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t("admin.works.search")}
          align="left"
          className={shell.filterSearch}
        />
        <Select
          value={sort}
          options={[
            { value: "order", label: t("admin.works.sortOrder") },
            { value: "newest", label: t("admin.works.sortNewest") },
            { value: "oldest", label: t("admin.works.sortOldest") },
            { value: "name", label: t("admin.works.sortName") },
          ]}
          onChange={(v) => { setSort(v); setPage(1); }}
          className={shell.filterItem}
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
          <button
            className={shell.filterReset}
            onClick={() => { setSearch(""); setSearchType("all"); setSort("order"); setFilterYear(""); setFilterCategory(""); setPage(1); }}
          >
            {t("admin.works.resetFilters")}
          </button>
        )}
        <Select
          value={String(perPage)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
          className={shell.filterPageSize}
        />
      </div>

      <AdminTable<Work>
        items={works}
        columns={columns}
        editBasePath="/admin/works"
        getTitle={(w) => w.title || t("admin.works.untitled")}
        onDelete={handleDelete}
        onBulkExport={async (ids) => {
          for (const id of ids) {
            const res = await fetch(`/api/works/export?id=${id}`);
            if (!res.ok) continue;
            const text = await res.text();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="(.+)"/);
            const fileName = match?.[1] ?? `${id}.md`;
            const blob = new Blob([text], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            await new Promise((r) => setTimeout(r, 100));
          }
        }}
        onBulkPublish={async (ids, published) => {
          await Promise.all(ids.map((id) =>
            fetch(`/api/works/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ published }),
            })
          ));
          fetchWorks();
        }}
        extraBulkActions={[
          {
            label: t("admin.common.changeCategory"),
            onClick: (ids) => {
              openModal(
                <BulkCategoryModal
                  count={ids.length}
                  categories={worksCategories}
                  onConfirm={async (cat) => {
                    await Promise.all(ids.map((id) =>
                      fetch(`/api/works/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          category_ko: cat?.ko ?? null,
                          category_en: cat?.en ?? null,
                        }),
                      })
                    ));
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
        gridTemplate="64px 1fr 100px 180px"
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
        onRowClick={handleRowClick}
        footerExtra={
          <Button variant="ghost" size="xs" title={t("admin.works.exportMdAll")} onClick={handleExportAll} disabled={exporting} soundDisabled icon={<Download size={14} />}>
            {exporting ? "..." : t("admin.works.exportMdAll")}
          </Button>
        }
      />

      {/* Hover / Tap preview tooltip — reads from refs, keyed by tooltipKey */}
      <PreviewTooltip
        key={tooltipKey}
        work={hoveredWorkRef.current}
        pos={tooltipPosRef.current}
        imgError={imgErrorRef.current}
        onImgError={handleImgError}
        onDismiss={hideTooltip}
        onNavigate={() => {
          const work = hoveredWorkRef.current;
          if (work) {
            hideTooltip();
            router.push(`/admin/works/${work.id}/edit`);
          }
        }}
      />

    </AdminListShell>
  );
}
