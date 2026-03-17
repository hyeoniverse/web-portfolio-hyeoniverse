"use client";

import React from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import { TblTrash } from "../icons";
import { MATH_TOOLS } from "../constants";
import { _mathSymbolInsert, _mathDeleteNode } from "../utils";
import styles from "../../RichTextEditor.module.css";

interface MathToolbarProps {
  visible: boolean;
}

export default React.memo(function MathToolbar({ visible }: MathToolbarProps) {
  const { t } = useLanguage();

  return (
    <div className={`${styles.tableToolbar} ${styles.tableToolbarFull} ${!visible ? styles.tableToolbarHidden : ""}`} data-math-symbols>
      <div className={styles.mathToolbarWrap}>
        <span className={styles.mathToolbarLabel}>MATH</span>
        {MATH_TOOLS.map((cat) => (
          <div key={cat.categoryKey} className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>{t(cat.categoryKey)}</span>
            {cat.items.map((item) => (
              <TBtn
                key={item.latex}
                tooltip={`${item.tipKey ? t(item.tipKey) : item.label}\n${item.latex.trim()}`}
                onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathSymbolInsert.current?.(item.latex); }}
              >
                {item.label}
              </TBtn>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.mathToolbarDelete}>
        <TBtn
          className={styles.tableDangerBtn}
          tooltip={t("editor.deleteMath")}
          onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathDeleteNode.current?.(); }}
        ><TblTrash /></TBtn>
      </div>
    </div>
  );
})
