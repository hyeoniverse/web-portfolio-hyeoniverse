"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Hash } from "@/components/icons";
import { showToast } from "@/stores/toastStore";
import Tooltip from "@/components/ui/Tooltip";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import RelatedChips from "@/components/ui/RelatedChips/RelatedChips";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import { md, DemoGroup, useDemo } from "./demoShared";

/** Chips — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function ChipsDemos() {
  const { language, scrollChildX } = useDemo();
  const [dragTags, setDragTags] = useState(["React", "Next.js", "TypeScript", "GSAP"]);
  const { itemProps: tagItemProps } = useChipReorder((from, to) => {
    setDragTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  });

  return (
    <>
        <h3 className={styles.componentCategory}>Chips</h3>

        {/* Chip */}
        <DemoGroup title="Chip">
          <div className={styles.componentSubLabel}>draggable capsule</div>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
            {dragTags.map((tag, i) => {
              const { dragging, dropSide, ...handlers } = tagItemProps(i);
              return (
                <Chip
                  key={`${tag}-${i}`}
                  variant="capsule"
                  showHandle
                  onRemove={() => setDragTags((prev) => prev.filter((_, j) => j !== i))}
                  dragging={dragging}
                  dropSide={dropSide}
                  dragHandlers={{ draggable: true, ...handlers }}
                >
                  {tag}
                </Chip>
              );
            })}
          </motion.div>
          <div className={styles.componentSubLabel}>variants & states</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "variant 는 capsule 또는 bare 를 고르고, leftIcon·active(편집 중)·onClick(button) 을 지원합니다. 핸들 위에 커서를 올리면 data-cursor 로 \"Drag\" 커서가 나타납니다."
              : "variant capsule|bare · leftIcon · active(editing) · onClick(button) · grip shows a \"Drag\" cursor via data-cursor.")}
          </p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)", alignItems: "center" }}>
            <Tooltip content="variant: capsule + leftIcon">
              <Chip variant="capsule" leftIcon={<Hash size={11} />}>react</Chip>
            </Tooltip>
            <Tooltip content="variant: bare (text-only)">
              <Chip variant="bare">#tag</Chip>
            </Tooltip>
            <Tooltip content="active — edit drawer open">
              <Chip variant="capsule" active>editing…</Chip>
            </Tooltip>
            <Tooltip content="onClick (button mode)">
              <Chip variant="capsule" onClick={() => showToast(language === "ko" ? "칩 클릭" : "chip clicked", "info")}>clickable</Chip>
            </Tooltip>
            <Tooltip content="showHandle — grip + Drag cursor">
              <Chip variant="capsule" showHandle leftIcon={<Star size={11} />}>draggable</Chip>
            </Tooltip>
          </motion.div>
          <div className={styles.componentSubLabel}>status dot (발행 상태)</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "`variant=\"capsule\"` 에 `leftIcon` 으로 색 dot 을 넣어 상태를 구분합니다. 에디터 상단 바의 발행 상태 표시가 이 패턴입니다 — 발행됨은 success, 예약 발행은 warning, 미발행은 muted 색 dot 입니다. dot 은 7px 원이고 색만 semantic 토큰으로 바뀝니다."
              : "A colored dot via `leftIcon` on a `variant=\"capsule\"` chip marks the state. The editor top bar's publish indicator uses this — published is success, scheduled is warning, draft is a muted dot. The dot is a 7px circle; only its color swaps via semantic tokens.")}
          </p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)", alignItems: "center" }}>
            {([
              { label: language === "ko" ? "발행됨" : "Published", color: "var(--bg-success-solid)" },
              { label: language === "ko" ? "예약 발행" : "Scheduled", color: "var(--bg-warning-solid)" },
              { label: language === "ko" ? "미발행" : "Draft", color: "var(--text-tertiary)" },
            ] as const).map((s) => (
              <Chip
                key={s.label}
                variant="capsule"
                leftIcon={<span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "var(--radius-circle)", background: s.color }} aria-hidden />}
              >
                {s.label}
              </Chip>
            ))}
          </motion.div>
        </DemoGroup>

        {/* RelatedChips */}
        <DemoGroup
          title="RelatedChips"
          ko={"관련 글이나 프로젝트를 보여 주는 칩입니다. 썸네일·제목·카테고리를 담고, `+N 더보기` 토글을 제공하며, 데스크톱에서는 hover 시 미리보기 카드를 띄웁니다."}
          en={"Related post / project chips — thumbnail + title + category, `+N more` toggle, hover preview card (desktop)."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
            <RelatedChips
              moreLabel={language === "ko" ? "더보기" : "More"}
              lessLabel={language === "ko" ? "접기" : "Less"}
              items={[
                { id: "1", title: "Design Tokens 정리", href: "#", category: "CSS", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=200&fit=crop", desc: "raw → semantic → component → context 4-tier 토큰 시스템" },
                { id: "2", title: "Plate Editor 마이그레이션", href: "#", category: "Editor", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=200&fit=crop", desc: "Tiptap 에서 Plate 로 — IME workaround 포함" },
                { id: "3", title: "Lenis Smooth Scroll", href: "#", category: "UX" },
                { id: "4", title: "Framer Motion Stagger", href: "#", category: "Animation" },
                { id: "5", title: "GSAP Horizontal Scroll", href: "#", category: "Animation" },
                { id: "6", title: "Admin 리스트 리팩토링", href: "#", category: "Admin" },
                { id: "7", title: "TOC 공통 컴포넌트", href: "#", category: "Refactor" },
                { id: "8", title: "이모지 Picker SVG", href: "#", category: "Editor" },
                { id: "9", title: "Autosave Debounce", href: "#", category: "Editor" },
                { id: "10", title: "Theme Provider", href: "#", category: "System" },
              ]}
            />
          </motion.div>
        </DemoGroup>

    </>
  );
}
