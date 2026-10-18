"use client";

// ── 업로드한 파일 (settings > 라이브러리) ──
// 저장소 두 곳(posts: 글·프로젝트 이미지·커버·낭독 음성 / uploads: 로고·아이콘·이모지·배경음·폰트·이력서)의 파일과
// 쓰는 곳. 예전엔 올린 파일을 볼 곳이 없어 쌓이기만 했다. 어디서도 쓰지 않는 파일만 지울 수 있다(서버도 다시 확인한다).
import { useEffect, useState } from "react";
import { Copy, ExternalLink, File, FileText, Film, LayoutGrid, List, Music, Trash2, Type } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Pressable from "@/components/ui/Pressable";
import MediaThumb from "@/components/ui/MediaThumb";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import Tooltip from "@/components/ui/Tooltip";
import TransitionLink from "@/components/ui/TransitionLink";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { errorFromResponse, errorText } from "@/lib/apiError";
import { mediaType, type MediaRef } from "@/lib/mediaUsage";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import styles from "./MediaManager.module.css";
import LibraryHead from "./LibraryHead";
import { GallerySkeleton, MediaFiltersSkeleton } from "./LibrarySkeletons";
import Checkbox from "@/components/ui/Checkbox";
import { LibraryBulkBar, isInnerControl, runBulk, useBulkResultText, useLibrarySelection } from "./LibrarySelection";
import { LibraryGallery, GalleryItem, galleryActionClass, galleryFileIconClass, galleryUsedClass, galleryUsedLinkClass, galleryUsedListClass } from "./LibraryGallery";

type MediaItem = { bucket: string; path: string; name: string; size: number; mime: string; createdAt: string | null; url: string; usage: MediaRef[] };
type Kind = ReturnType<typeof mediaType>;
const LIMIT = 48;
const VIEW_KEY = "library-media-view";

type Summary = { counts: Partial<Record<"all" | Kind, number>>; totalSize: number; unusedCount: number; unusedSize: number };
type PageData = { items: MediaItem[]; total: number; page: number; totalPages: number; summary: Summary };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_ICON: Record<Exclude<Kind, "image">, typeof File> = { video: Film, audio: Music, font: Type, doc: FileText, other: File };

/* 여러 개 고르기의 열쇠 · 조건 — 모듈 수준이라 훅의 의존 배열이 늘 같다 */
const mediaKey = (m: MediaItem) => `${m.bucket}/${m.path}`;
const isUnused = (m: MediaItem) => m.usage.length === 0;

export default function MediaManager() {
  const { language, t } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const [data, setData] = useState<PageData | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [page, setPage] = useState(1);
  /* 보기 — 갤러리(이미지 훑기) / 목록(크기·날짜 훑기). 이 브라우저에 기억한다 */
  const [view, setView] = useState<"gallery" | "list">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "gallery"; } catch { return "gallery"; }
  });
  const changeView = (v: "gallery" | "list") => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* 저장 못 해도 이번 화면은 바뀐다 */ }
  };
  /* 지운 뒤 같은 쪽을 다시 받는다 */
  const [reload, setReload] = useState(0);

  /* 검색은 잠깐 멈춘 뒤에 보낸다 — 글자마다 서버를 부르지 않게 */
  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(id);
  }, [search]);

  /* 한 쪽씩 받는다 — 서버가 걸러 보기·쪽 나누기를 하고 종류별 개수도 같이 준다 */
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (kind !== "all") params.set("kind", kind);
    if (unusedOnly) params.set("unused", "1");
    if (query) params.set("q", query);
    if (reload) params.set("fresh", "1");
    void fetch(`/api/admin/media?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: PageData) => { if (!cancelled) { setFailed(false); setData(d); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [page, kind, unusedOnly, query, reload]);

  const items = data?.items ?? null;
  /* 여러 개 고르기 — 쓰는 곳이 없는 파일만(하나씩 지울 때와 같은 조건) */
  const sel = useLibrarySelection(items, mediaKey, isUnused);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkResult = useBulkResultText();
  const summary = data?.summary;
  const counts = summary?.counts ?? {};
  const allCount = counts.all ?? 0;

  const KIND_LABEL: Record<Kind, string> = {
    image: t("admin.inline.mediaManager.kindImage"), video: t("admin.inline.mediaManager.kindVideo"), audio: t("admin.inline.mediaManager.kindAudio"),
    font: t("admin.inline.mediaManager.kindFont"), doc: t("admin.inline.mediaManager.kindDoc"), other: t("admin.inline.mediaManager.kindOther"),
  };
  const segItems = [
    { value: "all" as const, label: `${t("admin.inline.mediaManager.all")} ${allCount}` },
    ...(["image", "video", "audio", "font", "doc", "other"] as Kind[]).filter((k) => counts[k]).map((k) => ({ value: k, label: `${KIND_LABEL[k]} ${counts[k]}` })),
  ];

  /* 쓰는 곳 — "글 2 · 사이트 설정". 글·프로젝트는 올리면 제목 목록(누르면 편집 화면) */
  const usageSummary = (u: MediaRef[]) => {
    const n = (k: MediaRef["kind"]) => u.filter((r) => r.kind === k).length;
    return [
      n("post") ? fillTemplate(n("post") > 1 ? t("admin.inline.mediaManager.usagePosts") : t("admin.inline.mediaManager.usagePost"), { n: n("post") }) : "",
      n("work") ? fillTemplate(n("work") > 1 ? t("admin.inline.mediaManager.usageWorks") : t("admin.inline.mediaManager.usageWork"), { n: n("work") }) : "",
      n("series") ? fillTemplate(t("admin.inline.mediaManager.usageSeries"), { n: n("series") }) : "",
      n("settings") ? t("admin.inline.mediaManager.usageSettings") : "",
      n("emoji") ? t("admin.inline.mediaManager.usageEmoji") : "",
      n("coverHistory") ? t("admin.inline.mediaManager.usageCoverHistory") : "",
      n("comment") ? fillTemplate(t("admin.inline.mediaManager.usageComments"), { n: n("comment") }) : "",
    ].filter(Boolean).join(" · ");
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); showToast(t("admin.inline.mediaManager.copied"), "success"); }
    catch { showToast(t("admin.inline.mediaManager.copyFailed"), "error"); }
  };

  const remove = (m: MediaItem) => {
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.mediaManager.deleteConfirm"), { name: m.name })}
        confirmText={t("admin.inline.mediaManager.delete")}
        danger
        onConfirm={async () => {
          const res = await tryRequest("/api/admin/media", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bucket: m.bucket, path: m.path }),
          });
          if (!(res instanceof Response) || !res.ok) {
            const err = res instanceof Response ? await errorFromResponse(res) : null;
            showToast(errorText(err, t, t("admin.inline.mediaManager.deleteFailed")), "error");
            return;
          }
          setReload((n) => n + 1);
        }}
      />,
      { id: "media-delete", header: { title: t("admin.inline.mediaManager.deleteTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

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
              body: JSON.stringify({ bucket: m.bucket, path: m.path }),
            });
            return res instanceof Response && res.ok;
          });
          setBulkDeleting(false);
          showToast(bulkResult(ok.length, failed.length), failed.length ? "error" : "success");
          sel.clear();
          setReload((n) => n + 1);
        }}
      />,
      { id: "media-bulk-delete", header: { title: t("admin.inline.mediaManager.deleteTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };
  const selectOf = (m: MediaItem) => (isUnused(m)
    ? { checked: sel.isSelected(m), onChange: (v: boolean) => sel.toggle(m, v), label: fillTemplate(t("admin.inline.libraryBulk.select"), { name: m.name }) }
    : undefined);

  /* 쓰는 곳 — 글·프로젝트가 있으면 올렸을 때 제목 목록(누르면 편집 화면) */
  const usageNode = (m: MediaItem, usedClass: string, mutedClass?: string) => {
    const used = usageSummary(m.usage);
    if (!used) return <span className={mutedClass}>{t("admin.inline.mediaManager.notUsed")}</span>;
    const docs = m.usage.filter((r) => (r.kind === "post" || r.kind === "work") && r.id);
    if (!docs.length) return <span>{used}</span>;
    return (
      <Tooltip interactive placement="bottom" delay={150} content={
        <span className={galleryUsedListClass}>
          {docs.map((r) => (
            <TransitionLink key={`${r.kind}-${r.id}`} href={r.kind === "post" ? `/admin/posts/${r.id}/edit` : `/admin/works/${r.id}/edit`} className={galleryUsedLinkClass}>
              {r.kind === "post" ? t("admin.inline.mediaManager.post") : t("admin.inline.mediaManager.project")} · {r.title || r.id}
            </TransitionLink>
          ))}
        </span>
      }>
        <span className={usedClass}>{used}</span>
      </Tooltip>
    );
  };
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { year: "2-digit", month: "short", day: "numeric" }) : "";
  const folderOf = (m: MediaItem) => (m.path.includes("/") ? m.path.slice(0, m.path.lastIndexOf("/")) : m.bucket);

  const actionsOf = (m: MediaItem, cls: string) => (
    <>
      <Pressable className={cls} onClick={() => void copy(m.url)} aria-label={t("admin.inline.mediaManager.copyUrl")} title={t("admin.inline.mediaManager.copyUrl")}><Copy size={13} /></Pressable>
      <a className={cls} href={m.url} target="_blank" rel="noopener noreferrer" aria-label={t("admin.inline.mediaManager.openNewTab")} title={t("admin.inline.mediaManager.openNewTab")}><ExternalLink size={13} /></a>
      {!m.usage.length && (
        <Pressable className={cls} onClick={() => remove(m)} aria-label={t("admin.inline.mediaManager.delete")} title={t("admin.inline.mediaManager.delete")}><Trash2 size={13} /></Pressable>
      )}
    </>
  );

  /* 미리보기 — 이미지·동영상은 공용 MediaThumb(동영상은 올렸을 때만 받는다), 그 밖의 파일은 종류 아이콘 */
  const thumbOf = (m: MediaItem, sizes: string, iconClass: string, withExt: boolean) => {
    const mk = mediaType(m.mime, m.name);
    if (mk === "image" || mk === "video") return <MediaThumb src={m.url} fill sizes={sizes} fallbackSeed={m.path} />;
    const Icon = KIND_ICON[mk];
    const ext = m.name.includes(".") ? m.name.split(".").pop()!.toUpperCase() : "";
    return <span className={iconClass}><Icon size={withExt ? 22 : 16} strokeWidth={1.5} />{withExt && <span>{ext}</span>}</span>;
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.mediaManager.title")}
          count={summary ? `${allCount} · ${fmtSize(summary.totalSize)}` : undefined}
          hint={t("admin.inline.mediaManager.hint")}
          /* 개수를 받기 전에도 걸러 보기 자리를 잡아 둔다 — 없다가 생기면 아래 목록이 밀렸다 */
          filters={!summary ? <MediaFiltersSkeleton /> : allCount > 0 ? <>
            <SegmentedControl items={segItems} value={kind} onChange={(v) => { setKind(v); setPage(1); }} variant="subtle" />
            <Switch
              checked={unusedOnly}
              onCheckedChange={(v) => { setUnusedOnly(v); setPage(1); }}
              label={fillTemplate(t("admin.inline.mediaManager.unusedOnly"), { count: summary.unusedCount, size: fmtSize(summary.unusedSize) })}
            />
          </> : undefined}
          search={{ value: search, onChange: setSearch, placeholder: t("admin.inline.mediaManager.searchPlaceholder") }}
          actions={
            <SegmentedControl
              items={[
                { value: "gallery" as const, label: <LayoutGrid size={15} aria-label={t("admin.inline.mediaManager.gallery")} /> },
                { value: "list" as const, label: <List size={15} aria-label={t("admin.inline.mediaManager.list")} /> },
              ]}
              value={view}
              onChange={changeView}
              variant="subtle"
            />
          }
        />

        {failed && !data ? (
          <EmptyState pad="sm">{t("admin.inline.mediaManager.loadFailed")}</EmptyState>
        ) : items === null ? (
          <GallerySkeleton />
        ) : items.length === 0 ? (
          <EmptyState pad="sm">{search || unusedOnly || kind !== "all" ? t("admin.inline.mediaManager.noMatch") : t("admin.inline.mediaManager.empty")}</EmptyState>
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
            {view === "gallery" ? (
              <LibraryGallery selecting={sel.count > 0}>
                {items.map((m) => (
                  <GalleryItem
                    key={`${m.bucket}/${m.path}`}
                    media={thumbOf(m, "(max-width: 640px) 50vw, 200px", galleryFileIconClass, true)}
                    title={<span title={m.path}>{m.name}</span>}
                    meta={<><span>{fmtSize(m.size)}</span><span aria-hidden>·</span>{usageNode(m, galleryUsedClass)}</>}
                    actions={actionsOf(m, galleryActionClass)}
                    select={selectOf(m)}
                  />
                ))}
              </LibraryGallery>
            ) : (
              <div className={styles.table} role="table" data-library-list="">
                <div className={`${styles.row} ${styles.rowHead}`} role="row">
                  <span role="columnheader" />
                  <span role="columnheader" aria-label={t("admin.inline.mediaManager.colPreview")} />
                  <span role="columnheader">{t("admin.inline.mediaManager.colName")}</span>
                  <span role="columnheader">{t("admin.inline.mediaManager.colSize")}</span>
                  <span role="columnheader">{t("admin.inline.mediaManager.colUploaded")}</span>
                  <span role="columnheader">{t("admin.inline.mediaManager.colUsedIn")}</span>
                  <span role="columnheader" />
                </div>
                {items.map((m) => (
                  <div
                    key={`${m.bucket}/${m.path}`}
                    className={styles.row}
                    role="row"
                    data-selected={sel.isSelected(m) ? "" : undefined}
                    data-selectable={isUnused(m) ? "" : undefined}
                    onClick={(e) => { if (isUnused(m) && !isInnerControl(e.target)) sel.toggle(m, !sel.isSelected(m)); }}
                  >
                    <span role="cell">
                      {(() => { const s = selectOf(m); return s ? <Checkbox checked={s.checked} onChange={s.onChange} ariaLabel={s.label} /> : null; })()}
                    </span>
                    <span className={styles.thumb} role="cell">{thumbOf(m, "44px", styles.thumbIcon, false)}</span>
                    <span className={styles.nameCell} role="cell">
                      <span className={styles.name} title={m.path}>{m.name}</span>
                      <span className={styles.folder}>{folderOf(m)}</span>
                    </span>
                    <span className={styles.num} role="cell">{fmtSize(m.size)}</span>
                    <span className={styles.num} role="cell">{fmtDate(m.createdAt)}</span>
                    <span className={styles.usage} role="cell">{usageNode(m, styles.used, lib.muted)}</span>
                    <span className={styles.rowActions} role="cell">{actionsOf(m, styles.rowAction)}</span>
                  </div>
                ))}
              </div>
            )}
            {data && data.totalPages > 1 && (
              <Pagination className={lib.pager} page={data.page} totalPages={data.totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
