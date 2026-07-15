"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorRef, PlateElement, type PlateElementProps } from "platejs/react";
import { Plus, Smile, Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Tooltip from "@/components/ui/Tooltip";
import EmojiPickerPopup, { EmojiIcon } from "@/components/ui/EmojiPicker";
import { _imageUploadFn } from "./utils";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";

type Popup = { tab: number; mode: "tools" | "emoji" };
type Pos = { left: number; top: number; up: boolean };

/** 탭 라벨 최대 글자수 — 탭은 짧은 제목이므로 넘치지 않게 제한 */
const TAB_LABEL_MAX = 40;

/** 탭 블록 — activeTab + tab_panel(label, icon). 탭 클릭=전환 / 선택탭 재클릭=도구 팝업(이름·아이콘·삭제).
 *  팝업/이모지 picker 는 블록에 anchor 된 absolute (스크롤 따라 움직이고 overflow 에 잘림) + 뷰포트 안으로 배치. */
export function TabsElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { language } = useLanguage();
  const el = props.element as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panels = (el.children as any[]) || [];
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const activeTab = Math.min(Math.max(0, (el.activeTab as number) ?? 0), Math.max(0, panels.length - 1));
  const { blockDragProps } = useBlockDrag(elPath);

  const blockRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const setActive = (i: number) => { if (elPath) editor.tf.setNodes({ activeTab: i }, { at: elPath }); };
  const setLabel = (i: number, label: string) => { if (elPath) editor.tf.setNodes({ label }, { at: [...elPath, i] }); };
  const setIcon = (i: number, icon: string) => { if (elPath) editor.tf.setNodes({ icon: icon || undefined }, { at: [...elPath, i] }); };
  const addTab = () => {
    if (!elPath) return;
    const idx = panels.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.tf.insertNodes({ type: "tab_panel", label: `Tab ${idx + 1}`, children: [{ type: "p", children: [{ text: "" }] }] } as any, { at: [...elPath, idx] });
    setActive(idx);
  };
  const removeTab = (i: number) => {
    if (!elPath || panels.length <= 1) return;
    try { editor.tf.removeNodes({ at: [...elPath, i] }); } catch { /* noop */ }
    setActive(Math.max(0, Math.min(i, panels.length - 2)));
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelOf = (p: any, i: number) => (p?.label as string) ?? `Tab ${i + 1}`;

  // 뷰포트 안으로 들어오게 배치(넓은 쪽). block 기준 absolute 좌표 반환.
  const compute = (anchor: HTMLElement, w: number, h: number): Pos => {
    const block = blockRef.current?.getBoundingClientRect();
    const tab = anchor.getBoundingClientRect();
    if (!block) return { left: 0, top: 0, up: false };
    const gap = 6;
    const vw = window.innerWidth, vh = window.innerHeight;
    let absL = tab.left;
    if (absL + w > vw - 8) absL = vw - 8 - w;
    absL = Math.max(8, absL);
    const up = tab.bottom + h + gap > vh && tab.top - h - gap > 8;
    return { left: absL - block.left, top: (up ? tab.top : tab.bottom) - block.top, up };
  };

  const onTab = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLElement;
    if (i !== activeTab) { setActive(i); setPopup(null); return; }
    if (popup && popup.mode === "tools") { setPopup(null); return; }
    anchorRef.current = btn;
    setPos(compute(btn, 220, 170));
    setPopup({ tab: i, mode: "tools" });
  };
  const openEmoji = () => {
    if (anchorRef.current) setPos(compute(anchorRef.current, 340, 420));
    setPopup((p) => (p ? { ...p, mode: "emoji" } : p));
  };

  // 바깥 클릭 → 팝업 닫기 (이모지 모드는 picker 가 자체 처리)
  useEffect(() => {
    if (!popup || popup.mode !== "tools") return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      setPopup(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [popup]);

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props} className="tabs-block">
          <div className="tabs-block-inner" ref={blockRef}>
            <div className="tabs-header" contentEditable={false}>
              {panels.map((p, i) => {
                const icon = p.icon as string | undefined;
                return (
                  <Tooltip key={(p.id as string) ?? i}
                    content={i === activeTab
                      ? (language === "ko" ? "다시 클릭하면 이름·아이콘 편집" : "Click again to edit name & icon")
                      : (language === "ko" ? "클릭하여 전환" : "Click to switch")}
                    delay={400} placement="top" wrapperStyle={{ display: "inline-flex" }}>
                    <button type="button"
                      className={`tabs-tab${i === activeTab ? " tabs-tab-active" : ""}`}
                      onMouseDown={(e) => onTab(i, e)}>
                      {icon && <span className="tabs-tab-icon"><EmojiIcon value={icon} /></span>}
                      <span>{labelOf(p, i)}</span>
                    </button>
                  </Tooltip>
                );
              })}
              <button type="button" className="tabs-add" aria-label="add tab"
                onMouseDown={(e) => { e.preventDefault(); addTab(); }}>
                <Plus size={14} />
              </button>
            </div>

            {popup && pos && popup.mode === "tools" && (
              <div
                ref={popupRef}
                className="tabs-popup"
                contentEditable={false}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ position: "absolute", left: pos.left, top: pos.top, transform: pos.up ? "translateY(calc(-100% - 6px))" : "translateY(6px)" }}
              >
                <div className="tabs-tools">
                  <div className="tabs-tools-main">
                    <Button type="button" shape="circle" variant="subtle" size="md" aria-label="icon"
                      onMouseDown={(e) => { e.preventDefault(); openEmoji(); }}>
                      {panels[popup.tab]?.icon ? <EmojiIcon value={panels[popup.tab].icon as string} /> : <Smile size={16} />}
                    </Button>
                    <Input className="tabs-tools-name" spellCheck={false} autoFocus size="md" maxLength={TAB_LABEL_MAX}
                      value={labelOf(panels[popup.tab], popup.tab)}
                      onChange={(v) => setLabel(popup.tab, v)} />
                  </div>
                  {panels.length > 1 && (
                    <button type="button" className="tabs-tools-delete"
                      onMouseDown={(e) => { e.preventDefault(); removeTab(popup.tab); setPopup(null); }}>
                      <Trash2 size={14} /> {language === "ko" ? "삭제" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            )}
            {popup && popup.mode === "emoji" && (
              <EmojiPickerPopup
                open
                getAnchorRect={() => anchorRef.current?.getBoundingClientRect() ?? null}
                onClose={() => setPopup(null)}
                onSelect={(val) => { setIcon(popup.tab, val); setPopup(null); }}
                onImageUpload={_imageUploadFn.current || undefined}
                currentValue={(panels[popup.tab]?.icon as string) || ""}
              />
            )}
          </div>

          <div className="tabs-body">
            {React.Children.map(props.children, (child, i) => (
              <div className="tabs-panel" style={{ display: i === activeTab ? "block" : "none" }}>{child}</div>
            ))}
          </div>
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}

/** 탭 패널 — 내용 블록 컨테이너 (표시 여부는 TabsElement 가 제어). data-block-container 로 멀티블록 선택 경계 표시. */
export function TabPanelElement(props: PlateElementProps) {
  return <PlateElement {...props} data-block-container="">{props.children}</PlateElement>;
}
