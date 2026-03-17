"use client";

import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import PresetTab from "./PresetTab";
import UnsplashTab from "./UnsplashTab";
import AIGenerateTab from "./AIGenerateTab";
import styles from "./CoverImagePicker.module.css";

type Tab = "presets" | "unsplash" | "ai";

export interface PostContext {
  title: string;
  tags: string[];
  excerpt: string;
}

interface CoverImagePickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  postContext?: PostContext;
}

export default function CoverImagePicker({
  onSelect,
  onClose,
  postContext,
}: CoverImagePickerProps) {
  const { t } = useLanguage();
  const { aiCover } = useServiceStatus();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const [activeTab, setActiveTab] = useState<Tab>("presets");

  const tabs = useMemo(
    () => [
      { key: "presets" as Tab, label: tc("presets") },
      { key: "unsplash" as Tab, label: tc("unsplash") },
      ...(aiCover ? [{ key: "ai" as Tab, label: tc("aiGenerate") }] : []),
    ],
    [tc, aiCover],
  );

  return (
    <div className={styles.picker}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
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
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          &times;
        </button>
      </div>

      <div className={styles.body} data-lenis-prevent>
        {activeTab === "presets" && <PresetTab onSelect={onSelect} />}
        {activeTab === "unsplash" && <UnsplashTab onSelect={onSelect} postContext={postContext} />}
        {activeTab === "ai" && <AIGenerateTab onSelect={onSelect} postContext={postContext} />}
      </div>
    </div>
  );
}
