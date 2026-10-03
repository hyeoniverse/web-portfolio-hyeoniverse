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
import WorkGallery from "@/components/works/WorkGallery";
import { ImageViewer } from "@/components/ui/ImageViewer";

/* 갤러리 예시 — 저장소에 들어 있는 화면 캡처(public/images/screenshots/pc) */
const GALLERY_DEMO = [
  "/images/screenshots/pc/about-dark.png",
  "/images/screenshots/pc/design-system-dark.png",
  "/images/screenshots/pc/editor-light.png",
  "/images/screenshots/pc/admin-posts-dark.png",
  "/images/screenshots/pc/feat-comment.png",
  "/images/screenshots/pc/feat-i18n.png",
];

/* 장마다의 대본 — 음성 파일 없이 대본만 두면 브라우저가 읽는다. 음성 단추·자막이 이것으로 켜진다 */
const GALLERY_SCRIPTS: Record<"ko" | "en", string[]> = {
  ko: [
    "About 페이지입니다. 이 사이트를 어떻게 만들었는지 장면을 넘기며 보여 줍니다.",
    "디자인 시스템 페이지입니다. 색·간격·공통 컴포넌트를 한곳에서 확인합니다.",
    "글 편집기입니다. 블록을 끌어 옮기고, 표와 코드와 수식을 넣을 수 있습니다.",
    "관리자 글 목록입니다. 상태·카테고리·태그로 거르고 한꺼번에 고칩니다.",
    "댓글입니다. 로그인 없이도 쓰고, 답글과 알림 메일이 이어집니다.",
    "한국어와 영어를 오갑니다. 번역은 자동으로 채우고 직접 고칠 수 있습니다.",
  ],
  en: [
    "The About page — scenes that walk through how this site was built.",
    "The design system page — colors, spacing and shared components in one place.",
    "The post editor — drag blocks around and insert tables, code and math.",
    "The admin post list — filter by status, category and tag, and edit in bulk.",
    "Comments — no sign-in needed, with replies and email notifications.",
    "Switching between Korean and English — translations are filled in automatically and can be edited.",
  ],
};

/** Feedback & Display — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function FeedbackDisplayDemos() {
  const { language, vpGroup, scrollChildX, nd } = useDemo();
  const [twReplay, setTwReplay] = useState(0);
  const [paginationPage, setPaginationPage] = useState(3);
  const [galleryViewer, setGalleryViewer] = useState({ open: false, index: 0 });
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
        <h3 id="components-feedback" className={styles.componentCategory}>Feedback & Display</h3>

        {/* Toast */}
        <DemoGroup title="Toast">
          <p className={styles.componentDesc}>
            {language === "ko"
              ? "스택 중 하나에 hover 하면 그 토스트만이 아니라 전체가 멈춥니다(pauseAllToasts). 하나씩만 멈추면 다른 토스트가 사라지면서 스택이 재배치되고, 커서가 저절로 벗어나기 때문입니다. 클릭하면 즉시 사라집니다. 긴 문구는 어절 단위로 줄을 바꿔 끝까지 보이고, 문구 안 줄바꿈은 그대로 살려 AI 실패 사유처럼 항목을 줄마다 나눕니다."
              : "Hovering any toast pauses the whole stack, not just that one (pauseAllToasts) — pausing only the hovered one lets the others expire, and the stack reflows out from under the cursor. Click to dismiss immediately. Long messages wrap between words and are never cut off, and line breaks in the message are kept — e.g. one AI provider failure per line."}
          </p>
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 7)}>
              <Tooltip content="variant: success"><Button variant="outline" onClick={() => showToast("Saved successfully", "success")}>Success</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 7)}>
              <Tooltip content="variant: error (accent — 진짜 실패)"><Button variant="outline" onClick={() => showToast("Something went wrong", "error")}>Error</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(2, 7)}>
              <Tooltip content="variant: warning (amber — 검증·중복)"><Button variant="outline" onClick={() => showToast("Already exists", "warning")}>Warning</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 7)}>
              <Tooltip content="variant: info"><Button variant="outline" onClick={() => showToast("Just so you know", "info")}>Info</Button></Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(4, 7)}>
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
            <motion.div variants={staggerItemX} {...scrollChildX(5, 7)}>
              <Tooltip content="긴 문장 — 어절 단위로 줄을 바꾸고 끝까지 보인다(잘리지 않음)">
                <Button
                  variant="outline"
                  onClick={() => showToast(language === "ko"
                    ? "작업물을 저장하지 못했습니다. 네트워크 연결이 끊겼거나 서버가 응답하지 않습니다. 잠시 뒤 다시 저장해 주시고, 같은 문제가 이어지면 설정 › 서비스의 호출 기록에서 원인을 확인해 주세요."
                    : "Couldn't save the work. The network dropped or the server didn't respond. Please try saving again in a moment, and if it keeps happening, check the cause in Settings › Services › call log.", "error", 8000)}
                >
                  Long message
                </Button>
              </Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(6, 7)}>
              <Tooltip content="여러 줄 — 문구 안 줄바꿈을 살린다(AI 실패 사유 목록 등)">
                <Button
                  variant="outline"
                  onClick={() => showToast(language === "ko"
                    ? "AI 요약에 실패했습니다.\n· Gemini: 요청을 받지 않았습니다\n· OpenAI: 한도를 넘었습니다\n· Claude: 결제·크레딧이 부족합니다\n설정 › 서비스에서 확인해 주세요."
                    : "AI summary failed.\n· Gemini: request was refused\n· OpenAI: quota exceeded\n· Claude: billing or credits needed\nCheck Settings › Services.", "error", 8000)}
                >
                  Multi-line
                </Button>
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* Gallery */}
        <DemoGroup
          title="WorkGallery · ImageViewer"
          ko={"작업물 상세의 슬라이드 갤러리입니다. 가운데 한 장이 크고 양옆이 원근으로 기울어 이어지며, 끌기·휠·화살표 키로 넘기고 옆 장이나 아래 점을 누르면 그 장으로 갑니다. 양 끝에서 더 굴리면 페이지가 이어서 움직입니다. 가운데 장을 누르면 ImageViewer 가 열려 확대·전체화면으로 봅니다. 장마다 대본·음성(notes)이 있으면 띠 왼쪽에 음성 단추와 자막 단추가 생깁니다. 음성을 켜면 장을 읽고 다 읽으면 다음 장으로 넘어가며, 자막은 읽는 문장을 아래에 띄웁니다. 이 예시는 음성 파일 없이 대본만 두어 브라우저 음성으로 읽습니다."}
          en={"The slide gallery from work details — a large center slide with perspective-tilted neighbors. Drag, wheel or arrow keys to move; click a side slide or a dot to jump. Scrolling past either end hands the wheel back to the page. Clicking the center slide opens ImageViewer for zoom / fullscreen. With per-slide scripts or audio (notes), narration and caption buttons appear on the left of the strip — narration reads each slide and advances when done, captions show the sentence being read. This demo has scripts only, so the browser's speech reads them."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
            <WorkGallery
              images={GALLERY_DEMO}
              title="Design system"
              onOpen={(index) => setGalleryViewer({ open: true, index })}
              notes={Object.fromEntries(GALLERY_DEMO.map((url, i) => [url, { script: GALLERY_SCRIPTS[language === "ko" ? "ko" : "en"][i] }]))}
              suspended={galleryViewer.open}
            />
          </motion.div>
          <ImageViewer
            images={GALLERY_DEMO}
            index={galleryViewer.index}
            open={galleryViewer.open}
            onClose={() => setGalleryViewer({ open: false, index: 0 })}
            title="Design system"
          />
        </DemoGroup>

        {/* Pagination */}
        <DemoGroup title="Pagination">
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
            <Pagination page={paginationPage} totalPages={12} onChange={setPaginationPage} />
          </motion.div>
        </DemoGroup>

        {/* TypeWriter */}
        <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-12)", marginBottom: "var(--spacing-12)" }}>
            <div className={styles.componentGroupTitle} style={{ marginBottom: 0 }}>TypeWriter</div>
            <Pressable className={styles.replayBtn} onClick={() => setTwReplay((n) => n + 1)} aria-label="Replay">
              <RotateCcw size={14} />
            </Pressable>
          </div>
          <motion.div className={styles.typewriterDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
            <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-20)" align="center" replayTrigger={twReplay} />
          </motion.div>
        </motion.div>

        {/* HeartIcon — wave fill + burst (size 별 단독 데모) */}
        <DemoGroup title="HeartIcon">
          <p className={styles.componentDesc}>state machine (empty / filling / filled / draining) · 3-layer wave fill (SVG path d 애니메이션) · 채우기 완료 시 burst 1회 · burst 거리/크기 size 비례 스케일 · stroke / fill 모두 currentColor 상속 (부모 color 따라감)</p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-32)", cursor: "pointer", color: iconLiked ? "var(--text-accent)" : "var(--text-secondary)" }} onClick={toggleIcon}>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={14} />
              <span style={{ fontSize: "var(--font-size-body-sm)", color: "var(--text-tertiary)" }}>size 14</span>
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={20} />
              <span style={{ fontSize: "var(--font-size-body-sm)", color: "var(--text-tertiary)" }}>size 20</span>
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <HeartIcon liked={iconLiked} busy={iconBusy} size={32} />
              <span style={{ fontSize: "var(--font-size-body-sm)", color: "var(--text-tertiary)" }}>size 32</span>
            </span>
          </motion.div>
        </DemoGroup>

        {/* HighlightedText */}
        <DemoGroup
          title="HighlightedText"
          ko={"검색어와 일치하는 부분만 `<mark>` 로 감쌉니다. `query` 를 주지 않으면 SearchHighlightProvider context 의 값을 쓰므로, 리스트의 각 행이 검색어를 일일이 넘겨받을 필요가 없습니다. query 가 비면 그냥 평문으로 렌더되므로, 조건 분기 없이 항상 이 컴포넌트를 쓰면 됩니다."}
          en={"Wraps only the matched span in `<mark>`. Without an explicit `query` it reads the one from `SearchHighlightProvider` context, so list rows don't each have to thread the search term through. An empty query renders plain text, so you can use it unconditionally."}
        >
          <div className={styles.componentRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--spacing-4)" }}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
              <HighlightedText text={language === "ko" ? "검색어가 들어간 문장입니다" : "A sentence containing the search term"} query={language === "ko" ? "검색어" : "search"} />
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ color: "var(--text-muted)", fontSize: "var(--font-size-body-sm)" }}>
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
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-12)", alignItems: "center", lineHeight: 2.2 }}>
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
