"use client";

import shared from "../Dashboard.module.css";
import local from "./CategoryDonut.module.css";

/* 이 컴포넌트 전용 규칙은 CategoryDonut.module.css 에, 대시보드 여러 곳이 함께 쓰는 규칙은
   Dashboard.module.css 에 있다. 둘을 합쳐서 styles 하나로 쓴다. */
const styles = { ...shared, ...local };
import { useState } from "react";
import { List, ListItem, Panel, PanelTitle } from "../components";
import { describeDonutArc } from "./donutArc";
import { Eye } from "@/components/icons";
import CloseButton from "@/components/ui/CloseButton";
import { type TFunction } from "@/providers/LanguageProvider";
import Link from "next/link";
export type CategoryPost = {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  published: boolean;
  updated_at: string;
};

/** 카테고리 분포 — interactive 도넛: wedge 또는 범례 항목 hover 시 중앙 라벨 + 해당 wedge 강조.
 *  범례 클릭 시 그 카테고리의 게시물 top 10 inline expand. */
function CategoryDonut({
  data,
  language,
  t,
}: {
  data: { name: string; postCount: number; views: number }[];
  language: "ko" | "en";
  t: TFunction;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<CategoryPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // 카테고리 토글 — 같은 카테고리 누르면 닫힘, 다른 카테고리 누르면 갈아끼움
  const toggleCategory = (name: string) => {
    if (expandedCat === name) {
      setExpandedCat(null);
      setExpandedPosts([]);
      return;
    }
    setExpandedCat(name);
    setLoadingPosts(true);
    fetch(`/api/admin/dashboard/category?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d: { posts?: CategoryPost[] }) => {
        setExpandedPosts(d.posts ?? []);
        setLoadingPosts(false);
      })
      .catch(() => {
        setExpandedPosts([]);
        setLoadingPosts(false);
      });
  };

  const total = data.reduce((s, d) => s + d.views, 0);
  const palette = [
    "var(--color-accent)",
    "var(--color-accent-dark)",
    "var(--color-accent-light)",
    "var(--color-accent-alpha-70)",
    "var(--color-accent-alpha-50)",
    "var(--color-accent-alpha-30)",
  ];

  const cx = 70,
    cy = 70;
  const outerR = 60;
  const innerR = 38;

  let acc = 0;
  const arcs = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.views;
    const end = (acc / total) * 360;
    return {
      d,
      color: palette[i % palette.length],
      start,
      end,
      pct: total > 0 ? (d.views / total) * 100 : 0,
    };
  });

  const hovered = hoverIdx !== null ? arcs[hoverIdx] : null;
  const centerValue = hovered
    ? hovered.d.views.toLocaleString()
    : total.toLocaleString();
  const centerLabel = hovered
    ? hovered.d.name
    : language === "ko"
      ? "조회"
      : "views";

  return (
    <Panel
      variant="grid"
      cols="auto 1fr"
      style={{ columnGap: "var(--spacing-md)", alignItems: "stretch" }}
    >
      <svg
        viewBox="0 0 140 140"
        className={styles.donutSvg}
        aria-label={t("admin.dashboard.topCategories")}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {arcs.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={outerR} fill={arcs[0].color} />
            <circle cx={cx} cy={cy} r={innerR} fill="var(--bg-primary)" />
          </>
        ) : (
          arcs.map((arc, i) => {
            const isHover = hoverIdx === i;
            const isOther = hoverIdx !== null && !isHover;
            return (
              <path
                key={arc.d.name}
                d={describeDonutArc(cx, cy, outerR, innerR, arc.start, arc.end)}
                fill={arc.color}
                className={`${styles.donutWedge} ${isHover ? styles.donutWedgeActive : ""} ${isOther ? styles.donutWedgeDim : ""}`}
                /* onMouseLeave 는 SVG 레벨에만 두고 wedge 단위는 enter 만 — 인접 wedge 경계의
                   anti-aliasing edge 에서 leave→enter 사이 잠깐 null 되는 깜빡임 방지 */
                onMouseEnter={() => setHoverIdx(i)}
              >
                <title>
                  {arc.d.name} · {arc.d.views.toLocaleString()} (
                  {arc.pct.toFixed(0)}%)
                </title>
              </path>
            );
          })
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className={styles.donutCenterValue}
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className={styles.donutCenterLabel}
        >
          {centerLabel}
        </text>
      </svg>
      <List
        style={{
          flex: 1,
          minWidth: 140,
          height: 140,
          display: "grid",
          gridAutoRows: "1fr",
        }}
      >
        {arcs.map((arc, i) => {
          const isHover = hoverIdx === i;
          const isExpanded = expandedCat === arc.d.name;
          return (
            <ListItem
              key={arc.d.name}
              className={`${styles.donutLegendItem} ${isHover ? styles.donutLegendItemActive : ""} ${isExpanded ? styles.donutLegendItemExpanded : ""}`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => toggleCategory(arc.d.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCategory(arc.d.name);
                }
              }}
              aria-expanded={isExpanded}
            >
              <span className={styles.donutLegendLeft}>
                <span
                  className={styles.donutLegendSwatch}
                  style={{ background: arc.color }}
                  aria-hidden
                />
                <span className={styles.donutLegendName}>{arc.d.name}</span>
              </span>
              <span className={styles.donutLegendMeta}>
                <span className={styles.donutLegendPct}>
                  {arc.pct.toFixed(2)}%
                </span>
              </span>
            </ListItem>
          );
        })}
      </List>
      {expandedCat && (
        <Panel
          style={{ gridColumn: "1 / -1", borderTop: "var(--border-light)" }}
        >
          <header className={styles.panelHeader}>
            <PanelTitle variant="inset">
              {language === "ko"
                ? `${expandedCat} 게시물`
                : `${expandedCat} posts`}
            </PanelTitle>
            <CloseButton
              onClick={() => {
                setExpandedCat(null);
                setExpandedPosts([]);
              }}
              ariaLabel={language === "ko" ? "닫기" : "Close"}
            />
          </header>
          {loadingPosts ? (
            <p className={styles.muted}>
              {language === "ko" ? "불러오는 중..." : "Loading..."}
            </p>
          ) : expandedPosts.length === 0 ? (
            <p className={styles.muted}>
              {language === "ko" ? "게시물이 없습니다." : "No posts."}
            </p>
          ) : (
            <List>
              {expandedPosts.map((p) => (
                <ListItem key={p.id}>
                  <Link
                    href={`/posts/${p.slug}`}
                    className={styles.itemTitle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </Link>
                  <span className={styles.itemDate}>
                    <Eye size={11} strokeWidth={2} />
                    {p.view_count.toLocaleString()}
                  </span>
                </ListItem>
              ))}
            </List>
          )}
        </Panel>
      )}
    </Panel>
  );
}

export default CategoryDonut;
