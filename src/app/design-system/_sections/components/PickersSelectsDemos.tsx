"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { Code } from "@/components/icons";
import Button from "@/components/ui/Button";
import FontPicker from "@/components/ui/FontPicker";
import { FONT_GROUPS } from "@/components/posts/plate/constants";
import Select from "@/components/ui/Select";
import ColorPicker from "@/components/ui/ColorPicker";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type { DatePeriod } from "@/data/profile";
import Tooltip from "@/components/ui/Tooltip";
import Chip from "@/components/ui/Chip";
import EmojiPicker, { EmojiIcon } from "@/components/ui/EmojiPicker";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import Pressable from "@/components/ui/Pressable";
import { md, DemoGroup, useDemo } from "./demoShared";

const DatePicker = dynamic(
  () => import("@/components/ui/DatePicker/DatePicker"),
  { ssr: false, loading: () => <div style={{ height: 200 }} /> }
);

const FONT_SIZE_DEMO_PRESETS = [14, 15, 16, 18, 20, 24, 28, 32];
const LINE_HEIGHT_DEMO_PRESETS = [1.4, 1.6, 1.8, 2.0];

/** Pickers & Selects — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function PickersSelectsDemos() {
  const { language, scrollChildX } = useDemo();
  const [fontDemo, setFontDemo] = useState("var(--font-instrument)");
  const [selectValue, setSelectValue] = useState("option1");
  const [selectCompact, setSelectCompact] = useState("option1");
  const [selectEmpty, setSelectEmpty] = useState("");
  // editable Select 데모 — 트리거 더블클릭 시 입력칸으로 전환 (프리셋 밖 값 직접 입력)
  const [selectFontSize, setSelectFontSize] = useState("16");
  const [selectLineHeight, setSelectLineHeight] = useState("1.6");
  const [comboInput, setComboInput] = useState("");
  const [comboTags, setComboTags] = useState<string[]>(["React"]);
  const [bubbleVal, setBubbleVal] = useState("normal");
  const [dpFormat, setDpFormat] = useState<"year" | "yearMonth" | "date">("date");
  const [dpDate, setDpDate] = useState({ year: "2024", month: "03", day: "15" });
  const [period, setPeriod] = useState<DatePeriod>({ start: "2024-03", end: "2024-12", format: "yearMonth" });
  const [pickerColor, setPickerColor] = useState("#d01046");
  // EmojiPicker 데모
  const [dsEmojiOpen, setDsEmojiOpen] = useState(false);
  const [dsEmoji, setDsEmoji] = useState("");

  return (
    <>
        <h3 className={styles.componentCategory}>Pickers & Selects</h3>

        {/* Select */}
        <DemoGroup title="Select">
          <div className={styles.componentSubLabel}>Variants</div>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 3)}>
              <Tooltip content="variant: default">
                <Select
                  value={selectValue}
                  options={[
                    { value: "option1", label: "Option One" },
                    { value: "option2", label: "Option Two" },
                    { value: "option3", label: "Option Three" },
                  ]}
                  onChange={setSelectValue}
                  placeholder="Choose..."
                />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 3)}>
              <Tooltip content="showCheck — 선택 항목에 ✓ 표시">
                <Select
                  value={selectCompact}
                  options={[
                    { value: "option1", label: "Option One" },
                    { value: "option2", label: "Option Two" },
                    { value: "option3", label: "Option Three" },
                  ]}
                  onChange={setSelectCompact}
                  showCheck
                />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
              <Tooltip content='variant="bubble" — 오른쪽 말풍선'>
                <Select
                  variant="bubble"
                  value={bubbleVal}
                  onChange={setBubbleVal}
                  options={[
                    { value: "happy", label: "😊 Happy" },
                    { value: "normal", label: "😐 Normal" },
                    { value: "sad", label: "😢 Sad" },
                  ]}
                />
              </Tooltip>
            </motion.div>
          </div>
          <div className={styles.componentSubLabel}>States</div>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
              <Tooltip content="placeholder state">
                <Select
                  value={selectEmpty}
                  options={[
                    { value: "a", label: "Option A" },
                    { value: "b", label: "Option B" },
                  ]}
                  onChange={setSelectEmpty}
                  placeholder="No selection"
                />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
              <Tooltip content="disabled">
                <Select
                  value="option1"
                  options={[{ value: "option1", label: "Disabled" }]}
                  onChange={() => {}}
                  disabled
                />
              </Tooltip>
            </motion.div>
          </div>
          <div className={styles.componentSubLabel}>Combobox</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "combobox 는 input 을 trigger 로 씁니다. label 과 searchTerms(한글 alias)로 필터하고, Enter 나 쉼표로 free text 를 추가하며, 지우개 버튼과 화살표 키 이동, group/icon 옵션을 지원합니다."
              : "combobox — an input trigger. Filter by label + searchTerms (Korean alias), add free text with Enter/comma, plus a clear button, arrow-key nav, and grouped options with icons.")}
          </p>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
              <Tooltip content="combobox — filter + free-text add">
                <Select
                  combobox
                  value=""
                  inputValue={comboInput}
                  onInputChange={setComboInput}
                  onChange={() => {}}
                  onAdd={(v) => { const t = v.trim(); if (t && !comboTags.includes(t)) setComboTags((p) => [...p, t]); setComboInput(""); }}
                  options={[
                    { value: "React", label: "React", searchTerms: ["리액트"] },
                    { value: "Next.js", label: "Next.js", searchTerms: ["넥스트"] },
                    { value: "TypeScript", label: "TypeScript", icon: <Code size={12} /> },
                    { value: "GSAP", label: "GSAP", group: "Animation" },
                    { value: "Framer Motion", label: "Framer Motion", group: "Animation" },
                  ].map((o) => ({ ...o, selected: comboTags.includes(o.value) }))}
                  placeholder={language === "ko" ? "입력해 필터 / 추가" : "Type to filter / add"}
                />
              </Tooltip>
              {comboTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-2xs)" }}>
                  {comboTags.map((tag, i) => (
                    <Chip key={tag} variant="capsule" onRemove={() => setComboTags((p) => p.filter((_, j) => j !== i))}>{tag}</Chip>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
          <div className={styles.componentSubLabel}>editable — 프리셋 밖 값 직접 입력</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "`editable` 을 주면 트리거를 **더블클릭**할 때 입력칸으로 바뀌어, 드롭다운 프리셋에 없는 값도 직접 타이핑할 수 있습니다(에디터 툴바의 폰트 크기·줄간격 입력이 이 방식입니다). 한 번 클릭은 평소대로 드롭다운을 엽니다 — 더블클릭과 구분하려고 첫 클릭을 250ms 지연시킵니다. `editableInputProps` 로 `maxLength`(길이 제한)·`placeholder`·`sanitize`(확정 직전 정규화, 예: 숫자만 · 숫자·점만)를 지정합니다. blur 나 Enter 로 확정, Escape 로 취소하며, 프리셋에 없는 값은 현재 값을 임시 옵션으로 얹어 드롭다운에서도 보이게 합니다. `value` 가 비어 있으면 처음부터 입력 모드로 시작합니다(PeriodPicker 의 연·월·일 칸이 그 예입니다)."
              : "With `editable`, **double-clicking** the trigger swaps it for a text input, so you can type a value that isn't in the dropdown (the editor toolbar's font-size / line-height inputs work this way). A single click still opens the dropdown — the first click is delayed 250ms to tell the two apart. `editableInputProps` sets `maxLength`, `placeholder`, and `sanitize` (normalize on commit — digits only, digits-and-dot only, etc.). Commit on blur or Enter, cancel on Escape; a non-preset value is kept visible by prepending the current value as a temporary option. An empty `value` starts in input mode (PeriodPicker's year / month / day fields do this).")}
          </p>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2xs)" }}>
              <span className={styles.sliderLabel}>Font size — {selectFontSize}px · 더블클릭해 직접 입력</span>
              <Tooltip content="editable · sanitize(숫자만) · maxLength 3">
                <Select
                  value={selectFontSize}
                  options={[
                    ...(selectFontSize && !FONT_SIZE_DEMO_PRESETS.includes(Number(selectFontSize))
                      ? [{ value: selectFontSize, label: `${selectFontSize}px` }]
                      : []),
                    ...FONT_SIZE_DEMO_PRESETS.map((s) => ({ value: String(s), label: `${s}px` })),
                  ]}
                  onChange={setSelectFontSize}
                  size="sm"
                  width="max"
                  editable
                  editableInputProps={{ maxLength: 3, placeholder: "px", sanitize: (raw) => raw.replace(/[^0-9]/g, "") }}
                />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2xs)" }}>
              <span className={styles.sliderLabel}>Line height — {selectLineHeight} · 더블클릭해 직접 입력</span>
              <Tooltip content="editable · sanitize(숫자·점) · maxLength 4">
                <Select
                  value={selectLineHeight}
                  options={[
                    ...(selectLineHeight && !LINE_HEIGHT_DEMO_PRESETS.map(String).includes(selectLineHeight)
                      ? [{ value: selectLineHeight, label: selectLineHeight }]
                      : []),
                    ...LINE_HEIGHT_DEMO_PRESETS.map((v) => ({ value: String(v), label: String(v) })),
                  ]}
                  onChange={setSelectLineHeight}
                  size="sm"
                  width="max"
                  editable
                  editableInputProps={{ maxLength: 4, placeholder: "1.6", sanitize: (raw) => raw.replace(/[^0-9.]/g, "") }}
                />
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* ColorPicker */}
        <DemoGroup
          title="ColorPicker"
          ko={"render-prop trigger 와 portal popover 로 이뤄집니다. trigger 를 호출부가 직접 그리기 때문에 스와치·버튼·칩 등 무엇이든 될 수 있습니다. **모바일(≤768px)에서는 dropdown 대신 bottom sheet 으로 바뀝니다.** 색을 고르려면 두 손가락만 한 면적이 필요한데, 작은 화면의 popover 로는 그만한 공간이 나오지 않기 때문입니다. `inline` 모드는 이미 제자리에 펼쳐진 형태라 sheet 전환에서 제외됩니다."}
          en={"A render-prop trigger with a portal popover — the caller draws the trigger, so it can be a swatch, a button, or a chip. **On mobile (≤768px) it becomes a bottom sheet instead of a dropdown** — picking a color needs roughly two fingers' worth of area, which a popover on a small screen can't give. `inline` mode is already expanded in place, so it opts out of the sheet."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
            <Tooltip content="render-prop trigger + portal popover">
              <ColorPicker value={pickerColor} onChange={(c) => setPickerColor(c.hex)}>
                {({ toggle }) => (
                  <Pressable
                    onClick={toggle}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      border: "1px solid var(--color-neutral-300)",
                      borderRadius: "var(--radius-circle)",
                      background: pickerColor,
                      cursor: "pointer",
                    }}
                    aria-label="Pick color"
                  />
                )}
              </ColorPicker>
            </Tooltip>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-body)", color: "var(--text-secondary)" }}>{pickerColor}</span>
          </motion.div>
        </DemoGroup>

        {/* DatePicker */}
        <DemoGroup title="DatePicker">
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>Format</span>
              <div style={{ display: "flex", border: "var(--border-light)", borderRadius: "var(--radius-capsule)", overflow: "hidden" }}>
                {(["year", "yearMonth", "date"] as const).map((f, i, arr) => (
                  <Pressable
                    key={f}
                    onClick={() => setDpFormat(f)}
                    style={{
                      padding: "var(--spacing-2xs) var(--spacing-sm)",
                      border: "none",
                      borderRight: i < arr.length - 1 ? "var(--border-light)" : "none",
                      borderRadius: 0,
                      background: dpFormat === f ? "var(--text-primary)" : "transparent",
                      color: dpFormat === f ? "var(--bg-primary)" : "var(--text-secondary)",
                      fontSize: "var(--font-size-label)",
                      fontFamily: "var(--font-space-grotesk)",
                      cursor: "pointer",
                    }}
                  >
                    {f === "year" ? (language === "ko" ? "연도" : "Year") : f === "yearMonth" ? (language === "ko" ? "연.월" : "Y.M") : (language === "ko" ? "연.월.일" : "Y.M.D")}
                  </Pressable>
                ))}
              </div>
              <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-primary)", marginLeft: "var(--spacing-xs)", fontFamily: "var(--font-space-grotesk)", fontWeight: 600 }}>
                {dpFormat === "year" ? dpDate.year : dpFormat === "yearMonth" ? `${dpDate.year}.${dpDate.month}` : `${dpDate.year}.${dpDate.month}.${dpDate.day}`}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--spacing-lg)", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ minWidth: 230 }}>
                <div style={{ display: "inline-block", fontSize: "var(--font-size-label)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>Spinner</div>
                <div style={{ border: "var(--border-light)", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
                  <DatePicker
                    year={dpDate.year}
                    month={dpDate.month}
                    day={dpDate.day}
                    format={dpFormat}
                    mode="spinner"
                    language={language as "ko" | "en"}
                    onSelect={(y, m, d) => setDpDate({ year: y, month: m, day: d })}
                  />
                </div>
              </div>
              <div style={{ minWidth: 230 }}>
                <div style={{ display: "inline-block", fontSize: "var(--font-size-label)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>Calendar</div>
                <div style={{ border: "var(--border-light)", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
                  <DatePicker
                    year={dpDate.year}
                    month={dpDate.month}
                    day={dpDate.day}
                    format={dpFormat}
                    mode="calendar"
                    language={language as "ko" | "en"}
                    onSelect={(y, m, d) => setDpDate({ year: y, month: m, day: d })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </DemoGroup>

        {/* PeriodPicker */}
        <DemoGroup title="PeriodPicker">
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)", maxWidth: 540 }}>
            <PeriodPicker value={period} onChange={setPeriod} />
          </motion.div>
        </DemoGroup>

        {/* EmojiPicker */}
        <DemoGroup
          title="EmojiPicker"
          ko={"이모지·아이콘·커스텀 이미지를 선택합니다. 탭 전환과 검색, 셔플, 최근 사용 목록을 제공합니다."}
          en={"Pick an emoji, icon, or custom image — tabbed, with search, shuffle, and recents."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
            <Tooltip content="open EmojiPicker">
              <Button variant="outline" onClick={() => setDsEmojiOpen((v) => !v)}>
                {language === "ko" ? "선택하기" : "Pick"}
              </Button>
            </Tooltip>
            {dsEmoji && <EmojiIcon value={dsEmoji} />}
            <EmojiPicker
              open={dsEmojiOpen}
              onClose={() => setDsEmojiOpen(false)}
              onSelect={(v) => { setDsEmoji(v); setDsEmojiOpen(false); }}
              currentValue={dsEmoji}
            />
          </motion.div>
        </DemoGroup>

        {/* FontPicker */}
        <DemoGroup
          title="FontPicker"
          ko={"폰트를 고르는 드롭다운입니다. 각 항목이 그 폰트 그대로 렌더되기 때문에, 고르기 전에 실제 생김새를 미리 볼 수 있습니다. 폰트를 `groups` 로 묶어 넘기면 그룹마다 라벨(예: 영문·고정폭)이 붙고, 그룹이 하나뿐일 때는 `group: \"\"` 로 그 라벨만 숨길 수 있습니다. 어떤 항목에 `googleName` 을 지정해 두면 그 폰트를 고르는 순간 컴포넌트가 해당 Google Font 를 알아서 불러오므로, 호출부에서 따로 로드하지 않아도 됩니다. `preferEn` 을 켜면 한글 그룹이 목록 맨 뒤로 밀려서 영문 UI 를 우선하는 자리에 맞출 수 있습니다."}
          en={"A dropdown for picking a font. Each option is rendered in the very font it represents, so you can see how it actually looks before you choose. Group the options with `groups` to give each set a label (e.g. Latin, Mono); when there's only one group, pass `group: \"\"` to hide that label. Give an option a `googleName` and the component loads that Google Font automatically the moment it's chosen — the caller never has to load it. Turn on `preferEn` to push Korean groups to the end of the list for English-first surfaces."}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)", maxWidth: "560px", marginTop: "var(--spacing-xl)" }}>
            {/* 선택한 폰트 미리보기 — 맨 위, 프레임 없이 텍스트만 (폭 제한으로 넘침 방지) */}
            <motion.div
              variants={staggerItemX}
              {...scrollChildX(0, 2)}
              style={{
                fontFamily: fontDemo,
                fontSize: "var(--font-size-2xl)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
                /* 2줄 높이로 고정 — 폰트를 바꿔 줄바꿈돼도 높이가 안 변해 레이아웃이 안 흔들림 */
                height: "calc(var(--font-size-2xl) * 1.3 * 2)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
              }}
            >
              {language === "ko" ? "다람쥐 헌 쳇바퀴에 타고파 · The quick brown fox 0123" : "The quick brown fox jumps · 다람쥐 헌 쳇바퀴 0123"}
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ alignSelf: "flex-start" }}>
              <FontPicker
                value={fontDemo}
                onChange={(v) => setFontDemo(v)}
                groups={FONT_GROUPS}
                fallbackLabel="Default"
              />
            </motion.div>
          </div>
        </DemoGroup>

    </>
  );
}
