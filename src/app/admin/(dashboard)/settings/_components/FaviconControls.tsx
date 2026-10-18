"use client";

import { useState, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type TFunction } from "@/providers/LanguageProvider";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import RadioGroup from "@/components/ui/RadioGroup";
import { Switch } from "@/components/ui/Switch";
import NumberInput from "@/components/ui/NumberInput";
import FieldRow from "@/components/ui/FieldRow";
import Pressable from "@/components/ui/Pressable";
import { FAVICON_SHADOW_PRESETS, FAVICON_SIZE_BLUR } from "../_data/faviconPresets";
import { resolveFaviconShadow, type FaviconShadow } from "@/lib/favicon";
import type { PresetNameProblem } from "../_data/presetName";
import styles from "./AppearanceTab.module.css";
import shared from "../Settings.module.css";

/** 텍스트/배경 그림자 — 미리보기 안 광원(빛)을 드래그해 방향·거리(blur)를 정하고, 색/inset 은 옆에서 조정. */
export function FaviconShadowControls({
  textShadow,
  bgShadow,
  onChangeText,
  onChangeBg,
  t,
  textLabel,
  bgLabel,
  single = false,
}: {
  textShadow: FaviconShadow;
  bgShadow?: FaviconShadow;
  onChangeText: (v: FaviconShadow) => void;
  onChangeBg?: (v: FaviconShadow) => void;
  t: TFunction;
  textLabel?: string;
  bgLabel?: string;
  /** 단일 그림자 모드 — text/bg 탭 없이 그림자 하나만 편집(배경 없는 nav 로고용) */
  single?: boolean;
}) {
  const [tab, setTab] = useState<"text" | "bg">("text");
  // 드래그 중엔 로컬 drag 값으로 미리보기(이 컴포넌트)만 갱신 → 가볍다. 놓을 때 config 에 commit.
  const [drag, setDrag] = useState<{ angle: string; blur: string; hx: number; hy: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // single 모드면 항상 text(단일) 그림자만 편집. bg 는 favicon 처럼 배경 rect 있을 때만 의미.
  const useBg = !single && tab === "bg";
  const value = useBg ? bgShadow! : textShadow;
  const onChange = useBg ? onChangeBg! : onChangeText;
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
    if (!el || (e.pointerType === "mouse" && e.button !== 0)) return;
    /* 기본 동작(글자 선택 · 끌기 시작)을 막고 포인터를 붙잡는다 — 끄는 도중 커서가 다른 요소나 창 밖으로
       나가도 움직임 · 놓음이 이 미리보기로 온다(안 붙잡으면 중간에 놓친 것처럼 멈출 수 있다) */
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* 이미 끝난 포인터 */ }
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
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    /* 붙잡은 포인터의 이벤트는 이 요소로 온다 — window 로 들으면 WebKit 은 끄는 동안 움직임을 넘기지 않았다 */
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  /* 그림자마다 한 줄 — [이름 · 켜기] 와 (켜져 있으면) 조절 단추. 켠 그림자 하나만 아래에 조절 칸을 편다.
     예전엔 세그먼트(로고 | 배경) 옆 스위치 하나가 "지금 고른 쪽"을 켜고 꺼서, 어느 그림자의 스위치인지 알 수 없었다 */
  const rows: { key: "text" | "bg"; label: string; shadow: FaviconShadow; set: (v: FaviconShadow) => void }[] = [
    { key: "text", label: textLabel || t("admin.settings.faviconTextShadow"), shadow: textShadow, set: onChangeText },
    ...(!single && bgShadow && onChangeBg ? [{ key: "bg" as const, label: bgLabel || t("admin.settings.faviconBgShadow"), shadow: bgShadow, set: onChangeBg }] : []),
  ];
  const editing = single ? "text" : tab;

  return (
    <div className={styles.faviconShadowCard}>
      <h5 className={styles.faviconPanelTitle}>{t("admin.settings.faviconShadowTitle")}</h5>
      {rows.map((r) => {
        const open = r.shadow.enabled && editing === r.key;
        return (
          <div key={r.key} className={styles.shadowRow}>
            <div className={styles.shadowRowHead}>
              <Switch
                checked={r.shadow.enabled}
                onCheckedChange={(v) => {
                  r.set({ ...r.shadow, enabled: v });
                  /* 켜면 그쪽을 펴고, 펴 둔 쪽을 끄면 켜져 있는 다른 쪽을 편다 */
                  const other = rows.find((o) => o.key !== r.key && o.shadow.enabled);
                  if (v) setTab(r.key);
                  else if (editing === r.key && other) setTab(other.key);
                }}
                label={r.label}
                labelWidth="8em"
              />
              {r.shadow.enabled && !open && (
                <Pressable className={styles.shadowEdit} onClick={() => setTab(r.key)}>
                  {t("admin.settings.faviconShadowEdit")}
                </Pressable>
              )}
            </div>
            <AnimatePresence initial={false}>
              {open && (
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
              options={FAVICON_SHADOW_PRESETS.map((p) => ({ value: p.key, label: t(p.labelKey) }))}
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
            <p className={styles.shadowDragHint}>{t("admin.settings.faviconShadowDragHint")}</p>
          </div>
        </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/** 프리셋 이름 입력 row — 펼침/접힘 애니메이션 + 이름 Input + 저장/취소 버튼.
 *  테마 프리셋·로고색 프리셋 추가에 공용. open 조건·값·저장 동작만 호출부가 결정. */
export function PresetNameAddRow({ open, value, onChange, onSave, onCancel, problem, label, preview, t }: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  /** 저장할 수 없는 이유 — presetNameProblem 결과. null 이면 저장 가능 */
  problem: PresetNameProblem | null;
  /** 입력칸 앞 설명 + 저장될 색 미리보기 — 무엇이 저장되는지 한눈에 */
  label?: string;
  preview?: ReactNode;
  t: TFunction;
}) {
  /* 빈 이름은 저장을 눌러 봤을 때만 알린다 — 열자마자 빨간 글씨가 뜨면 잘못한 것처럼 보인다 */
  const [tried, setTried] = useState(false);
  const shown = problem && (problem.kind !== "empty" || tried) ? problem : null;
  const message = !shown ? "" : shown.kind === "empty"
    ? t("admin.settings.presetNameEmpty")
    : t(shown.kind === "builtIn" ? "admin.settings.presetNameBuiltIn" : "admin.settings.presetNameSaved").replace("{{name}}", shown.name);
  const save = () => {
    setTried(true);
    if (!problem) { setTried(false); onSave(); }
  };
  const cancel = () => { setTried(false); onCancel(); };
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="preset-add-row"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: "hidden" }}
        >
          <div className={styles.presetAddPanel}>
            <div className={styles.logoColorPresetAddRow}>
              {label && <span className={styles.presetAddLabel}>{label}</span>}
              {preview}
              <Input
                className={styles.logoColorPresetNameInput}
                placeholder={t("admin.settings.presetNamePlaceholder")}
                value={value}
                onChange={onChange}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") { e.preventDefault(); save(); }
                  else if (e.key === "Escape") { e.preventDefault(); cancel(); }
                }}
                error={!!shown}
                aria-describedby={shown ? "preset-name-problem" : undefined}
                autoFocus
              />
              <Button variant="outline" onClick={save} disabled={!!problem && problem.kind !== "empty"}>
                {t("admin.settings.presetAddSubmit")}
              </Button>
              <Button variant="outline" onClick={cancel}>
                {t("admin.settings.cancel")}
              </Button>
            </div>
            {shown && <p id="preset-name-problem" className={styles.presetAddProblem} role="alert">{message}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
