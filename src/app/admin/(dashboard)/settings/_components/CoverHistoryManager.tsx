"use client";

// ── 커버 이미지 기록 (settings > 라이브러리) ──
// AI 로 만들거나 이미지 검색·기본 이미지에서 고른 커버의 최근 기록(최대 24개, 계정별).
// 예전엔 커버 고르기 창 안에서만 보였다. 여기서 모아 보고 주소를 복사해 다른 글에 쓰거나 기록에서 뺀다.
// 기록에서 빼도 이미지 파일과 이미 커버로 쓴 글은 그대로다.
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import EmptyState from "@/components/ui/EmptyState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import TransitionLink from "@/components/ui/TransitionLink";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import MediaThumb from "@/components/ui/MediaThumb";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { LibraryBulkBar, runBulk, useBulkResultText, useDragSelect, useLibrarySelection } from "./LibrarySelection";
import LibraryHead from "./LibraryHead";
import { GallerySkeleton } from "./LibrarySkeletons";
import { LibraryGallery, GalleryItem, galleryActionClass, galleryUsedClass, galleryUsedLinkClass, galleryUsedListClass } from "./LibraryGallery";

type Ref = { id: string; title: string; slug: string };
type CoverItem = { id: string; url: string; source: "ai" | "unsplash" | "preset" | string; meta: string; created_at: string; usage?: { posts: Ref[]; works: Ref[] } };

/* 여러 개 고르기의 열쇠 — 모듈 수준이라 훅의 의존 배열이 늘 같다 */
const coverKey = (c: CoverItem) => c.id;

type UseFilter = "all" | "used" | "unused";
const isUsed = (u: CoverItem["usage"]) => !!u && (u.posts.length > 0 || u.works.length > 0);

export default function CoverHistoryManager() {
  const { language, t } = useLanguage();
  const ko = language === "ko";
  const [items, setItems] = useState<CoverItem[] | null>(null);

  /* 사용처 — 목록과 따로 받는다. 기록 24개는 바로 오지만 쓰는 곳은 글·프로젝트를 훑어야 해서,
     같이 기다리면 목록까지 늦게 떴다. 목록을 먼저 그리고 사용처는 오는 대로 채운다(id → usage) */
  const [usage, setUsage] = useState<Record<string, CoverItem["usage"]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const get = (q: string) => fetch(`/api/admin/cover-history${q}`)
      .then((r) => (r.ok ? r.json() : { history: [] }))
      .catch(() => ({ history: [] })) as Promise<{ history?: CoverItem[] }>;
    void get("").then((d) => { if (!cancelled) setItems(Array.isArray(d.history) ? d.history : []); });
    void get("?usage=1").then((d) => {
      if (cancelled) return;
      setUsage(Object.fromEntries((d.history ?? []).map((c) => [c.id, c.usage])));
    });
    return () => { cancelled = true; };
  }, []);

  /* 출처 — 커버 고르기 창은 Pexels 에서 고른 것도 source "unsplash" 로 남기므로 주소로 가린다 */
  const sourceLabel = (c: CoverItem) => {
    if (/^https:\/\/(images|videos)\.pexels\.com\//i.test(c.url)) return "Pexels";
    if (c.source === "ai") return "AI";
    if (c.source === "unsplash") return "Unsplash";
    if (c.source === "preset") return isVideoUrl(c.url) ? t("admin.inline.coverHistoryManager.presetVideo") : t("admin.inline.coverHistoryManager.presetImage");
    return c.source;
  };
  const date = (s: string) => new Date(s).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); showToast(t("admin.inline.coverHistoryManager.copied"), "success"); }
    catch { showToast(t("admin.inline.coverHistoryManager.copyFailed"), "error"); }
  };

  const removeOne = async (c: CoverItem) => {
    const res = await tryRequest(`/api/admin/cover-history?url=${encodeURIComponent(c.url)}`, { method: "DELETE" });
    return res instanceof Response && res.ok;
  };
  const remove = async (c: CoverItem) => {
    if (!(await removeOne(c))) { showToast(t("admin.inline.coverHistoryManager.removeFailed"), "error"); return; }
    setItems((prev) => prev?.filter((x) => x.id !== c.id) ?? prev);
  };

  /* 쓰는 곳으로 걸러 보기 — 사용처가 오기 전에는 전체만 보인다(사용 중 · 미사용은 숫자 없이 고르면 뼈대) */
  const [useFilter, setUseFilter] = useState<UseFilter>("all");
  const usedCount = useMemo(() => (items && usage ? items.filter((c) => isUsed(usage[c.id])).length : null), [items, usage]);
  const shown = useMemo(() => {
    if (!items || useFilter === "all") return items;
    if (!usage) return null;
    return items.filter((c) => isUsed(usage[c.id]) === (useFilter === "used"));
  }, [items, usage, useFilter]);
  const filterItems = [
    { value: "all" as const, label: `${t("admin.inline.coverHistoryManager.all")} ${items?.length ?? 0}` },
    { value: "used" as const, label: usedCount === null ? t("admin.inline.coverHistoryManager.used") : `${t("admin.inline.coverHistoryManager.used")} ${usedCount}` },
    { value: "unused" as const, label: usedCount === null ? t("admin.inline.coverHistoryManager.unused") : `${t("admin.inline.coverHistoryManager.unused")} ${items!.length - usedCount}` },
  ];

  /* 여러 개 고르기 — 기록에서 빼기(글 · 프로젝트에 쓴 커버는 그대로 남는다). 걸러 본 것만 대상 */
  const sel = useLibrarySelection(shown, coverKey);
  const pick = useDragSelect(sel);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkResult = useBulkResultText();
  const openModal = useModalStore((s) => s.openModal);
  const removeSelected = () => {
    const targets = sel.selected;
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.libraryBulk.removeHistoryConfirm"), { n: targets.length })}
        confirmText={fillTemplate(t("admin.inline.libraryBulk.removeFromHistoryN"), { n: targets.length })}
        danger
        onConfirm={async () => {
          setBulkDeleting(true);
          const { ok, failed } = await runBulk(targets, removeOne);
          setBulkDeleting(false);
          const gone = new Set(ok.map(coverKey));
          setItems((prev) => prev?.filter((x) => !gone.has(x.id)) ?? prev);
          showToast(bulkResult(ok.length, failed.length), failed.length ? "error" : "success");
          sel.clear();
        }}
      />,
      { id: "cover-history-bulk", header: { title: t("admin.inline.coverHistoryManager.removeFromHistory") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.coverHistoryManager.title")}
          count={items?.length}
          hint={t("admin.inline.coverHistoryManager.hint")}
          filters={<SegmentedControl items={filterItems} value={useFilter} onChange={setUseFilter} variant="subtle" />}
        />
        {items === null || shown === null ? (
          <GallerySkeleton />
        ) : items.length === 0 ? (
          <EmptyState pad="sm">{t("admin.inline.coverHistoryManager.empty")}</EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState pad="sm">{t("admin.inline.coverHistoryManager.noMatch")}</EmptyState>
        ) : (
          <>
          <LibraryBulkBar
            count={sel.count}
            selectableCount={sel.selectableCount}
            onSelectAll={sel.selectAll}
            onClear={sel.clear}
            onDelete={removeSelected}
            deleting={bulkDeleting}
            deleteLabel={t("admin.inline.libraryBulk.removeFromHistoryN")}
          />
          <LibraryGallery selecting={sel.count > 0}>
            {shown.map((c) => {
              const u = usage?.[c.id];
              const used = [...(u?.posts ?? []).map((r) => ({ ...r, kind: "post" as const })), ...(u?.works ?? []).map((r) => ({ ...r, kind: "work" as const }))];
              return (
                <GalleryItem
                  key={c.id}
                  media={<MediaThumb src={c.url} fill sizes="(max-width: 640px) 50vw, 200px" fallbackSeed={c.id} />}
                  title={`${sourceLabel(c)} · ${date(c.created_at)}`}
                  meta={usage === null ? <span>…</span> : used.length ? (
                    <Tooltip interactive placement="bottom" delay={150} content={
                      <span className={galleryUsedListClass}>
                        {used.map((r) => (
                          <TransitionLink key={`${r.kind}-${r.id}`} href={r.kind === "post" ? `/admin/posts/${r.id}/edit` : `/admin/works/${r.id}/edit`} className={galleryUsedLinkClass}>
                            {r.kind === "post" ? t("admin.inline.coverHistoryManager.post") : t("admin.inline.coverHistoryManager.project")} · {r.title || r.slug}
                          </TransitionLink>
                        ))}
                      </span>
                    }>
                      <span className={galleryUsedClass}>{fillTemplate(t("admin.inline.coverHistoryManager.usedAsCover"), { n: used.length })}</span>
                    </Tooltip>
                  ) : <span>{t("admin.inline.coverHistoryManager.notUsed")}</span>}
                  actions={<>
                    <Pressable className={galleryActionClass} onClick={() => void copy(c.url)} aria-label={t("admin.inline.coverHistoryManager.copyUrl")} title={t("admin.inline.coverHistoryManager.copyUrl")}><Copy size={13} /></Pressable>
                    <a className={galleryActionClass} href={c.url} target="_blank" rel="noopener noreferrer" aria-label={t("admin.inline.coverHistoryManager.openNewTab")} title={t("admin.inline.coverHistoryManager.openNewTab")}><ExternalLink size={13} /></a>
                    <Pressable className={galleryActionClass} onClick={() => void remove(c)} aria-label={t("admin.inline.coverHistoryManager.removeFromHistory")} title={t("admin.inline.coverHistoryManager.removeFromHistory")}><Trash2 size={13} /></Pressable>
                  </>}
                  select={{ checked: sel.isSelected(c), onChange: (v) => sel.toggle(c, v), label: fillTemplate(t("admin.inline.libraryBulk.select"), { name: `${sourceLabel(c)} · ${date(c.created_at)}` }), pick: pick(c) }}
                />
              );
            })}
          </LibraryGallery>
          </>
        )}
      </div>
    </section>
  );
}
