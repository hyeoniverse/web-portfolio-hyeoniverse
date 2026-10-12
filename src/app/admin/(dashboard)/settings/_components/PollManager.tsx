"use client";

// ── 투표 결과 (settings > 라이브러리) ──
// 글·프로젝트에 넣은 투표 블록을 모아 옵션별 표를 보인다. 예전엔 투표가 든 글을 하나씩 열어야 결과를 봤다.
// 초기화는 표만 지우고, 투표 블록은 글에 그대로 남는다.
import { useEffect, useState } from "react";
import { RotateCcw } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
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
  const { language, t } = useLanguage();
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

  const label = (p: PollItem) => p.title || p.options.map((o) => o.label).join(" / ") || t("admin.inline.pollManager.untitled");
  const q = search.trim().toLowerCase();
  const filtered = items && q
    ? items.filter((p) => label(p).toLowerCase().includes(q) || p.where.some((w) => w.title.toLowerCase().includes(q)))
    : items;
  const paged = usePagedList(filtered, PAGE_SIZE);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
  /* 기간 — 시작 전 / 진행 중 / 끝남. 기간이 없으면 표시하지 않는다 */
  const period = (p: PollItem) => {
    if (!p.startAt && !p.endAt) return null;
    const now = loadedAt;
    const state = p.startAt && Date.parse(p.startAt) > now ? t("admin.inline.pollManager.upcoming")
      : p.endAt && Date.parse(p.endAt) < now ? t("admin.inline.pollManager.ended") : t("admin.inline.pollManager.open");
    const range = [p.startAt ? fmtDate(p.startAt) : "", p.endAt ? fmtDate(p.endAt) : ""].join(" – ");
    return `${state} · ${range}`;
  };

  const reset = (p: PollItem) => {
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.inline.pollManager.resetDesc"), { label: label(p), votes: p.votes })}
        confirmText={t("admin.inline.pollManager.reset")}
        danger
        onConfirm={async () => {
          const res = await tryRequest(`/api/admin/polls/${encodeURIComponent(p.pollId)}`, { method: "DELETE" });
          if (!(res instanceof Response) || !res.ok) { showToast(t("admin.inline.pollManager.resetFailed"), "error"); return; }
          setItems((prev) => prev?.map((x) => x.pollId === p.pollId ? { ...x, votes: 0, voters: 0, options: x.options.map((o) => ({ ...o, count: 0 })) } : x) ?? prev);
        }}
      />,
      { id: "poll-reset", header: { title: t("admin.inline.pollManager.resetTitle") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <LibraryHead
          title={t("admin.inline.pollManager.title")}
          count={items?.length}
          hint={t("admin.inline.pollManager.hint")}
          search={{ value: search, onChange: (v) => { setSearch(v); paged.setPage(1); }, placeholder: t("admin.inline.pollManager.searchPlaceholder") }}
        />

        {filtered === null ? (
          <div className={styles.list}>{[0, 1].map((i) => <div key={i} className={styles.item}><SkeletonLine width="50%" height={14} /></div>)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("admin.inline.pollManager.noResults") : t("admin.inline.pollManager.noPolls")}</EmptyState>
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
                      {t("admin.inline.pollManager.reset")}
                    </Button>
                  </div>
                  <p className={styles.meta}>
                    {[
                      fillTemplate(t(p.voters === 1 ? "admin.inline.pollManager.votersOne" : "admin.inline.pollManager.votersMany"), { n: p.voters }),
                      fillTemplate(t(p.votes === 1 ? "admin.inline.pollManager.votesOne" : "admin.inline.pollManager.votesMany"), { n: p.votes }),
                      p.multiple ? t("admin.inline.pollManager.multiple") : "",
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
                          {w.kind === "post" ? t("admin.inline.pollManager.post") : t("admin.inline.pollManager.project")} · {w.title || w.slug}
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
