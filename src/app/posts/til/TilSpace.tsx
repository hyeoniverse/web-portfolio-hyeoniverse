"use client";

import { useEffect, useRef, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import type { TilEntry } from "@/lib/posts";
import type { StarRef } from "./TilSpace3D";
import dynamic from "next/dynamic";
import Pressable from "@/components/ui/Pressable";
import { X } from "@/components/icons";
import { CONSTELLATIONS, litCount } from "./constellations";
import { ArrowLeft } from "@/components/icons";
import { useDialogRef } from "@/hooks/useTopLayer";
import styles from "./TilSpace.module.css";

/** 3D 플라네타리움 — three 묶음이 커서 브라우저에서만 따로 싣는다 */
const TilSpace3D = dynamic(() => import("./TilSpace3D"), { ssr: false });

/** CSS 색(oklch 등)을 three 가 읽는 #rrggbb 로 — 1px 캔버스에 칠해 읽는다 */
function cssColorToHex(value: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return "#ff4f9a";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/* TIL 플라네타리움 — 망원경 단추로 여는 전체 화면 돔 하늘. 다른 요소는 모두 덮는다.
   - 하늘: 끌어서 둘러보고, 은하수 · 별똥별 · 열두 별자리. 별자리를 누르면 그쪽으로 확대(초점)된다.
   - 초점: 켜진 별 하나가 그날의 TIL — 올리면 날짜 · 제목 말풍선, 누르면 TIL 카드. 옆 패널에 그달 기록 목록과
     "피드에서 보기"(닫히며 피드를 그달로 좁힌다), "하늘로"(초점 풀기).
   - Esc 는 초점이면 하늘로, 아니면 닫는다(<dialog> top layer) */
export default function TilSpace({
  year,
  byDay,
  titleOf,
  excerptOf,
  formatDay,
  texts,
  monthName,
  lang,
  doneLabel,
  dragHint,
  closeLabel,
  onMonth,
  onClose,
}: {
  year: number;
  byDay: Map<string, TilEntry[]>;
  titleOf: (e: TilEntry) => string;
  excerptOf: (e: TilEntry) => string | null | undefined;
  formatDay: (key: string) => string;
  texts: { back: string; openFeed: string; openPost: string; empty: string };
  monthName: (m: number) => string;
  lang: "ko" | "en";
  doneLabel: string;
  dragHint: string;
  closeLabel: string;
  onMonth: (m: number) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDialogElement>(null);
  // 사이트 공용 top layer 도우미로 띄운다 — 커스텀 커서 등 늘 위에 있어야 할 것이 다시 이 창 위로 올라온다
  const dialogRef = useDialogRef(rootRef);
  const [accent, setAccent] = useState("#ff4f9a");
  // 닫을 때 3D(이름표 DOM 포함)를 먼저 내리고 다음 틀에 창을 닫는다 — 창이 먼저 사라지면 이름표 정리가 엇갈린다
  const [leaving, setLeaving] = useState(false);
  const leave = (then: () => void) => {
    setLeaving(true);
    requestAnimationFrame(() => then());
  };

  const lits = CONSTELLATIONS.map((_, m) => litCount(byDay, year, m));
  // 초점 — 고른 별자리(확대), 가리킨 별, 펼친 별(TIL 카드)
  const [focus, setFocus] = useState<number | null>(null);
  const [hoverStar, setHoverStar] = useState<StarRef>(null);
  const [openStar, setOpenStar] = useState<StarRef>(null);
  const tipEl = useRef<HTMLDivElement>(null);
  /** 그달 TIL 을 쓴 날(오름차순) — 별 i 번이 i 번째 날 */
  const daysOf = (m: number) => {
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}-`;
    return [...byDay.keys()].filter((k) => k.startsWith(prefix)).sort();
  };
  const dayOf = (s: StarRef) => (s ? daysOf(s.m)[s.i] ?? null : null);
  const unfocus = () => {
    setFocus(null);
    setOpenStar(null);
    setHoverStar(null);
  };
  const doneCount = CONSTELLATIONS.filter((c, m) => lits[m] >= c.stars.length).length;
  const labelEls = useRef<(HTMLElement | null)[]>([]);
  const labels = CONSTELLATIONS.map((c, m) => ({
    name: `${monthName(m)} · ${lang === "en" ? c.en : c.ko}`,
    count: `${lits[m] >= c.stars.length ? "✦ " : ""}${lits[m]}/${c.stars.length}`,
  }));

  // 강조색 — 토큰 값은 light-dark(var(..)) 식이라 그대로는 못 읽는다. 그 색을 입힌 요소의 계산된 색을 읽는다
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const probe = document.createElement("span");
    probe.style.color = "var(--text-accent)";
    el.appendChild(probe);
    setAccent(cssColorToHex(getComputedStyle(probe).color));
    probe.remove();
  }, []);

  // 열려 있는 동안 뒤 페이지 스크롤을 막는다(창은 useDialogRef 가 top layer 에 띄운다 — 3.10-1)
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.root}
      data-card={openStar !== null || undefined}
      aria-label={`${year} TIL`}
      data-lenis-prevent
      // Esc — 브라우저가 닫기 전에 가로채 상태로 닫는다
      onCancel={(e) => {
        e.preventDefault();
        if (focus !== null) unfocus();
        else leave(onClose);
      }}
    >
      <div className={styles.canvas}>
        {!leaving && (
          <TilSpace3D
            lits={lits}
            accent={accent}
            labels={labelEls}
            onPick={(m) => { setFocus(m); setOpenStar(null); }}
            focus={focus}
            hoverStar={hoverStar}
            onStarHover={setHoverStar}
            onStarPick={(st) => setOpenStar(st)}
            tipRef={tipEl}
          />
        )}
      </div>
      {/* 별자리 이름표 — 3D 가 매 틀 자리를 옮긴다 */}
      <div className={styles.labels} aria-hidden data-focus={focus !== null || undefined}>
        {labels.map((l, m) => (
          <span
            key={m}
            ref={(el) => { labelEls.current[m] = el; }}
            className={`${styles.label} ${lits[m] >= CONSTELLATIONS[m].stars.length ? styles.labelDone : ""} ${focus === m ? styles.labelFocused : ""}`}
          >
            <b>{l.name}</b>
            <i>{l.count}</i>
          </span>
        ))}
      </div>
      {/* 별 말풍선 — 가리킨 별의 날짜 · 제목 */}
      <div ref={tipEl} className={styles.tip} data-show={hoverStar !== null || undefined} aria-hidden>
        {(() => {
          const d = dayOf(hoverStar);
          const list = d ? byDay.get(d) ?? [] : [];
          return d ? (
            <>
              <span className={styles.tipDate}>{d.replaceAll("-", ".")}</span>
              {list.map((e) => <b key={e.id}>{titleOf(e)}</b>)}
            </>
          ) : null;
        })()}
      </div>

      {/* 펼친 별 — 그날의 TIL 자막(패널보다 먼저 그려 패널이 그늘 위에 오게) */}
      {(() => {
        const d = dayOf(openStar);
        if (!d) return null;
        const list = byDay.get(d) ?? [];
        return (
          <div className={styles.card} key={d}>
            <Pressable noTapScale className={styles.cardClose} aria-label={closeLabel} onClick={() => setOpenStar(null)}>
              <X size={14} aria-hidden />
            </Pressable>
            <span className={styles.cardDate}>✦ {formatDay(d)}</span>
            {list.map((e) => (
              <article key={e.id} className={styles.cardEntry}>
                <h3>{titleOf(e)}</h3>
                {excerptOf(e) && <p>{excerptOf(e)}</p>}
                <TransitionLink href={`/posts/${e.slug}`} className={styles.cardLink}>
                  {texts.openPost} →
                </TransitionLink>
              </article>
            ))}
          </div>
        );
      })()}

      {/* 초점 패널 — 그달 별자리 · 진행 · 기록 목록 */}
      {focus !== null && (
        <aside className={styles.panel} key={focus}>
          <Pressable noTapScale className={styles.back} onClick={unfocus}>
            <ArrowLeft size={14} aria-hidden /> {texts.back}
          </Pressable>
          <p className={styles.panelMonth}>{year}.{String(focus + 1).padStart(2, "0")}</p>
          <h2 className={styles.panelName}>
            {lang === "en" ? CONSTELLATIONS[focus].en : CONSTELLATIONS[focus].ko}
            {lang !== "en" && <span>{CONSTELLATIONS[focus].en}</span>}
          </h2>
          <p className={`${styles.panelCount} ${lits[focus] >= CONSTELLATIONS[focus].stars.length ? styles.panelDone : ""}`}>
            {lits[focus] >= CONSTELLATIONS[focus].stars.length ? "✦ " : ""}
            {lits[focus]} / {CONSTELLATIONS[focus].stars.length}
          </p>
          {daysOf(focus).length === 0 ? (
            <p className={styles.panelEmpty}>{texts.empty}</p>
          ) : (
            <ol className={styles.panelList}>
              {daysOf(focus).slice(0, CONSTELLATIONS[focus].stars.length).map((d, i) => (
                <li key={d}>
                  <Pressable
                    noTapScale
                    className={`${styles.panelItem} ${openStar?.m === focus && openStar.i === i ? styles.panelItemOn : ""}`}
                    onClick={() => setOpenStar({ m: focus, i })}
                    onMouseEnter={() => setHoverStar({ m: focus, i })}
                    onMouseLeave={() => setHoverStar(null)}
                  >
                    <span className={styles.panelStar} aria-hidden>✦</span>
                    <span className={styles.panelDate}>{d.slice(5).replace("-", ".")}</span>
                    <span className={styles.panelTitle}>{(byDay.get(d) ?? []).map(titleOf).join(" · ")}</span>
                  </Pressable>
                </li>
              ))}
            </ol>
          )}
          <Pressable noTapScale className={styles.panelFeed} onClick={() => leave(() => onMonth(focus))}>
            {texts.openFeed}
            <span aria-hidden>→</span>
          </Pressable>
        </aside>
      )}

      <p className={styles.top}>
        {year} · ✦ {doneLabel.replace("{{n}}", String(doneCount))}
      </p>
      <Pressable noTapScale className={styles.close} aria-label={closeLabel} title={closeLabel} onClick={() => leave(onClose)}>
        <X size={20} strokeWidth={1.8} aria-hidden />
      </Pressable>
      <p className={styles.hint}>{dragHint}</p>
    </dialog>
  );
}
