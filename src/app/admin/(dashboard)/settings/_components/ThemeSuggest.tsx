"use client";

import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { converter, formatHex } from "culori";
import { useLanguage } from "@/providers/LanguageProvider";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { showToast } from "@/stores/toastStore";
import type { ThemeColors } from "@/lib/themeAudit";
import { HARMONY_RULES, extractColors, harmonyHues, harmonyPalette, harmonyThemes, themesFromColors, withHue, type ExtractedColor, type HarmonyRule } from "@/lib/themeGenerate";
import { VerdictChip } from "./ThemeContrastReport";
import styles from "./ThemeTools.module.css";

const toOklch = converter("oklch");

/** 색상환 바탕 — OKLCH 색상을 30° 마다 찍은 conic-gradient. 0° 가 위, 시계 방향 */
const WHEEL_BG = `conic-gradient(${Array.from({ length: 13 }, (_, i) => `${formatHex({ mode: "oklch", l: 0.72, c: 0.14, h: i * 30 })} ${i * 30}deg`).join(", ")})`;
/** 점을 찍는 반지름(%) — 도넛 가운데 두께. 단색 규칙은 같은 색상의 밝기 단계라 반지름을 달리해 겹치지 않게 */
const MARKER_R = 40;
const MONO_R = [40, 33, 47];

/** 이미지에서 색을 뽑을 때 줄이는 크기 — 색 분포만 보면 되니 작게 */
const SAMPLE = 96;

function ThemeCard({ theme, name, desc, onApply }: { theme: ThemeColors; name: string; desc?: string; onApply: (t: ThemeColors) => void }) {
  return (
    <button type="button" className={styles.card} onClick={() => onApply(theme)} aria-label={name}>
      <span className={styles.swatches} aria-hidden>
        <span style={{ background: theme.darkBg }} />
        <span style={{ background: theme.darkText }} />
        <span style={{ background: theme.accentColor }} />
        <span style={{ background: theme.lightText }} />
        <span style={{ background: theme.lightBg }} />
      </span>
      <span className={styles.cardName}>
        {name}
        <VerdictChip theme={theme} />
      </span>
      {desc && <span className={styles.cardDesc}>{desc}</span>}
    </button>
  );
}

/**
 * 테마 색 추천 — 색상환 조화 규칙(유사·보색·분할 보색·삼각·단색) 또는 올린 이미지의 주요 색으로
 * 테마 한 벌씩 만들어 카드로 보여 준다. 카드를 누르면 onApply 로 테마 색을 바꾼다(저장은 따로).
 */
export default function ThemeSuggest({ accent, onApply }: { accent: string; onApply: (t: ThemeColors) => void }) {
  const { t } = useLanguage();
  const k = (key: string) => t(`admin.settings.themeTools.${key}`);
  const [tab, setTab] = useState<"wheel" | "image">("wheel");
  const [base, setBase] = useState(accent);
  const [rule, setRule] = useState<HarmonyRule>("complementary");
  const [image, setImage] = useState<{ url: string; colors: ExtractedColor[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hues = harmonyHues(base, rule);
  const palette = useMemo(() => harmonyPalette(base, rule), [base, rule]);
  const harmonies = useMemo(() => harmonyThemes(base, rule), [base, rule]);
  const imageThemes = useMemo(() => (image ? themesFromColors(image.colors) : []), [image]);
  /* 끄는 중인지 — 포인터 캡처만 믿으면 일부 브라우저(Safari 트랙패드 등)에서 move 가 안 와서 놓을 때만 바뀐다.
     누른 순간부터 뗄 때까지 창 전체의 pointermove 로 따라간다 */
  const wheelRef = useRef<HTMLDivElement>(null);

  const apply = (theme: ThemeColors) => {
    onApply(theme);
    showToast(k("applied"), "success");
  };

  /* 색상환 — 누르거나 끌면 그 각도가 기준 색상. 원 밖으로 끌어도 각도만 보고 계속 따라온다 */
  const hueAt = (x: number, y: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    setBase((b) => withHue(b, ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360));
  };
  const onWheelDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    hueAt(e.clientX, e.clientY);
    const move = (ev: globalThis.PointerEvent) => hueAt(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // 키보드 — 좌우(상하) 화살표로 5°, Shift 를 누르면 30°
  const onWheelKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30 : 5;
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
    if (!d) return;
    e.preventDefault();
    setBase((b) => withHue(b, (((toOklch(b)?.h ?? 0) + d) % 360 + 360) % 360));
  };

  const readImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, SAMPLE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const colors = extractColors(ctx.getImageData(0, 0, canvas.width, canvas.height).data, 6);
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url, colors };
      });
    } catch {
      URL.revokeObjectURL(url);
      showToast(k("imageFail"), "error");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void readImage(f);
  };

  /** 규칙이 고른 색의 자리 (%) — 첫 번째가 기준 */
  const points = hues.map((h, i) => {
    const rad = (h * Math.PI) / 180, r = rule === "mono" ? MONO_R[i] : MARKER_R;
    return { x: 50 + r * Math.sin(rad), y: 50 - r * Math.cos(rad), color: palette[i] };
  });

  return (
    <div className={styles.suggest}>
      <div className={styles.suggestHead}>
        <span className={styles.reportTitle}>{k("suggestTitle")}</span>
        <SegmentedControl
          items={[{ value: "wheel", label: k("tabWheel") }, { value: "image", label: k("tabImage") }] as const}
          value={tab}
          onChange={setTab}
          variant="subtle"
        />
      </div>

      {tab === "wheel" ? (
        <>
        <div className={styles.ruleRow}>
          <SegmentedControl
            items={HARMONY_RULES.map((r) => ({ value: r, label: k(r) }))}
            value={rule}
            onChange={setRule}
            variant="subtle"
          />
          <span className={styles.wheelHint}>{k(`${rule}Desc`)}</span>
        </div>
        <div className={styles.suggestBody}>
          <div className={styles.wheelCol}>
            <div
              ref={wheelRef}
              className={styles.wheel}
              style={{ background: WHEEL_BG }}
              role="slider"
              tabIndex={0}
              aria-label={k("wheelLabel")}
              aria-valuemin={0}
              aria-valuemax={359}
              aria-valuenow={Math.round(hues[0])}
              aria-valuetext={`${Math.round(hues[0])}°`}
              onPointerDown={onWheelDown}
              onKeyDown={onWheelKey}
            >
              {/* 가운데에서 각 색으로 뻗는 선 — 규칙이 색을 어떻게 고르는지 보인다 */}
              <svg className={styles.wheelLines} viewBox="0 0 100 100" aria-hidden>
                {points.map((p, i) => <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} />)}
              </svg>
              {points.map((p, i) => (
                <span
                  key={i}
                  className={`${styles.marker} ${i === 0 ? styles.markerBase : ""}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color }}
                />
              ))}
            </div>
            <span className={styles.palette} aria-hidden>
              {palette.map((c, i) => <span key={i} style={{ background: c, flex: 1 }} />)}
            </span>
            <span className={styles.wheelHint}>{k("wheelHint")}</span>
            {base !== accent && (
              <button type="button" className={styles.resetBtn} onClick={() => setBase(accent)}>
                {k("resetBase")}
              </button>
            )}
          </div>
          <div className={styles.cards}>
            {harmonies.map((theme, i) => (
              <ThemeCard key={i} theme={theme} name={`${k(rule)} ${i + 1}`} desc={theme.accentColor} onApply={apply} />
            ))}
          </div>
        </div>
        </>
      ) : (
        <div className={styles.suggestBody}>
          <div className={styles.imageCol}>
            <button
              type="button"
              className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기라 최적화 대상이 아니다 */}
              {image ? <img src={image.url} alt="" /> : k("imagePick")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void readImage(f); e.target.value = ""; }} />
            {image && (
              <span className={styles.palette} aria-hidden>
                {image.colors.map((c) => <span key={c.hex} style={{ background: c.hex, flex: c.share }} />)}
              </span>
            )}
            <span className={styles.wheelHint}>{k("imageNote")}</span>
          </div>
          {imageThemes.length ? (
            <div className={styles.cards}>
              {imageThemes.map((theme, i) => (
                <ThemeCard key={`${theme.accentColor}-${i}`} theme={theme} name={k("candidate").replace("{{n}}", String(i + 1))} desc={`${theme.accentColor} · ${Math.round((toOklch(theme.accentColor)?.h ?? 0))}°`} onApply={apply} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>{k("imageEmpty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
