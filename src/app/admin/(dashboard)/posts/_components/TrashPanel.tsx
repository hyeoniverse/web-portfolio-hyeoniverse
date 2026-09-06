"use client";

import { useState, useMemo } from "react";
import type { Post } from "@/types/post";
import { PREVIEW_KEY } from "@/constants";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { formatPostTitle } from "@/utils/post";
import { getTrashDaysLeft } from "@/utils/trash";
import { Trash2 } from "@/components/icons";
import T from "@/components/ui/T";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SubTable from "@/components/admin/SubTable/SubTable";
import { adminShellStyles as shell } from "@/components/admin/AdminListShell";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { PurgeModal } from "./PostModals";
import { createTrashColumns } from "../_columns";
import { searchTypeOptions, pageSizeOptions, matchesSearch, useSubTableControls, type SearchType } from "./subTableControls";
import styles from "../AdminPosts.module.css";

type Props = {
  /** 휴지통에 든 글. 접혀 있을 때는 비어 있고, 펼칠 때 바깥에서 불러온다. */
  posts: Post[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  /** 휴지통만 다시 불러온다. */
  onRefresh: () => void;
  /** 글이 되살아났을 때 — 글 목록도 함께 바뀐다. */
  onRestored: () => void;
  /** 줄에 마우스를 올렸을 때 미리보기 — 글 목록과 같은 것을 쓴다. */
  onRowHover: (post: Post, e: React.MouseEvent) => void;
  onRowLeave: () => void;
  hideTooltip: () => void;
};

/**
 * 글 목록 화면 위쪽의 휴지통 패널.
 *
 * 정렬·검색·쪽 번호처럼 이 패널 안에서만 쓰이는 상태를 스스로 들고 있다.
 * 목록 자체와 펼침 여부는 바깥이 들고 있다. 글을 지울 때도 휴지통을 다시 불러야 하기 때문이다.
 */
export default function TrashPanel({
  posts, loading, open, onToggle, busy, setBusy,
  onRefresh, onRestored, onRowHover, onRowLeave, hideTooltip,
}: Props) {
  const { t } = useLanguage();
  const { openModal } = useModalStore();

  const { page, setPage, perPage, changePerPage, search, setSearch, searchType, setSearchType, selected, setSelected, andResetPage } = useSubTableControls(10);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    let list = [...posts];
    if (search) {
      list = list.filter((p) =>
        matchesSearch(searchType, search, formatPostTitle(p) || "", (p.content || "") + " " + (p.content_en || "")),
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.deleted_at!).getTime();
      const db = new Date(b.deleted_at!).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [posts, search, searchType, sort]);

  const handleRestore = async (id: string) => {
    await fetch(`/api/posts/${id}/restore`, { method: "POST" });
    onRestored();
  };

  const handlePurge = (id: string, title: string) => {
    openModal(
      <PurgeModal title={title} onConfirm={async () => { await fetch(`/api/posts/${id}/purge`, { method: "DELETE" }); onRefresh(); }} />,
      { id: "purge-confirm", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  };

  // 휴지통 보관 +30일 연장
  const handleExtend = async (id: string) => {
    await fetch(`/api/posts/${id}/extend-retention`, { method: "POST" });
    onRefresh();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => createTrashColumns(t, getTrashDaysLeft, handleRestore, handlePurge, handleExtend), [t]);

  return (
    <div className={styles.trashSection}>
      <SubTable<Post>
        icon={<Trash2 size={13} />}
        title={<T k="admin.posts.trash" />}
        count={posts.length}
        hint={<T k="admin.posts.trashAutoDelete" />}
        open={open}
        onToggle={onToggle}
        allItems={filtered}
        columns={columns}
        gridTemplate="28px 64px 1fr 200px 180px"
        selected={selected}
        onSelectChange={setSelected}
        bulkActions={[
          {
            label: <T k="admin.posts.trashRestore" />,
            disabled: busy,
            onClick: async () => {
              setBusy(true);
              await Promise.all([...selected].map((id) => handleRestore(id)));
              setSelected(new Set());
              setBusy(false);
            },
          },
          {
            label: <T k="admin.posts.trashPurge" />,
            disabled: busy,
            onClick: () => {
              openModal(
                <ModalConfirm
                  desc={t("admin.posts.trashPurgeConfirmBulk").replace("{{count}}", String(selected.size))}
                  confirmText={t("admin.posts.trashPurge")}
                  onConfirm={async () => {
                    setBusy(true);
                    await Promise.all([...selected].map((id) => fetch(`/api/posts/${id}/purge`, { method: "DELETE" })));
                    onRefresh();
                    setSelected(new Set());
                    setBusy(false);
                  }}
                />,
                { id: "bulk-purge", header: { title: t("admin.posts.trashPurge") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        emptyMessage={t("admin.posts.trashEmpty")}
        loading={loading}
        onRowHover={onRowHover}
        onRowLeave={onRowLeave}
        onRowClick={(post) => {
          hideTooltip();
          sessionStorage.setItem(PREVIEW_KEY.post, JSON.stringify({
            title: formatPostTitle(post) || t("admin.posts.untitled"),
            content: post.content || "",
            content_type: post.content_type || "markdown",
            cover_image: post.cover_image || "",
            excerpt: post.excerpt || "",
            tags: post.tags || [],
            _trashId: post.id,
          }));
          window.open("/admin/posts/preview", "_blank");
        }}
        filterBar={
          <div className={shell.filterBar}>
            <SegmentedControl
              items={[{ value: "date", label: t("admin.posts.sortDeletedAt") }]}
              value="date"
              sortDir={sort === "oldest" ? "asc" : "desc"}
              onChange={andResetPage(() => setSort((p) => (p === "newest" ? "oldest" : "newest")))}
            />
            <SearchCapsule
              typeSelector={{
                value: searchType,
                options: searchTypeOptions(t),
                onChange: andResetPage((v: string) => setSearchType(v as SearchType)),
              }}
              search={search}
              onSearchChange={andResetPage(setSearch)}
              placeholder={t("admin.posts.trashSearch")}
              className={shell.filterSearch}
            />
            <Select
              value={String(perPage)}
              options={pageSizeOptions(10, 20, 50)}
              onChange={changePerPage}
              className={shell.filterPageSize}
            />
          </div>
        }
      />
    </div>
  );
}
