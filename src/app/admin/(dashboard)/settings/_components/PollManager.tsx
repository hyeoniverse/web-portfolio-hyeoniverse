"use client";

// ── 투표 결과 (settings > 라이브러리) ──
// 글·프로젝트에 넣은 투표 블록을 모아 옵션별 표를 보인다. 예전엔 투표가 든 글을 하나씩 열어야 결과를 봤다.
// 초기화는 표만 지우고, 투표 블록은 글에 그대로 남는다.
import { useEffect, useState } from "react";
import { RotateCcw } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import TransitionLink from "@/components/ui/TransitionLink";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { tryRequest } from "@/lib/sendAction";
import type { PollBlock, PollWhere } from "@/lib/pollUsage";
import settings from "../Settings.module.css";
import LibraryHead from "./LibraryHead";
import lib from "./Library.module.css";
import styles from "./PollManager.module.css";
import { usePagedList } from "./usePagedList";

const PAGE_SIZE = 10;

type PollItem = Omit<PollBlock, "options"> & {
  options: (PollBlock["options"][number] & { count: number })[];
  votes: number;
  voters: number;
  where: PollWhere[];
};

export default function PollManager() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const openModal = useModalStore((s) => s.openModal);
  const [items, setItems] = useState<PollItem[] | null>(null);
  const [search, setSearch] = useState("");
  /* 불러온 때 — 기간(시작 전·진행 중·끝남) 판정에 쓴다(그리는 중에 시계를 읽지 않는다) */
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/polls")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .catch(() => ({ items: [] }))
      .then((d: { items?: PollItem[] }) => { if (!cancelled) { setLoadedAt(Date.now()); setItems(Array.isArray(d.items) ? d.items : []); } });
    return () => { cancelled = true; };
  }, []);

  const label = (p: PollItem) => p.title || p.options.map((o) => o.label).join(" / ") || t("제목 없는 투표", "Untitled poll");
  const q = search.trim().toLowerCase();
  const filtered = items && q
    ? items.filter((p) => label(p).toLowerCase().includes(q) || p.where.some((w) => w.title.toLowerCase().includes(q)))
    : items;
  const paged = usePagedList(filtered, PAGE_SIZE);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
  /* 기간 — 시작 전 / 진행 중 / 끝남. 기간이 없으면 표시하지 않는다 */
  const period = (p: PollItem) => {
    if (!p.startAt && !p.endAt) return null;
    const now = loadedAt;
    const state = p.startAt && Date.parse(p.startAt) > now ? t("시작 전", "Upcoming")
      : p.endAt && Date.parse(p.endAt) < now ? t("끝남", "Ended") : t("진행 중", "Open");
    const range = [p.startAt ? fmtDate(p.startAt) : "", p.endAt ? fmtDate(p.endAt) : ""].join(" – ");
    return `${state} · ${range}`;
  };

  const reset = (p: PollItem) => {
    openModal(
      <ModalConfirm
        desc={t(`"${label(p)}" 투표의 표 ${p.votes}개를 모두 지울까요? 투표 블록은 글에 그대로 남고, 되돌릴 수 없습니다.`,
          `Delete all ${p.votes} votes of "${label(p)}"? The poll block stays in the post. This can't be undone.`)}
        confirmText={t("초기화", "Reset")}
        danger
        onConfirm={async () => {
          const res = await tryRequest(`/api/admin/polls/${encodeURIComponent(p.pollId)}`, { method: "DELETE" });
          if (!(res instanceof Response) || !res.ok) { showToast(t("투표를 초기화하지 못했어요.", "Couldn’t reset the poll."), "error"); return; }
          setItems((prev) => prev?.map((x) => x.pollId === p.pollId ? { ...x, votes: 0, voters: 0, options: x.options.map((o) => ({ ...o, count: 0 })) } : x) ?? prev);
        }}
      />,
      { id: "poll-reset", header: { title: t("투표 초기화", "Reset poll") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("투표", "Polls")}
          count={items?.length}
          hint={t("글·프로젝트에 넣은 투표 블록의 결과예요. 초기화하면 표만 지워지고 투표 블록은 그대로 남아요.",
            "Results of poll blocks in posts and projects. Resetting deletes the votes only; the poll block stays.")}
          search={{ value: search, onChange: (v) => { setSearch(v); paged.setPage(1); }, placeholder: t("질문·글 제목 검색", "Search question or post") }}
        />

        {filtered === null ? (
          <div className={styles.list}>{[0, 1].map((i) => <div key={i} className={styles.item}><SkeletonLine width="50%" height={14} /></div>)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("검색 결과가 없습니다", "No results") : t("글에 넣은 투표가 없습니다", "No polls in posts yet")}</EmptyState>
        ) : (
          <div className={styles.list}>
            {paged.slice!.map((p) => {
              const max = Math.max(1, ...p.options.map((o) => o.count));
              const per = period(p);
              return (
                <article key={p.pollId} className={styles.item}>
                  <div className={styles.head}>
                    <h3 className={`${styles.title}${p.title ? "" : ` ${lib.muted}`}`}>{label(p)}</h3>
                    <Button variant="ghost" icon={<RotateCcw size={13} />} disabled={p.votes === 0} onClick={() => reset(p)} soundDisabled>
                      {t("초기화", "Reset")}
                    </Button>
                  </div>
                  <p className={styles.meta}>
                    {[
                      t(`${p.voters}명 참여 · 표 ${p.votes}개`, `${p.voters} voter${p.voters === 1 ? "" : "s"} · ${p.votes} vote${p.votes === 1 ? "" : "s"}`),
                      p.multiple ? t("복수 선택", "Multiple choice") : "",
                      per ?? "",
                    ].filter(Boolean).join(" · ")}
                  </p>
                  <ul className={styles.options}>
                    {p.options.map((o) => {
                      const pct = p.votes ? Math.round((o.count / p.votes) * 100) : 0;
                      return (
                        <li key={o.id} className={styles.option}>
                          <span className={styles.optLabel}>{o.label}</span>
                          <span className={styles.bar} aria-hidden>
                            <span className={styles.barFill} data-top={o.count > 0 && o.count === max ? "" : undefined} style={{ width: `${(o.count / max) * 100}%` }} />
                          </span>
                          <span className={styles.optCount}>{o.count}<span className={styles.optPct}> · {pct}%</span></span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className={styles.where}>
                    {p.where.map((w, i) => (
                      <span key={`${w.kind}-${w.id}`}>
                        {i > 0 && " · "}
                        <TransitionLink href={w.kind === "post" ? `/admin/posts/${w.id}/edit` : `/admin/works/${w.id}/edit`} className={styles.whereLink}>
                          {w.kind === "post" ? t("글", "Post") : t("프로젝트", "Project")} · {w.title || w.slug}
                        </TransitionLink>
                      </span>
                    ))}
                  </p>
                </article>
              );
            })}
          </div>
        )}
        {paged.totalPages > 1 && (
          <Pagination className={lib.pager} page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} showJump={false} />
        )}
      </div>
    </section>
  );
}
