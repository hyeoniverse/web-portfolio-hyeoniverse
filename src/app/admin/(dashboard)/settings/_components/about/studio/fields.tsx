"use client";

import { useState } from "react";
import css from "../AboutStudio.module.css";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { FONT_FAMILIES_FLAT, FONT_GROUPS } from "@/components/posts/plate/constants";
import Button from "@/components/ui/Button";
import ColorPicker from "@/components/ui/ColorPicker";
import FontPicker from "@/components/ui/FontPicker";
import Pressable from "@/components/ui/Pressable";
import { Slider } from "@/components/ui/Slider";
import { type TFunction } from "@/providers/LanguageProvider";
/* 폰트 선택 — 공통 FontPicker. "기본" (빈 값)만 앞에 덧붙인다. */
export function AboutFontPicker({ value, onChange, fallbackLabel, dropAlign }: {
  value: string; onChange: (v: string) => void; fallbackLabel: string;
  dropAlign?: "active" | "below";
}) {
  return (
    <FontPicker
      value={value}
      onChange={(v) => onChange(v)}
      groups={[{ group: "", fonts: [{ label: fallbackLabel, value: "" }] }, ...FONT_GROUPS]}
      dropAlign={dropAlign}
      triggerClassName={css.fontTrigger}
      dropdownClassName={css.fontDropdown}
      enableGoogleSearch
      fallbackLabel={fallbackLabel}
      renderValue={() => {
        const matched = FONT_FAMILIES_FLAT.find((f) => f.value === value);
        const label = matched ? matched.label
          : value ? value.replace(/["']/g, "").split(",")[0].trim() : fallbackLabel;
        return <span style={{ fontFamily: value || undefined }}>{label}</span>;
      }}
    />
  );
}

/* ═══════════ 배경 서브 컨트롤 ═══════════ */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={css.bgSliderRow}>
      <span>{label}</span>
      <ColorPicker value={value} onChange={(c) => onChange(c.hex)}>
        {({ toggle }) => <Pressable className={css.ttSwatch} style={{ background: value }} onClick={toggle} aria-label={label} />}
      </ColorPicker>
    </div>
  );
}

/* 색 선택 필드 — 스와치 + 라벨 + 값 (단색/그라데이션 stop 용) */
export function SwatchField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <ColorPicker value={value} onChange={(c) => onChange(c.hex)}>
      {({ toggle }) => (
        <Pressable className={css.swatchField} onClick={toggle}>
          <span className={css.swatchChip} style={{ background: value }} />
          <span className={css.swatchLabel}>{label}</span>
          <span className={css.swatchVal}>{value}</span>
        </Pressable>
      )}
    </ColorPicker>
  );
}

export function BgMedia({ media, t, onSet, opacity, onOpacity, overlay, onOverlay, strength, onStrength }: {
  media: string; t: TFunction; onSet: (u: string) => void;
  opacity: number; onOpacity: (n: number) => void;
  overlay: string; onOverlay: (c: string) => void;
  strength: number; onStrength: (n: number) => void;
}) {
  const [pick, setPick] = useState(false);
  return (
    <>
      <div className={css.mediaActions}>
        <Button variant="outline" size="sm" onClick={() => setPick((v) => !v)}>
          {pick ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}
        </Button>
        {media && <Button variant="outline" size="sm" onClick={() => onSet("")}>{t("admin.settings.aboutHeroBgClear")}</Button>}
      </div>
      {pick && (
        <CoverImagePicker onSelect={(u) => { onSet(u); setPick(false); }} onClose={() => setPick(false)} currentUrl={media}
          postContext={{ title: "About hero background", tags: ["hero", "abstract"], excerpt: "" }} />
      )}
      {media && (
        <>
          <div className={css.bgSliderRow}><span>{t("admin.settings.aboutHeroBgOpacity")}</span><span>{Math.round(opacity * 100)}%</span></div>
          <Slider min={0} max={1} step={0.01} value={[opacity]} onValueChange={([n]) => onOpacity(Math.round(n * 100) / 100)} />
          <ColorRow label={t("admin.settings.aboutHeroVideoOverlayColor")} value={overlay} onChange={onOverlay} />
          <div className={css.bgSliderRow}><span>{t("admin.settings.aboutHeroVideoOverlayStrength")}</span><span>{Math.round(strength * 100)}%</span></div>
          <Slider min={0} max={1} step={0.01} value={[strength]} onValueChange={([n]) => onStrength(Math.round(n * 100) / 100)} />
        </>
      )}
    </>
  );
}
