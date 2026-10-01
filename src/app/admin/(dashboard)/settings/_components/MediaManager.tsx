"use client";

// ── 업로드한 파일 (settings > 라이브러리) ──
// 저장소 두 곳(posts: 글·프로젝트 이미지·커버·낭독 음성 / uploads: 로고·아이콘·이모지·배경음·폰트·이력서)의 파일과
// 쓰는 곳. 예전엔 올린 파일을 볼 곳이 없어 쌓이기만 했다. 어디서도 쓰지 않는 파일만 지울 수 있다(서버도 다시 확인한다).
import { useEffect, useState } from "react";
import { Copy, ExternalLink, File, FileText, Film, Music, Trash2, Type } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import Tooltip from "@/components/ui/Tooltip";
import TransitionLink from "@/components/ui/TransitionLink";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import { errorFromResponse, errorText } from "@/lib/apiError";
import { mediaType, type MediaRef } from "@/lib/mediaUsage";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import styles from "./MediaManager.module.css";

type MediaItem = { bucket: string; path: string; name: string; size: number; mime: string; createdAt: string | null; url: string; usage: MediaRef[] };
type Kind = ReturnType<typeof mediaType>;
const LIMIT = 48;

type Summary = { counts: Partial<Record<"all" | Kind, number>>; totalSize: number; unusedCount: number; unusedSize: number };
type PageData = { items: MediaItem[]; total: number; page: number; totalPages: number; summary: Summary };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_ICON: Record<Exclude<Kind, "image">, typeof File> = { video: Film, audio: Music, font: Type, doc: FileText, other: File };

export default function MediaManager() {
  const { language, t: tr } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const openModal = useModalStore((s) => s.openModal);
  const [data, setData] = useState<PageData | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [page, setPage] = useState(1);
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
  const summary = data?.summary;
  const counts = summary?.counts ?? {};
  const allCount = counts.all ?? 0;

  const KIND_LABEL: Record<Kind, string> = {
    image: t("이미지", "Images"), video: t("동영상", "Video"), audio: t("오디오", "Audio"),
    font: t("폰트", "Fonts"), doc: t("문서", "Docs"), other: t("기타", "Other"),
  };
  const segItems = [
    { value: "all" as const, label: `${t("전체", "All")} ${allCount}` },
    ...(["image", "video", "audio", "font", "doc", "other"] as Kind[]).filter((k) => counts[k]).map((k) => ({ value: k, label: `${KIND_LABEL[k]} ${counts[k]}` })),
  ];

  /* 쓰는 곳 — "글 2 · 사이트 설정". 글·프로젝트는 올리면 제목 목록(누르면 편집 화면) */
  const usageSummary = (u: MediaRef[]) => {
    const n = (k: MediaRef["kind"]) => u.filter((r) => r.kind === k).length;
    return [
      n("post") ? t(`글 ${n("post")}`, `${n("post")} post${n("post") > 1 ? "s" : ""}`) : "",
      n("work") ? t(`프로젝트 ${n("work")}`, `${n("work")} project${n("work") > 1 ? "s" : ""}`) : "",
      n("series") ? t(`시리즈 ${n("series")}`, `${n("series")} series`) : "",
      n("settings") ? t("사이트 설정", "Site settings") : "",
      n("emoji") ? t("커스텀 이모지", "Custom emoji") : "",
      n("coverHistory") ? t("커버 기록", "Cover history") : "",
    ].filter(Boolean).join(" · ");
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); showToast(t("주소를 복사했어요.", "URL copied."), "success"); }
    catch { showToast(t("복사하지 못했어요.", "Couldn’t copy."), "error"); }
  };

  const remove = (m: MediaItem) => {
    openModal(
      <ModalConfirm
        desc={t(`"${m.name}" 파일을 저장소에서 지울까요? 어디서도 쓰지 않는 파일이지만, 지우면 되돌릴 수 없습니다.`,
          `Delete "${m.name}" from storage? It isn't used anywhere, but this can't be undone.`)}
        confirmText={t("지우기", "Delete")}
        danger
        onConfirm={async () => {
          const res = await tryRequest("/api/admin/media", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bucket: m.bucket, path: m.path }),
          });
          if (!(res instanceof Response) || !res.ok) {
            const err = res instanceof Response ? await errorFromResponse(res) : null;
            showToast(errorText(err, tr, t("파일을 지우지 못했어요.", "Couldn’t delete the file.")), "error");
            return;
          }
          setReload((n) => n + 1);
        }}
      />,
      { id: "media-delete", header: { title: t("파일 지우기", "Delete file") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <div className={lib.headRow}>
          <h2 className={settings.sectionTitle}>{t("업로드한 파일", "Uploaded files")}</h2>
          {summary && <span className={lib.headCount}>{allCount} · {fmtSize(summary.totalSize)}</span>}
          <div className={lib.headActions}>
            <div className={lib.headSearch}>
              <SearchCapsule search={search} onSearchChange={setSearch} placeholder={t("파일 이름·폴더 검색", "Search name or folder")} align="left" />
            </div>
          </div>
        </div>
        <p className={settings.sectionHint}>
          {t("글·프로젝트 이미지와 로고·아이콘·배경음 같은 사이트 파일이에요. 어디서도 쓰지 않는 파일만 지울 수 있어요(휴지통 글에서 쓰는 것도 쓰는 것으로 봐요).",
            "Post and project images plus site files like logos, icons and background music. Only files used nowhere can be deleted (posts in the trash count as using them).")}
        </p>

        {summary && allCount > 0 && (
          <div className={lib.filterRow}>
            <SegmentedControl items={segItems} value={kind} onChange={(v) => { setKind(v); setPage(1); }} variant="subtle" size="sm" />
            <Switch
              size="sm"
              checked={unusedOnly}
              onCheckedChange={(v) => { setUnusedOnly(v); setPage(1); }}
              label={t(`쓰지 않는 파일만 (${summary.unusedCount}개 · ${fmtSize(summary.unusedSize)})`, `Unused only (${summary.unusedCount} · ${fmtSize(summary.unusedSize)})`)}
            />
          </div>
        )}

        {failed && !data ? (
          <EmptyState pad="sm">{t("파일 목록을 불러오지 못했습니다", "Couldn’t load files")}</EmptyState>
        ) : items === null ? (
          <div className={styles.grid}>{[0, 1, 2, 3].map((i) => <div key={i} className={styles.preview}><SkeletonLine width="100%" height="100%" /></div>)}</div>
        ) : items.length === 0 ? (
          <EmptyState pad="sm">{search || unusedOnly || kind !== "all" ? t("조건에 맞는 파일이 없습니다", "No matching files") : t("올린 파일이 없습니다", "No uploaded files")}</EmptyState>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((m) => {
                const mk = mediaType(m.mime, m.name);
                const Icon = mk === "image" ? null : KIND_ICON[mk];
                const ext = m.name.includes(".") ? m.name.split(".").pop()!.toUpperCase() : "";
                const used = usageSummary(m.usage);
                const docs = m.usage.filter((r) => (r.kind === "post" || r.kind === "work") && r.id);
                return (
                  <figure key={`${m.bucket}/${m.path}`} className={styles.card}>
                    <div className={styles.preview}>
                      {Icon ? (
                        <span className={styles.fileIcon}><Icon size={22} strokeWidth={1.5} /><span>{ext}</span></span>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element -- 저장소 원본 미리보기, 크기가 제각각이라 next/image 를 쓰지 않는다 */
                        <img src={m.url} alt="" loading="lazy" />
                      )}
                      <span className={styles.actions}>
                        <Pressable className={styles.action} onClick={() => void copy(m.url)} aria-label={t("주소 복사", "Copy URL")} title={t("주소 복사", "Copy URL")}><Copy size={13} /></Pressable>
                        <a className={styles.action} href={m.url} target="_blank" rel="noopener noreferrer" aria-label={t("새 탭에서 열기", "Open in new tab")} title={t("새 탭에서 열기", "Open in new tab")}><ExternalLink size={13} /></a>
                        {!m.usage.length && (
                          <Pressable className={styles.action} onClick={() => remove(m)} aria-label={t("지우기", "Delete")} title={t("지우기", "Delete")}><Trash2 size={13} /></Pressable>
                        )}
                      </span>
                    </div>
                    <figcaption className={styles.caption}>
                      <span className={styles.name} title={m.path}>{m.path}</span>
                      <span>{fmtSize(m.size)}{m.createdAt ? ` · ${new Date(m.createdAt).toLocaleDateString(ko ? "ko-KR" : "en-US", { year: "2-digit", month: "short", day: "numeric" })}` : ""}</span>
                      {used ? (
                        docs.length ? (
                          <Tooltip interactive placement="bottom" delay={150} content={
                            <span className={styles.usedList}>
                              {docs.map((r) => (
                                <TransitionLink key={`${r.kind}-${r.id}`} href={r.kind === "post" ? `/admin/posts/${r.id}/edit` : `/admin/works/${r.id}/edit`} className={styles.usedLink}>
                                  {r.kind === "post" ? t("글", "Post") : t("프로젝트", "Project")} · {r.title || r.id}
                                </TransitionLink>
                              ))}
                            </span>
                          }>
                            <span className={styles.used}>{used}</span>
                          </Tooltip>
                        ) : <span className={styles.usedPlain}>{used}</span>
                      ) : <span className={lib.muted}>{t("쓰는 곳 없음", "Not used")}</span>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            {data && data.totalPages > 1 && (
              <Pagination className={lib.pager} page={data.page} totalPages={data.totalPages} onChange={setPage} size="sm" />
            )}
          </>
        )}
      </div>
    </section>
  );
}
