"use client";

import React, { type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2 } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import T from "@/components/ui/T";
import type { TroubleshootingDiagram, TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import FlowDiagram from "../../FlowDiagram";
import { renderHighlight } from "../../renderHighlight";
import { DIFFICULTY_META } from "./difficulty";
import { displayTitle, makeVizFeeder } from "./itemHelpers";
import styles from "../TroubleshootingPanel.module.css";

/* IDE 에디터 영역 — 항목 하나를 정의·원인·해결·결론 순으로 그린다.
   본문은 renderParagraphs 가 IDE 줄 모양으로, 위치별 이미지는 renderImagesAt 가 끼워 넣고,
   각 구간의 도형은 makeVizFeeder 가 본문 마커와 구간 끝에 나눠 배치한다. */
export default function TroubleEditor({
  items,
  displayIndex,
  language,
  fontScale,
  editorRef,
  renderParagraphs,
  renderImagesAt,
  onEnlargeDiagram,
}: {
  items: TroubleShootingItem[];
  displayIndex: number;
  language: Language;
  fontScale: number;
  editorRef: RefObject<HTMLDivElement | null>;
  renderParagraphs: (text: string, opts?: { insightStyle?: boolean; takeViz?: () => React.ReactNode | null }) => React.ReactNode;
  renderImagesAt: (item: TroubleShootingItem, position: "definition" | "cause" | "solution" | "insight") => React.ReactNode;
  onEnlargeDiagram: (diagram: TroubleshootingDiagram) => void;
}) {
  return (
          <div ref={editorRef} className={styles.ideEditor}>
            <AnimatePresence mode="wait" initial={false}>
              {(() => {
                const item = items[displayIndex];
                if (!item) return null;
                return (
                  <motion.div
                    key={displayIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className={styles.ideEditorContent}
                    style={{ "--ide-font-scale": fontScale } as React.CSSProperties}
                    data-lenis-prevent
                  >
                    {/* Header (메타 정보) */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHash}>#</span>{" "}
                        <span className={styles.ideTitle}>
                          {displayTitle(item)[language]}
                          <span className={styles.ideCursor} aria-hidden>▊</span>
                        </span>
                      </span>
                    </div>
                    <div className={`${styles.ideLine} ${styles.ideLineEmpty}`}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText} />
                    </div>
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideComment}>{"// "}@section: {item.section?.[language] ?? "-"}</span>
                      </span>
                    </div>
                    {item.difficulty && (
                      <div className={styles.ideLine}>
                        <span className={styles.ideLineNum} />
                        <span className={styles.ideLineText}>
                          <span className={styles.ideComment}>
                            {"// "}@difficulty: {DIFFICULTY_META[item.difficulty].label[language]}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className={styles.ideDivider} aria-hidden />

                    {/* Symptom (definition) — 무슨 일이 있었나. 증상→원인→해결→교훈 4단의 첫 단 */}
                    {item.definition && (
                      <>
                        <div className={styles.ideLine}>
                          <span className={styles.ideLineNum} />
                          <span className={styles.ideLineText}>
                            <span className={styles.ideHashH2}>##</span>{" "}
                            <span className={styles.ideHeading}>
                              <T k="aboutPage.troubleshooting.definition" />
                            </span>
                          </span>
                        </div>
                        {(() => { const f = makeVizFeeder(item.vizKey, "definition", language); return (<>{renderParagraphs(item.definition![language], { takeViz: f.take })}{renderImagesAt(item, "definition")}{f.rest()}</>); })()}

                        <div className={styles.ideDivider} aria-hidden />
                      </>
                    )}

                    {/* Cause */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={styles.ideHeading}>
                          <T k="aboutPage.troubleshooting.cause" />
                        </span>
                      </span>
                    </div>
                    {(() => { const f = makeVizFeeder(item.vizKey, "cause", language); return (<>{renderParagraphs(item.cause[language], { takeViz: f.take })}{renderImagesAt(item, "cause")}{f.rest()}</>); })()}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Solution */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={`${styles.ideHeading} ${styles.ideHeadingAccent}`}>
                          <T k="aboutPage.troubleshooting.solution" />
                        </span>
                      </span>
                    </div>
                    {(() => { const f = makeVizFeeder(item.vizKey, "solution", language); return (<>{renderParagraphs(item.solution[language], { takeViz: f.take })}{renderImagesAt(item, "solution")}{f.rest()}</>); })()}

                    {item.comparisons && item.comparisons.length > 0 && (
                      <>
                        <div className={styles.ideDivider} aria-hidden />
                        <div className={styles.ideIndent}>
                          <div className={styles.troubleComparisons}>
                            {item.comparisons.map((table, ti) => (
                              <div key={ti} className={styles.troubleComparisonWrap}>
                                {table.label && (
                                  <span className={styles.troubleComparisonLabel}>{table.label[language]}</span>
                                )}
                                <table className={styles.troubleTable}>
                                  <thead>
                                    <tr>
                                      {table.headers.map((h, hi) => (
                                        <th key={hi}>{h[language]}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.rows.map((row, ri) => (
                                      <tr key={ri} className={row.highlight ? styles.troubleTableRowHighlight : undefined}>
                                        {row.cells.map((cell, ci) => (
                                          <td key={ci}>{renderHighlight(cell[language], language)}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {item.diagrams && item.diagrams.length > 0 && (
                      <>
                        <div className={styles.ideDivider} aria-hidden />
                        <div className={styles.ideLine}>
                          <span className={styles.ideLineNum} />
                          <span className={styles.ideLineText}>
                            <span className={styles.ideHashH2}>##</span>{" "}
                            <span className={styles.ideHeading}>
                              <T k="aboutPage.troubleshooting.flow" />
                            </span>
                          </span>
                        </div>
                        <div className={styles.ideIndent}>
                          <div className={styles.troubleDiagrams}>
                            {item.diagrams.map((d, di) => (
                              <div key={di} className={styles.troubleDiagramItem}>
                                <div className={styles.troubleDiagramFrame}>
                                  {d.title && (
                                    <span className={styles.troubleDiagramTitle}>{d.title[language]}</span>
                                  )}
                                  <FlowDiagram nodes={d.nodes} edges={d.edges} language={language} />
                                </div>
                                <Pressable noTapScale
                                  data-clickable="true"
                                  className={styles.ideDiagramHint}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEnlargeDiagram(d);
                                  }}
                                  aria-label="크게 보기"
                                >
                                  <Maximize2 strokeWidth={2} className={styles.ideDiagramHintIcon} />
                                  크게 보기
                                </Pressable>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className={styles.ideDivider} aria-hidden />

                    {/* Key insight — 나머지 섹션과 동일한 ## 헤딩 */}
                    <div className={styles.ideLine}>
                      <span className={styles.ideLineNum} />
                      <span className={styles.ideLineText}>
                        <span className={styles.ideHashH2}>##</span>{" "}
                        <span className={styles.ideHeading}>
                          <T k="aboutPage.troubleshooting.keyInsight" />
                        </span>
                      </span>
                    </div>
                    {(() => { const f = makeVizFeeder(item.vizKey, "insight", language); return (<>{renderParagraphs(item.keyInsight[language], { insightStyle: true, takeViz: f.take })}{renderImagesAt(item, "insight")}{f.rest()}</>); })()}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
  );
}
