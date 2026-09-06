"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "@/components/icons";
import Button from "@/components/ui/Button";
import HighlightedText from "@/components/ui/HighlightedText";
import { showToast } from "@/stores/toastStore";
import TypeWriter from "@/components/effects/TypeWriter";
import Tooltip from "@/components/ui/Tooltip";
import Pagination from "@/components/ui/Pagination";
import HeartIcon from "@/components/ui/HeartIcon";
import { staggerContainer, staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import Pressable from "@/components/ui/Pressable";
import { DemoGroup, useDemo } from "./demoShared";

/** Feedback & Display — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function FeedbackDisplayDemos() {
  const { language, vpGroup, scrollChildX, nd } = useDemo();
  const [twReplay, setTwReplay] = useState(0);
  const [paginationPage, setPaginationPage] = useState(3);
  // HeartIcon 단독 데모 (size 별)
  const [iconLiked, setIconLiked] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const toggleIcon = useCallback(() => {
    setIconBusy(true);
    setIconLiked((prev) => !prev);
    setTimeout(() => setIconBusy(false), 200);
  }, []);

  return (
    <>
        <h3 className={styles.componentCategory}>Feedback & Display</h3>

        {/* Toast */}
        <DemoGroup title="Toast">
          <p className={styles.componentDesc}>
            {language === "ko"
              ? "스택 중 하나에 hover 하면 그 토스트만이 아니라 전체가 멈춥니다(pauseAllToasts). 하나씩만 멈추면 다른 토스트가 사라지면서 스택이 재배치되고, 커서가 저절로 벗어나기 때문입니다. 클릭하면 즉시 사라집니다."
              : "Hovering any toast pauses the whole stack, not just that one (pauseAllToasts) — pausing only the hovered one lets the others expire, and the stack reflows out from under the cursor. Click to dismiss immediately."}
          </p>
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}>
              <Tooltip content="variant: success"><Button variant="outline" onClick={() => showToast("Saved successfully", "success")}>Success</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}>
              <Tooltip content="variant: error (accent — 진짜 실패)"><Button variant="outline" onClick={() => showToast("Something went wrong", "error")}>Error</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}>
              <Tooltip content="variant: warning (amber — 검증·중복)"><Button variant="outline" onClick={() => showToast("Already exists", "warning")}>Warning</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}>
              <Tooltip content="variant: info"><Button variant="outline" onClick={() => showToast("Just so you know", "info")}>Info</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}>
              <Tooltip content="스택 — 하나에 hover 하면 pauseAllToasts 로 전체 타이머 정지">
                <Button
                  variant="outline"
                  onClick={() => {
                    showToast("Uploading cover…", "info");
                    showToast("Cover uploaded", "success");
                    showToast("Draft saved", "success");
                  }}
                >
                  Stack ×3
                </Button>
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* Pagination */}
        <DemoGroup title="Pagination">
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
            <Pagination page={paginationPage} totalPages={12} onChange={setPaginationPage} />
          </motion.div>
        </DemoGroup>

        {/* TypeWriter */}
        <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)" }}>
            <div className={styles.componentGroupTitle} style={{ marginBottom: 0 }}>TypeWriter</div>
            <Pressable className={styles.replayBtn} onClick={() => setTwReplay((n) => n + 1)} aria-label="Replay">
              <RotateCcw size={14} />
            </Pressable>
          </div>
          <motion.div className={styles.typewriterDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
            <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-xl)" align="center" replayTrigger={twReplay} />
          </motion.div>
        </motion.div>

        {/* HeartIcon — wave fill + burst (size 별 단독 데모) */}
        <DemoGroup title="HeartIcon">
          <p className={styles.componentDesc}>state machine (empty / filling / filled / draining) · 3-layer wave fill (SVG path d 애니메이션) · 채우기 완료 시 burst 1회 · burst 거리/크기 size 비례 스케일 · stroke / fill 모두 currentColor 상속 (부모 color 따라감)</p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2xl)", cursor: "pointer", color: iconLiked ? "var(--text-accent)" : "var(--text-secondary)" }} onClick={toggleIcon}>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={14} />
              <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 14</span>
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={20} />
              <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 20</span>
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={32} />
              <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 32</span>
            </span>
          </motion.div>
        </DemoGroup>

        {/* HighlightedText */}
        <DemoGroup
          title="HighlightedText"
          ko={"검색어와 일치하는 부분만 `<mark>` 로 감쌉니다. `query` 를 주지 않으면 SearchHighlightProvider context 의 값을 쓰므로, 리스트의 각 행이 검색어를 일일이 넘겨받을 필요가 없습니다. query 가 비면 그냥 평문으로 렌더되므로, 조건 분기 없이 항상 이 컴포넌트를 쓰면 됩니다."}
          en={"Wraps only the matched span in `<mark>`. Without an explicit `query` it reads the one from `SearchHighlightProvider` context, so list rows don't each have to thread the search term through. An empty query renders plain text, so you can use it unconditionally."}
        >
          <div className={styles.componentRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--spacing-2xs)" }}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
              <HighlightedText text={language === "ko" ? "검색어가 들어간 문장입니다" : "A sentence containing the search term"} query={language === "ko" ? "검색어" : "search"} />
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ color: "var(--text-muted)", fontSize: "var(--font-size-label)" }}>
              {language === "ko" ? "query 없음 → 평문" : "no query → plain text"}: <HighlightedText text={language === "ko" ? "강조 없음" : "no highlight"} query="" />
            </motion.div>
          </div>
        </DemoGroup>

        {/* Inline Color Swatch */}
        <DemoGroup
          title="Inline Color Swatch"
          ko={"인라인 `code` 의 내용이 색상값(`#hex` · `rgb()` · `hsl()`)이면 앞에 색 원(스와치)이 붙습니다 — GitHub 스타일. 렌더 후 `applyColorSwatches` 가 인라인 코드를 스캔해 **검증된 색만** 배경으로 주입하므로, 이름색·비색상은 평문으로 남습니다. 인라인 코드 자체는 Notion 식 배경형(보더 없음)입니다. 에디터에서는 툴바의 **색상 칩** 도구(Palette 아이콘)로 팔레트에서 고른 `#hex` 를 인라인 코드로 삽입하고, 리더가 이걸 그대로 이 스와치로 렌더합니다."}
          en={"When inline `code` holds a color value (`#hex` · `rgb()` · `hsl()`), a color dot (swatch) is prepended — GitHub style. After render, `applyColorSwatches` scans inline code and injects **only validated colors**, so named colors / non-colors stay plain. The inline code itself is Notion-style (borderless background). In the editor, the toolbar's **color chip** tool (Palette icon) inserts a picked `#hex` as inline code, and the reader renders exactly that as this swatch."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)", alignItems: "center", lineHeight: 2.2 }}>
            <code><span className="color-swatch" style={{ background: "#e11d48" }} aria-hidden />#e11d48</code>
            <code><span className="color-swatch" style={{ background: "rgb(46, 204, 113)" }} aria-hidden />rgb(46, 204, 113)</code>
            <code><span className="color-swatch" style={{ background: "hsl(280, 70%, 55%)" }} aria-hidden />hsl(280, 70%, 55%)</code>
            <code>not-a-color</code>
          </motion.div>
        </DemoGroup>

        {/* Code Block Controls */}
        <DemoGroup
          title="Code Block Controls"
          ko={"리더/미리보기에서 코드블록 위에 붙는 바 — 좌측 언어 라벨 + 우측 복사·줄바꿈 토글. 두 버튼은 각자 떠오른 **emboss 타일**로 구분되고, 코드블록 위 세로 스크롤은 페이지로 통과합니다(축 기반 wheel 라우팅). 런타임엔 `attachCodeWrapToggle` 이 주입합니다."}
          en={"The bar above a code block in the reader/preview — a language label on the left, copy and wrap toggles on the right. The two buttons read as raised **emboss tiles**, and vertical scroll over a code block passes through to the page (axis-based wheel routing). At runtime it's injected by `attachCodeWrapToggle`."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
            <div className="code-block-wrap has-code-bar" style={{ maxWidth: 440 }}>
              <div className="code-block-bar" style={{ position: "relative" }}>
                <span className="code-lang-label">css</span>
                <div className="code-block-controls">
                  <button className="code-copy-btn" type="button" tabIndex={-1} aria-hidden>
                    <span className="code-copy-labels"><span className="code-copy-default">Copy</span></span>
                  </button>
                  <button className="code-wrap-toggle" type="button" tabIndex={-1} aria-hidden>
                    <span className="code-wrap-label-default">↔ Scroll</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </DemoGroup>

    </>
  );
}
