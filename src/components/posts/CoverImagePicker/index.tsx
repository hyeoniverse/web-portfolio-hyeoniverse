"use client";

import { useState } from "react";
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

const tabs: { key: Tab; label: string }[] = [
  { key: "presets", label: "Presets" },
  { key: "unsplash", label: "Unsplash" },
  { key: "ai", label: "AI Generate" },
];

export default function CoverImagePicker({
  onSelect,
  onClose,
  postContext,
}: CoverImagePickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("presets");

  return (
    <div className={styles.picker}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
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
