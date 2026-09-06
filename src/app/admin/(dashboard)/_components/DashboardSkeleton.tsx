"use client";

import shared from "../Dashboard.module.css";
import local from "./DashboardSkeleton.module.css";

/* 이 컴포넌트 전용 규칙은 DashboardSkeleton.module.css 에, 대시보드 여러 곳이 함께 쓰는 규칙은
   Dashboard.module.css 에 있다. 둘을 합쳐서 styles 하나로 쓴다. */
const styles = { ...shared, ...local };
import { Item, List, ListItem, Panel, PanelTitle, Section, SectionHeader } from "../components";
import { SkeletonBlock, SkeletonCircle, SkeletonLine, SkeletonPill } from "@/components/ui/Skeleton";
/* ── Skeleton state — 실제 dashboard 의 Section/Panel/List 추상화를 그대로 미러링 ── */
function DashboardSkeleton() {
  return (
    <div className={styles.container} aria-busy="true" aria-live="polite">
      {/* Header — title + refresh button */}
      <header className={styles.header}>
        <SkeletonLine width={180} height="var(--font-size-2xl)" />
        <SkeletonPill width={84} />
      </header>

      {/* Quick Actions — 4 buttons */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.quickActions}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} height={56} />
          ))}
        </Panel>
      </Section>

      {/* Stats — heroStat + 3 statCards + CategoryDonut + DailyViewsChart */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={60} />
        </SectionHeader>
        <Panel variant="grid" className={styles.statsGrid}>
          {/* heroStat — full row span at 3-col */}
          <div className={styles.heroStat}>
            <div className={styles.heroLeft}>
              <SkeletonLine width={80} height="var(--skeleton-h-line-sm)" />
              <div className={styles.heroValueRow}>
                <SkeletonLine width={140} height={48} />
                <SkeletonPill width={56} height={20} />
              </div>
              <SkeletonLine width={120} height="var(--skeleton-h-line-sm)" />
            </div>
            <SkeletonBlock width={180} height={56} />
          </div>
          {/* 3 stat cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.statCard}>
              <SkeletonLine width={60} height="var(--skeleton-h-line-sm)" />
              <SkeletonLine width={80} height={28} />
              <SkeletonLine width={100} height="var(--skeleton-h-line-sm)" />
            </div>
          ))}
        </Panel>

        {/* Category Donut + legend */}
        <Panel className={styles.donutWrap}>
          <SkeletonCircle size={140} />
          <List
            style={{
              flex: 1,
              minWidth: 140,
              height: 140,
              display: "grid",
              gridAutoRows: "1fr",
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItem key={i}>
                <SkeletonCircle size={10} />
                <SkeletonLine width={`${70 - i * 8}%`} />
              </ListItem>
            ))}
          </List>
        </Panel>

        {/* Daily Views Chart — header (title + stats + toggle) + chart area */}
        <Panel className={styles.dailyChart}>
          <header className={styles.panelHeader}>
            <PanelTitle variant="inset">
              <SkeletonLine width={120} />
            </PanelTitle>
            <SkeletonLine width={80} />
            <SkeletonPill width={56} height={20} />
            <SkeletonPill width={56} />
          </header>
          <SkeletonBlock height={220} />
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 최근 활동 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={120} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {Array.from({ length: 2 }).map((_, p) => (
            <Panel key={p} className={styles.panelCell}>
              <PanelTitle>
                <SkeletonLine width={100} />
              </PanelTitle>
              <List>
                {Array.from({ length: 5 }).map((_, i) => (
                  <ListItem key={i}>
                    <SkeletonPill width={48} height={18} />
                    <SkeletonLine width={`${60 - (i % 3) * 8}%`} />
                    <SkeletonLine
                      width={56}
                      height="var(--skeleton-h-line-sm)"
                    />
                  </ListItem>
                ))}
              </List>
            </Panel>
          ))}
        </Panel>
        {/* Recent Comments — same section */}
        <Panel className={styles.panelCell}>
          <PanelTitle>
            <SkeletonLine width={120} />
          </PanelTitle>
          <List>
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItem key={i} layout="column">
                <div className={styles.commentMeta}>
                  <SkeletonLine width={70} height="var(--skeleton-h-line-sm)" />
                  <SkeletonLine width={50} height="var(--skeleton-h-line-sm)" />
                </div>
                <SkeletonLine width={i % 2 === 0 ? "92%" : "70%"} />
                <SkeletonLine width={120} height="var(--skeleton-h-line-sm)" />
              </ListItem>
            ))}
          </List>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 인기 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {/* Popular Posts */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={120} />
            </PanelTitle>
            <List>
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItem key={i} layout="column">
                  <div className={styles.popularHeader}>
                    <SkeletonLine
                      width={28}
                      height="var(--skeleton-h-line-sm)"
                    />
                    <div className={styles.popularStats}>
                      <SkeletonLine
                        width={32}
                        height="var(--skeleton-h-line-sm)"
                      />
                      <SkeletonLine
                        width={28}
                        height="var(--skeleton-h-line-sm)"
                      />
                    </div>
                  </div>
                  <SkeletonLine width={`${85 - (i % 3) * 10}%`} />
                  <div className={styles.popularMeta}>
                    <SkeletonLine
                      width={50}
                      height="var(--skeleton-h-line-sm)"
                    />
                    <SkeletonLine
                      width={70}
                      height="var(--skeleton-h-line-sm)"
                    />
                  </div>
                </ListItem>
              ))}
            </List>
          </Panel>
          {/* Top Tags */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={80} />
            </PanelTitle>
            <Item className={styles.tagsItem}>
              {[68, 84, 56, 100, 72, 92, 60, 76, 88, 64, 96, 70].map((w, i) => (
                <SkeletonPill key={i} width={w} />
              ))}
            </Item>
          </Panel>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 트래픽 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={80} />
        </SectionHeader>
        <Panel variant="grid" className={styles.twoCol}>
          {/* Traffic Sources — bar list */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={120} />
            </PanelTitle>
            <List>
              {Array.from({ length: 6 }).map((_, i) => (
                <ListItem key={i} layout="grid" className={styles.referrerRow}>
                  <SkeletonLine width={70} />
                  <SkeletonPill height={6} />
                  <SkeletonLine width={50} />
                </ListItem>
              ))}
            </List>
          </Panel>
          {/* Devices — 3 small charts */}
          <Panel className={styles.panelCell}>
            <PanelTitle>
              <SkeletonLine width={80} />
            </PanelTitle>
            <div className={styles.skelDevicesRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} height={80} />
              ))}
            </div>
          </Panel>
        </Panel>
      </Section>

      {/* ━━━━━━━━━━ 시스템 ━━━━━━━━━━ */}
      <Section>
        <SectionHeader>
          <SkeletonLine width={100} />
        </SectionHeader>
        <Panel variant="grid" cols="repeat(2, 1fr)" insetItems>
          {Array.from({ length: 8 }).map((_, i) => (
            <Item key={i} className={styles.serviceItem}>
              <SkeletonCircle size={8} />
              <SkeletonLine width="60%" />
              <SkeletonLine width={40} height="var(--skeleton-h-line-sm)" />
            </Item>
          ))}
        </Panel>
      </Section>
    </div>
  );
}

export default DashboardSkeleton;
