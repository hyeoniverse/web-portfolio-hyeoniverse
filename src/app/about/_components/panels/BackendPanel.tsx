"use client";

import { useCallback, useMemo, useState, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { backendItems } from "@/data/about/backend";
import { useAboutConfig } from "../AboutConfig";
import { renderDetail } from "./BackendDetail";
import { renderHighlight } from "../renderHighlight";
import type { BackendItem } from "@/data/about/types";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import frame from "../AboutPanel.module.css";
import nav from "../AboutNav.module.css";
import shell from "../AboutSection.module.css";
import local from "./BackendPanel.module.css";
import Pressable from "@/components/ui/Pressable";
const shared = { ...frame, ...nav, ...shell };
const styles = { ...shared, ...local };

/** 상세에서 처음 보여 줄 엔드포인트 수 — 나머지는 펼쳐 본다 */
const KEY_ENDPOINTS = 4;
const METHOD_ORDER = ["GET", "POST", "PATCH", "PUT", "DELETE"];
const orderMethods = (m: Map<string, number>) =>
  [...m.entries()].sort((a, b) => METHOD_ORDER.indexOf(a[0]) - METHOD_ORDER.indexOf(b[0]));
const isAdminEndpoint = (ep: NonNullable<BackendItem["endpoints"]>[number]) =>
  ep.path.startsWith("/api/admin/") || /\badmin\b/i.test(ep.description.en ?? "");

interface BackendPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function BackendPanel({
  language,
  scrollBy,
}: BackendPanelProps) {
  /* admin(about.backend) override — 비어있으면 정적 데이터 */
  const about = useAboutConfig();
  const cfgItems = about.backend;
  const items = cfgItems && cfgItems.length > 0 ? cfgItems : backendItems;
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    items.length,
    undefined,
    scrollBy,
  );
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  /* 지도 수치 — 데이터에서 센다. 관리자 전용 = 경로가 /api/admin/ 이거나 설명에 admin 이 적힌 엔드포인트 */
  const stats = useMemo(() => {
    const perItem = items.map((item) => {
      const eps = item.endpoints ?? [];
      const m = new Map<string, number>();
      for (const ep of eps) m.set(ep.method, (m.get(ep.method) ?? 0) + 1);
      return { count: eps.length, admin: eps.filter(isAdminEndpoint).length, methods: orderMethods(m) };
    });
    const methods = new Map<string, number>();
    for (const p of perItem) for (const [k, n] of p.methods) methods.set(k, (methods.get(k) ?? 0) + n);
    return {
      total: perItem.reduce((n, p) => n + p.count, 0),
      admin: perItem.reduce((n, p) => n + p.admin, 0),
      methods: orderMethods(methods),
      perItem,
      maxCount: Math.max(1, ...perItem.map((p) => p.count)),
    };
  }, [items]);

  // 지금 묶음의 엔드포인트 — 처음엔 몇 개만, 펼치면 전부. 펼친 묶음을 기억해 다른 묶음으로 가면 저절로 접힌다
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const expanded = expandedIndex === activeIndex;
  /* 펼친 목록 위의 휠은 목록만 굴린다 — 가로 스크롤(섹션의 휠 리스너)보다 먼저 받아 멈춘다.
     끝에 닿은 방향이면 그대로 흘려보내 패널을 계속 넘길 수 있게 둔다 */
  const endpointListRef = useCallback((el: HTMLUListElement | null) => {
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const down = e.deltaY > 0;
      const atEnd = down
        ? el.scrollTop + el.clientHeight >= el.scrollHeight - 1
        : el.scrollTop <= 0;
      if (!atEnd) e.stopPropagation();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const active = items[activeIndex];
  const activeStats = stats.perItem[activeIndex];

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.dbContent}`}>
        <PinnedTitleRow
          panelKey="backend"
         
          compact
          animate
          dotNav={{
            count: items.length,
            activeIndex,
            onDotClick: scrollToItem,
            labels: items.map((t) => t.name),
            className: styles.dotNavMobileOnly,
          }}
        />

        {/* 데스크톱: API 지도 — 왼쪽은 전체 수치와 묶음 타일, 오른쪽은 지금 묶음의 상세 */}
        <div className={styles.apiStage}>
          <div className={styles.apiOverview}>
            <div className={styles.apiTotals}>
              <p className={styles.apiTotal}>
                <b>{stats.total}</b>
                <span>{L("엔드포인트", "endpoints")}</span>
              </p>
              <dl className={styles.apiTotalsMeta}>
                <div><dt>{L("묶음", "Groups")}</dt><dd>{items.length}</dd></div>
                <div><dt>{L("관리자 전용", "Admin only")}</dt><dd>{stats.admin}</dd></div>
              </dl>
              <figure className={styles.apiMethods}>
                <div className={styles.apiMethodBar}>
                  {stats.methods.map(([m, n]) => (
                    <span key={m} className={styles.apiMethodSeg} data-method={m} style={{ flexGrow: n }} />
                  ))}
                </div>
                <ul className={styles.apiMethodLegend}>
                  {stats.methods.map(([m, n]) => (
                    <li key={m} data-method={m}><span>{m}</span><b>{n}</b></li>
                  ))}
                </ul>
              </figure>
            </div>

            <ol className={styles.apiMap}>
              {items.map((item, i) => {
                const st = stats.perItem[i];
                return (
                  <li key={item.name} className={`${styles.apiTile} ${i === activeIndex ? styles.apiTileActive : ""}`}>
                    <Pressable
                      data-clickable="true"
                      className={styles.apiTileBtn}
                      onClick={() => scrollToItem(i)}
                      aria-current={i === activeIndex ? "step" : undefined}
                    >
                      <span className={styles.apiTileNum}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={styles.apiTileName}>{item.name.replace(/ API$/, "")}</span>
                      <span className={styles.apiTileBar} aria-hidden>
                        {st.methods.map(([m, n]) => (
                          <span key={m} className={styles.apiMethodSeg} data-method={m} style={{ flexGrow: n }} />
                        ))}
                        <span style={{ flexGrow: stats.maxCount - st.count }} />
                      </span>
                      <span className={styles.apiTileCount}>{st.count}</span>
                    </Pressable>
                  </li>
                );
              })}
            </ol>
          </div>

          {active && (
            <article className={`${styles.apiDetail} ${expanded ? styles.apiDetailExpanded : ""}`} key={activeIndex}>
              <header className={styles.apiDetailHead}>
                <span className={styles.apiDetailNum}>{String(activeIndex + 1).padStart(2, "0")}</span>
                <div>
                  <h4 className={styles.apiDetailName}>{active.name}</h4>
                  <p className={styles.apiDetailMeta}>
                    {L("엔드포인트", "Endpoints")} {activeStats.count}
                    {activeStats.admin > 0 && ` · ${L("관리자 전용", "admin only")} ${activeStats.admin}`}
                  </p>
                </div>
              </header>
              <p className={styles.apiDetailDesc}>{active.description[language]}</p>
              {active.designNote && (
                <aside className={styles.apiDetailNote}>
                  <span>{L("설계 포인트", "Design point")}</span>
                  <p>{renderHighlight(active.designNote[language])}</p>
                </aside>
              )}
              {active.endpoints && active.endpoints.length > 0 && (
                <div className={`${styles.apiEndpoints} ${expanded ? styles.apiEndpointsOpen : ""}`}>
                  <ul ref={expanded ? endpointListRef : undefined} data-lenis-prevent-wheel={expanded ? "" : undefined}>
                    {(expanded ? active.endpoints : active.endpoints.slice(0, KEY_ENDPOINTS)).map((ep, ei) => (
                      <li key={ei}>
                        <span className={`${styles.dbMethodBadge} ${styles[`dbMethod${ep.method}` as keyof typeof styles] || ""}`}>{ep.method}</span>
                        <code>{ep.path}</code>
                        <span>{ep.description[language]}</span>
                      </li>
                    ))}
                  </ul>
                  {active.endpoints.length > 3 && (
                    <Pressable className={styles.apiMore} onClick={() => setExpandedIndex(expanded ? null : activeIndex)}>
                      {expanded
                        ? L("접기", "Show less")
                        : L(`엔드포인트 ${active.endpoints.length}개 모두 보기`, `Show all ${active.endpoints.length} endpoints`)}
                    </Pressable>
                  )}
                </div>
              )}
            </article>
          )}
        </div>

        {/* 모바일: 모든 항목 표시 */}
        <div className={styles.dbMobileList}>
          {items.map((item, index) => (
            <div
              key={index}
              className={`${styles.dbMobileItem} ${styles.animate}`}
            >
              {renderDetail(item, index, language)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(BackendPanel);
