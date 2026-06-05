"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Shuffle, ImagePlus, ClipboardPaste } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalAlert, ModalPrompt } from "@/components/ui/ModalTemplates";
import LoadingDots from "@/components/ui/LoadingDots";
import ColorPicker from "@/components/ui/ColorPicker";
import Tooltip from "@/components/ui/Tooltip";
import { extractPalette } from "@/components/admin/CoverImageField/extractPalette";
import { renderGradient, type Stop, type GradientType, type PresetConfig } from "./gradientUtils";
import styles from "./CoverImagePicker.module.css";

interface CustomGradientEditorProps {
  /** 부모가 controlled state — preset 클릭 시 여기를 update 해 editor 가 즉시 반영 */
  config: PresetConfig;
  onConfigChange: (config: PresetConfig) => void;
  /** "사용" 버튼 클릭 시 호출 — caller 가 upload + history 추가 */
  onSelect: (url: string, name: string) => void;
  /** 이미지 업로드로 색 추출 시 호출 — 부모가 history 에 추가 */
  onImageUploaded?: (url: string, name: string) => void;
}

/** 두 hex 색을 t(0~1) 비율로 선형 보간 → hex */
function blendHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ra = parseInt(pa.slice(0, 2), 16);
  const ga = parseInt(pa.slice(2, 4), 16);
  const ba = parseInt(pa.slice(4, 6), 16);
  const rb = parseInt(pb.slice(0, 2), 16);
  const gb = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(ra + (rb - ra) * t).toString(16).padStart(2, "0");
  const g = Math.round(ga + (gb - ga) * t).toString(16).padStart(2, "0");
  const bl = Math.round(ba + (bb - ba) * t).toString(16).padStart(2, "0");
  return `#${r}${g}${bl}`;
}

/** HSL(0-360, 0-100, 0-100) → "#rrggbb" */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** "#rrggbb" → HSL(h:0-360, s:0-100, l:0-100) */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const p = hex.replace("#", "");
  const r = parseInt(p.slice(0, 2), 16) / 255;
  const g = parseInt(p.slice(2, 4), 16) / 255;
  const b = parseInt(p.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── Adobe Color 스타일 색조합 (Color Harmony) ─────────────────
export type SchemeKind =
  | "analogous" | "monochromatic" | "triad" | "complementary"
  | "split-complementary" | "square" | "compound" | "shades";

const clampL = (l: number) => Math.max(10, Math.min(90, l));
const clampS = (s: number) => Math.max(10, Math.min(95, s));

/** base color + scheme kind → 5개 stop 색 (균등 위치). */
function generateScheme(base: string, kind: SchemeKind): string[] {
  const { h, s, l } = hexToHsl(base);
  const w = (deg: number) => (h + deg + 360) % 360;
  switch (kind) {
    case "analogous": // 유사 — 기준 ±60°
      return [-60, -30, 0, 30, 60].map((d) => hslToHex(w(d), s, l));
    case "monochromatic": // 단색 — 같은 hue, l 변주
      return [25, 40, 55, 70, 85].map((l2) => hslToHex(h, s, l2));
    case "triad": // 삼각형 — 0, 120, 240 (반복으로 5개 채움)
      return [hslToHex(h, s, l), hslToHex(w(120), s, clampL(l - 10)), hslToHex(w(120), s, l), hslToHex(w(240), s, clampL(l + 10)), hslToHex(w(240), s, l)];
    case "complementary": // 보색 — h 와 h+180
      return [hslToHex(h, s, clampL(l - 15)), hslToHex(h, s, l), hslToHex(h, s, clampL(l + 15)), hslToHex(w(180), s, l), hslToHex(w(180), s, clampL(l - 15))];
    case "split-complementary": // 분할 보색 — h, h+150, h+210
      return [hslToHex(h, s, l), hslToHex(h, clampS(s - 20), clampL(l + 10)), hslToHex(w(150), s, l), hslToHex(w(180), s, l), hslToHex(w(210), s, l)];
    case "square": // 정사각형 — 0, 90, 180, 270 (4개 + 첫번째 반복)
      return [0, 90, 180, 270].map((d) => hslToHex(w(d), s, l)).concat(hslToHex(h, s, clampL(l - 10)));
    case "compound": // 혼합 — analogous + 보색 한 쌍
      return [hslToHex(h, s, l), hslToHex(w(30), s, l), hslToHex(w(150), s, l), hslToHex(w(180), s, l), hslToHex(w(330), s, l)];
    case "shades": // 음영 — 같은 hue, 어두움→밝음
      return [15, 30, 50, 70, 88].map((l2) => hslToHex(h, s, l2));
  }
}

export default function CustomGradientEditor({ config, onConfigChange, onSelect, onImageUploaded }: CustomGradientEditorProps) {
  const { t } = useLanguage();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const openModal = useModalStore((s) => s.openModal);

  // controlled state 분해 — config 가 single source of truth
  const stops = config.stops;
  const angle = config.angle ?? 135;
  const type = config.type;
  const size = config.size ?? 1;
  const speed = config.speed ?? 1;

  const update = useCallback((patch: Partial<PresetConfig>) => onConfigChange({ ...config, ...patch }), [config, onConfigChange]);
  const setStops = useCallback((next: Stop[] | ((prev: Stop[]) => Stop[])) => {
    const value = typeof next === "function" ? (next as (p: Stop[]) => Stop[])(stops) : next;
    update({ stops: value });
  }, [stops, update]);
  const setAngle = useCallback((v: number) => update({ angle: v }), [update]);
  const setType = useCallback((v: GradientType) => update({ type: v }), [update]);
  const setSize = useCallback((v: number) => update({ size: v }), [update]);
  const setSpeed = useCallback((v: number) => update({ speed: v }), [update]);

  const [uploading, setUploading] = useState(false);
  // 이미지 → palette 추출 state
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 파일 → server 업로드 → cover history 추가 → palette 추출 */
  const handleImageExtract = useCallback(async (file: File) => {
    setExtracting(true);
    setExtractedPalette([]);
    try {
      // 1. 서버 업로드 (permanent URL 확보)
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      // 2. 부모 콜백 (history 추가) — 적용 안 해도 이력에서 다시 사용 가능
      onImageUploaded?.(data.url, file.name);
      // 3. palette 추출 (server URL — CORS OK)
      const colors = await extractPalette(data.url, 5);
      setExtractedPalette(colors);
    } catch (e) {
      console.error("[CustomGradientEditor] image extract failed:", e);
    } finally {
      setExtracting(false);
    }
  }, [onImageUploaded]);

  /** 입력 문자열에서 hex 색상 추출 (#rrggbb 또는 #rgb 둘 다 허용) → 정규화된 #rrggbb 배열 */
  const parsePaletteText = useCallback((text: string): string[] => {
    const matches = text.match(/#?[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
    if (!matches) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of matches) {
      const stripped = raw.replace("#", "");
      const full = stripped.length === 3
        ? `#${stripped[0]}${stripped[0]}${stripped[1]}${stripped[1]}${stripped[2]}${stripped[2]}`
        : `#${stripped}`;
      const norm = full.toLowerCase();
      if (!seen.has(norm)) { seen.add(norm); out.push(norm); }
    }
    return out;
  }, []);

  /** colors 배열을 stop 으로 적용 — 2~5개 균등 위치 (4개 cap 은 stop UI 제약) */
  const applyPaletteAsStops = useCallback((colors: string[]) => {
    if (colors.length < 2) return false;
    const limited = colors.slice(0, 4);
    const next: Stop[] = limited.map((color, i) => ({
      color,
      pos: limited.length === 1 ? 0.5 : i / (limited.length - 1),
    }));
    setStops(next);
    setScheme(null);
    return true;
  }, [setStops]);

  /** invalid 입력 안내 — ModalAlert 로 표시 */
  const showPasteEmptyAlert = useCallback(() => {
    openModal(
      <ModalAlert desc={tc("pasteEmpty") || "No valid hex colors"} />,
      { header: { title: tc("pastePalette") || "Paste palette" } },
    );
  }, [openModal, tc]);

  /** clipboard 또는 ModalPrompt 로 색상표 텍스트 받아 stop 으로 변환 */
  const handlePastePalette = useCallback(async () => {
    let text = "";
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch { /* clipboard 권한 거부 — ModalPrompt fallback */ }
    // 1. 클립보드에 유효 hex 가 있으면 즉시 적용
    if (text) {
      const colors = parsePaletteText(text);
      if (applyPaletteAsStops(colors)) return;
    }
    // 2. 클립보드가 비어있거나 유효 hex 없음 — ModalPrompt 로 직접 입력 받기
    openModal(
      <ModalPrompt
        desc={tc("pastePrompt") || "Paste palette"}
        placeholder="#ff0000, #00ff00, #0000ff"
        validate={(v) => parsePaletteText(v).length >= 2}
        onConfirm={(value) => {
          const colors = parsePaletteText(value);
          if (!applyPaletteAsStops(colors)) showPasteEmptyAlert();
        }}
      />,
      { header: { title: tc("pastePalette") || "Paste palette" } },
    );
  }, [parsePaletteText, applyPaletteAsStops, openModal, showPasteEmptyAlert, tc]);

  /** palette swatch 클릭 — stop 으로 추가 (4개 미만이면 append, 4개면 마지막 교체) */
  const applyPaletteColor = useCallback((hex: string) => {
    setStops((prev) => {
      if (prev.length < 4) {
        // 인접 두 stop 의 중점 위치
        const sorted = [...prev].sort((a, b) => a.pos - b.pos);
        const last = sorted[sorted.length - 1];
        const prevLast = sorted[sorted.length - 2];
        const newPos = prevLast ? (prevLast.pos + last.pos) / 2 : 0.5;
        return [...prev, { color: hex, pos: newPos }];
      }
      // 4개면 마지막 stop 의 색 교체
      return prev.map((s, i) => (i === prev.length - 1 ? { ...s, color: hex } : s));
    });
  }, [setStops]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Adobe Color 스타일 — scheme kind. base color 는 stops[0] 에서 derive (preset 로드 시 자동 동기화)
  const [scheme, setScheme] = useState<SchemeKind | null>(null);
  const baseColor = stops[0]?.color ?? "#667eea";

  /** 선택한 scheme 적용 — 5개 stop 균등 위치 */
  const applyScheme = useCallback((kind: SchemeKind, base = baseColor) => {
    const colors = generateScheme(base, kind);
    setStops(colors.map((color, i) => ({ color, pos: i / (colors.length - 1) })));
    setScheme(kind);
  }, [baseColor, setStops]);

  const onBaseColorChange = useCallback((value: string) => {
    if (scheme) {
      // scheme 적용 중 — 새 base 로 5개 stop 재생성
      applyScheme(scheme, value);
    } else {
      // 수동 모드 — 첫 stop 색만 변경
      setStops((prev) => prev.map((s, i) => (i === 0 ? { ...s, color: value } : s)));
    }
  }, [scheme, applyScheme, setStops]);

  // 미리보기 — stops/각도/타입 변경 시마다 다시 그림
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderGradient(ctx, canvas.width, canvas.height, config);
  }, [config]);

  const updateColor = (idx: number, value: string) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, color: value } : s)));
  };

  const updatePos = (idx: number, value: number) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, pos: value } : s)));
  };

  const addColor = () => {
    if (stops.length >= 4) return;
    setStops((prev) => {
      // 신규 stop 의 색은 마지막 색, pos 는 마지막 두 stop 의 중점
      const sorted = [...prev].sort((a, b) => a.pos - b.pos);
      const last = sorted[sorted.length - 1];
      const prevLast = sorted[sorted.length - 2];
      const newPos = prevLast ? (prevLast.pos + last.pos) / 2 : 0.5;
      return [...prev, { color: last.color, pos: newPos }];
    });
  };

  const removeColor = (idx: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── handle 드래그 — bar 의 좌측 기준 비율로 stop pos 계산 ──
  const barRef = useRef<HTMLDivElement>(null);
  const dragIdxRef = useRef<number | null>(null);

  const beginHandleDrag = (idx: number, openPicker?: () => void) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const bar = barRef.current;
    if (!bar) return;
    dragIdxRef.current = idx;
    const startX = e.clientX, startY = e.clientY;
    let dragged = false;
    const rect = bar.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (!dragged && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) dragged = true;
      if (!dragged) return;
      const x = (ev.clientX - rect.left) / rect.width;
      updatePos(idx, Math.max(0, Math.min(1, x)));
    };
    const up = () => {
      dragIdxRef.current = null;
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      // 움직임 없이 떼면 click 으로 간주 — color picker 열기
      if (!dragged && openPicker) openPicker();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  /** bar 빈 영역 더블클릭 → 그 위치에 새 stop 추가 (해당 위치의 보간 색) */
  const onBarDoubleClick = (e: React.MouseEvent) => {
    if (stops.length >= 4) return;
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // 인접한 두 stop 색의 단순 hex blend
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    let color = sorted[sorted.length - 1].color;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
        const t = (pos - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos || 1);
        color = blendHex(sorted[i].color, sorted[i + 1].color, t);
        break;
      }
    }
    setStops((prev) => [...prev, { color, pos }]);
  };

  // 현재 stops 를 정렬해 CSS gradient 문자열로 — bar 배경 + 미리보기에 사용
  const cssGradient = `linear-gradient(to right, ${[...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`)
    .join(", ")})`;

  /** 완전 랜덤 — pattern, 크기, 속도, 색, 색 개수, 위치 모두 random */
  const randomize = useCallback(() => {
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

    // 1. count (2~5) — 더 다양한 stop 수
    const count = randInt(2, 5);

    // 2. colors — 50% scheme 기반(조화), 50% 자유 hue spread
    let colors: string[];
    if (Math.random() < 0.5) {
      const baseHex = hslToHex(randInt(0, 359), randInt(40, 95), randInt(35, 75));
      const kinds: SchemeKind[] = ["analogous", "monochromatic", "triad", "complementary", "split-complementary", "square", "compound", "shades"];
      const kind = kinds[randInt(0, kinds.length - 1)];
      colors = generateScheme(baseHex, kind).slice(0, count);
      // count > 5 면 generateScheme 가 5개만 줘서 부족 — 마지막 색 복사로 채움 (rare)
      while (colors.length < count) colors.push(colors[colors.length - 1]);
    } else {
      const baseHue = randInt(0, 359);
      const hueStep = randInt(15, 180);
      const sat = randInt(30, 95);
      const light = randInt(25, 80);
      colors = Array.from({ length: count }, (_, i) => hslToHex((baseHue + hueStep * i) % 360, sat, light));
    }

    // 3. positions — sorted random, 양 끝 anchor (0, 1) 로 그라데이션이 bar 전체 커버
    let positions: number[];
    if (count <= 2) {
      positions = [0, 1];
    } else {
      const middle = Array.from({ length: count - 2 }, () => Math.random()).sort((a, b) => a - b);
      positions = [0, ...middle, 1];
    }

    // 4. type — 75% linear / 25% radial
    const nextType: GradientType = Math.random() < 0.75 ? "linear" : "radial";

    // 5. angle — 10° 단위 (linear 일 때만 의미 있지만 set 해둠)
    const nextAngle = randInt(0, 35) * 10;

    // 6. size 0.3~1.8, speed 0.4~2.5
    const nextSize = +rand(0.3, 1.8).toFixed(2);
    const nextSpeed = +rand(0.4, 2.5).toFixed(2);

    // 한 번의 onChange 로 모든 변경 commit (개별 setter 는 race 가능)
    onConfigChange({
      type: nextType,
      angle: nextAngle,
      size: nextSize,
      speed: nextSpeed,
      stops: colors.map((color, i) => ({ color, pos: positions[i] })),
    });
    // scheme 활성 상태 해제 — 직접 랜덤 결과
    setScheme(null);
  }, [onConfigChange]);

  const handleApply = useCallback(async () => {
    setUploading(true);
    try {
      // 풀 사이즈 (1200×630) 렌더 → upload
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderGradient(ctx, 1200, 675, config);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", new File([blob], `cover-custom-${Date.now()}.png`, { type: "image/png" }));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // 이름은 색 + angle 요약
      const name = `Custom ${type === "radial" ? "radial" : `${angle}°`} ${stops.map((s) => s.color).join(" ")}`.slice(0, 40);
      onSelect(data.url, name);
    } catch (err) {
      console.error("Custom gradient upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [config, stops, angle, type, onSelect]);

  return (
    <div className={styles.customGradientWrap}>
    <div className={styles.customGradient}>
      <div className={styles.customGradientPreview}>
        <canvas ref={canvasRef} />
      </div>
        {/* Adobe Color 스타일 scheme selector — base color + 8가지 조합 */}
        <div className={styles.schemeRow}>
          <ColorPicker value={baseColor} onChange={(c) => onBaseColorChange(c.hex)}>
            {({ toggle }) => (
              <Tooltip content={tc("baseColor")} placement="top">
                <button
                  type="button"
                  className={styles.schemeBaseLabel}
                  onClick={toggle}
                  aria-label={tc("baseColor")}
                >
                  <span className={styles.schemeBaseSwatch} style={{ background: baseColor }} aria-hidden />
                </button>
              </Tooltip>
            )}
          </ColorPicker>
          <div className={styles.schemeChips}>
            {(["analogous", "monochromatic", "triad", "complementary", "split-complementary", "square", "compound", "shades"] as SchemeKind[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.schemeChip} ${scheme === k ? styles.schemeChipActive : ""}`}
                onClick={() => applyScheme(k)}
              >
                {tc(`scheme_${k}`)}
              </button>
            ))}
          </div>
          {/* 색상표 붙여넣기 — clipboard 또는 prompt 로 hex 입력 받아 stop 변환 */}
          <Tooltip content={tc("pastePalette")} placement="top">
            <button
              type="button"
              className={styles.schemeImageBtn}
              onClick={handlePastePalette}
              aria-label={tc("pastePalette")}
            >
              <ClipboardPaste size={12} strokeWidth={2} />
            </button>
          </Tooltip>
          {/* 이미지 업로드 → 색 추출 (scheme row 우측 끝) */}
          <Tooltip content={tc("extractFromImage")} placement="top">
            <button
              type="button"
              className={styles.schemeImageBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              aria-label={tc("extractFromImage")}
            >
              <ImagePlus size={12} strokeWidth={2} />
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageExtract(file);
              e.target.value = ""; // 같은 파일 재선택 가능하게
            }}
          />
        </div>
        {/* 추출된 palette — 클릭으로 stop 추가/교체 */}
        {(extracting || extractedPalette.length > 0) && (
          <div className={styles.extractedRow}>
            <span className={styles.extractedLabel}>
              {extracting ? tc("extracting") : tc("extractedPalette")}
            </span>
            {extracting && extractedPalette.length === 0 ? (
              <LoadingDots />
            ) : (
              extractedPalette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={styles.extractedSwatch}
                  style={{ background: hex }}
                  onClick={() => applyPaletteColor(hex)}
                  title={`Add ${hex} as stop`}
                  aria-label={`Add ${hex}`}
                />
              ))
            )}
          </div>
        )}
        {/* gradient stop bar — 가로 그라데이션 + 각 stop 이 handle 로 표시 (드래그로 위치 조정) */}
        <div className={styles.stopBarWrap}>
          <div
            ref={barRef}
            className={styles.stopBar}
            style={{ background: cssGradient }}
            onDoubleClick={onBarDoubleClick}
            title="Drag handles to reposition. Double-click bar to add a stop."
          >
            {stops.map((s, i) => (
              <ColorPicker key={i} value={s.color} onChange={(c) => updateColor(i, c.hex)}>
                {({ toggle }) => (
                  <span
                    className={styles.stopHandle}
                    style={{ left: `${s.pos * 100}%` }}
                    onPointerDown={beginHandleDrag(i, toggle)}
                    onDoubleClick={(e) => { e.stopPropagation(); if (stops.length > 2) removeColor(i); }}
                    title={`Drag to reposition / Click to edit · ${s.color} · ${Math.round(s.pos * 100)}%`}
                    data-cursor="grab"
                  >
                    <span className={styles.stopHandleArrow} aria-hidden />
                    <span className={styles.stopHandleSwatch} style={{ background: s.color }} data-cursor="grab">
                      <span className={styles.stopHandleGrip} aria-hidden />
                    </span>
                    {stops.length > 2 && (
                      <button
                        type="button"
                        className={styles.stopHandleRemove}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removeColor(i); }}
                        aria-label="Remove stop"
                      >
                        ×
                      </button>
                    )}
                  </span>
                )}
              </ColorPicker>
            ))}
          </div>
          <Tooltip content={tc("addStop")} placement="top" disabled={stops.length >= 4}>
            <button
              type="button"
              className={styles.stopAddBtn}
              onClick={addColor}
              aria-label={tc("addStop")}
              disabled={stops.length >= 4}
            >
              +
            </button>
          </Tooltip>
        </div>
        {/* customRow + customSliders 를 하나의 그룹으로 묶음 — 모바일 layout 분기/정렬 단위 */}
        <div className={styles.customGroup}>
        {/* 줄1: 타입 토글 + 사용 버튼 */}
        <div className={styles.customRow}>
          <div className={styles.customTypeToggle}>
            <button
              type="button"
              className={`${styles.customTypeBtn} ${type === "linear" ? styles.customTypeBtnActive : ""}`}
              onClick={() => setType("linear")}
            >
              Linear
            </button>
            <button
              type="button"
              className={`${styles.customTypeBtn} ${type === "radial" ? styles.customTypeBtnActive : ""}`}
              onClick={() => setType("radial")}
            >
              Radial
            </button>
          </div>
          <Tooltip content={tc("randomGradient")} placement="top">
            <button
              type="button"
              className={styles.customRandomBtn}
              onClick={randomize}
              aria-label={tc("randomGradient")}
            >
              <Shuffle size={12} strokeWidth={2} />
            </button>
          </Tooltip>
          <button
            type="button"
            className={styles.customApplyBtn}
            onClick={handleApply}
            disabled={uploading}
          >
            {uploading ? (
              <span className={styles.generateBtnLoading}>
                <span>{tc("uploading") || "Uploading"}</span>
                <LoadingDots />
              </span>
            ) : (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>{tc("useThis")}</span>
              </>
            )}
          </button>
        </div>
        {/* 줄2: 각도(radial 일 때 비활성화) / 크기 / 속도 slider — 항상 동일 row 수 유지해 높이 변하지 않게 */}
        <div className={styles.customSliders}>
          <label className={`${styles.customSlider} ${type !== "linear" ? styles.customSliderDisabled : ""}`}>
            <span className={styles.customSliderLabel}>{tc("angle") || "각도"}</span>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              data-cursor="grab"
              disabled={type !== "linear"}
            />
            <span className={styles.customSliderValue}>{angle}°</span>
          </label>
          <label className={styles.customSlider}>
            <span className={styles.customSliderLabel}>{tc("size") || "크기"}</span>
            <input
              type="range"
              min={30}
              max={200}
              value={Math.round(size * 100)}
              onChange={(e) => setSize(Number(e.target.value) / 100)}
              data-cursor="grab"
            />
            <span className={styles.customSliderValue}>{size.toFixed(2)}</span>
          </label>
          <label className={styles.customSlider}>
            <span className={styles.customSliderLabel}>{tc("speed") || "속도"}</span>
            <input
              type="range"
              min={30}
              max={300}
              value={Math.round(speed * 100)}
              onChange={(e) => setSpeed(Number(e.target.value) / 100)}
              data-cursor="grab"
            />
            <span className={styles.customSliderValue}>{speed.toFixed(2)}</span>
          </label>
        </div>
      </div>
    </div>
    </div>
  );
}
