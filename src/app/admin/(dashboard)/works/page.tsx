"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Work } from "@/types/work";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable, {
  usePublishChanges,
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import T from "@/components/ui/T";

const WORKS_PER_PAGE = 20;

export default function AdminWorksPage() {
  const { t } = useLanguage();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);

  const { publishOverrides, toggle, setAll, reset, toChanges, hasChanges } =
    usePublishChanges<Work>();

  /* Preview tooltip */
  const [hoveredWork, setHoveredWork] = useState<Work | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [imgError, setImgError] = useState(false);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(WORKS_PER_PAGE),
    });
    const res = await fetch(`/api/works?${params}`);
    const data = await res.json();
    setWorks(data.works ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/works/${id}`, { method: "DELETE" });
    fetchWorks();
  };

  const handleDragReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;

    const next = [...works];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setWorks(next);

    // Redistribute sort_order values in the affected range
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const sortOrders = works
      .slice(lo, hi + 1)
      .map((w) => w.sort_order)
      .sort((a, b) => a - b);

    await Promise.all(
      next.slice(lo, hi + 1).map((w, i) =>
        fetch(`/api/works/${w.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: sortOrders[i] }),
        }),
      ),
    );

    fetchWorks();
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    await Promise.all(
      toChanges().map((c) =>
        fetch(`/api/works/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: c.published }),
        }),
      ),
    );
    reset();
    setSaving(false);
    fetchWorks();
  };

  const handleRowHover = (work: Work, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 280;
    const hasImage = !!work.image;
    const tooltipHeight = hasImage ? 260 : 120;
    const gap = 8;
    const rawLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.max(
      8,
      Math.min(rawLeft, window.innerWidth - tooltipWidth - 8),
    );
    const spaceAbove = rect.top;
    const top =
      spaceAbove > tooltipHeight + gap
        ? rect.top - tooltipHeight - gap
        : rect.bottom + gap;
    setTooltipPos({ top, left });
    setImgError(false);
    setHoveredWork(work);
  };

  const columns: AdminTableColumn<Work>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: "",
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
        key: "status",
        label: t("admin.works.tableStatus"),
        render: (_work, published) => (
          <span
            className={`${ts.statusBadge} ${published ? ts.published : ts.draft}`}
          >
            {published
              ? <T k="admin.works.published" />
              : <T k="admin.works.draft" />}
          </span>
        ),
        skeletonWidth: "60px",
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
    }),
    [t],
  );

  return (
    <AdminListShell
      title={t("admin.works.title")}
      newHref="/admin/works/new"
      newLabel={t("admin.works.newWork")}
      saving={saving}
      hasChanges={hasChanges}
      onSave={handleSave}
      saveCount={publishOverrides.size}
      saveLabel={t("admin.works.save")}
    >
      <AdminTable<Work>
        items={works}
        columns={columns}
        editBasePath="/admin/works"
        getTitle={(w) => w.title || t("admin.works.untitled")}
        publishOverrides={publishOverrides}
        onPublishToggle={toggle}
        onPublishAll={setAll}
        onDelete={handleDelete}
        onReorder={handleDragReorder}
        gridTemplate="40px 60px 1fr 100px 80px 140px"
        loading={loading}
        emptyMessage={t("admin.works.noWorksYet")}
        skeletonRows={4}
        labels={labels}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowHover={handleRowHover}
        onRowLeave={() => setHoveredWork(null)}
      >
        {/* Hover preview tooltip */}
        {hoveredWork && (
          <div
            className={shell.previewTooltip}
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {hoveredWork.image && (
              <div className={shell.previewImage}>
                {imgError ? (
                  <div className={shell.previewPlaceholder}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={hoveredWork.image}
                    alt=""
                    width={280}
                    height={140}
                    className={shell.previewImg}
                    unoptimized
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            )}
            <div className={shell.previewBody}>
              <p className={shell.previewTitle}>{hoveredWork.title}</p>
              {hoveredWork.subtitle_ko && (
                <p className={shell.previewExcerpt}>
                  {hoveredWork.subtitle_ko}
                </p>
              )}
              {hoveredWork.tech.length > 0 && (
                <div className={shell.previewTags}>
                  {hoveredWork.tech.map((t) => (
                    <span key={t} className={shell.previewTag}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminTable>
    </AdminListShell>
  );
}
