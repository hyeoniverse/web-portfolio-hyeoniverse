"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import HighlightInput from "@/components/ui/HighlightInput";
import { Slider } from "@/components/ui/Slider";
import Input from "@/components/ui/Input";
import NumberInput from "@/components/ui/NumberInput";
import { showToast } from "@/stores/toastStore";
import Tooltip from "@/components/ui/Tooltip";
import Textarea from "@/components/ui/Textarea";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import { md, DemoGroup, useDemo } from "./demoShared";

/** Inputs & Fields — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function InputsFieldsDemos() {
  const { language, scrollChildX } = useDemo();
  const [searchDemo, setSearchDemo] = useState("");
  const [searchScoped, setSearchScoped] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [searchMorph, setSearchMorph] = useState("");
  const [sliderValue, setSliderValue] = useState([40]);
  const [rangeValue, setRangeValue] = useState([20, 80]);
  const [numBasic, setNumBasic] = useState(50);
  const [numWidth, setNumWidth] = useState(320);
  const [numGauge, setNumGauge] = useState(50);
  const [editableDemo, setEditableDemo] = useState("클릭해서 편집");
  const [editableLimitDemo, setEditableLimitDemo] = useState("글자수 권장 한도를 넘겨 보세요");
  const [inputValue, setInputValue] = useState("");
  const [inputUnderline, setInputUnderline] = useState("");
  const [inputSm, setInputSm] = useState("");
  const [inputInline, setInputInline] = useState("");
  const [inputAdd, setInputAdd] = useState("");
  // Textarea (with maxHint) 데모
  const [excerptDemo, setExcerptDemo] = useState("");

  return (
    <>
        <h3 className={styles.componentCategory}>Inputs & Fields</h3>

        {/* Input */}
        <DemoGroup title="Input">
          <div className={styles.componentSubLabel}>Variants</div>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 4)}>
              <Tooltip content="variant: capsule (default)">
                <Input label="Label" value={inputValue} onChange={setInputValue} placeholder="Type something..." />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 4)}>
              <Tooltip content="variant: underline">
                <Input label="Underline" value={inputUnderline} onChange={setInputUnderline} variant="underline" placeholder="Underline style..." />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 4)}>
              <Tooltip content="inlineLabel">
                <Input inlineLabel="EN" value={inputInline} onChange={setInputInline} placeholder="Inline label..." />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(3, 4)}>
              <Tooltip content="onAdd — Enter / + 클릭 시 commit, focus-within 시 + 도 strong border">
                <Input label="Add" value={inputAdd} onChange={setInputAdd} onAdd={(v) => { showToast(`Added: ${v}`, "info"); setInputAdd(""); }} placeholder="Type then Enter / +" />
              </Tooltip>
            </motion.div>
          </div>
          <div className={styles.componentSubLabel}>Sizes & States</div>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 3)}>
              <Tooltip content="size: md (default)">
                <Input label="Medium" value="" onChange={() => {}} placeholder="Default size" />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 3)}>
              <Tooltip content="size: sm">
                <Input label="Small" value={inputSm} onChange={setInputSm} size="sm" placeholder="Small input..." />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
              <Tooltip content="disabled">
                <Input value="Read-only value" onChange={() => {}} disabled />
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* Slider */}
        <DemoGroup title="Slider">
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 3)}>
              <span className={styles.sliderLabel}>Single — {sliderValue[0]}</span>
              <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 3)}>
              <span className={styles.sliderLabel}>Range — {rangeValue[0]}~{rangeValue[1]}</span>
              <Slider value={rangeValue} onValueChange={setRangeValue} max={100} step={1} />
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
              <span className={styles.sliderLabel}>Disabled</span>
              <Slider defaultValue={[60]} max={100} disabled />
            </motion.div>
          </div>
        </DemoGroup>

        {/* NumberInput — 캡슐형 숫자 입력 (타이핑 중엔 draft, blur/Enter/스텝퍼에만 확정) */}
        <DemoGroup title="NumberInput">
          <p className={styles.componentDesc}>
            {language === "ko"
              ? "스텝퍼는 SpinButton 이라 누르고 있으면 가속하며 반복합니다. 경계값에 닿으면 toast 로 알리되, hold-repeat 로 도배되는 것을 막으려고 1.2초당 한 번만 띄웁니다."
              : "The steppers are SpinButtons — hold to repeat with acceleration. Hitting a bound raises a toast, throttled to once per 1.2s so hold-repeat can't spam it."}
          </p>
          <div className={styles.sliderRow}>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 4)}>
              <span className={styles.sliderLabel}>Basic — {numBasic} · 스텝퍼 + blur/Enter 확정</span>
              <Tooltip content="value + onCommit (min/max clamp)">
                <NumberInput value={numBasic} onCommit={setNumBasic} min={0} max={100} />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 4)}>
              <span className={styles.sliderLabel}>Label + unit — {numWidth}px</span>
              <Tooltip content="label='W' · unit='px' · width — unit 이 잘리면 그때만 툴팁으로 전체 표시">
                <NumberInput value={numWidth} onCommit={setNumWidth} min={1} label="W" unit="px" width={56} />
              </Tooltip>
            </motion.div>
            <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 4)}>
              <span className={styles.sliderLabel}>Gauge — {numGauge}% (0~100 중 위치에 따라 숫자 색)</span>
              <Tooltip content="gauge — min·max 사이 위치를 낮음/중간/높음 색으로. 바 없이 숫자 색만">
                <NumberInput value={numGauge} onCommit={setNumGauge} min={0} max={100} unit="%" width={48} gauge />
              </Tooltip>
            </motion.div>
          </div>
        </DemoGroup>

        {/* Textarea */}
        <DemoGroup title="Textarea">
          {/* maxHint 와 tabIndent 는 같은 contenteditable 모드라 한 컴포넌트에 동시 적용 — 데모는 하나로,
              label·설명은 옵션별로 각각 유지. */}
          <div className={styles.componentSubLabel}>maxHint (contenteditable highlight)</div>
          <p className={styles.componentDesc}>
            maxHint 설정 시 contenteditable=&quot;plaintext-only&quot; 모드로 자동 전환 — 초과 글자에 inline &lt;mark&gt; highlight · preset (short 200 / basic 500 / long 2000) 또는 숫자 · 카운터 80% 부터 warning, 100% 부터 over · native resize 핸들 위 투명 overlay 로 커스텀 cursor 표시
          </p>
          <div className={styles.componentSubLabel}>tabIndent</div>
          <p className={styles.componentDesc}>
            {language === "ko"
              ? "tabIndent 는 opt-in 입니다. 키보드로 폼을 빠져나갈 수 있으려면 기본적으로 Tab 이 다음 포커스로 동작해야 하기 때문입니다(a11y). 그래서 코드나 마크다운을 입력하는 칸(댓글 작성란 등)에서만 켭니다. maxHint 가 있어야 켜지는 contenteditable 모드 전용입니다."
              : "tabIndent is opt-in — Tab must default to next-focus so keyboard users can leave the form (a11y). Turn it on only where code/markdown gets typed (the comment box, etc.). Requires the contenteditable mode, which maxHint enables."}
          </p>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ maxWidth: 480 }}>
            <Textarea
              value={excerptDemo}
              onChange={setExcerptDemo}
              placeholder={language === "ko" ? "200자를 넘기면 초과한 부분이 강조되고, Tab 을 누르면 2칸 들여쓰기 됩니다." : "Type past 200 characters and the overflow is highlighted; press Tab to indent two spaces."}
              rows={4}
              maxHint="short"
              tabIndent
            />
          </motion.div>
        </DemoGroup>

        {/* SearchCapsule */}
        <DemoGroup
          title="SearchCapsule"
          ko={"접힌 아이콘에서 펼쳐지는 검색 인풋입니다. 지우개·검색 이력·문법 도움말을 자체 내장해서, 목록이나 필터 바에서 raw input 을 다시 짤 필요가 없습니다."}
          en={"A search capsule — an input that expands from a collapsed icon. It bundles its own clear button, search history, and syntax help, so list/filter bars never re-implement a raw input."}
        >

          <div className={styles.componentSubLabel}>typeSelector · historyKey · showHelp</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "실제 필터 바는 이 옵션들을 한꺼번에 씁니다. 왼쪽 `typeSelector` 로 검색 범위를, 오른쪽 `?`(`showHelp`) 말풍선으로 문법·매칭 강도(prefix/regex) 도움말을 열고, `historyKey` 로 최근 검색을 저장합니다(검색어 입력 → Enter → 빈 상태로 다시 포커스하면 이력이 뜹니다)."
              : "A real filter bar uses these together: `typeSelector` scopes the search on the left, the `?` (`showHelp`) bubble opens syntax + match-strength (prefix/regex) help on the right, and `historyKey` persists recent searches (type → Enter → refocus empty to see history).")}
          </p>
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ minWidth: 360 }}>
              <SearchCapsule
                search={searchScoped}
                onSearchChange={setSearchScoped}
                placeholder={language === "ko" ? "검색 (Enter 로 이력 저장)" : "Search (Enter saves history)"}
                align="left"
                historyKey="design-system-search"
                showHelp
                typeSelector={{
                  value: searchScope,
                  onChange: setSearchScope,
                  options: [
                    { value: "all", label: language === "ko" ? "전체" : "All" },
                    { value: "title", label: language === "ko" ? "제목" : "Title" },
                    { value: "body", label: language === "ko" ? "본문" : "Body" },
                  ],
                }}
              />
            </motion.div>
          </div>

          <div className={styles.componentSubLabel}>collapsible</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "`collapsible` 은 접힌 원형 아이콘에서 클릭 시 캡슐로 펼쳐지고, 비었을 때 blur 하면 다시 접힙니다. compact 배치용 — 펼침 너비는 `expandedWidth` 로 조정합니다."
              : "`collapsible` starts as a circle icon, expands to a capsule on click, and folds back on blur when empty. For compact bars — expanded width via `expandedWidth`.")}
          </p>
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
              <SearchCapsule
                search={searchMorph}
                onSearchChange={setSearchMorph}
                placeholder={language === "ko" ? "클릭해서 펼치기" : "Click to expand"}
                align="left"
                historyKey={null}
                collapsible
              />
            </motion.div>
          </div>

          <div className={styles.componentSubLabel}>size</div>
          <p className={styles.componentDesc}>
            {md(language === "ko"
              ? "`size` 는 캡슐 높이를 정합니다 — sm(28) · md(32, 기본). `align` 은 dropdown 정렬을 좌/우로 잡습니다."
              : "`size` sets the capsule height — sm(28) / md(32, default). `align` anchors the dropdown left/right.")}
          </p>
          <div className={styles.componentRow} style={{ gap: "var(--spacing-lg)" }}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ minWidth: 200 }}>
              <SearchCapsule
                search={searchDemo}
                onSearchChange={setSearchDemo}
                placeholder="size sm"
                size="sm"
                align="left"
                historyKey={null}
              />
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ minWidth: 200 }}>
              <SearchCapsule
                search={searchDemo}
                onSearchChange={setSearchDemo}
                placeholder={language === "ko" ? "size md (기본)" : "size md (default)"}
                size="md"
                align="left"
                historyKey={null}
              />
            </motion.div>
          </div>
        </DemoGroup>

        {/* HighlightInput */}
        <DemoGroup
          title="HighlightInput"
          ko={"native `<input>` 은 텍스트 **일부만** 색칠할 수 없어서, 초과 글자에 inline `<mark>` 하이라이트를 하려면 contentEditable 이 필요합니다 — 그걸 위한 단일행 contentEditable input 입니다(native 가 공짜로 주는 caret·IME·autofill 을 대신 손으로 재구현하는 대신 하이라이트를 얻는 트레이드오프). 하이라이트가 필요할 때만 이걸 직접 쓰고, 그 외엔 native `Input` 을 씁니다 — 둘은 완전히 분리돼 있고 서로를 모릅니다. 제한은 두 갈래 — `maxHint` 는 **권장** 한도라 초과분에 `<mark>` 와 카운터만 띄우고 자르진 않으며(붙여넣은 긴 제목 보존), `maxLength` 는 **하드** 상한이라 입력·붙여넣기 시점에 잘라냅니다. `inlineLabel` 로 KO/EN 배지를 input 안에 넣습니다."}
          en={"A native `<input>` can't style **part** of its text, so inline `<mark>` highlighting of overflow needs contentEditable — this is that single-line contentEditable input (the trade-off: you re-implement caret/IME/autofill that native gives for free, in exchange for the highlight). Reach for it only when you need the highlight; otherwise use native `Input` — the two are fully separate and don't know about each other. Two-tier limit: `maxHint` is a **soft** cap (marks the overflow + counter, never truncates a long pasted title), `maxLength` is a **hard** cap enforced on type/paste. `inlineLabel` adds a badge like KO/EN inside the field."}
        >
          <div className={styles.componentRow} style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--spacing-sm)", maxWidth: 380 }}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
              <HighlightInput value={editableDemo} onChange={setEditableDemo} inlineLabel="KO" placeholder={language === "ko" ? "제목" : "Title"} />
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}>
              <HighlightInput value={editableLimitDemo} onChange={setEditableLimitDemo} maxHint={20} placeholder={language === "ko" ? "권장 20자" : "20 chars suggested"} />
            </motion.div>
          </div>
        </DemoGroup>

    </>
  );
}
