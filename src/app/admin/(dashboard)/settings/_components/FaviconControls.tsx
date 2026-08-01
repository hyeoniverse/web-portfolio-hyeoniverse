"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Equal, ArrowLeftRight, X } from "@/components/icons";
import { type TFunction } from "@/providers/LanguageProvider";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import RadioGroup from "@/components/ui/RadioGroup";
import { Switch } from "@/components/ui/Switch";
import NumberInput from "@/components/ui/NumberInput";
import FieldRow from "@/components/ui/FieldRow";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { FAVICON_SHADOW_PRESETS, FAVICON_SIZE_BLUR } from "../_data/faviconPresets";
import { resolveFaviconShadow, type FaviconShadow } from "@/lib/favicon";
import styles from "./AppearanceTab.module.css";
import shared from "../Settings.module.css";

/** 라이트/다크 색 쌍 편의 버튼 — 맞추기(다크=라이트) / 서로 바꾸기 / 지우기 */
export function ColorDuoTools({
  light,
  dark,
  onLight,
  onDark,
  labels,
}: {
  light: string;
  dark: string;
  onLight: (v: string) => void;
  onDark: (v: string) => void;
  labels: { match: string; swap: string; clear: string };
}) {
  return (
    <div className={styles.faviconColorTools}>
      <button type="button" className={styles.faviconColorTool} title={labels.match} aria-label={labels.match} onClick={() => onDark(light)}>
        <Equal size={13} strokeWidth={2} />
      </button>
      <button type="button" className={styles.faviconColorTool} title={labels.swap} aria-label={labels.swap} onClick={() => { const l = light; onLight(dark); onDark(l); }}>
        <ArrowLeftRight size={13} strokeWidth={2} />
      </button>
      <button type="button" className={styles.faviconColorTool} title={labels.clear} aria-label={labels.clear} onClick={() => { onLight(""); onDark(""); }}>
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

/** 텍스트/배경 그림자 — 미리보기 안 광원(빛)을 드래그해 방향·거리(blur)를 정하고, 색/inset 은 옆에서 조정. */
export function FaviconShadowControls({
  textShadow,
  bgShadow,
  onChangeText,
  onChangeBg,
  t,
  textLabel,
  bgLabel,
}: {
  textShadow: FaviconShadow;
  bgShadow: FaviconShadow;
  onChangeText: (v: FaviconShadow) => void;
  onChangeBg: (v: FaviconShadow) => void;
  t: TFunction;
  textLabel?: string;
  bgLabel?: string;
}) {
  const [tab, setTab] = useState<"text" | "bg">("text");
  // 드래그 중엔 로컬 drag 값으로 미리보기(이 컴포넌트)만 갱신 → 가볍다. 놓을 때 config 에 commit.
  const [drag, setDrag] = useState<{ angle: string; blur: string; hx: number; hy: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const value = tab === "text" ? textShadow : bgShadow;
  const onChange = tab === "text" ? onChangeText : onChangeBg;
  const angle = drag?.angle ?? (value.angle || "135");
  const sizeBlur = drag?.blur ?? (value.size === "custom" ? value.custom : (FAVICON_SIZE_BLUR[value.size] ?? "2"));
  const blurN = parseFloat(sizeBlur) || 2;
  const liveValue: FaviconShadow = drag ? { ...value, angle, size: "custom", custom: sizeBlur } : value;

  const applyPreset = (p: (typeof FAVICON_SHADOW_PRESETS)[number]) =>
    onChange({ ...value, enabled: true, size: "custom", custom: p.custom, angle: p.angle, color: p.color, inset: p.inset });
  const isActivePreset = (p: (typeof FAVICON_SHADOW_PRESETS)[number]) =>
    value.custom === p.custom &&
    (value.angle || "135") === p.angle &&
    value.color === p.color &&
    value.inset === p.inset;
  const activePresetKey = FAVICON_SHADOW_PRESETS.find((p) => isActivePreset(p))?.key ?? "";

  // 현재(또는 드래그 중 로컬) 값 → 실시간 미리보기용 box-shadow (구체에 적용, inset 지원)
  const resolved = resolveFaviconShadow(liveValue);
  const previewBoxShadow = resolved ? `${resolved.inset ? "inset " : ""}${resolved.dx}px ${resolved.dy}px ${resolved.blur}px ${resolved.color}` : "none";

  // 핸들 위치(%) = 그림자 방향(커서와 일치). 드래그 중엔 커서 좌표(hx/hy), 아니면 angle/blur 로 계산.
  const angleRad = (parseFloat(angle) * Math.PI) / 180;
  const lightDist = 14 + (Math.min(blurN, 12) / 12) * 28; // 14~42%
  const lightX = drag ? drag.hx : 50 + Math.sin(angleRad) * lightDist;
  const lightY = drag ? drag.hy : 50 - Math.cos(angleRad) * lightDist;

  // 미리보기 안에서 빛을 드래그 → 그림자 방향(광원 반대, 45° 스냅) + 거리(blur 1~12)
  const handleLightDrag = (e: React.PointerEvent) => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // rAF throttle — pointermove 마다 setConfig 하면 버벅이므로 프레임당 1회로 합친다
    let raf: number | null = null;
    let lx = e.clientX;
    let ly = e.clientY;
    const calc = () => {
      const dx = lx - cx;
      const dy = ly - cy;
      // 커서 방향 = 그림자 방향(0=위, 시계). 연속(45° 스냅 제거)이라 커서를 부드럽게 따라온다.
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = Math.min(rect.width, rect.height) / 2;
      const blur = Math.max(1, Math.min(12, Math.round((dist / maxR) * 12)));
      // 핸들을 커서 좌표(미리보기 상대 %)에 정확히 맞춘다
      const hx = ((lx - rect.left) / rect.width) * 100;
      const hy = ((ly - rect.top) / rect.height) * 100;
      return { angle: String(Math.round(deg)), blur: String(blur), hx, hy };
    };
    const schedule = (x: number, y: number) => {
      lx = x;
      ly = y;
      // 드래그 중엔 로컬 state 만 (setConfig 안 함 → AppearanceTab·favicon SVG 재계산 회피)
      if (raf == null) raf = requestAnimationFrame(() => { raf = null; setDrag(calc()); });
    };
    schedule(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => schedule(ev.clientX, ev.clientY);
    const onUp = () => {
      if (raf != null) cancelAnimationFrame(raf);
      const d = calc(); // 놓을 때만 config 에 commit
      onChange({ ...value, angle: d.angle, size: "custom", custom: d.blur });
      setDrag(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className={styles.faviconShadowCard}>
      <div className={styles.faviconShadowHead}>
        <SegmentedControl<"text" | "bg">
          size="md"
          items={[
            { value: "text", label: textLabel ?? t("admin.settings.faviconTextShadow") },
            { value: "bg", label: bgLabel ?? t("admin.settings.faviconBgShadow") },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: v })}
          showStateText
          size="md"
        />
      </div>
      <AnimatePresence initial={false}>
        {value.enabled && (
          <motion.div
            key="shadow-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
        <div className={styles.faviconShadowBody}>
          {/* 광원 드래그 미리보기 — 빛(점)을 끌면 그림자 방향·거리(blur)가 실시간 반영 */}
          <div
            ref={previewRef}
            className={styles.shadowPreview}
            onPointerDown={handleLightDrag}
          >
            <div className={styles.shadowPreviewCircle} style={{ background: "#fff", boxShadow: previewBoxShadow }} />
            <span className={styles.shadowLight} style={{ left: `${lightX}%`, top: `${lightY}%` }} aria-hidden />
          </div>
          <div className={styles.shadowControls}>
            {/* 프리셋 — RadioGroup. 선택 시 광원/blur 세팅, 이후 드래그로 미세 조정 */}
            <RadioGroup<string>
              className={styles.shadowPresetRadio}
              value={activePresetKey}
              onChange={(key) => {
                const p = FAVICON_SHADOW_PRESETS.find((x) => x.key === key);
                if (p) applyPreset(p);
              }}
              options={FAVICON_SHADOW_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
            />
            {/* 번짐(blur) px — 직접 미세 조정 (드래그 거리로도 조절됨) */}
            <FieldRow label={t("admin.settings.faviconShadowSize")} className={styles.faviconShadowRow}>
              <NumberInput
                className={styles.shadowBlurInput}
                value={parseFloat(sizeBlur) || 1}
                onCommit={(n) => onChange({ ...value, size: "custom", custom: String(n) })}
                min={1}
                max={12}
                step={1}
                unit="px"
                ariaLabel={t("admin.settings.faviconShadowSize")}
              />
            </FieldRow>
            <FieldRow label={t("admin.settings.faviconShadowColor")} className={styles.faviconShadowRow}>
              <div className={shared.colorField}>
                <ColorPicker
                  value={value.color || "rgba(0,0,0,0.4)"}
                  onChange={(c) => onChange({ ...value, color: c.hex })}
                  triggerClassName={shared.colorPicker}
                />
                <Input
                  className={shared.colorInput}
                  value={value.color}
                  onChange={(v) => onChange({ ...value, color: v })}
                  placeholder={t("admin.settings.faviconShadowColorPlaceholder")}
                />
              </div>
            </FieldRow>
            <FieldRow label={t("admin.settings.faviconShadowInset")} className={styles.faviconShadowRow}>
              <Checkbox checked={value.inset} onChange={(v) => onChange({ ...value, inset: v })} shape="square" />
            </FieldRow>
            <p className={styles.shadowDragHint}>미리보기의 빛을 드래그해 방향·거리를 조절하세요</p>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
