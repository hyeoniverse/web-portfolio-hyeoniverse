"use client";

import { useEffect, useCallback, useRef, useMemo, useId } from "react";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./TOC.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

interface TocItem {
  id: string;
  text: string;
  level?: number;
}

interface TOCProps {
  items: TocItem[];
  title?: string;
  position?: "left" | "right";
  scrollOffset?: number;
  className?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   별자리 목차
   · 장(가장 높은 단계의 제목)마다 마디, 지금 장만 소제목을 펼친다.
   · 레일은 곧은 직선이고, 별(사이트 로고의 ✦)이 그 위를 오르내린다. 제목·마디는 제자리에 있다.
     (예전엔 별 자리만 종 모양으로 안쪽으로 당겨지고 제목도 그 곡선을 따라 움직였는데, 스크롤할 때마다
     굴곡이 오르내려 레일이 꿀렁여 보였다)
   · 지나온 길은 반투명 강조색 실선, 남은 길은 점선. 별 뒤로 짧은 빛 꼬리.
   · 머리말에 전체 진행 링과 읽기 시간, 뒤에 지금 장 번호를 크게 깐다.
   스크롤마다 React 상태를 바꾸지 않고 요소에 직접 쓴다 — 목록 전체가 다시 그려지지 않게.
   ───────────────────────────────────────────────────────────────────────── */
const RAIL_X = 8;
const TAIL = 48;
const CHARS_PER_MIN = 500;
/** 배경 장 번호 한 칸 높이 — TOC.module.css .mark · .markReel div 와 같은 값 */
const MARK_H = 128;
const STAR_PATH =
  "M256 106 C262 200 312 250 406 256 C312 262 262 312 256 406 C250 312 200 262 106 256 C200 250 250 200 256 106 Z";

interface Chapter {
  i: number;
  no: string;
  subs: { i: number; depth: number }[];
}

/** 장 묶음 — 문서에 실제로 있는 가장 높은 단계가 장, 그 아래 단계는 모두 그 장의 소제목(깊이는 들여쓰기로) */
function chaptersOf(items: TocItem[]) {
  const levels = items.map((it) => it.level ?? 1);
  const top = Math.min(...levels);
  const chapters: Chapter[] = [];
  const chapterOf: number[] = [];
  items.forEach((_, i) => {
    const depth = levels[i] - top;
    if (depth === 0 || chapters.length === 0) {
      chapters.push({ i, no: String(chapters.length + 1).padStart(2, "0"), subs: [] });
    } else {
      chapters[chapters.length - 1].subs.push({ i, depth: Math.min(depth, 2) });
    }
    chapterOf.push(chapters.length - 1);
  });
  return { chapters, chapterOf };
}

function clock(min: number) {
  const s = Math.max(0, Math.round(min * 60));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 목차에는 장과 그 바로 아래 단계까지만 — 더 깊은 제목(문제·원인·해결 과정 같은 h4)까지 넣으면
 *  장마다 줄이 불어나 목차가 다시 길어진다. 빠진 제목 구간은 위 단계 구간의 진행으로 읽힌다. */
function shallow(items: TocItem[]) {
  if (items.length === 0) return items;
  const top = Math.min(...items.map((it) => it.level ?? 1));
  return items.filter((it) => (it.level ?? 1) - top <= 1);
}


export default function TOC({
  items: allItems,
  title = "Contents",
  position = "right",
  scrollOffset = -100,
  className,
}: TOCProps) {
  const { t } = useLanguage();
  const { lenis } = useLenis();
  const items = useMemo(() => shallow(allItems), [allItems]);
  const { chapters, chapterOf } = useMemo(() => chaptersOf(items), [items]);
  const navRef = useRef<HTMLElement>(null);
  const gradId = `toc-tail-${useId().replace(/:/g, "")}`;
  const RING = 2 * Math.PI * 15;

  /* ── 스크롤 → 별·레일·강조 ── */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || items.length === 0) return;
    const q = <T extends Element>(sel: string) => nav.querySelector<T>(sel);
    const scrub = q<HTMLElement>("[data-toc-scrub]");
    const star = q<HTMLElement>("[data-toc-star]");
    const starSvg = q<SVGSVGElement>("[data-toc-star] svg");
    const rail = q<SVGSVGElement>("[data-toc-rail]");
    const pDone = q<SVGPathElement>("[data-toc-done]");
    const pAhead = q<SVGPathElement>("[data-toc-ahead]");
    const pGlow = q<SVGPathElement>("[data-toc-glow]");
    const grad = q<SVGLinearGradientElement>("[data-toc-grad]");
    const ringFg = q<SVGCircleElement>("[data-toc-ring]");
    const pct = q<HTMLElement>("[data-toc-pct]");
    const time = q<HTMLElement>("[data-toc-time]");
    const reel = q<HTMLElement>("[data-toc-reel]");
    if (!scrub || !star || !rail || !pDone || !pAhead || !pGlow || !grad) return;

    const rows = chapters.map((c, k) => ({
      li: q<HTMLElement>(`[data-toc-ch="${k}"]`)!,
      a: q<HTMLElement>(`[data-toc-ch="${k}"] > a`)!,
      node: q<HTMLElement>(`[data-toc-node="${c.i}"]`)!,
      subs: c.subs.map((s) => ({
        i: s.i,
        el: q<HTMLElement>(`[data-toc-sub="${s.i}"]`)!,
        node: q<HTMLElement>(`[data-toc-node="${s.i}"]`)!,
      })),
    }));
    /* 제목·본문은 매번 id 로 다시 찾는다 — 본문이 다시 그려지면 처음 잡아 둔 요소는 문서에서 떨어져
       위치가 0 으로 잡히고, 그러면 모든 제목을 이미 지나간 것으로 판단한다 */
    const findHeads = () => items.map((it) => document.getElementById(it.id));
    const findProse = (hs: (HTMLElement | null)[]) => hs.find(Boolean)?.closest(".prose-content") as HTMLElement | null;
    let proseEl: HTMLElement | null = null;
    let totalMin = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mid = (n: HTMLElement) => n.offsetTop + n.offsetHeight / 2;

    /** 읽는 위치 — 화면 위 30% 선이 어느 제목 사이에 있는가 */
    const measure = () => {
      const heads = findHeads();
      const prose = findProse(heads);
      if (prose !== proseEl) {
        proseEl = prose;
        totalMin = (prose?.textContent ?? "").replace(/\s/g, "").length / CHARS_PER_MIN;
      }
      const line = window.innerHeight * 0.3;
      const tops = heads.map((h) => (h ? h.getBoundingClientRect().top - line : Infinity));
      const end = (prose?.getBoundingClientRect().bottom ?? document.documentElement.scrollHeight) - line;
      let i = 0;
      for (let k = 0; k < tops.length; k++) if (tops[k] <= 0) i = k;
      const a = tops[i];
      const b = i + 1 < tops.length ? tops[i + 1] : end;
      const f = a > 0 ? 0 : Math.min(1, -a / Math.max(1, b - a));
      const p = tops[0] > 0 ? 0 : Math.min(1, -tops[0] / Math.max(1, end - tops[0]));
      return { i, f, p, tops, end };
    };

    let lastCh = -1;
    /* 부드럽게 따라가는 건 픽셀 위치가 아니라 읽는 자리(제목 번호 + 그 구간의 진행) — 장이 바뀌면 소제목이
       접히고 펼쳐지며 목록 줄이 0.45초 동안 움직이는데, 예전처럼 별의 픽셀 위치를 쫓으면 움직이는 목표를
       늦게 따라가며 앞뒤로 출렁였고 레일도 같이 꿀렁였다. 읽는 자리를 매 프레임 지금 줄 위치에 대입하면
       별은 줄에 붙어 함께 움직인다 */
    let idx = -1;
    let lastT = 0;
    let raf = 0;
    let settleUntil = 0;

    const scrollIntoToc = (li: HTMLElement) => {
      let box: HTMLElement | null = nav.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      if (!box) return;
      const l = li.getBoundingClientRect();
      const bx = box.getBoundingClientRect();
      if (l.top < bx.top + 40 || l.bottom > bx.bottom - 60) {
        box.scrollTo({ top: box.scrollTop + (l.top - bx.top) - bx.height / 3, behavior: reduce ? "auto" : "smooth" });
      }
    };

    const paint = () => {
      const { i: si, f, p } = measure();
      const ci = chapterOf[si] ?? 0;
      if (ci !== lastCh) {
        lastCh = ci;
        settleUntil = performance.now() + 650;
        scrollIntoToc(rows[ci].li);
      }
      rows.forEach((r, k) => {
        r.li.classList.toggle(styles.past, k < ci);
        r.li.classList.toggle(styles.on, k === ci);
        r.a.toggleAttribute("aria-current", k === ci);
        r.subs.forEach((s) => {
          s.el.classList.toggle(styles.past, s.i < si);
          s.el.classList.toggle(styles.on, s.i === si);
        });
      });

      /* 마디 y — 소제목의 실제 자리를 그 장의 보이는 높이 안으로 가둔다. 접히는 중이면 줄과 함께 올라가고,
         다 접힌 장의 소제목은 장 제목 바로 아래에 모인다(예전엔 접힌 장이면 곧장 장 제목 자리로 뛰었다) */
      const subY = (r: (typeof rows)[number], el: HTMLElement) =>
        Math.max(mid(r.a), Math.min(mid(el), r.li.offsetTop + r.li.offsetHeight - el.offsetHeight / 2));
      const wp = (i: number) => {
        const r = rows[chapterOf[i]];
        const s = r.subs.find((x) => x.i === i);
        return s ? subY(r, s.el) : mid(r.a);
      };
      /* 읽는 자리를 시간 기준으로 따라간다(화면 주사율과 상관없이 같은 빠르기) */
      const now = performance.now();
      const dt = lastT ? Math.min(64, now - lastT) : 16;
      lastT = now;
      const want = si + f;
      idx = idx < 0 || reduce ? want : idx + (want - idx) * (1 - Math.exp(-dt / 90));
      const i0 = Math.min(items.length - 1, Math.floor(idx));
      const y0 = wp(i0);
      const y1 = i0 + 1 < items.length ? wp(i0 + 1) : y0 + 20;
      const yc = y0 + (y1 - y0) * (idx - i0);

      rows.forEach((r, k) => {
        const ty = mid(r.a);
        r.node.style.transform = `translateY(${ty}px)`;
        r.node.classList.toggle(styles.past, k < ci);
        r.node.classList.toggle(styles.on, k === ci);
        r.subs.forEach((s) => {
          const sy = subY(r, s.el);
          s.node.style.transform = `translateY(${sy}px)`;
          s.node.classList.toggle(styles.gone, k !== ci);
          s.node.classList.toggle(styles.past, s.i < si);
          s.node.classList.toggle(styles.on, s.i === si);
        });
      });

      const top = mid(rows[0].a);
      const bottom = mid(rows[rows.length - 1].a);
      const ys = Math.min(Math.max(yc, top), bottom);
      const seg = (from: number, to: number) => {
        if (to <= from) return "";
        return `M${RAIL_X} ${from.toFixed(1)}L${RAIL_X} ${to.toFixed(1)}`;
      };
      rail.setAttribute("height", String(bottom + 16));
      pDone.setAttribute("d", seg(top, ys));
      pAhead.setAttribute("d", seg(ys, bottom));
      pGlow.setAttribute("d", seg(Math.max(top, ys - TAIL), ys));
      grad.setAttribute("y1", String(ys - TAIL));
      grad.setAttribute("y2", String(ys));
      star.style.transform = `translateY(${yc}px)`;
      if (starSvg) starSvg.style.transform = `rotate(${p * 540}deg)`;

      if (ringFg) ringFg.style.strokeDashoffset = String(RING * (1 - p));
      if (pct) pct.textContent = String(Math.round(p * 100));
      if (time && totalMin > 0) time.textContent = `${clock(p * totalMin)} / ${clock(totalMin)}`;
      if (reel) reel.style.transform = `translateY(${-ci * MARK_H}px)`;
      if (Math.abs(want - idx) <= 0.002) lastT = 0;
      return Math.abs(want - idx) > 0.002 || performance.now() < settleUntil;
    };

    const loop = () => { raf = paint() ? requestAnimationFrame(loop) : 0; };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    /* 레일에 올리면 그 높이의 장이 진해지고 그 장이 시작하는 시각이 붙는다. 누르면 그 장으로 */
    const track = q<HTMLElement>("[data-toc-track]");
    let peekK = -1;
    const rowAt = (clientY: number) => {
      const y = clientY - scrub.getBoundingClientRect().top;
      for (let k = 0; k < rows.length; k++) if (y < rows[k].li.offsetTop + rows[k].li.offsetHeight + 2) return k;
      return rows.length - 1;
    };
    const onMove = (e: PointerEvent) => {
      const k = rowAt(e.clientY);
      if (k === peekK) return;
      if (peekK >= 0) rows[peekK].li.classList.remove(styles.peek);
      rows[k].li.classList.add(styles.peek);
      peekK = k;
      const { tops, end } = measure();
      const tm = rows[k].li.querySelector<HTMLElement>("[data-toc-tm]");
      const at = (tops[chapters[k].i] - tops[0]) / Math.max(1, end - tops[0]);
      if (tm && totalMin > 0) tm.textContent = clock(Math.max(0, at) * totalMin);
    };
    const onLeave = () => { if (peekK >= 0) rows[peekK].li.classList.remove(styles.peek); peekK = -1; };
    const onTrackClick = (e: MouseEvent) => rows[rowAt(e.clientY)].a.click();
    track?.addEventListener("pointermove", onMove);
    track?.addEventListener("pointerleave", onLeave);
    track?.addEventListener("click", onTrackClick);

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    const ro = new ResizeObserver(kick);
    ro.observe(scrub);
    kick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      ro.disconnect();
      track?.removeEventListener("pointermove", onMove);
      track?.removeEventListener("pointerleave", onLeave);
      track?.removeEventListener("click", onTrackClick);
    };
  }, [items, chapters, chapterOf, RING]);

  /* ── 클릭 시 스크롤 ── */
  const handleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { offset: scrollOffset, duration: 0.8 });
      else el.scrollIntoView({ behavior: "smooth" });
    },
    [lenis, scrollOffset],
  );

  if (items.length === 0) return null;

  return (
    <nav ref={navRef} aria-label={t("common.toc")} className={`${styles.toc} ${styles[position]} ${className ?? ""}`}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          {title}<i>.</i>
          <span className={styles.headTime} data-toc-time />
        </div>
        <div className={styles.ring} aria-hidden>
          <svg viewBox="0 0 36 36">
            <circle className={styles.ringBg} cx="18" cy="18" r="15" />
            <circle className={styles.ringFg} data-toc-ring cx="18" cy="18" r="15" style={{ strokeDasharray: RING, strokeDashoffset: RING }} />
          </svg>
          <b data-toc-pct>0</b>
        </div>
      </div>

      <div className={styles.mark} aria-hidden>
        <div className={styles.markReel} data-toc-reel>
          {chapters.map((c) => <div key={c.i}>{c.no}</div>)}
        </div>
      </div>

      <div className={styles.scrub} data-toc-scrub>
        <div className={styles.track} data-toc-track aria-hidden>
          <svg className={styles.rail} data-toc-rail width="40" height="10">
            <defs>
              <linearGradient data-toc-grad id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={styles.tailFrom} />
                <stop offset="1" className={styles.tailTo} />
              </linearGradient>
            </defs>
            <path className={styles.ahead} data-toc-ahead />
            <path className={styles.done} data-toc-done />
            <path className={styles.glow} data-toc-glow stroke={`url(#${gradId})`} />
          </svg>
          {items.map((it, i) => (
            <span key={`n-${it.id}-${i}`} className={`${styles.node} ${chapters[chapterOf[i]].i === i ? "" : styles.mini}`} data-toc-node={i} />
          ))}
          <div className={styles.star} data-toc-star>
            <svg viewBox="106 106 300 300"><path d={STAR_PATH} /></svg>
          </div>
        </div>

        <ul className={styles.list}>
          {chapters.map((c, k) => (
            <li key={`${items[c.i].id}-${c.i}`} className={styles.ch} data-toc-ch={k}>
              <a href={`#${items[c.i].id}`} className={styles.chT} title={items[c.i].text} onClick={(e) => handleClick(e, items[c.i].id)}>
                <span className={styles.n}>{c.no}</span>
                <span className={styles.tx}>{items[c.i].text}</span>
                <span className={styles.tm} data-toc-tm />
              </a>
              {c.subs.length > 0 && (
                <div className={styles.subs}>
                  <div>
                    {c.subs.map((s) => (
                      <a
                        key={`${items[s.i].id}-${s.i}`}
                        href={`#${items[s.i].id}`}
                        className={`${styles.sub} ${s.depth > 1 ? styles.subDeep : ""}`}
                        data-toc-sub={s.i}
                        title={items[s.i].text}
                        onClick={(e) => handleClick(e, items[s.i].id)}
                      >
                        {items[s.i].text}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
