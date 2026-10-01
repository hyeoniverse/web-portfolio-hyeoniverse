"use client";

// ── 커버 이미지 기록 (settings > 라이브러리) ──
// AI 로 만들거나 이미지 검색·기본 이미지에서 고른 커버의 최근 기록(최대 24개, 계정별).
// 예전엔 커버 고르기 창 안에서만 보였다. 여기서 모아 보고 주소를 복사해 다른 글에 쓰거나 기록에서 뺀다.
// 기록에서 빼도 이미지 파일과 이미 커버로 쓴 글은 그대로다.
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Trash2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
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
  const { language } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
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
    if (c.source === "preset") return isVideoUrl(c.url) ? t("기본 동영상", "Preset video") : t("기본 이미지", "Preset");
    return c.source;
  };
  const date = (s: string) => new Date(s).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); showToast(t("주소를 복사했어요.", "URL copied."), "success"); }
    catch { showToast(t("복사하지 못했어요.", "Couldn’t copy."), "error"); }
  };

  const remove = async (c: CoverItem) => {
    const res = await tryRequest(`/api/admin/cover-history?url=${encodeURIComponent(c.url)}`, { method: "DELETE" });
    if (!(res instanceof Response) || !res.ok) { showToast(t("기록에서 빼지 못했어요.", "Couldn’t remove it from history."), "error"); return; }
    setItems((prev) => prev?.filter((x) => x.id !== c.id) ?? prev);
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("커버 이미지 기록", "Cover image history")}
          count={items?.length}
          hint={t("커버 고르기 창에서 AI 로 만들거나 고른 최근 커버예요(최대 24개). 기록에서 빼도 이미지와 이미 커버로 쓴 글은 그대로예요.",
            "Recent covers you generated or picked in the cover picker (up to 24). Removing one keeps the image and any post using it.")}
        />
        {items === null ? (
          <LibraryGallery>{[0, 1, 2, 3, 4, 5].map((i) => <GalleryItem key={i} media={<SkeletonLine width="100%" height="100%" />} />)}</LibraryGallery>
        ) : items.length === 0 ? (
          <EmptyState pad="sm">{t("커버 이미지 기록이 없습니다", "No cover history yet")}</EmptyState>
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
                            {r.kind === "post" ? t("글", "Post") : t("프로젝트", "Project")} · {r.title || r.slug}
                          </TransitionLink>
                        ))}
                      </span>
                    }>
                      <span className={galleryUsedClass}>{t(`커버로 쓰는 곳 ${used.length}`, `Used as cover ×${used.length}`)}</span>
                    </Tooltip>
                  ) : <span>{t("쓰는 곳 없음", "Not used")}</span>}
                  actions={<>
                    <Pressable className={galleryActionClass} onClick={() => void copy(c.url)} aria-label={t("주소 복사", "Copy URL")} title={t("주소 복사", "Copy URL")}><Copy size={13} /></Pressable>
                    <a className={galleryActionClass} href={c.url} target="_blank" rel="noopener noreferrer" aria-label={t("새 탭에서 열기", "Open in new tab")} title={t("새 탭에서 열기", "Open in new tab")}><ExternalLink size={13} /></a>
                    <Pressable className={galleryActionClass} onClick={() => void remove(c)} aria-label={t("기록에서 빼기", "Remove from history")} title={t("기록에서 빼기", "Remove from history")}><Trash2 size={13} /></Pressable>
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
