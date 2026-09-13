"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, ArrowRight, Zap, ExternalLink } from "@/components/icons";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm, ModalAlert } from "@/components/ui/ModalTemplates";
import Tooltip from "@/components/ui/Tooltip";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import { MoreVertical, ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "@/components/icons";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import Pressable from "@/components/ui/Pressable";
import { md, DemoGroup, useDemo } from "./demoShared";

/* 이미지 뷰어 시연 사진. 뷰어는 원본(1200×800)을 쓰고, 썸네일 칸은 칸 크기로 받는다. 예전에는 120×68 칸에도 원본을 받아
   다섯 장에 1MB 가 넘었다(#907). Unsplash 주소는 w·h·dpr 로 크기를 정하고, 고밀도 화면은 srcSet 의 2x·3x 를 고른다 */
const IV_PHOTOS = [
  "photo-1506744038136-46273834b3fb",
  "photo-1469474968028-56623f02e42e",
  "photo-1501785888041-af3ef285b470",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1447752875215-b2761acb3c5d",
];
const IV_THUMB = { w: 120, h: 68 };
const unsplash = (id: string, w: number, h: number, dpr = 1) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop${dpr > 1 ? `&dpr=${dpr}` : ""}`;
const IV_IMAGES = IV_PHOTOS.map((id) => unsplash(id, 1200, 800));

/** Overlays & Popovers — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function OverlaysPopoversDemos() {
  const { language, scrollChildX } = useDemo();
  const { openModal } = useModalStore();
  const [ivOpen, setIvOpen] = useState(false);
  const [ivIndex, setIvIndex] = useState(0);
  const handleOpenModal = useCallback((title: string, content: React.ReactNode) => {
    openModal(content, { header: { title }, closeButton: true, width: "420px" });
  }, [openModal]);

  return (
    <>
        <h3 className={styles.componentCategory}>Overlays & Popovers</h3>

        {/* Modal */}
        <DemoGroup title="Modal">
          <div className={styles.modalDemo}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}>
              <Tooltip content="ModalConfirm template">
                <Button
                  variant="outline"
                  onClick={() => handleOpenModal("Confirm Action", (
                    <ModalConfirm
                      desc="Are you sure you want to proceed? This action cannot be undone."
                      confirmText="Confirm"
                      onConfirm={() => {}}
                    />
                  ))}
                >
                  Confirm
                </Button>
              </Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}>
              {/* children — 확인 전에 "무엇이 바뀌는지" 를 목록으로. 문장으로 뭉개면 되돌릴 수 없는 동작에서 판단 근거가 사라진다 */}
              <Tooltip content="ModalConfirm with children — list what changes">
                <Button
                  variant="outline"
                  tone="danger"
                  onClick={() => handleOpenModal("Apply Changes", (
                    <ModalConfirm
                      desc="Applying this replaces part of the current data. This cannot be undone."
                      confirmText="Apply"
                      onConfirm={() => {}}
                    >
                      <ul className={styles.modalChangeList}>
                        <li><strong>2 tables</strong> will be removed — <code>legacy_tags</code>, <code>old_views</code></li>
                        <li><strong>1 column</strong> will be overwritten — <code>posts.title</code> <code>text → varchar(200)</code></li>
                        <li><strong>18 tables</strong> stay untouched</li>
                      </ul>
                    </ModalConfirm>
                  ))}
                >
                  Confirm with detail
                </Button>
              </Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}>
              <Tooltip content="Modal with icon + centered layout">
                <Button
                  variant="outline"
                  icon={<Star size={16} />}
                  onClick={() => handleOpenModal("Feature Highlight", (
                    <div className={styles.modalContentCenter}>
                      <Zap size={48} color="var(--color-accent)" />
                      <Typography variant="h4">Design Tokens</Typography>
                      <Typography variant="body2" color="secondary">A 4-tier token system: raw → semantic → component → context.</Typography>
                    </div>
                  ))}
                >
                  Showcase
                </Button>
              </Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}>
              <Tooltip content="ModalAlert template">
                <Button
                  variant="outline"
                  onClick={() => openModal((
                    <ModalAlert
                      desc="Minimal modal without a header. Useful for quick notifications or lightweight confirmations."
                      confirmText="OK"
                    />
                  ), { closeButton: true, width: "420px" })}
                >
                  Alert
                </Button>
              </Tooltip>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}>
              <Tooltip content="header.actions (헤더 우측) + subButtons (X 왼쪽)">
                <Button
                  variant="outline"
                  onClick={() => openModal((
                    <div className={styles.modalContentCenter}>
                      <Typography variant="body2" color="secondary">
                        {language === "ko"
                          ? "header.actions 는 헤더 우측의 액션 영역(닫기 버튼 왼쪽)에 들어가고, subButtons 는 X 버튼에 바로 붙는 자리에 들어갑니다. 뒤로/앞으로 같은 네비게이션에 씁니다."
                          : "header.actions fills the header's right-hand action area (left of close); subButtons sits flush against the X — for back/forward style navigation."}
                      </Typography>
                    </div>
                  ), {
                    header: {
                      icon: <Zap size={16} />,
                      title: language === "ko" ? "헤더 액션" : "Header actions",
                      actions: <Button variant="link" size="xs" icon={<ExternalLink size={12} />} iconPosition="right">Docs</Button>,
                    },
                    subButtons: <Button variant="ghost" shape="circle" size="xs" icon={<ArrowRight size={14} />} aria-label="next" soundDisabled />,
                    closeButton: true,
                    width: "460px",
                  })}
                >
                  Header actions
                </Button>
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* ImageViewer */}
        <DemoGroup
          title="ImageViewer"
          ko={"아래 이미지를 클릭하면 뷰어가 열립니다. 확대·이동·썸네일 탐색·풀스크린을 지원합니다."}
          en={"Click any image below to open the viewer. Supports zoom, pan, thumbnail navigation, and fullscreen."}
        >
          <div
            style={{
              display: "inline-flex",
              borderTop: "var(--border-light)",
              borderBottom: "var(--border-light)",
              lineHeight: 0,
            }}
          >
            {IV_PHOTOS.map((id, i) => (
              <motion.div key={id} variants={staggerItemX} {...scrollChildX(i, IV_PHOTOS.length)}>
                <Tooltip content={`Sample image ${i + 1} — Click to open ImageViewer`}>
                  <Pressable
                    style={{
                      width: IV_THUMB.w,
                      height: IV_THUMB.h,
                      borderRadius: 0,
                      overflow: "hidden",
                      border: "none",
                      padding: 0,
                      background: "var(--bg-secondary)",
                      cursor: "pointer",
                    }}
                    onClick={() => { setIvIndex(i); setIvOpen(true); }}
                  >
                    {/* 페이지 아래쪽이라 늦게 받는다. loading 이 없으면 React 가 서버 HTML 의 head 에 미리 받기로 올려,
                        첫 페인트를 막는 CSS 와 대역을 나눠 쓴다(#905) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={unsplash(id, IV_THUMB.w, IV_THUMB.h)}
                      srcSet={`${unsplash(id, IV_THUMB.w, IV_THUMB.h, 2)} 2x, ${unsplash(id, IV_THUMB.w, IV_THUMB.h, 3)} 3x`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </Pressable>
                </Tooltip>
              </motion.div>
            ))}
          </div>
          <ImageViewer
            images={IV_IMAGES}
            index={ivIndex}
            open={ivOpen}
            onClose={() => setIvOpen(false)}
            title="Design System Preview"
          />
        </DemoGroup>

        {/* Popover */}
        <DemoGroup title="Popover">
          <div className={styles.componentSubLabel}>base</div>
          <p className={styles.componentDesc}>
            anchor + portal · outside click / ESC 자동 닫힘 · 터치 디바이스에선 bottom sheet 로 자동 분기 · 모달 안에선 그 stacking context 로 portal 돼 전역 z-index 없이도 모달 위에 뜬다
          </p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
            <Popover
              trigger={<Button variant="outline" shape="square" icon={<MoreVertical size={16} />} aria-label="Row actions" />}
              sheetTitle="Row actions"
            >
              {({ close }) => (
                <div style={{ minWidth: 180 }}>
                  <MenuItem icon={<ChevronsLeft size={14} />} label="맨앞으로" onClick={close} />
                  <MenuItem icon={<ChevronsRight size={14} />} label="맨뒤로" onClick={close} />
                  <MenuDivider />
                  <MenuItem icon={<Pencil size={14} />} label="수정" onClick={close} />
                  <MenuItem icon={<Trash2 size={14} />} label="삭제" onClick={close} />
                </div>
              )}
            </Popover>
          </motion.div>
          <div className={styles.componentSubLabel}>variants</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "예전에는 호출부마다 유리 배경을 제각각 override 했는데, 이를 variant 로 흡수했습니다. glass(기본)는 반투명 scrim 과 blur 라 안쪽 색이 그대로 살아납니다. solid 는 뒤가 전혀 비치면 안 될 때 씁니다. difference 는 패널째 뒤 페이지와 반전 합성해서 밑에 무엇이 깔리든 대비가 자동으로 잡힙니다. 다만 difference 는 subtree 가 한 덩어리로 합성돼 안쪽 색 구분이 사라지고, 배경이 임의의 색이면 색이 틀어집니다. 그래서 기본값은 glass 입니다. 아래 그라데이션 위에 열어 비교해 보세요."
              : "Each call site used to override its own glass background → absorbed into variant. glass (default) is a translucent scrim + blur, so inner colors survive; solid is for when nothing behind may show through; difference blends the whole panel against the page so contrast holds over anything. The trade-off: difference composites the subtree as one mass, losing inner color distinctions, and shifts hue over arbitrary backgrounds — hence glass as the default. Open them over the gradient below to compare.")}
          </p>
          <motion.div
            className={styles.popoverBackdrop}
            variants={staggerItemX}
            {...scrollChildX(0, 1)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.popoverBackdropImg}
              src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=400&fit=crop"
              alt=""
              loading="lazy"
              decoding="async"
            />
            {([
              { v: "glass", label: language === "ko" ? "Glass (기본)" : "Glass (default)" },
              { v: "solid", label: "Solid" },
              { v: "difference", label: "Difference" },
            ] as const).map((o) => (
              <Popover
                key={o.v}
                variant={o.v}
                trigger={<Button variant="primary" size="sm">{o.label}</Button>}
                placement="bottom-start"
                sheetTitle={o.label}
              >
                <div className={styles.popoverNote} style={{ maxWidth: 200 }}>
                  variant=&quot;{o.v}&quot;
                  <br />
                  {language === "ko" ? "그라데이션 위에서 대비를 확인" : "Check contrast over the gradient"}
                </div>
              </Popover>
            ))}
          </motion.div>
          <div className={styles.componentSubLabel}>openOnHover</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "데스크톱에서는 hover 로 열립니다. 열림은 즉시 이뤄지고 닫힘은 500ms 지연되므로, trigger 와 content 사이를 지나가도 닫히지 않습니다. hover popover 는 한 번에 하나만 열립니다(둘을 번갈아 올려 보세요). 클릭도 그대로 동작하며, hover 개념이 없는 터치/sheet 모드에서는 무시됩니다."
              : "Opens on hover on desktop — instantly on enter, with a 500ms close delay so crossing from trigger to content doesn't dismiss it. Only one hover popover stays open at a time (try alternating between the two). Click still works, and it's ignored in touch/sheet mode where hover doesn't exist.")}
          </p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center" }}>
            {["Format", "Insert"].map((label) => (
              <Popover
                key={label}
                openOnHover
                trigger={<Button variant="ghost" size="sm">{label}</Button>}
                placement="bottom-start"
              >
                {({ close }) => (
                  <div style={{ minWidth: 160, padding: "var(--spacing-sm)" }}>
                    <MenuItem icon={<Star size={14} />} label={`${label} A`} onClick={close} />
                    <MenuItem icon={<Zap size={14} />} label={`${label} B`} onClick={close} />
                  </div>
                )}
              </Popover>
            ))}
          </motion.div>
        </DemoGroup>

    </>
  );
}
