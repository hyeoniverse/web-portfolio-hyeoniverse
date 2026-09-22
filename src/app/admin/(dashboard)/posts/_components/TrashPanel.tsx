"use client";

import { useState, useMemo } from "react";
import type { Post } from "@/types/post";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { getTrashDaysLeft } from "@/utils/trash";
import { Trash2 } from "@/components/icons";
import T from "@/components/ui/T";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SubTable from "@/components/admin/SubTable/SubTable";
import { adminShellStyles as shell } from "@/components/admin/AdminListShell";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { sendAction, sendActions } from "@/lib/sendAction";
import { PurgeModal } from "./PostModals";
import { createTrashColumns } from "../_columns";
import { searchTypeOptions, pageSizeOptions, useSubTableControls, type SearchType } from "./subTableControls";
import { useTrashSearchIds } from "@/hooks/useTrashSearchIds";
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
  /** 영구 삭제한 글을 응답을 기다리지 않고 바로 휴지통에서 뺀다. 실패하면 onRefresh 로 되살린다. */
  onRemove: (ids: string[]) => void;
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
  onRefresh, onRemove, onRestored, onRowHover, onRowLeave, hideTooltip,
}: Props) {
  const { t } = useLanguage();
  const { openModal } = useModalStore();

  const { page, setPage, perPage, changePerPage, search, setSearch, searchType, setSearchType, selected, setSelected, andResetPage } = useSubTableControls(10);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  /* 휴지통 목록은 본문 없이 받으므로 검색은 서버가 본문까지 거른 id 로 한다(useTrashSearchIds) */
  const searchIds = useTrashSearchIds("/api/posts", search, searchType, posts.length);
  const filtered = useMemo(() => {
    const list = searchIds ? posts.filter((p) => searchIds.has(p.id)) : [...posts];
    list.sort((a, b) => {
      const da = new Date(a.deleted_at!).getTime();
      const db = new Date(b.deleted_at!).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [posts, searchIds, sort]);

  /* 실패하면 알림을 띄우고 목록은 그대로 둔다 — 예전에는 응답을 보지 않아 거절돼도 아무 표시가 없었다(#868) */
  const handleRestore = async (id: string) => {
    if (await sendAction(`/api/posts/${id}/restore`, { method: "POST" }, t, t("admin.common.restoreFailed"))) onRestored();
  };

  const handlePurge = (id: string, title: string) => {
    openModal(
      <PurgeModal
        title={title}
        onConfirm={async () => {
          /* 응답과 휴지통 재조회를 기다리지 않고 바로 뺀다(예전에는 1~2초 그대로 남았다). 실패하면 되살린다 */
          onRemove([id]);
          if (!(await sendAction(`/api/posts/${id}/purge`, { method: "DELETE" }, t, t("admin.common.purgeFailed")))) onRefresh();
        }}
      />,
      { id: "purge-confirm", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  };

  // 휴지통 보관 +30일 연장
  const handleExtend = async (id: string) => {
    if (await sendAction(`/api/posts/${id}/extend-retention`, { method: "POST" }, t, t("admin.common.extendFailed"))) onRefresh();
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
              const restored = await sendActions(
                [...selected].map((id) => ({ input: `/api/posts/${id}/restore`, init: { method: "POST" } })),
                t, t("admin.common.restoreFailed"),
              );
              if (restored > 0) onRestored();
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
                    const ids = [...selected];
                    onRemove(ids);
                    setSelected(new Set());
                    const purged = await sendActions(
                      ids.map((id) => ({ input: `/api/posts/${id}/purge`, init: { method: "DELETE" } })),
                      t, t("admin.common.purgeFailed"),
                    );
                    /* 하나라도 실패했으면 휴지통을 다시 불러와 남은 것을 되살린다 */
                    if (purged < ids.length) onRefresh();
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
          /* 미리보기가 id 로 글을 불러온다 — 휴지통 목록에는 본문이 없다. 작업물 휴지통과 같은 방식이다.
             예전에는 본문을 브라우저 저장소(sessionStorage)에 담아 넘겨, 긴 글은 저장소 한도를 넘길 수 있었다 */
          window.open(`/admin/posts/preview?fetch=${encodeURIComponent(post.id)}`, "_blank");
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
