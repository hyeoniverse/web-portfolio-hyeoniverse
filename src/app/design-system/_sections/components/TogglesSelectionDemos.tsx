"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SortControl from "@/components/ui/SortControl";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import { DemoGroup, useDemo } from "./demoShared";

/** Toggles & Selection — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function TogglesSelectionDemos() {
  const { language, scrollChildX } = useDemo();
  // Textarea tabIndent 데모
  const [sortDemo, setSortDemo] = useState<"registered" | "reactions">("registered");
  const [sortDirDemo, setSortDirDemo] = useState<"asc" | "desc">("asc");
  const [segDemo, setSegDemo] = useState("all");
  const [segSubtleDemo, setSegSubtleDemo] = useState("month");
  const [switchOn, setSwitchOn] = useState(false);
  const [switchAccent, setSwitchAccent] = useState(true);
  const [switchLabeled, setSwitchLabeled] = useState(true);
  const [switchStateText, setSwitchStateText] = useState(true);
  const [checkSquare, setCheckSquare] = useState(false);
  const [checkCircle, setCheckCircle] = useState(true);
  const [checkIndet, setCheckIndet] = useState(false);
  // LanguageToggle 데모 (size md / sm)
  const [langMd, setLangMd] = useState<"ko" | "en">("ko");
  const [langSm, setLangSm] = useState<"ko" | "en">("ko");

  return (
    <>
        <h3 className={styles.componentCategory}>Toggles & Selection</h3>

        {/* SortControl */}
        <DemoGroup
          title="SortControl"
          ko={"정렬 필드 Select 와 역순 토글을 하나의 pill 로 결합합니다. 달력 블록 툴바와 댓글이 함께 씁니다. 예전에는 달력은 pill, 댓글은 gap 배치에 고정 아이콘이라 같은 기능이 서로 다르게 보였습니다. 역순 아이콘은 현재 정렬 방향을 그대로 반영합니다(고정 아이콘은 '누르면 뒤집힌다'만 알려줄 뿐 지금 방향은 알려주지 못합니다)."}
          en={"A sort-field Select joined with a reverse toggle in one pill. Shared by the calendar block toolbar and comments — the calendar used a pill while comments used a gap layout with a fixed icon, so the same feature looked different in each. The reverse icon reflects the current direction (a fixed icon only says 'this flips', never which way you are)."}
        >
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
              <SortControl
                value={sortDemo}
                onChange={setSortDemo}
                options={[
                  { value: "registered", label: language === "ko" ? "등록순" : "Registered" },
                  { value: "reactions", label: language === "ko" ? "반응순" : "Most reactions" },
                ]}
                dir={sortDirDemo}
                onDirChange={setSortDirDemo}
              />
            </motion.div>
          </div>
        </DemoGroup>

        {/* SegmentedControl */}
        <DemoGroup
          title="SegmentedControl"
          ko={"캡슐 안에서 하나를 고르는 컨트롤로, posts 정렬·시리즈/태그 필터·달력 뷰 전환 등 33곳에서 씁니다. 테두리를 border 가 아니라 inset box-shadow 로 그립니다. border 는 layout 에 영향을 줘서 '전체 높이 = 버튼 높이 + padding' 규칙을 지킬 수 없기 때문입니다(그래서 색만 바꾸려 해도 border-color 로는 먹지 않습니다). variant 는 테두리 세기만 가릅니다. subtle 은 주변이 전부 border-light 결인 자리(달력 블록)에서 기본값이 혼자 진하게 튀는 것을 막아 줍니다."}
          en={"A capsule control for picking one of several — used in 33 places (post sorting, series/tag filters, calendar view switching). Its outline is an inset box-shadow, not a border: a real border affects layout and breaks the \"total height = button height + padding\" rule (which is also why border-color won't override it). variant only changes outline weight — subtle keeps the default from standing out where everything around it is border-light, like the calendar block."}
        >
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
              <SegmentedControl<string>
                items={[
                  { value: "all", label: language === "ko" ? "전체" : "All" },
                  { value: "todo", label: language === "ko" ? "예정" : "To-do" },
                  { value: "done", label: language === "ko" ? "완료" : "Done" },
                ]}
                value={segDemo}
                onChange={setSegDemo}
                size="sm"
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>default</span>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
              <SegmentedControl<string>
                variant="subtle"
                items={[
                  { value: "month", label: language === "ko" ? "월" : "Month" },
                  { value: "week", label: language === "ko" ? "주" : "Week" },
                  { value: "day", label: language === "ko" ? "일" : "Day" },
                ]}
                value={segSubtleDemo}
                onChange={setSegSubtleDemo}
                size="sm"
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>subtle</span>
            </motion.div>
          </div>
        </DemoGroup>

        {/* Checkbox */}
        <DemoGroup title="Checkbox">
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="shape: square"><Checkbox checked={checkSquare} onChange={setCheckSquare} shape="square" label="Square" /></Tooltip></motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="shape: circle"><Checkbox checked={checkCircle} onChange={setCheckCircle} shape="circle" label="Circle" /></Tooltip></motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="indeterminate"><Checkbox checked={checkIndet} onChange={setCheckIndet} indeterminate label="Indeterminate" /></Tooltip></motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled"><Checkbox checked={false} onChange={() => {}} disabled label="Disabled" /></Tooltip></motion.div>
          </div>
        </DemoGroup>

        {/* Switch */}
        <DemoGroup title="Switch">
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>Default (sm)</span>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Switch checked={switchAccent} onCheckedChange={setSwitchAccent} variant="accent" />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>Accent</span>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(2, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Switch disabled />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>Disabled</span>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(3, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Switch disabled defaultChecked />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>Disabled On</span>
            </motion.div>
          </div>
          {/* label(옆 form-row 라벨) vs showStateText(토글 안 ON/OFF 텍스트) */}
          <div className={styles.componentRow} style={{ marginTop: "var(--spacing-sm)", gap: "var(--spacing-2xl)" }}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "inline-flex" }}>
              <Switch size="md" label="With label" checked={switchLabeled} onCheckedChange={setSwitchLabeled} />
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Switch size="md" showStateText checked={switchStateText} onCheckedChange={setSwitchStateText} />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>showStateText (ON/OFF)</span>
            </motion.div>
          </div>
        </DemoGroup>

        {/* LanguageToggle — 사이즈 md / sm */}
        <DemoGroup title="LanguageToggle">
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <LanguageToggle lang={langMd} onLangChange={setLangMd} />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>Default (md, 28px)</span>
            </motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <LanguageToggle lang={langSm} onLangChange={setLangSm} size="sm" />
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-label)", color: "var(--text-secondary)" }}>size=&quot;sm&quot; (22px)</span>
            </motion.div>
          </div>
        </DemoGroup>

    </>
  );
}
