"use client";

// ── 커버 이미지 기록 (settings > 라이브러리) ──
// AI 로 만들거나 이미지 검색·기본 이미지에서 고른 커버의 최근 기록(최대 24개, 계정별).
// 예전엔 커버 고르기 창 안에서만 보였다. 여기서 모아 보고 주소를 복사해 다른 글에 쓰거나 기록에서 뺀다.
// 기록에서 빼도 이미지 파일과 이미 커버로 쓴 글은 그대로다.
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import EmptyState from "@/components/ui/EmptyState";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import TransitionLink from "@/components/ui/TransitionLink";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import MediaThumb from "@/components/ui/MediaThumb";
import { isVideoUrl } from "@/lib/isVideoUrl";
import LibraryHead from "./LibraryHead";
import { LibraryGallery, GalleryItem, galleryActionClass, galleryUsedClass, galleryUsedLinkClass, galleryUsedListClass } from "./LibraryGallery";

type Ref = { id: string; title: string; slug: string };
type CoverItem = { id: string; url: string; source: "ai" | "unsplash" | "preset" | string; meta: string; created_at: string; usage?: { posts: Ref[]; works: Ref[] } };

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

  const remove = async (c: CoverItem) => {
    const res = await tryRequest(`/api/admin/cover-history?url=${encodeURIComponent(c.url)}`, { method: "DELETE" });
    if (!(res instanceof Response) || !res.ok) { showToast(t("admin.inline.coverHistoryManager.removeFailed"), "error"); return; }
    setItems((prev) => prev?.filter((x) => x.id !== c.id) ?? prev);
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.coverHistoryManager.title")}
          count={items?.length}
          hint={t("admin.inline.coverHistoryManager.hint")}
        />
        {items === null ? (
          <LibraryGallery>{[0, 1, 2, 3, 4, 5].map((i) => <GalleryItem key={i} media={<SkeletonLine width="100%" height="100%" />} />)}</LibraryGallery>
        ) : items.length === 0 ? (
          <EmptyState pad="sm">{t("admin.inline.coverHistoryManager.empty")}</EmptyState>
        ) : (
          <LibraryGallery>
            {items.map((c) => {
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
                />
              );
            })}
          </LibraryGallery>
        )}
      </div>
    </section>
  );
}
