"use client";

// ── 댓글 이미지 정리 (settings > 라이브러리, #1455) ──
// 방문자가 댓글 입력란에서 올렸지만 어느 댓글에도 쓰이지 않은 이미지. 자동 정리는 업로드가 하루 한 번 겸해서,
// 업로드가 없으면 지울 때가 지난 이미지가 남는다 — 여기서 보고 직접 지운다. 아직 지울 때가 안 된 이미지는
// 댓글을 쓰는 중일 수 있어 보여 주기만 한다(언제부터 지워지는지와 함께).
import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormGroup from "@/components/ui/FormGroup";
import MediaThumb from "@/components/ui/MediaThumb";
import Pressable from "@/components/ui/Pressable";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { errorFromResponse, errorText } from "@/lib/apiError";
import { COMMENT_IMAGE_BUCKET } from "@/lib/commentImages";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import LibraryHead from "./LibraryHead";
import { CommentImagesSkeleton } from "./LibrarySkeletons";
import { LibraryGallery, GalleryItem, galleryActionClass } from "./LibraryGallery";
import { LibraryBulkBar, runBulk, useBulkResultText, useDragSelect, useLibrarySelection } from "./LibrarySelection";

type Item = { path: string; name: string; size: number; createdAt: string | null; url: string; deleteAfter: string | null };
type Data = { due: Item[]; scheduled: Item[]; usedCount: number };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* 여러 개 고르기의 열쇠 — 모듈 수준이라 훅의 의존 배열이 늘 같다 */
const commentImageKey = (m: Item) => m.path;

export default function CommentImageManager() {
  const { language, t } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  /* 지운 뒤 다시 받는다 */
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/media/comment-images")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Data) => { if (!cancelled) { setFailed(false); setData(d); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [reload]);

  const date = (d: string | null) => d ? new Date(d).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" }) : "";

  /* 하나씩 — 업로드한 파일과 같은 경로로 지운다(댓글에서 쓰는지 서버가 다시 본다) */
  const remove = (m: Item) => {
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.commentImageManager.deleteConfirm"), { name: m.name })}
        confirmText={t("admin.inline.commentImageManager.delete")}
        danger
        onConfirm={async () => {
          const res = await tryRequest("/api/admin/media", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bucket: COMMENT_IMAGE_BUCKET, path: m.path }),
          });
          if (!(res instanceof Response) || !res.ok) {
            const err = res instanceof Response ? await errorFromResponse(res) : null;
            showToast(errorText(err, t, t("admin.inline.commentImageManager.deleteFailed")), "error");
            return;
          }
          setReload((n) => n + 1);
        }}
      />,
      { id: "comment-image-delete", header: { title: t("admin.inline.commentImageManager.deleteTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  /* 지울 때가 지난 것 모두 — 자동 정리를 지금 돌린다(그 사이 댓글에 쓰인 이미지는 서버가 거른다) */
  const sweep = (n: number) => {
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.commentImageManager.deleteAllConfirm"), { n })}
        confirmText={t("admin.inline.commentImageManager.deleteAll")}
        danger
        onConfirm={async () => {
          setSweeping(true);
          const res = await tryRequest("/api/admin/media/comment-images", { method: "POST" });
          setSweeping(false);
          if (!(res instanceof Response) || !res.ok) {
            showToast(t("admin.inline.commentImageManager.deleteFailed"), "error");
            return;
          }
          const { deleted } = (await res.json().catch(() => ({ deleted: 0 }))) as { deleted?: number };
          showToast(fillTemplate(t("admin.inline.commentImageManager.deletedN"), { n: deleted ?? 0 }), "success");
          setReload((k) => k + 1);
        }}
      />,
      { id: "comment-image-sweep", header: { title: t("admin.inline.commentImageManager.deleteAllTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  /* 여러 개 고르기 — 지울 때가 지난 것만(하나씩 지울 때와 같은 조건) */
  const sel = useLibrarySelection(data?.due ?? null, commentImageKey);
  const pick = useDragSelect(sel);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkResult = useBulkResultText();
  const removeSelected = () => {
    const targets = sel.selected;
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.libraryBulk.deleteConfirm"), { n: targets.length })}
        confirmText={fillTemplate(t("admin.inline.libraryBulk.deleteN"), { n: targets.length })}
        danger
        onConfirm={async () => {
          setBulkDeleting(true);
          const { ok, failed } = await runBulk(targets, async (m) => {
            const res = await tryRequest("/api/admin/media", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bucket: COMMENT_IMAGE_BUCKET, path: m.path }),
            });
            return res instanceof Response && res.ok;
          });
          setBulkDeleting(false);
          showToast(bulkResult(ok.length, failed.length), failed.length ? "error" : "success");
          sel.clear();
          setReload((k) => k + 1);
        }}
      />,
      { id: "comment-image-bulk", header: { title: t("admin.inline.commentImageManager.deleteTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  const item = (m: Item, due: boolean) => (
    <GalleryItem
      key={m.path}
      media={<MediaThumb src={m.url} fill sizes="(max-width: 640px) 50vw, 200px" fallbackSeed={m.path} />}
      title={fillTemplate(t("admin.inline.commentImageManager.uploadedOn"), { date: date(m.createdAt) })}
      meta={<>
        <span>{fmtSize(m.size)}</span>
        <span aria-hidden>·</span>
        <span>{due
          ? t("admin.inline.commentImageManager.deletable")
          : fillTemplate(t("admin.inline.commentImageManager.deletesAfter"), { date: date(m.deleteAfter) })}</span>
      </>}
      actions={<>
        <a className={galleryActionClass} href={m.url} target="_blank" rel="noopener noreferrer" aria-label={t("admin.inline.commentImageManager.openNewTab")} title={t("admin.inline.commentImageManager.openNewTab")}><ExternalLink size={13} /></a>
        {due && (
          <Pressable className={galleryActionClass} onClick={() => remove(m)} aria-label={t("admin.inline.commentImageManager.delete")} title={t("admin.inline.commentImageManager.delete")}><Trash2 size={13} /></Pressable>
        )}
      </>}
      select={{ checked: sel.isSelected(m), onChange: (v) => sel.toggle(m, v), label: fillTemplate(t("admin.inline.libraryBulk.select"), { name: m.name }), pick: pick(m), disabled: !due, disabledReason: t("admin.inline.libraryBulk.imageNotDue") }}
    />
  );

  const total = data ? data.due.length + data.scheduled.length : 0;

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.commentImageManager.title")}
          count={data ? total : undefined}
          hint={t("admin.inline.commentImageManager.hint")}
          actions={data && data.due.length > 0 ? (
            <Button variant="outline" tone="danger" icon={<Trash2 size={14} />} loading={sweeping} onClick={() => sweep(data.due.length)}>
              {fillTemplate(t("admin.inline.commentImageManager.deleteAllCount"), { n: data.due.length })}
            </Button>
          ) : undefined}
        />

        {failed && !data ? (
          <EmptyState pad="sm">{t("admin.inline.commentImageManager.loadFailed")}</EmptyState>
        ) : data === null ? (
          <CommentImagesSkeleton />
        ) : total === 0 ? (
          <EmptyState pad="sm">{t("admin.inline.commentImageManager.empty")}</EmptyState>
        ) : (
          <>
            <LibraryBulkBar
              count={sel.count}
              selectableCount={sel.selectableCount}
              onSelectAll={sel.selectAll}
              onClear={sel.clear}
              onDelete={removeSelected}
              deleting={bulkDeleting}
              deleteLabel={t("admin.inline.libraryBulk.deleteN")}
            />
            {data.due.length > 0 && (
              <FormGroup
                title={fillTemplate(t("admin.inline.commentImageManager.dueTitle"), { n: data.due.length })}
                description={t("admin.inline.commentImageManager.dueDesc")}
              >
                <LibraryGallery selecting={sel.count > 0}>{data.due.map((m) => item(m, true))}</LibraryGallery>
              </FormGroup>
            )}
            {data.scheduled.length > 0 && (
              <FormGroup
                title={fillTemplate(t("admin.inline.commentImageManager.scheduledTitle"), { n: data.scheduled.length })}
                description={t("admin.inline.commentImageManager.scheduledDesc")}
              >
                <LibraryGallery>{data.scheduled.map((m) => item(m, false))}</LibraryGallery>
              </FormGroup>
            )}
          </>
        )}
      </div>
    </section>
  );
}
