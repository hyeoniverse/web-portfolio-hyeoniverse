"use client";

// ── 업로드한 파일 (settings > 라이브러리) ──
// 저장소 두 곳(posts: 글·프로젝트 이미지·커버·낭독 음성 / uploads: 로고·아이콘·이모지·배경음·폰트·이력서)의 파일과
// 쓰는 곳. 예전엔 올린 파일을 볼 곳이 없어 쌓이기만 했다. 어디서도 쓰지 않는 파일만 지울 수 있다(서버도 다시 확인한다).
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, File, FileText, Film, Music, Trash2, Type } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
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
const PAGE = 48;

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
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/media")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items?: MediaItem[] }) => { if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (!cancelled) { setFailed(true); setItems([]); } });
    return () => { cancelled = true; };
  }, []);

  const withKind = useMemo(() => (items ?? []).map((m) => ({ ...m, kind: mediaType(m.mime, m.name) })), [items]);
  const kinds = useMemo(() => {
    const c = new Map<Kind, number>();
    for (const m of withKind) c.set(m.kind, (c.get(m.kind) ?? 0) + 1);
    return c;
  }, [withKind]);
  const q = search.trim().toLowerCase();
  const filtered = withKind.filter((m) =>
    (kind === "all" || m.kind === kind) && (!unusedOnly || m.usage.length === 0) && (!q || m.path.toLowerCase().includes(q)));
  const unused = withKind.filter((m) => m.usage.length === 0);
  const unusedSize = unused.reduce((a, m) => a + m.size, 0);
  const totalSize = withKind.reduce((a, m) => a + m.size, 0);

  const KIND_LABEL: Record<Kind, string> = {
    image: t("이미지", "Images"), video: t("동영상", "Video"), audio: t("오디오", "Audio"),
    font: t("폰트", "Fonts"), doc: t("문서", "Docs"), other: t("기타", "Other"),
  };
  const segItems = [
    { value: "all" as const, label: `${t("전체", "All")} ${withKind.length}` },
    ...(["image", "video", "audio", "font", "doc", "other"] as Kind[]).filter((k) => kinds.get(k)).map((k) => ({ value: k, label: `${KIND_LABEL[k]} ${kinds.get(k)}` })),
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
          setItems((prev) => prev?.filter((x) => !(x.bucket === m.bucket && x.path === m.path)) ?? prev);
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
          {items && <span className={lib.headCount}>{withKind.length} · {fmtSize(totalSize)}</span>}
          <div className={lib.headActions}>
            <div className={lib.headSearch}>
              <SearchCapsule search={search} onSearchChange={(v) => { setSearch(v); setShown(PAGE); }} placeholder={t("파일 이름·폴더 검색", "Search name or folder")} align="left" />
            </div>
          </div>
        </div>
        <p className={settings.sectionHint}>
          {t("글·프로젝트 이미지와 로고·아이콘·배경음 같은 사이트 파일이에요. 어디서도 쓰지 않는 파일만 지울 수 있어요(휴지통 글에서 쓰는 것도 쓰는 것으로 봐요).",
            "Post and project images plus site files like logos, icons and background music. Only files used nowhere can be deleted (posts in the trash count as using them).")}
        </p>

        {items && withKind.length > 0 && (
          <div className={lib.filterRow}>
            <SegmentedControl items={segItems} value={kind} onChange={(v) => { setKind(v); setShown(PAGE); }} variant="subtle" size="sm" />
            <Switch
              size="sm"
              checked={unusedOnly}
              onCheckedChange={(v) => { setUnusedOnly(v); setShown(PAGE); }}
              label={t(`쓰지 않는 파일만 (${unused.length}개 · ${fmtSize(unusedSize)})`, `Unused only (${unused.length} · ${fmtSize(unusedSize)})`)}
            />
          </div>
        )}

        {items === null ? (
          <div className={styles.grid}>{[0, 1, 2, 3].map((i) => <div key={i} className={styles.preview}><SkeletonLine width="100%" height="100%" /></div>)}</div>
        ) : failed ? (
          <EmptyState pad="sm">{t("파일 목록을 불러오지 못했습니다", "Couldn’t load files")}</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search || unusedOnly || kind !== "all" ? t("조건에 맞는 파일이 없습니다", "No matching files") : t("올린 파일이 없습니다", "No uploaded files")}</EmptyState>
        ) : (
          <>
            <div className={styles.grid}>
              {filtered.slice(0, shown).map((m) => {
                const Icon = m.kind === "image" ? null : KIND_ICON[m.kind];
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
            {filtered.length > shown && (
              <Button variant="outline" size="md" className={lib.more} onClick={() => setShown((n) => n + PAGE)}>
                {t(`더 보기 (${filtered.length - shown}개 남음)`, `Show more (${filtered.length - shown} left)`)}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
