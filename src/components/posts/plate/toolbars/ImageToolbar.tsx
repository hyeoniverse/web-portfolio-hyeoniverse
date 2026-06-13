"use client";

import React, { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { MoreHorizontal, ImageUp } from "lucide-react";
import { RxReset } from "react-icons/rx";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import Popover, { MenuDivider } from "@/components/ui/Popover";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { TblTrash, LockIcon, UnlockIcon } from "../icons";
import { IMG_ALIGNS, IMG_ALIGN_ICONS, IMG_FILTERS } from "../constants";
import { _imageUploadFn } from "../utils";
import styles from "../../RichTextEditor.module.css";

interface ImageToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  visible: boolean;
  selectedImage: Record<string, unknown> | null;
  setImageAttr: (attr: string, val: unknown) => void;
  onFocusCapture?: () => void;
  onBlurCapture?: () => void;
}

const LAYOUT_LABELS = {
  inline: "Inline", block: "Block", float: "Float",
};

/**
 * 이미지 floating toolbar — 선택한 이미지 바로 위에 컴팩트하게 뜬다.
 * 메인: 레이아웃 / 정렬(block 일 때) / 캡션 토글 / ⋯
 * ⋯ 오버플로: 비율잠금·W/H·원본복원 / 필터 / 순서 / 삭제
 */
export default React.memo(function ImageToolbar({
  editor, visible, selectedImage, setImageAttr, onFocusCapture, onBlurCapture,
}: ImageToolbarProps) {
  const { t } = useLanguage();

  const getRect = useCallback((): DOMRect => {
    try {
      const dom = selectedImage ? editor.api.toDOMNode(selectedImage) : null;
      if (dom) {
        // 슬레이트 wrapper 가 아닌 실제 <img> 박스에 맞춰 toolbar 위치 계산
        // (wrapper 는 캡션·커서타깃까지 포함해 rect 가 이미지에서 벗어남)
        const img = (dom as HTMLElement).querySelector("img");
        return (img || dom).getBoundingClientRect();
      }
    } catch { /* ignore */ }
    return new DOMRect();
  }, [editor, selectedImage]);

  const { refs, style, update } = useVirtualFloating({
    open: visible,
    getBoundingClientRect: getRect,
    strategy: "fixed",
    placement: "top",
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  // 큰 이미지는 첫 렌더 시 레이아웃 전이라 rect 가 어긋남 → paint 후 rAF 로 위치 재계산
  useEffect(() => {
    if (!visible) return;
    update?.();
    const r = requestAnimationFrame(() => update?.());
    return () => cancelAnimationFrame(r);
  }, [visible, selectedImage, update]);

  const deleteImage = useCallback(() => {
    try {
      // selection 이 toolbar 로 넘어가 above 가 비어도 캐시된 selectedImage path 로 삭제
      let path = null;
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) path = entry[1];
      else if (selectedImage) { const p = editor.api.findPath(selectedImage); if (p) path = p; }
      if (path) editor.tf.removeNodes({ at: path });
    } catch { /* ignore */ }
  }, [editor, selectedImage]);

  // 이미지 교체 — 파일 선택 후 업로드, url 교체 + 크기 초기화(새 이미지 원본 비율)
  const replaceImage = useCallback(() => {
    const fn = _imageUploadFn.current;
    if (!fn) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await fn(file);
        if (url) { setImageAttr("url", url); setImageAttr("width", 0); setImageAttr("height", 0); }
      } catch { /* ignore */ }
    };
    input.click();
  }, [setImageAttr]);

  // 캡션 input 은 이미지 아래에 렌더됨 — toolbar 버튼은 그 input 을 편집 모드로 트리거
  const focusCaption = useCallback(() => {
    try {
      const dom = (selectedImage ? editor.api.toDOMNode(selectedImage) : null) as HTMLElement | null;
      const wrapper = (dom?.closest('[data-slate-node="element"]') as HTMLElement | null) || dom;
      const input = wrapper?.querySelector("[data-img-caption]") as HTMLTextAreaElement | null;
      if (input) {
        input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        setTimeout(() => input.focus(), 0);
      }
    } catch { /* ignore */ }
  }, [editor, selectedImage]);

  // W/H — NumberInput 이 draft/commit 을 내부 처리. lock 비율 연동만 부모에서.
  const wVal = (selectedImage?.width as number) || 0;
  const hVal = (selectedImage?.height as number) || 0;
  const lockVal = (selectedImage?.lockAspect as boolean) ?? true;
  const ratioVal = wVal > 0 && hVal > 0 ? wVal / hVal : 0;
  const commitW = useCallback((nw: number) => {
    setImageAttr("width", nw);
    if (lockVal && ratioVal > 0) setImageAttr("height", Math.round(nw / ratioVal));
  }, [lockVal, ratioVal, setImageAttr]);
  const commitH = useCallback((nh: number) => {
    setImageAttr("height", nh);
    if (lockVal && ratioVal > 0) setImageAttr("width", Math.round(nh * ratioVal));
  }, [lockVal, ratioVal, setImageAttr]);

  if (!visible || !selectedImage) return null;

  const layout = (selectedImage.layout as string) || "inline";
  const isFloat = layout.startsWith("float-");
  const lock = (selectedImage.lockAspect as boolean) ?? true;

  const toolbar = (
    <div ref={refs.setFloating} className={styles.floatingToolbar} style={style}
      onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture} onMouseDown={(e) => e.preventDefault()}>
      {/* 레이아웃 — Inline / Block / Float (Float 은 단일 버튼, 좌/우는 아래에서) */}
      <TBtn active={layout === "inline"} onClick={() => setImageAttr("layout", "inline")} tooltip={LAYOUT_LABELS.inline} style={{ padding: "0 10px" }}>{LAYOUT_LABELS.inline}</TBtn>
      <TBtn active={layout === "block"} onClick={() => setImageAttr("layout", "block")} tooltip={LAYOUT_LABELS.block} style={{ padding: "0 10px" }}>{LAYOUT_LABELS.block}</TBtn>
      <TBtn active={isFloat} onClick={() => { if (!isFloat) setImageAttr("layout", "float-left"); }} tooltip={LAYOUT_LABELS.float} style={{ padding: "0 10px" }}>{LAYOUT_LABELS.float}</TBtn>
      {/* block 정렬 — block 일 때만 (left/center/right) */}
      {layout === "block" && (
        <>
          <span className={styles.divider} />
          {IMG_ALIGNS.map((a) => (
            <TBtn key={a} square active={(selectedImage.align as string || "center") === a}
              onClick={() => setImageAttr("align", a)}
              tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}>
              {IMG_ALIGN_ICONS[a]}
            </TBtn>
          ))}
        </>
      )}
      {/* float 좌/우 — float 일 때만 */}
      {isFloat && (
        <>
          <span className={styles.divider} />
          <TBtn square active={layout === "float-left"} onClick={() => setImageAttr("layout", "float-left")} tooltip={t("editor.left")}>{IMG_ALIGN_ICONS.left}</TBtn>
          <TBtn square active={layout === "float-right"} onClick={() => setImageAttr("layout", "float-right")} tooltip={t("editor.right")}>{IMG_ALIGN_ICONS.right}</TBtn>
        </>
      )}
      <span className={styles.divider} />
      {/* 캡션 — 버튼만 (input 은 이미지 아래) */}
      <TBtn active={!!(selectedImage.caption as string)} onClick={focusCaption} tooltip={t("editor.caption")} style={{ padding: "0 10px" }}>
        {t("editor.caption")}
      </TBtn>
      <span className={styles.divider} />
      {/* 교체 / 삭제 — 메인 바에 노출 */}
      {_imageUploadFn.current && (
        <TBtn square onClick={replaceImage} tooltip={t("editor.replaceImage")}><ImageUp size={16} strokeWidth={1.75} /></TBtn>
      )}
      {/* 삭제 — 확인 후 삭제 */}
      <Popover placement="bottom-end" contentClassName={styles.floatingMenu}
        trigger={<TBtn square className={styles.tableDangerBtn} tooltip={t("editor.deleteImage")}><TblTrash /></TBtn>}>
        {({ close }) => (
          <div onMouseDown={(e) => e.preventDefault()} className={styles.imgConfirm}>
            <span className={styles.imgConfirmMsg}>{t("editor.deleteImageConfirm")}</span>
            <div className={styles.imgConfirmActions}>
              <TBtn onClick={close} style={{ padding: "0 12px" }}>{t("editor.cancel")}</TBtn>
              <TBtn className={styles.tableDangerBtn} onClick={() => { deleteImage(); close(); }} style={{ padding: "0 12px" }}>{t("editor.delete")}</TBtn>
            </div>
          </div>
        )}
      </Popover>
      <span className={styles.divider} />
      {/* ⋯ 오버플로 */}
      <Popover placement="bottom-end" contentClassName={styles.floatingMenu}
        trigger={<TBtn square tooltip={t("editor.more")}><MoreHorizontal size={14} strokeWidth={1.75} /></TBtn>}>
        {() => (
          <div onMouseDown={(e) => e.preventDefault()} className={styles.imgMoreMenu}>
            <div className={styles.imgMoreRow}>
              <TBtn active={lock} onClick={() => setImageAttr("lockAspect", !lock)} tooltip={lock ? t("editor.lockAspect") : t("editor.unlockAspect")} style={{ padding: "0 10px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "flex" }}>{lock ? <LockIcon /> : <UnlockIcon />}</span>{t("editor.ratio")}
                </span>
              </TBtn>
              <span style={{ flex: 1 }} />
              <TBtn square onClick={() => { setImageAttr("width", 0); setImageAttr("height", 0); }} tooltip={t("editor.restoreOriginal")}><RxReset size={14} /></TBtn>
            </div>
            {wVal > 0 && (
              <div className={styles.imgMoreRow}>
                <NumberInput label="W" value={wVal} min={1} width={52} onCommit={commitW} ariaLabel="Width" />
                <NumberInput label="H" value={hVal} min={1} width={52} placeholder="auto" onCommit={commitH} ariaLabel="Height" />
              </div>
            )}
            <MenuDivider />
            <div className={styles.imgMoreRow}>
              <span className={styles.tableGroupLabel}>{t("editor.filter")}</span>
              <Select
                value={(selectedImage.filter as string) || ""}
                options={IMG_FILTERS.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
                onChange={(v) => { setImageAttr("filter", v); setTimeout(() => editor.tf.focus(), 0); }}
                size="sm"
                width="max"
                preserveFocus
              />
            </div>
          </div>
        )}
      </Popover>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(toolbar, document.body) : null;
});
