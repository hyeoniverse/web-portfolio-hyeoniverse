"use client";

import React, { useCallback, useMemo } from "react";
import { CAPTION_EDIT_EVENT } from "../constants";
import { ImageUp, AlignCenter, Scaling, Type } from "lucide-react";
import FloatingBar from "./FloatingBar";
import { RxReset } from "react-icons/rx";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import Popover, { MenuDivider } from "@/components/ui/Popover";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { TblTrash, LockIcon, UnlockIcon } from "../icons";
import { IMG_ALIGNS, IMG_ALIGN_ICONS, IMG_FILTERS } from "../constants";
import { _imageUploadFn, _uploadErrorFn } from "../utils";
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
const IMG_SIZES = [{ label: "S", w: 320 }, { label: "M", w: 480 }, { label: "L", w: 640 }];
const IMG_MIN_PX = 20;
const IMG_MAX_PX = 4096;

/**
 * 이미지 floating toolbar — 선택한 이미지 바로 위에 컴팩트하게 뜬다.
 * 메인: 레이아웃 / 정렬(block 일 때) / 캡션 토글 / ⋯
 * ⋯ 오버플로: 비율잠금·W/H·원본복원 / 필터 / 순서 / 삭제
 */
export default React.memo(function ImageToolbar({
  editor, visible, selectedImage, setImageAttr, onFocusCapture, onBlurCapture,
}: ImageToolbarProps) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "en" ? en : ko);

  // 현재 대상 이미지의 인스턴스 식별자(path) — 같은 이미지 툴바가 열린 채 다른 이미지로 옮겨가면
  // 값이 바뀌어 FloatingBar 의 pin/오프셋이 리셋되고 새 이미지에 재앵커된다.
  const anchorKey = useMemo(() => {
    try { const p = selectedImage ? editor.api.findPath(selectedImage) : null; return p ? (p as number[]).join(",") : null; }
    catch { return null; }
  }, [editor, selectedImage]);

  const getRect = useCallback((): DOMRect => {
    try {
      const dom = selectedImage ? editor.api.toDOMNode(selectedImage) : null;
      if (dom) {
        // 가로/상단은 실제 <img> 박스 기준(정렬), 단 아래에 캡션이 있으면 rect 하단을 캡션까지 확장 →
        // 공간 부족으로 toolbar 가 flip(아래로) 될 때 캡션을 가리지 않고 캡션 아래로 내려감.
        const img = (dom as HTMLElement).querySelector("img");
        const base = (img || dom).getBoundingClientRect();
        const cap = (dom as HTMLElement).querySelector("[data-img-caption]");
        if (cap) {
          const cr = cap.getBoundingClientRect();
          if (cr.bottom > base.bottom) return new DOMRect(base.x, base.y, base.width, cr.bottom - base.y);
        }
        return base;
      }
    } catch { /* ignore */ }
    return new DOMRect();
  }, [editor, selectedImage]);

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
      } catch (err) { _uploadErrorFn.current?.(err); }
    };
    input.click();
  }, [setImageAttr]);

  // 캡션 추가 — 이미지 DOM 노드에 커스텀 이벤트 dispatch → 이미지가 캡션 input 을 렌더 + focus.
  // (input 이 아직 없어도 이미지 쪽에서 먼저 렌더시킨 뒤 focus 하므로 안정적)
  const focusCaption = useCallback(() => {
    try {
      const dom = (selectedImage ? editor.api.toDOMNode(selectedImage) : null) as HTMLElement | null;
      dom?.dispatchEvent(new CustomEvent(CAPTION_EDIT_EVENT.image, { bubbles: true }));
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

  return (
    <FloatingBar open getAnchorRect={getRect} inline anchorKey={anchorKey} onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture}>
      {/* 배치·정렬 popover */}
      <Popover openOnHover placement="bottom-start" offset={8}
        trigger={<TBtn tooltip={L("배치·정렬", "Layout & align")}><span className={styles.tblBarLabel}><AlignCenter size={15} strokeWidth={1.75} />{L("배치", "Layout")}</span></TBtn>}>
        {() => (
          <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{L("배치", "Layout")}</span>
              <TBtn active={layout === "inline"} onClick={() => setImageAttr("layout", "inline")} tooltip={L("본문 흐름 안에", "Inline with text")}>{LAYOUT_LABELS.inline}</TBtn>
              <TBtn active={layout === "block"} onClick={() => setImageAttr("layout", "block")} tooltip={L("단독 블록", "Standalone block")}>{LAYOUT_LABELS.block}</TBtn>
              <TBtn active={isFloat} onClick={() => { if (!isFloat) setImageAttr("layout", "float-left"); }} tooltip={L("본문 옆에 띄우기", "Float beside text")}>{LAYOUT_LABELS.float}</TBtn>
            </div>
            {layout !== "inline" && (
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>{L("정렬", "Align")}</span>
                {isFloat ? (
                  <>
                    <TBtn square active={layout === "float-left"} onClick={() => setImageAttr("layout", "float-left")} tooltip={t("editor.left")}>{IMG_ALIGN_ICONS.left}</TBtn>
                    <TBtn square active={layout === "float-right"} onClick={() => setImageAttr("layout", "float-right")} tooltip={t("editor.right")}>{IMG_ALIGN_ICONS.right}</TBtn>
                  </>
                ) : (
                  IMG_ALIGNS.map((a) => (
                    <TBtn key={a} square active={(selectedImage.align as string || "center") === a}
                      onClick={() => setImageAttr("align", a)}
                      tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}>
                      {IMG_ALIGN_ICONS[a]}
                    </TBtn>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Popover>
      {/* 크기·효과 popover */}
      <Popover openOnHover placement="bottom-start" offset={8}
        trigger={<TBtn tooltip={L("크기·효과", "Size & effects")}><span className={styles.tblBarLabel}><Scaling size={15} strokeWidth={1.75} />{L("크기", "Size")}</span></TBtn>}>
        {() => (
          <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{L("크기", "Size")}</span>
              {IMG_SIZES.map((s) => (
                <TBtn key={s.label} active={wVal === s.w} onClick={() => { setImageAttr("width", s.w); setImageAttr("height", 0); }} tooltip={`${s.w}px`}>{s.label}</TBtn>
              ))}
            </div>
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>{t("editor.ratio")}</span>
              <TBtn active={lock} onClick={() => setImageAttr("lockAspect", !lock)} tooltip={lock ? t("editor.lockAspect") : t("editor.unlockAspect")}>
                <span className={styles.tblBarLabel}>{lock ? <LockIcon /> : <UnlockIcon />}{lock ? L("고정", "Locked") : L("해제", "Free")}</span>
              </TBtn>
              <span className={styles.flexSpacer} />
              <TBtn square onClick={() => { setImageAttr("width", 0); setImageAttr("height", 0); }} tooltip={t("editor.restoreOriginal")}><RxReset size={14} /></TBtn>
            </div>
            {wVal > 0 && (
              <>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("너비", "Width")}</span>
                  <NumberInput value={wVal} min={IMG_MIN_PX} max={IMG_MAX_PX} width={72} onCommit={commitW} ariaLabel="Width" />
                </div>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("높이", "Height")}</span>
                  <NumberInput value={hVal} min={IMG_MIN_PX} max={IMG_MAX_PX} width={72} placeholder="auto" onCommit={commitH} ariaLabel="Height" />
                </div>
              </>
            )}
            <MenuDivider />
            <div className={styles.tableGroup}>
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
      {/* 캡션 */}
      <TBtn active={!!(selectedImage.caption as string)} onClick={focusCaption} tooltip={t("editor.caption")}>
        <span className={styles.tblBarLabel}><Type size={15} strokeWidth={1.75} />{t("editor.caption")}</span>
      </TBtn>
      {/* 교체 */}
      {_imageUploadFn.current && (
        <TBtn square onClick={replaceImage} tooltip={t("editor.replaceImage")}><ImageUp size={16} strokeWidth={1.75} /></TBtn>
      )}
      {/* 삭제 — 확인 후 삭제 */}
      <Popover openOnHover placement="bottom-end" offset={12} contentClassName={styles.floatingMenu}
        trigger={<TBtn square className={styles.tableDangerBtn} tooltip={t("editor.deleteImage")}><TblTrash /></TBtn>}>
        {({ close }) => (
          <div onMouseDown={(e) => e.preventDefault()} className={styles.imgConfirm}>
            <span className={styles.imgConfirmMsg}>{t("editor.deleteImageConfirm")}</span>
            <div className={styles.imgConfirmActions}>
              <TBtn onClick={close}>{t("editor.cancel")}</TBtn>
              <TBtn className={styles.tableDangerBtn} onClick={() => { deleteImage(); close(); }}>{t("editor.delete")}</TBtn>
            </div>
          </div>
        )}
      </Popover>
    </FloatingBar>
  );
});
