"use client";

import shared from "../Dashboard.module.css";
import local from "./DevicesBreakdown.module.css";

/* 이 컴포넌트 전용 규칙은 DevicesBreakdown.module.css 에, 대시보드 여러 곳이 함께 쓰는 규칙은
   Dashboard.module.css 에 있다. 둘을 합쳐서 styles 하나로 쓴다. */
const styles = { ...shared, ...local };
import { useEffect, useState } from "react";
import { List, ListItem } from "../components";
import { describeDonutArc } from "./donutArc";
import { ChevronRight, Monitor, Smartphone, Tablet } from "@/components/icons";
import CloseButton from "@/components/ui/CloseButton";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
/* ── Devices Breakdown — Type / OS / Browser 탭, 각 탭마다 도넛 + 범례 ── */
type DeviceTab = "type" | "os" | "browser";

import type { DeviceKind } from "@/lib/api/dashboardAggregates";

function DevicesBreakdown({
  deviceTypes,
  operatingSystems,
  browsers,
  deviceModels,
  language,
  drillKind,
  onDrillChange,
}: {
  deviceTypes: { kind: DeviceKind; count: number; pct: number }[];
  operatingSystems?: { name: string; count: number; pct: number }[];
  browsers?: { name: string; count: number; pct: number }[];
  deviceModels?: {
    desktop: { model: string; count: number; pct: number }[];
    mobile: { model: string; count: number; pct: number }[];
    tablet: { model: string; count: number; pct: number }[];
  };
  language: "ko" | "en";
  drillKind: DeviceKind | null;
  onDrillChange: (k: DeviceKind | null) => void;
}) {
  const tabs: { id: DeviceTab; label: string; available: boolean }[] = [
    {
      id: "type",
      label: language === "ko" ? "기기" : "Type",
      available: deviceTypes.length > 0,
    },
    {
      id: "os",
      label: language === "ko" ? "OS" : "OS",
      available: !!operatingSystems?.length,
    },
    {
      id: "browser",
      label: language === "ko" ? "브라우저" : "Browser",
      available: !!browsers?.length,
    },
  ];
  const [activeTab, setActiveTab] = useState<DeviceTab>("type");

  // 탭이 바뀌면 drill-down 자동 닫기 (Type 탭이 아닌 곳에서는 모델 분포 의미 없음)
  useEffect(() => {
    if (activeTab !== "type") onDrillChange(null);
  }, [activeTab, onDrillChange]);

  // 탭별 데이터 준비
  const palette = [
    "var(--color-accent)",
    "var(--color-accent-dark)",
    "var(--color-accent-light)",
    "var(--color-accent-alpha-70)",
    "var(--color-accent-alpha-50)",
    "var(--color-accent-alpha-30)",
    "var(--color-accent-alpha-15)",
  ];

  let items: {
    name: string;
    count: number;
    pct: number;
    icon?: typeof Monitor;
    kind?: DeviceKind;
  }[] = [];
  if (activeTab === "type") {
    const labels = {
      desktop: language === "ko" ? "데스크탑" : "Desktop",
      mobile: language === "ko" ? "모바일" : "Mobile",
      tablet: language === "ko" ? "태블릿" : "Tablet",
    };
    const icons = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
    items = deviceTypes.map((d) => ({
      name: labels[d.kind],
      count: d.count,
      pct: d.pct,
      icon: icons[d.kind],
      kind: d.kind,
    }));
  } else if (activeTab === "os" && operatingSystems) {
    items = operatingSystems.map((o) => ({
      name: o.name,
      count: o.count,
      pct: o.pct,
    }));
  } else if (activeTab === "browser" && browsers) {
    items = browsers.map((b) => ({ name: b.name, count: b.count, pct: b.pct }));
  }

  const total = items.reduce((s, d) => s + d.count, 0);
  let acc = 0;
  const arcs = items.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.count;
    const end = (acc / total) * 360;
    return { ...d, color: palette[i % palette.length], start, end };
  });

  return (
    <>
      {/* 탭 — capsule 형태, hover indicator. 각 탭에 분류 기준 툴팁 */}
      <div className={styles.deviceTabs} role="tablist">
        {tabs
          .filter((t) => t.available)
          .map((tab) => {
            const tipMap: Record<DeviceTab, string> =
              language === "ko"
                ? {
                    type: "기기 종류 (데스크탑 / 모바일 / 태블릿) — 클릭 시 모델 분포",
                    os: "운영체제 (macOS / Windows / iOS / Android ...)",
                    browser: "브라우저 (Chrome / Safari / Firefox ...)",
                  }
                : {
                    type: "Device kind — click to see specific models",
                    os: "Operating system breakdown",
                    browser: "Browser breakdown",
                  };
            return (
              <Tooltip
                key={tab.id}
                content={tipMap[tab.id]}
                placement="top"
                delay={300}
              >
                <Pressable
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`${styles.deviceTab} ${activeTab === tab.id ? styles.deviceTabActive : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Pressable>
              </Tooltip>
            );
          })}
      </div>

      <div
        className={styles.devicesWrap}
        key={activeTab /* 탭 변경 시 fade-in 재실행 */}
      >
        <svg viewBox="0 0 140 140" className={styles.donutSvg}>
          {arcs.length === 1 ? (
            <>
              <circle cx={70} cy={70} r={60} fill={arcs[0].color} />
              <circle cx={70} cy={70} r={38} fill="var(--bg-primary)" />
            </>
          ) : (
            arcs.map((arc, i) => (
              <path
                key={`${arc.name}-${i}`}
                d={describeDonutArc(70, 70, 60, 38, arc.start, arc.end)}
                fill={arc.color}
              >
                <title>
                  {arc.name} · {arc.count.toLocaleString()} ({arc.pct}%)
                </title>
              </path>
            ))
          )}
          <text
            x={70}
            y={66}
            textAnchor="middle"
            className={styles.donutCenterValue}
          >
            {total.toLocaleString()}
          </text>
          <text
            x={70}
            y={82}
            textAnchor="middle"
            className={styles.donutCenterLabel}
          >
            {language === "ko" ? "방문" : "visits"}
          </text>
        </svg>
        <List className={styles.deviceLegend}>
          {arcs.map((arc, i) => {
            const Icon = arc.icon;
            const drillable =
              activeTab === "type" && !!arc.kind && !!deviceModels?.[arc.kind];
            const isOpen = drillable && drillKind === arc.kind;
            const content = (
              <>
                <span
                  className={styles.deviceLegendSwatch}
                  style={{ background: arc.color }}
                  aria-hidden
                />
                {Icon && (
                  <Icon
                    size={13}
                    strokeWidth={2}
                    className={styles.deviceLegendIcon}
                  />
                )}
                <span className={styles.deviceLegendName}>{arc.name}</span>
                <span className={styles.deviceLegendPct}>{arc.pct}%</span>
                {drillable && (
                  <ChevronRight
                    size={13}
                    strokeWidth={2}
                    className={`${styles.deviceLegendChevron} ${isOpen ? styles.deviceLegendChevronOpen : ""}`}
                    aria-hidden
                  />
                )}
              </>
            );
            return (
              <ListItem
                key={`${arc.name}-${i}`}
                /* hover·선택 배경은 행 전체(ListItem)가 갖는다 — 버튼에 주면 item 패딩이 빠져 일부만 칠해진다 */
                className={`${styles.deviceLegendItem} ${isOpen ? styles.deviceLegendItemActive : ""}`}
                data-drillable={drillable || undefined}
              >
                {drillable ? (
                  <Pressable
                    className={styles.deviceLegendBtn}
                    onClick={() =>
                      onDrillChange(isOpen ? null : (arc.kind as DeviceKind))
                    }
                    aria-expanded={isOpen}
                  >
                    {content}
                  </Pressable>
                ) : (
                  <div className={styles.deviceLegendBtn}>{content}</div>
                )}
              </ListItem>
            );
          })}
        </List>
      </div>

      {/* Drill-down — Type 탭에서 데스크탑/모바일/태블릿 클릭 시 모델별 분포 */}
      {activeTab === "type" && drillKind && deviceModels?.[drillKind] && (
        <DeviceModelsPanel
          kind={drillKind}
          models={deviceModels[drillKind]}
          language={language}
          onClose={() => onDrillChange(null)}
        />
      )}
    </>
  );
}

/* ── Drill-down panel — 선택한 디바이스 종류의 모델별 분포 (가로 막대 리스트) ── */
function DeviceModelsPanel({
  kind,
  models,
  language,
  onClose,
}: {
  kind: DeviceKind;
  models: { model: string; count: number; pct: number }[];
  language: "ko" | "en";
  onClose: () => void;
}) {
  const kindLabels = {
    desktop: language === "ko" ? "데스크탑" : "Desktop",
    mobile: language === "ko" ? "모바일" : "Mobile",
    tablet: language === "ko" ? "태블릿" : "Tablet",
  };
  const max = Math.max(...models.map((m) => m.count), 1);

  return (
    <div
      className={styles.deviceDrill}
      key={kind /* kind 바뀌면 fade-in 재실행 */}
    >
      <div className={styles.deviceDrillHeader}>
        <span className={styles.deviceDrillTitle}>
          {kindLabels[kind]} · {language === "ko" ? "기기 모델" : "Top devices"}
        </span>
        <CloseButton
          onClick={onClose}
          ariaLabel={language === "ko" ? "닫기" : "Close"}
        />
      </div>
      {models.length === 0 ? (
        <p className={styles.deviceDrillEmpty}>
          {language === "ko" ? "데이터가 없습니다." : "No data yet."}
        </p>
      ) : (
        <List className={styles.deviceDrillList}>
          {models.map((m, i) => (
            <ListItem
              key={`${m.model}-${i}`}
              layout="grid"
              className={styles.deviceDrillRow}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={styles.deviceDrillName} title={m.model}>
                {m.model}
              </span>
              <span className={`${styles.bar} ${styles.barTertiaryBg}`}>
                <span
                  className={`${styles.barFill} ${styles.barFillGradient} ${styles.barFillEnter}`}
                  style={{ width: `${(m.count / max) * 100}%` }}
                />
              </span>
              <span className={styles.deviceDrillCount}>
                {m.count.toLocaleString()}
              </span>
              <span className={styles.deviceDrillPct}>{m.pct}%</span>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}

export default DevicesBreakdown;
