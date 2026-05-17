"use client";

import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import PresetTab from "./PresetTab";
import UnsplashTab from "./UnsplashTab";
import AIGenerateTab from "./AIGenerateTab";
import HistoryTab from "./HistoryTab";
import { useHistory, type HistorySource } from "./useHistory";
import CloseButton from "@/components/ui/CloseButton";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./CoverImagePicker.module.css";

type Tab = "presets" | "unsplash" | "ai" | "history";

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
}

export default function CoverImagePicker({
  onSelect,
  onClose,
  postContext,
  closing = false,
  onAutoSave,
  currentUrl,
}: CoverImagePickerProps) {
  const { t } = useLanguage();
  const { aiCover } = useServiceStatus();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const [activeTab, setActiveTab] = useState<Tab>("presets");
  const { history, add: addHistory, remove: removeHistory } = useHistory();

  const tabs = useMemo(
    () => [
      { key: "presets" as Tab, label: tc("presets") },
      { key: "unsplash" as Tab, label: tc("unsplash") },
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

  return (
    <div className={`${styles.picker}${closing ? ` ${styles.pickerClosing}` : ""}`}>
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
          />
        )}
        {activeTab === "unsplash" && (
          <UnsplashTab
            onSelect={(url, photographer) => handlePicked(url, "unsplash", photographer ?? "unsplash")}
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
    </div>
  );
}
