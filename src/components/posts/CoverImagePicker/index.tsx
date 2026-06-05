"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLenis } from "@/providers/LenisProvider";
import PresetTab from "./PresetTab";
import UnsplashTab from "./UnsplashTab";
import PexelsTab from "./PexelsTab";
import AIGenerateTab from "./AIGenerateTab";
import HistoryTab from "./HistoryTab";
import { useHistory, type HistorySource } from "./useHistory";
import CloseButton from "@/components/ui/CloseButton";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./CoverImagePicker.module.css";

type Tab = "presets" | "unsplash" | "pexels" | "ai" | "history";

export interface PostContext {
  title: string;
  tags: string[];
  excerpt: string;
}

interface CoverImagePickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  postContext?: PostContext;
  /** 닫는 중 — 역방향 애니메이션 적용. 외부에서 언마운트 타이밍을 제어할 때 사용 */
  closing?: boolean;
  /** picker 닫지 않고 form 값만 자동저장 — AI 생성 즉시 cover 적용 (사용자가 명시적으로 "사용" 안 눌러도) */
  onAutoSave?: (url: string) => void;
  /** 현재 cover 로 사용 중인 url — history 탭의 active 표시용 */
  currentUrl?: string;
  /** 로컬 파일 endpoint — default 는 공용 `/api/admin/cover` (public/cover/{videos,images}). 별도 풀이면 override. */
  localFilesEndpoint?: string;
  /** 로컬 파일 섹션에 안내 hint 문구 — 어디서 파일이 오는지 명시. */
  localFilesHint?: string;
}

export default function CoverImagePicker({
  onSelect,
  onClose,
  postContext,
  closing = false,
  onAutoSave,
  currentUrl,
  localFilesEndpoint = "/api/admin/cover",
  localFilesHint = "public/cover/videos/ 와 public/cover/images/ 안의 모든 미디어 파일이 표시됩니다.",
}: CoverImagePickerProps) {
  const { t } = useLanguage();
  const { aiCover } = useServiceStatus();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const [activeTab, setActiveTab] = useState<Tab>("presets");
  const { history, add: addHistory, remove: removeHistory } = useHistory();
  const { isMobile } = useIsMobile();
  const { stop: lenisStop, start: lenisStart } = useLenis();

  /* 모바일 sheet 열려있는 동안 body scroll lock + Lenis 정지 — 메인 페이지 스크롤 방지 */
  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenisStop();
    return () => {
      document.body.style.overflow = prev;
      lenisStart();
    };
  }, [isMobile, lenisStop, lenisStart]);

  const tabs = useMemo(
    () => [
      { key: "presets" as Tab, label: tc("presets") },
      { key: "unsplash" as Tab, label: tc("unsplash") },
      { key: "pexels" as Tab, label: "Pexels" },
      ...(aiCover ? [{ key: "ai" as Tab, label: tc("aiGenerate") }] : []),
      { key: "history" as Tab, label: tc("history") },
    ],
    [tc, aiCover],
  );

  /** 각 탭이 이미지를 produce(선택/생성/업로드) 했을 때 호출 — history 추가 + onSelect 또는 onAutoSave */
  const handlePicked = useCallback(
    (url: string, source: HistorySource, meta: string, opts?: { autoSave?: boolean }) => {
      addHistory({ url, source, meta });
      if (opts?.autoSave) onAutoSave?.(url);
      else onSelect(url);
    },
    [addHistory, onAutoSave, onSelect],
  );

  const pickerBody = (
    <>
      {isMobile && (
        <div className={`ui-sheet-handle ${styles.sheetHandle}`} aria-hidden>
          <span className="ui-sheet-handle-bar" />
        </div>
      )}
      <div className={styles.header}>
        {/* preset / unsplash / ai 만 capsule 그룹 — history 는 독립 버튼 */}
        <div className={styles.tabs}>
          {tabs.filter((t) => t.key !== "history").map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.historyTab} ${activeTab === "history" ? styles.historyTabActive : ""}`}
          onClick={() => setActiveTab("history")}
        >
          {tc("history")}
          {history.length > 0 && <span className={styles.tabCount}>{history.length}</span>}
        </button>
        <Tooltip content={tc("close")} placement="bottom">
          <CloseButton className={styles.closeBtn} onClick={onClose} ariaLabel={tc("close")} />
        </Tooltip>
      </div>

      <div className={styles.body} data-lenis-prevent>
        {activeTab === "presets" && (
          <PresetTab
            onSelect={(url, name) => handlePicked(url, "preset", name ?? "preset")}
            // 이미지 업로드 → 색 추출 시 history 에만 추가 (cover 는 자동 저장 X)
            onImageUploaded={(url, name) => addHistory({ url, source: "preset", meta: name })}
            currentUrl={currentUrl}
            localFilesEndpoint={localFilesEndpoint}
            localFilesHint={localFilesHint}
          />
        )}
        {activeTab === "unsplash" && (
          <UnsplashTab
            onSelect={(url, photographer) => handlePicked(url, "unsplash", photographer ?? "unsplash")}
            postContext={postContext}
          />
        )}
        {activeTab === "pexels" && (
          <PexelsTab
            onSelect={(url, photographer) => handlePicked(url, "unsplash", photographer ?? "pexels")}
            postContext={postContext}
          />
        )}
        {activeTab === "ai" && (
          <AIGenerateTab
            onSelect={onSelect}
            onGenerated={(url, prompt) => handlePicked(url, "ai", prompt, { autoSave: true })}
            postContext={postContext}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            items={history}
            onPick={(url) => onAutoSave?.(url)}
            onRemove={removeHistory}
            currentUrl={currentUrl}
          />
        )}
      </div>
    </>
  );

  /* Desktop: 기존 인라인 expand 애니메이션 그대로. Mobile: portal + bottom sheet (slide up, dim backdrop). */
  if (isMobile) {
    if (typeof window === "undefined") return null;
    return createPortal(
      <AnimatePresence>
        {!closing && (
          <>
            <motion.div
              key="cover-backdrop"
              className="ui-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              key="cover-sheet"
              className={`${styles.picker} ${styles.pickerSheet}`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
            >
              {pickerBody}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return (
    <div className={`${styles.picker}${closing ? ` ${styles.pickerClosing}` : ""}`}>
      {pickerBody}
    </div>
  );
}
