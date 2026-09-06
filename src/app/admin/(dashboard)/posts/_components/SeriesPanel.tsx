"use client";

import { useState, useCallback, useMemo } from "react";
import type { Series } from "@/types/post";
import type { GithubImportResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { useModalStore } from "@/stores/modalStore";
import { downloadFiles } from "@/utils/download";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SubTable from "@/components/admin/SubTable/SubTable";
import { adminShellStyles as shell } from "@/components/admin/AdminListShell";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { SeriesDeleteModal } from "./PostModals";
import { createSeriesColumns } from "../_columns";
import { searchTypeOptions, pageSizeOptions, matchesSearch, useSubTableControls, type SearchType } from "./subTableControls";
import styles from "../AdminPosts.module.css";

type Props = {
  /** 시리즈 목록. 글 목록 화면의 시리즈 필터도 같은 목록을 쓰기 때문에 바깥에서 받아온다. */
  seriesList: Series[];
  loading: boolean;
  /** 화면 전체를 덮는 대기 표시 — 일괄 삭제처럼 오래 걸리는 작업 동안 켠다. */
  busy: boolean;
  setBusy: (v: boolean) => void;
  /** 시리즈만 다시 불러온다. */
  onRefresh: () => void;
  /** 시리즈가 지워졌을 때 — 글 목록과 휴지통도 함께 영향을 받는다. */
  onDeleted: () => void;
};

/**
 * 글 목록 화면 위쪽의 시리즈 패널.
 *
 * 정렬·검색·쪽 번호처럼 이 패널 안에서만 쓰이는 상태를 스스로 들고 있다.
 * 바깥은 시리즈 목록과 새로고침 방법만 넘긴다.
 */
export default function SeriesPanel({ seriesList, loading, busy, setBusy, onRefresh, onDeleted }: Props) {
  const { t, language } = useLanguage();
  const categories = useCategories();
  const { openModal } = useModalStore();

  const [open, setOpen] = useState(false);
  const { page, setPage, perPage, changePerPage, search, setSearch, searchType, setSearchType, selected, setSelected, andResetPage } = useSubTableControls(5);
  const [sort, setSort] = useState<"order" | "newest" | "oldest" | "name">("order");
  const [filter, setFilter] = useState<"" | "published" | "draft">("");

  const filtered = useMemo(() => {
    let list = [...seriesList];
    if (search) {
      list = list.filter((s) =>
        matchesSearch(searchType, search, s.title + " " + (s.title_en || ""), s.description + " " + (s.description_en || "")),
      );
    }
    if (filter === "published") list = list.filter((s) => s.published);
    if (filter === "draft") list = list.filter((s) => !s.published);
    if (sort === "order") list.sort((a, b) => a.sort_order - b.sort_order);
    else if (sort === "newest") list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sort === "oldest") list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [seriesList, search, searchType, sort, filter]);

  const handleExport = useCallback(async (seriesId: string) => {
    const res = await fetch(`/api/posts/export?series_id=${seriesId}`);
    if (!res.ok) return;
    const { files } = await res.json() as GithubImportResponse;
    await downloadFiles(files);
  }, []);

  const handleDelete = (s: Series) => {
    const deletePostsRef = { current: false };
    openModal(
      <SeriesDeleteModal
        series={s}
        deletePostsRef={deletePostsRef}
        onConfirm={async () => {
          await fetch(`/api/series/${s.id}${deletePostsRef.current ? "?deletePosts=true" : ""}`, { method: "DELETE" });
          onDeleted();
        }}
      />,
      { id: "series-delete", header: { title: `"${s.title}"` }, closeButton: true, width: "400px" },
    );
  };

  // 순서 인라인 편집 — order 정렬 + 검색/필터 없을 때만 (그 외엔 표시 순번이 sort_order 와 어긋나 혼란)
  const reorder = useMemo(
    () =>
      sort === "order" && !search && filter === ""
        ? async (s: Series, newOrder: number) => {
            if (newOrder === s.sort_order) return;
            await fetch(`/api/series/${s.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sort_order: newOrder }),
            });
            onRefresh();
          }
        : undefined,
    [sort, search, filter, onRefresh],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => createSeriesColumns(t, handleDelete, handleExport, language, categories, reorder, seriesList.length), [t, language, categories, reorder, seriesList.length]);

  return (
    <div className={styles.seriesSection}>
      <SubTable<Series>
        title={<T k="admin.posts.series" />}
        count={seriesList.length}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        headerExtra={
          <Button href="/admin/settings?tab=content&sub=posts" external variant="link" size="xs" className={styles.seriesNewBtn}>
            <T k="admin.posts.newSeries" />
          </Button>
        }
        allItems={filtered}
        columns={columns}
        gridTemplate="28px 64px 1fr 80px 60px 80px 180px"
        selected={selected}
        onSelectChange={setSelected}
        bulkActions={[
          {
            label: t("admin.posts.exportMd"),
            disabled: busy,
            onClick: async () => {
              for (const sid of [...selected]) await handleExport(sid);
            },
          },
          {
            label: t("admin.posts.delete"),
            disabled: busy,
            onClick: () => {
              const ids = [...selected];
              openModal(
                <ModalConfirm
                  desc={t("admin.posts.seriesBulkDeleteConfirm").replace("{{count}}", String(ids.length))}
                  confirmText={t("admin.posts.delete")}
                  onConfirm={async () => {
                    setBusy(true);
                    await Promise.all(ids.map((id) => fetch(`/api/series/${id}`, { method: "DELETE" })));
                    onRefresh();
                    setSelected(new Set());
                    setBusy(false);
                  }}
                />,
                { id: "bulk-series-delete", header: { title: t("admin.posts.delete") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        emptyMessage={t("admin.posts.noSeriesYet")}
        loading={loading}
        filterBar={
          <div className={shell.filterBar}>
            <SegmentedControl
              items={[
                { value: "order", label: t("admin.posts.sortOrder") },
                { value: "date", label: t("admin.posts.sortDate") },
                { value: "name", label: t("admin.posts.sortName") },
              ]}
              value={sort === "name" ? "name" : sort === "order" ? "order" : "date"}
              sortDir={sort === "oldest" ? "asc" : "desc"}
              onChange={andResetPage((v: string) => {
                if (v === "order") setSort("order");
                else if (v === "name") setSort("name");
                else if (sort === "newest") setSort("oldest");
                else if (sort === "oldest") setSort("newest");
                else setSort("newest");
              })}
            />
            <Select
              value={filter}
              options={[
                { value: "", label: t("admin.posts.filterAll") },
                { value: "published", label: t("admin.posts.filterPublished") },
                { value: "draft", label: t("admin.posts.filterDraft") },
              ]}
              onChange={andResetPage((v: string) => setFilter(v as "" | "published" | "draft"))}
              className={shell.filterItem}
            />
            <SearchCapsule
              typeSelector={{
                value: searchType,
                options: searchTypeOptions(t),
                onChange: andResetPage((v: string) => setSearchType(v as SearchType)),
              }}
              search={search}
              onSearchChange={andResetPage(setSearch)}
              placeholder={t("admin.posts.seriesSearch")}
              className={shell.filterSearch}
            />
            <Select
              value={String(perPage)}
              options={pageSizeOptions(5, 10, 20)}
              onChange={changePerPage}
              className={shell.filterPageSize}
            />
          </div>
        }
      />
    </div>
  );
}
