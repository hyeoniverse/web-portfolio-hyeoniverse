"use client";

import React from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import FloatingBar from "./FloatingBar";
import Popover from "@/components/ui/Popover";
import { ArrowLeftRight } from "@/components/icons";
import { TblTrash } from "../icons";
import { MATH_TOOLS } from "../constants";
import { _mathSymbolInsert, _mathDeleteNode, _mathToggleMode } from "../utils";
import base from "../../RichTextEditor.module.css";
import math from "../../EditorMath.module.css";
const styles = { ...base, ...math };

interface MathToolbarProps {
  visible: boolean;
  /** 편집 중인 수식(패널)에 앵커할 rect */
  getAnchorRect: () => DOMRect;
}

// 수식 기호 팔레트 — 편집 패널에 앵커된 FloatingBar. 카테고리별 hover Popover 로 compact 하게.
// data-math-symbols: MathElements 가 이 안 클릭 시 편집 패널을 닫지 않도록 판별하는 마커 (바 + 팝오버 콘텐츠 둘 다).
export default React.memo(function MathToolbar({ visible, getAnchorRect }: MathToolbarProps) {
  const { t } = useLanguage();

  return (
    <FloatingBar inline open={visible} getAnchorRect={getAnchorRect}>
      <div data-math-symbols style={{ display: "contents" }}>
        {MATH_TOOLS.map((cat) => (
          <Popover
            key={cat.categoryKey}
            openOnHover
            placement="bottom-start"
            offset={8}
            trigger={<TBtn tooltip={t(cat.categoryKey)}><span className={styles.tblBarLabel}>{t(cat.categoryKey)}</span></TBtn>}
          >
            {() => (
              <div data-math-symbols className={styles.mathMenu} onMouseDown={(e) => e.preventDefault()}>
                {cat.items.map((item) => (
                  <TBtn
                    key={item.latex}
                    square={item.label.length <= 2}
                    tooltip={`${item.tipKey ? t(item.tipKey) : item.label}\n${item.latex.trim()}`}
                    onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathSymbolInsert.current?.(item.latex); }}
                    style={item.label.length > 2 ? { padding: "0 6px" } : undefined}
                  >
                    {item.label}
                  </TBtn>
                ))}
              </div>
            )}
          </Popover>
        ))}
        <span className={styles.mathBarDiv} />
        <TBtn
          square
          tooltip={`${t("editor.mathInline")} / ${t("editor.mathBlock")}`}
          onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathToggleMode.current?.(); }}
        ><ArrowLeftRight size={15} /></TBtn>
        <TBtn
          square
          className={styles.tableDangerBtn}
          tooltip={t("editor.deleteMath")}
          onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathDeleteNode.current?.(); }}
        ><TblTrash /></TBtn>
      </div>
    </FloatingBar>
  );
})
