"use client";

import { memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { userFlows } from "@/data/about/architecture";
import T from "@/components/ui/T";
import { FLOW_ICONS } from "../flowIcons";
import shared from "../../AboutPanel.module.css";
import local from "../UserFlowPanel.module.css";
const styles = { ...shared, ...local };

type Flow = (typeof userFlows)[number];

/* 사용자 플로우 (모바일) — SVG 다이어그램 대신 단계를 목록으로 편다.
   좁은 화면에서 노드 좌표 기반 도형은 읽히지 않으므로 흐름만 순서대로 보여 준다. */
function UserFlowMobileList({ flows, language, activeIdx }: { flows: Flow[]; language: Language; activeIdx: number }) {
  return (
        <div className={styles.ufMobileList}>
          {flows.map((flow, fi) => {
            const isActive = fi === activeIdx;
            return (
              <div
                key={fi}
                className={`${styles.ufMobileFlowGroup} ${isActive ? styles.ufMobileFlowActive : ""}`}
              >
                <div className={styles.ufMobileFlowHeader}>
                  <span className={styles.ufMobileFlowIcon}>
                    {FLOW_ICONS[flow.title]}
                  </span>
                  <span className={styles.ufMobileFlowTitle}>
                    {flow.title}
                  </span>
                  <span className={styles.ufMobileFlowCount}>
                    {flow.nodes.filter((n) => n.type !== "end").length}{" "}
                    <T k="aboutPage.userFlow.steps" />
                  </span>
                </div>
                {isActive && (
                  <div className={styles.ufMobileNodes}>
                    {flow.nodes
                      .filter((n) => n.col === 0)
                      .map((node, ni) => (
                        <div
                          key={node.id}
                          className={`${styles.ufMobileNode} ${node.type === "decision" ? styles.ufMobileDecision : ""} ${node.type === "start" || node.type === "end" ? styles.ufMobileTerminal : ""}`}
                        >
                          <span className={styles.ufMobileDot} />
                          {ni <
                            flow.nodes.filter((n) => n.col === 0).length -
                              1 && (
                            <span className={styles.ufMobileLine} />
                          )}
                          <span className={styles.ufMobileNodeLabel}>
                            {node.type === "decision"
                              ? `${node.label[language]}`
                              : node.label[language]}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {isActive && (
                  <p className={styles.ufMobileFlowDesc}>
                    {flow.description[language]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
  );
}

export default memo(UserFlowMobileList);
