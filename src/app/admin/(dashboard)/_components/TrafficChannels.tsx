"use client";

import shared from "../Dashboard.module.css";
import local from "./TrafficChannels.module.css";

/* 이 컴포넌트 전용 규칙은 TrafficChannels.module.css 에, 대시보드 여러 곳이 함께 쓰는 규칙은
   Dashboard.module.css 에 있다. 둘을 합쳐서 styles 하나로 쓴다. */
const styles = { ...shared, ...local };
import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, ListItem } from "../components";
import Pressable from "@/components/ui/Pressable";
import {
  ChevronRight,
  Code2,
  Globe,
  MessageSquare,
  Search,
  Users,
  Zap,
  type LucideIcon,
} from "@/components/icons";
import type { Channel } from "@/lib/api/dashboardAggregates";

/* ── 유입 채널 — 검색/SNS/커뮤니티/개발/직접/기타 + 채널별 호스트 드릴다운(#1161) ── */

type ChannelStat = {
  channel: Channel;
  count: number;
  pct: number;
  hosts: Array<{ host: string; count: number; pct: number }>;
};

const CHANNEL_META: Record<Channel, { ko: string; en: string; icon: LucideIcon }> = {
  search: { ko: "검색", en: "Search", icon: Search },
  social: { ko: "SNS", en: "Social", icon: Users },
  community: { ko: "커뮤니티·블로그", en: "Communities", icon: MessageSquare },
  dev: { ko: "개발 플랫폼", en: "Dev platforms", icon: Code2 },
  direct: { ko: "직접 방문", en: "Direct", icon: Zap },
  other: { ko: "기타", en: "Other", icon: Globe },
};

function TrafficChannels({
  channels,
  language,
}: {
  channels: ChannelStat[];
  language: "ko" | "en";
}) {
  const [openChannel, setOpenChannel] = useState<Channel | null>(null);

  return (
    <List>
      {channels.map((c) => {
        const meta = CHANNEL_META[c.channel];
        const Icon = meta.icon;
        const drillable = c.hosts.length > 0;
        const isOpen = openChannel === c.channel;
        const content = (
          <>
            <span className={styles.referrerSource}>
              <Icon size={11} strokeWidth={2} />
              {language === "ko" ? meta.ko : meta.en}
            </span>
            <div className={styles.bar} aria-hidden>
              <div
                className={`${styles.barFill} ${styles.barFillSoft}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
            <span className={styles.referrerMeta}>
              <span className={styles.referrerPct}>{c.pct}%</span>
              <span className={styles.referrerCount}>{c.count.toLocaleString()}</span>
              {drillable ? (
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className={`${styles.channelChevron} ${isOpen ? styles.channelChevronOpen : ""}`}
                  aria-hidden
                />
              ) : (
                /* 자리 고정 — 토글 없는 행에서도 숫자 열이 흔들리지 않게 */
                <span className={styles.channelChevronGhost} aria-hidden />
              )}
            </span>
          </>
        );
        return (
          <Fragment key={c.channel}>
            <ListItem
              /* hover·선택 배경은 행 전체(ListItem)가 갖는다 — 버튼에 주면 item 패딩이 빠져 일부만 칠해진다 */
              className={`${styles.channelItem} ${isOpen ? styles.channelItemActive : ""}`}
              data-drillable={drillable || undefined}
            >
              {drillable ? (
                <Pressable
                  className={styles.channelBtn}
                  onClick={() => setOpenChannel(isOpen ? null : c.channel)}
                  aria-expanded={isOpen}
                >
                  {content}
                </Pressable>
              ) : (
                <div className={styles.channelBtn}>{content}</div>
              )}
            </ListItem>
            <AnimatePresence initial={false}>
              {drillable && isOpen && (
                /* 높이 0↔auto 아코디언 — padding 은 안쪽 div 가 가져야 접힐 때 같이 눌리지 않는다 */
                <motion.li
                  key={`${c.channel}-hosts`}
                  className={styles.channelHosts}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className={styles.channelHostsInner}>
                    {c.hosts.map((h) => (
                      <div key={h.host} className={styles.channelHostRow}>
                        <span className={styles.channelHostName}>{h.host}</span>
                        <div className={styles.bar} aria-hidden>
                          <div
                            className={`${styles.barFill} ${styles.barFillSoft}`}
                            style={{ width: `${h.pct}%` }}
                          />
                        </div>
                        <span className={styles.referrerMeta}>
                          <span className={styles.referrerPct}>{h.pct}%</span>
                          <span className={styles.referrerCount}>{h.count.toLocaleString()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.li>
              )}
            </AnimatePresence>
          </Fragment>
        );
      })}
    </List>
  );
}

export default TrafficChannels;
