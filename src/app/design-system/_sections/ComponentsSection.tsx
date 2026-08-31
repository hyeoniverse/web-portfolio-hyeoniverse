"use client";

import { memo, useState, useCallback, Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Mail, Send, Star, ArrowRight, Zap, RotateCcw, Hash, Code, Minus, Plus, ExternalLink } from "@/components/icons";
import Button from "@/components/ui/Button";
import HelpButton from "@/components/ui/HelpButton";
import SortControl from "@/components/ui/SortControl";
import SegmentedControl from "@/components/ui/SegmentedControl";
import FontPicker from "@/components/ui/FontPicker";
import { FONT_GROUPS } from "@/components/posts/plate/constants";
import MenuDots from "@/components/ui/MenuDots";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import HighlightedText from "@/components/ui/HighlightedText";
import HighlightInput from "@/components/ui/HighlightInput";
import SpinButton from "@/components/ui/SpinButton";
import Collapsible from "@/components/ui/Collapsible";
import { Typography } from "@/components/ui/Typography";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import Input from "@/components/ui/Input";
import NumberInput from "@/components/ui/NumberInput";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { useModalStore } from "@/stores/modalStore";
import { showToast } from "@/stores/toastStore";
import { ModalConfirm, ModalAlert } from "@/components/ui/ModalTemplates";
import ColorPicker from "@/components/ui/ColorPicker";
import SectionHeader from "@/components/ui/SectionHeader";
import CloseButton from "@/components/ui/CloseButton";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type { DatePeriod } from "@/data/profile";
import Logo from "@/components/common/Logo";
import TypeWriter from "@/components/effects/TypeWriter";
import Tooltip from "@/components/ui/Tooltip";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import { MoreVertical, ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "@/components/icons";
import TextLink from "@/components/ui/TextLink";
import Pagination from "@/components/ui/Pagination";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import HeartIcon from "@/components/ui/HeartIcon";
import Textarea from "@/components/ui/Textarea";
import LanguageToggle from "@/components/ui/LanguageToggle";
import EmojiPicker, { EmojiIcon } from "@/components/ui/EmojiPicker";
import RelatedChips from "@/components/ui/RelatedChips/RelatedChips";
import { staggerContainer, staggerItemX } from "../_data/animations";
import styles from "../DesignSystem.module.css";
import Pressable from "@/components/ui/Pressable";

const DatePicker = dynamic(
  () => import("@/components/ui/DatePicker/DatePicker"),
  { ssr: false, loading: () => <div style={{ height: 200 }} /> }
);

interface ComponentsSectionProps {
  language: string;
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
  vpGroup: (delay: number) => Record<string, unknown>;
  scrollChildX: (i: number, total: number) => Record<string, unknown>;
  nd: () => number;
}

/** 설명 문자열 안의 인라인 마크다운을 렌더 — **굵게** → <strong>, `코드` → <code>. */
function md(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// FontPicker 데모는 공용 카탈로그(FONT_GROUPS, 단일 소스)를 그대로 사용한다.

// editable Select 데모용 프리셋 — 에디터 툴바의 폰트 크기·줄간격 입력과 같은 구성.
const FONT_SIZE_DEMO_PRESETS = [14, 15, 16, 18, 20, 24, 28, 32];
const LINE_HEIGHT_DEMO_PRESETS = [1.4, 1.6, 1.8, 2.0];

function ComponentsSection({ language, setSectionRef, vpGroup, scrollChildX, nd }: ComponentsSectionProps) {
  const { openModal } = useModalStore();
  const [menuDotsOpen, setMenuDotsOpen] = useState(false);
  const [menuDotsClosing, setMenuDotsClosing] = useState(false);
  const [twReplay, setTwReplay] = useState(0);
  const [searchDemo, setSearchDemo] = useState("");
  const [searchScoped, setSearchScoped] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [searchMorph, setSearchMorph] = useState("");
  const [sliderValue, setSliderValue] = useState([40]);
  const [rangeValue, setRangeValue] = useState([20, 80]);
  const [numBasic, setNumBasic] = useState(50);
  const [numWidth, setNumWidth] = useState(320);
  const [numGauge, setNumGauge] = useState(50);
  // SpinButton 데모 — 누르고 있으면 가속 반복되는 걸 카운터로 보여줌
  const [spinCount, setSpinCount] = useState(0);
  // Textarea tabIndent 데모
  const [sortDemo, setSortDemo] = useState<"registered" | "reactions">("registered");
  const [sortDirDemo, setSortDirDemo] = useState<"asc" | "desc">("asc");
  const [segDemo, setSegDemo] = useState("all");
  const [segSubtleDemo, setSegSubtleDemo] = useState("month");
  const [fontDemo, setFontDemo] = useState("var(--font-instrument)");
  const [editableDemo, setEditableDemo] = useState("클릭해서 편집");
  const [editableLimitDemo, setEditableLimitDemo] = useState("글자수 권장 한도를 넘겨 보세요");
  const [switchOn, setSwitchOn] = useState(false);
  const [switchAccent, setSwitchAccent] = useState(true);
  const [switchLabeled, setSwitchLabeled] = useState(true);
  const [switchStateText, setSwitchStateText] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [inputUnderline, setInputUnderline] = useState("");
  const [inputSm, setInputSm] = useState("");
  const [inputInline, setInputInline] = useState("");
  const [inputAdd, setInputAdd] = useState("");
  const [checkSquare, setCheckSquare] = useState(false);
  const [checkCircle, setCheckCircle] = useState(true);
  const [checkIndet, setCheckIndet] = useState(false);
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
  const [paginationPage, setPaginationPage] = useState(3);
  const [pickerColor, setPickerColor] = useState("#d01046");
  const [dragTags, setDragTags] = useState(["React", "Next.js", "TypeScript", "GSAP"]);
  // HeartIcon 단독 데모 (size 별)
  const [iconLiked, setIconLiked] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  // LanguageToggle 데모 (size md / sm)
  const [langMd, setLangMd] = useState<"ko" | "en">("ko");
  const [langSm, setLangSm] = useState<"ko" | "en">("ko");
  const toggleIcon = useCallback(() => {
    setIconBusy(true);
    setIconLiked((prev) => !prev);
    setTimeout(() => setIconBusy(false), 200);
  }, []);
  // Textarea (with maxHint) 데모
  const [excerptDemo, setExcerptDemo] = useState("");
  // EmojiPicker 데모
  const [dsEmojiOpen, setDsEmojiOpen] = useState(false);
  const [dsEmoji, setDsEmoji] = useState("");
  const { itemProps: tagItemProps } = useChipReorder((from, to) => {
    setDragTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  });
  const [ivOpen, setIvOpen] = useState(false);
  const [ivIndex, setIvIndex] = useState(0);
  const ivImages = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=800&fit=crop",
  ];

  const handleOpenModal = useCallback((title: string, content: React.ReactNode) => {
    openModal(content, { header: { title }, closeButton: true, width: "420px" });
  }, [openModal]);

  return (
    <section id="components" ref={setSectionRef("components")} className={styles.section}>
      <h2 className={styles.sectionTitle}>Components</h2>

      <h3 className={styles.componentCategory}>Layout & Brand</h3>

      {/* Logo */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Logo</div>
        <div className={styles.logoRow}>
          <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
            <Logo variant="short" as="span" />
            <span className={styles.logoLabel}>short</span>
          </motion.div>
          <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
            <Logo variant="full" as="span" />
            <span className={styles.logoLabel}>full</span>
          </motion.div>
        </div>
      </motion.div>

      {/* SectionHeader */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SectionHeader</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "제목과 선택적 부가설명, 선택적 우측 액션 슬롯으로 구성됩니다. 여러 곳에 흩어져 있던 `<h2>제목</h2> + <p>부가설명</p>` 인라인 패턴을 흡수합니다. 저장/되돌리기와 dirty 계산이 결합된 admin 설정의 SectionHeader 와 달리, 이 컴포넌트는 프레젠테이션 전용입니다."
            : "Title + optional sub + optional right-side action slot. Absorbs the scattered inline `<h2>` + `<p>` pattern. Presentation-only — unlike the settings `SectionHeader` which is coupled to save/dirty logic.")}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)", width: "100%", maxWidth: 520 }}>
          <SectionHeader
            title={language === "ko" ? "섹션 제목" : "Section title"}
            sub={language === "ko" ? "제목 아래 부가설명이 들어갑니다." : "A subtitle sits below the title."}
          />
          <SectionHeader
            title={language === "ko" ? "액션 있는 헤더" : "With actions"}
            sub={language === "ko" ? "우측에 버튼 슬롯이 붙습니다." : "A button slot on the right."}
            actions={<Button variant="outline" size="sm">{language === "ko" ? "액션" : "Action"}</Button>}
          />
        </motion.div>
      </motion.div>

      {/* Collapsible */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Collapsible</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "내용이 maxHeight 를 넘을 때만 접고 더보기를 붙입니다. 넘치지 않으면 버튼도 페이드도 없어서 짧은 내용에는 흔적이 남지 않습니다. 높이는 ResizeObserver 로 추적합니다. 마크다운 이미지는 늦게 로드돼 그때 높이가 바뀌는데, 한 번만 재면 \"로드 전 = 안 넘침\" 상태로 굳어 긴 댓글이 접히지 않기 때문입니다. 첫 클램프에는 애니메이션을 걸지 않아, 글이 저절로 접히는 듯한 연출을 피합니다."
            : "Clamps and adds a show-more only when the content exceeds maxHeight — no button, no fade otherwise, so short content shows no trace of it. Height is tracked with a ResizeObserver: markdown images load late and change the height, and measuring once would freeze \"not overflowing\" from before the load, leaving long comments unclamped. The first clamp skips the animation so posts don't appear to fold themselves up.")}
        </p>
        <motion.div className={styles.collapsibleDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
          <Collapsible
            maxHeight={140}
            expandLabel={language === "ko" ? "더보기" : "Show more"}
            collapseLabel={language === "ko" ? "접기" : "Show less"}
          >
            <div className={styles.collapsibleBody}>
              <p>
                {language === "ko"
                  ? "이 문단은 maxHeight(140px)보다 길어서 접힙니다. 잘린 아래쪽 페이드가 \"여기서 끝이 아니다\"를 알리는 유일한 시각 단서입니다 — 버튼만 있으면 딱 잘린 글자 줄이 그냥 마지막 줄처럼 읽힙니다."
                  : "This block is taller than maxHeight (140px), so it clamps. The fade at the cut is the only cue that there's more below — with just a button, the clipped line reads as the last line."}
              </p>
              <p>
                {language === "ko"
                  ? "클램프는 바깥(.clip)이 하고 측정은 안쪽(.inner)이 합니다. 같은 요소가 둘 다 하면 max-height 에 눌린 높이를 재게 되어 항상 \"딱 맞음\"이 나옵니다."
                  : "The outer element (.clip) does the clamping while an inner one measures. If one element did both, it would measure the height already squashed by max-height and always report \"fits\"."}
              </p>
              <p>
                {language === "ko"
                  ? "펼친 뒤 높이는 실제로 auto 입니다 — framer-motion 이 height: \"auto\" 를 실측해 애니메이트하기 때문에, 나중에 이미지가 더 로드돼 내용이 길어져도 잘리지 않습니다."
                  : "Once expanded the height is genuinely auto — framer-motion measures height: \"auto\" to animate it, so late-loading images can grow the content without it getting cut off."}
              </p>
              <p>
                {language === "ko"
                  ? "chevron 회전 transition 은 .root .chevron 처럼 compound 셀렉터로 씁니다. 전역 theme transition(html[data-theme-ready] *)이 shorthand 라 단일 클래스로는 transform transition 이 통째로 덮어써집니다."
                  : "The chevron's rotation transition uses a compound selector (.root .chevron). The global theme transition (html[data-theme-ready] *) is a shorthand, so a single-class selector would have its transform transition wiped out entirely."}
              </p>
            </div>
          </Collapsible>
        </motion.div>
      </motion.div>

      <h3 className={styles.componentCategory}>Buttons & Actions</h3>

      {/* Button */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button</div>
        <div className={styles.componentSubLabel}>Variants</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 7)}><Tooltip content="variant: primary"><Button variant="primary">Primary</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 7)}><Tooltip content="variant: outline"><Button variant="outline">Outline</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 7)}><Tooltip content="variant: subtle — 옅은 보더 저강조. HelpButton 이 이걸 쓴다"><Button variant="subtle">Subtle</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 7)}><Tooltip content="variant: ghost"><Button variant="ghost">Ghost</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 7)}><Tooltip content="variant: link — hover 시 밑줄 draw"><Button variant="link">Link</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(5, 7)}><Tooltip content="variant: difference — mix-blend-mode + hover backdrop blur"><Button variant="difference">Difference</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(6, 7)}><Tooltip content="disabled"><Button disabled>Disabled</Button></Tooltip></motion.div>
        </div>
        <div className={styles.componentSubLabel}>Sizes</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 6)}><Tooltip content="size: 2xs"><Button variant="outline" size="2xs">2XS</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 6)}><Tooltip content="size: xs"><Button variant="outline" size="xs">XS</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 6)}><Tooltip content="size: sm"><Button variant="outline" size="sm">Small</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 6)}><Tooltip content="size: md"><Button variant="outline" size="md">Medium</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 6)}><Tooltip content="size: lg"><Button variant="outline" size="lg">Large</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(5, 6)}><Tooltip content="size: xl"><Button variant="outline" size="xl">XL</Button></Tooltip></motion.div>
        </div>
        <div className={styles.componentSubLabel}>Shapes</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}><Tooltip content="shape: circle, primary"><Button variant="primary" shape="circle" icon={<Star size={16} />} /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}><Tooltip content="shape: circle, outline"><Button variant="outline" shape="circle" icon={<Mail size={16} />} /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}><Tooltip content="shape: square, ghost"><Button variant="ghost" shape="square" icon={<Zap size={16} />} /></Tooltip></motion.div>
        </div>
        <div className={styles.componentSubLabel}>Icons & States</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="icon + text"><Button variant="primary" icon={<Send size={16} />}>Send</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="iconPosition: right"><Button variant="outline" icon={<ArrowRight size={16} />} iconPosition="right">Next</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="active state"><Button variant="outline" active>Active</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="fullWidth"><Button variant="outline" fullWidth>Full Width</Button></Tooltip></motion.div>
        </div>
        <div className={styles.componentSubLabel}>Tones</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "tone 은 variant 위에 의미를 나타내는 색을 얹습니다. 모든 조합이 정의돼 있지는 않고 실제로 쓰이는 조합만 존재합니다. accent 와 danger 는 둘 다 ghost 에서 색이 시작하지만 hover 방향은 반대입니다. accent 는 text-primary 로 가라앉고(강조 → 평상), danger 는 text-error 로 올라옵니다(평상 → 경고)."
            : "tone layers meaning (color) on top of variant — only the combinations actually used are defined. accent and danger both start colored on ghost but hover in opposite directions: accent settles to text-primary (emphasis → calm), danger rises to text-error (calm → warning).")}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}><Tooltip content='ghost + tone="accent" — accent 로 시작, hover 시 text-primary'><Button variant="ghost" tone="accent">Accent</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}><Tooltip content='ghost + tone="danger" — hover 시 text-error'><Button variant="ghost" tone="danger">Danger</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}><Tooltip content='outline + tone="danger"'><Button variant="outline" tone="danger">Danger</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}><Tooltip content='primary + tone="danger" — 되돌릴 수 없는 확정 액션'><Button variant="primary" tone="danger">Delete</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}><Tooltip content='primary + tone="success"'><Button variant="primary" tone="success">Success</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Pressable */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Pressable</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "눌리는 것의 **동작만** 담는 기반입니다 — `type=\"button\"` · 클릭/호버 사운드 · disabled · 누를 때 축소. 생김새는 주지 않으므로 `className` 으로 쓰는 쪽이 정합니다. MUI 의 `ButtonBase`, React Aria 의 `useButton` 과 같은 구조입니다.\n\n버튼처럼 생긴 것은 `Button` 을, 절대위치로 깔린 클릭 영역·부모 글꼴을 물려받는 페이지 번호·`::after` 로 밑줄을 그리는 칩처럼 **생김새를 통일하면 안 되는 자리**는 `Pressable` 을 씁니다. raw `<button>` 은 쓰지 않습니다 — 사운드가 빠지고 `type` 누락 시 폼이 제출됩니다."
            : "The behavior-only base for anything pressable — `type=\"button\"`, click/hover sound, disabled, tap scale. It gives no appearance, so the caller supplies `className`. Same structure as MUI's `ButtonBase` or React Aria's `useButton`.\n\nUse `Button` for things that look like buttons; use `Pressable` where the appearance must NOT be unified — absolutely positioned hit areas, page numbers that inherit the parent font, chips that draw an underline with `::after`. Never a raw `<button>`: it loses the sound, and a missing `type` submits the form.")}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}>
            <Tooltip content="Pressable — 생김새는 자기 CSS, 동작만 공유">
              <Pressable style={{ padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-default)", borderRadius: "var(--radius-capsule)", fontSize: "var(--font-size-label)" }}>
                {language === "ko" ? "직접 만든 모양" : "Own look"}
              </Pressable>
            </Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}>
            <Tooltip content="soundDisabled — 연타되는 자리(스텝퍼 등)">
              <Pressable soundDisabled style={{ padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-default)", borderRadius: "var(--radius-capsule)", fontSize: "var(--font-size-label)" }}>
                soundDisabled
              </Pressable>
            </Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}>
            <Tooltip content="noTapScale — transform 이 자리를 흔들면 안 되는 절대위치 오버레이">
              <Pressable noTapScale style={{ padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-default)", borderRadius: "var(--radius-capsule)", fontSize: "var(--font-size-label)" }}>
                noTapScale
              </Pressable>
            </Tooltip>
          </motion.div>
        </div>
      </motion.div>

      {/* HelpButton */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HelpButton</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "도움말 `?` 버튼으로, Button 의 subtle/circle 을 고정한 wrapper 입니다. variant·shape·children 은 일관성을 위해 고정하고 size 만 열어 둡니다(폼 라벨 옆에는 2xs, 섹션 헤더에는 sm 을 씁니다). 나머지 props 는 Button 으로 그대로 흘려보내므로 Popover/Tooltip 의 trigger 로 바로 쓸 수 있습니다."
            : "The help `?` button — a fixed Button subtle/circle wrapper. variant/shape/children are locked for consistency; only size is open (2xs next to a form label, sm in a section header). All other props pass through to Button, so it works directly as a Popover/Tooltip trigger.")}
        </p>
        <div className={styles.componentRow}>
          {(["2xs", "xs", "sm", "md", "lg", "xl"] as const).map((s, i, arr) => (
            <motion.div key={s} variants={staggerItemX} {...scrollChildX(i, arr.length + 1)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
              <HelpButton size={s} aria-label={`help ${s}`} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>{s}</span>
            </motion.div>
          ))}
          <motion.div variants={staggerItemX} {...scrollChildX(6, 7)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
            <Popover
              trigger={<HelpButton aria-label="도움말" />}
              placement="bottom-start"
              sheetTitle={language === "ko" ? "도움말" : "Help"}
            >
              <div className={styles.popoverNote} style={{ maxWidth: 220 }}>
                {language === "ko"
                  ? "Popover 의 trigger 로 쓴 예입니다. HelpButton 이 ref/onClick 을 그대로 넘겨받습니다."
                  : "Used as a Popover trigger — HelpButton forwards ref/onClick untouched."}
              </div>
            </Popover>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>+ Popover</span>
          </motion.div>
        </div>
      </motion.div>

      {/* TextLink */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TextLink</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}><TextLink href="/design-system">Internal Link</TextLink></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}><TextLink href="https://fonts.google.com" external>External Link</TextLink></motion.div>
        </div>
      </motion.div>

      {/* SpinButton — long-press 가속 반복 */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SpinButton</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "누르고 있으면 action 을 가속하며 반복합니다. 클릭하면 즉시 한 번 실행하고, 380ms 이상 누르고 있으면 반복을 시작합니다(130ms 에서 28ms 로 점점 빨라집니다). 버튼 밖에서 손을 떼도 pointerCapture 로 안전하게 멈춥니다. 자체 시각 스타일은 없고, 놓이는 자리의 모양을 className 으로 받습니다(NumberInput 의 스텝퍼가 그 예입니다)."
            : "Hold to repeat the action with acceleration — one immediate fire, then repeat after a 380ms hold (130ms → 28ms, speeding up). pointerCapture stops it safely even if you release outside the button. It ships no visual style — the host passes the look via className (NumberInput's stepper being the example).")}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <SpinButton className={styles.spinBtn} ariaLabel="감소" onStep={() => setSpinCount((n) => n - 1)}>
            <Minus size={14} strokeWidth={2.5} />
          </SpinButton>
          <span className={styles.spinValue}>{spinCount}</span>
          <SpinButton className={styles.spinBtn} ariaLabel="증가" onStep={() => setSpinCount((n) => n + 1)}>
            <Plus size={14} strokeWidth={2.5} />
          </SpinButton>
          <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-label)", marginLeft: "var(--spacing-sm)" }}>
            {language === "ko" ? "꾹 눌러보세요" : "Press and hold"}
          </span>
        </motion.div>
      </motion.div>

      {/* CloseButton */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>CloseButton</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "닫기 버튼입니다. 평소엔 minus(하단 line 하나)였다가 hover 하면 두 line 이 X 로 morph 합니다(`[data-active]` 로 강제 X 상태도 가능). vector line 을 `top: 50%; left: 50%` + negative margin 으로 sub-pixel 정렬해 어느 크기에서도 정확히 겹칩니다. 아래 버튼에 마우스를 올려 보세요."
            : "A close button — a single minus line at rest that morphs into an X on hover (or force the X via `[data-active]`). The lines are sub-pixel aligned with `top: 50%; left: 50%` + negative margins so they meet cleanly at any size. Hover the buttons below.")}
        </p>
        <div className={styles.componentRow} style={{ gap: "var(--spacing-2xl)", alignItems: "flex-end" }}>
          {([["xs", "20px"], ["sm", "24px"], ["md", "32px"], ["lg", "38px"]] as const).map(([size, px], i) => (
            <motion.div key={size} variants={staggerItemX} {...scrollChildX(i, 4)} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
              <CloseButton size={size} onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>{size} · {px}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* MenuDots */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>MenuDots</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "메뉴 버튼 아이콘입니다. 9-dot 격자가 눌리면 X 로 모였다가 닫힐 때 다시 흩어집니다. 사이트 Navigation 메뉴 버튼과 admin/settings 서랍 토글이 같은 아이콘을 쓰도록 공용화했습니다. viewBox 8×8 의 vector circle 이라 어떤 크기에서도 완전한 원을 유지합니다(작은 span 에서는 subpixel 안티앨리어싱이 dot 마다 달라 타원처럼 보였습니다). 클릭해 보세요."
            : "A menu-button icon — a 9-dot grid that collapses into an X when opened, and back out when closing. Shared so the site Navigation menu button and the admin/settings drawer toggle use one icon. Vector circles in an 8×8 viewBox keep perfect circles at any size (tiny spans made subpixel anti-aliasing differ per dot, so they read as ovals). Click it.")}
        </p>
        <div className={styles.componentRow}>
          <motion.button
            type="button"
            variants={staggerItemX}
            {...scrollChildX(0, 1)}
            onClick={() => {
              if (menuDotsOpen) {
                setMenuDotsOpen(false);
                setMenuDotsClosing(true);
                setTimeout(() => setMenuDotsClosing(false), 800);
              } else {
                setMenuDotsClosing(false);
                setMenuDotsOpen(true);
              }
            }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, border: "none", borderRadius: "var(--radius-capsule)", background: "transparent", cursor: "pointer", color: "var(--text-primary)" }}
            aria-label="Toggle menu"
            aria-expanded={menuDotsOpen}
          >
            <MenuDots open={menuDotsOpen} closing={menuDotsClosing} size={16} />
          </motion.button>
        </div>
      </motion.div>

      <h3 className={styles.componentCategory}>Toggles & Selection</h3>

      {/* SortControl */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SortControl</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "정렬 필드 Select 와 역순 토글을 하나의 pill 로 결합합니다. 달력 블록 툴바와 댓글이 함께 씁니다. 예전에는 달력은 pill, 댓글은 gap 배치에 고정 아이콘이라 같은 기능이 서로 다르게 보였습니다. 역순 아이콘은 현재 정렬 방향을 그대로 반영합니다(고정 아이콘은 '누르면 뒤집힌다'만 알려줄 뿐 지금 방향은 알려주지 못합니다)."
            : "A sort-field Select joined with a reverse toggle in one pill. Shared by the calendar block toolbar and comments — the calendar used a pill while comments used a gap layout with a fixed icon, so the same feature looked different in each. The reverse icon reflects the current direction (a fixed icon only says 'this flips', never which way you are).")}
        </p>
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
      </motion.div>

      {/* SegmentedControl */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SegmentedControl</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "캡슐 안에서 하나를 고르는 컨트롤로, posts 정렬·시리즈/태그 필터·달력 뷰 전환 등 33곳에서 씁니다. 테두리를 border 가 아니라 inset box-shadow 로 그립니다. border 는 layout 에 영향을 줘서 '전체 높이 = 버튼 높이 + padding' 규칙을 지킬 수 없기 때문입니다(그래서 색만 바꾸려 해도 border-color 로는 먹지 않습니다). variant 는 테두리 세기만 가릅니다. subtle 은 주변이 전부 border-light 결인 자리(달력 블록)에서 기본값이 혼자 진하게 튀는 것을 막아 줍니다."
            : "A capsule control for picking one of several — used in 33 places (post sorting, series/tag filters, calendar view switching). Its outline is an inset box-shadow, not a border: a real border affects layout and breaks the \"total height = button height + padding\" rule (which is also why border-color won't override it). variant only changes outline weight — subtle keeps the default from standing out where everything around it is border-light, like the calendar block.")}
        </p>
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
      </motion.div>

      {/* Checkbox */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Checkbox</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="shape: square"><Checkbox checked={checkSquare} onChange={setCheckSquare} shape="square" label="Square" /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="shape: circle"><Checkbox checked={checkCircle} onChange={setCheckCircle} shape="circle" label="Circle" /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="indeterminate"><Checkbox checked={checkIndet} onChange={setCheckIndet} indeterminate label="Indeterminate" /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled"><Checkbox checked={false} onChange={() => {}} disabled label="Disabled" /></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Switch */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Switch</div>
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
      </motion.div>

      {/* LanguageToggle — 사이즈 md / sm */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>LanguageToggle</div>
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
      </motion.div>

      <h3 className={styles.componentCategory}>Inputs & Fields</h3>

      {/* Input */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Input</div>
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
      </motion.div>

      {/* Slider */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Slider</div>
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
      </motion.div>

      {/* NumberInput — 캡슐형 숫자 입력 (타이핑 중엔 draft, blur/Enter/스텝퍼에만 확정) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>NumberInput</div>
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
      </motion.div>

      {/* Textarea */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Textarea</div>
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
      </motion.div>

      {/* SearchCapsule */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SearchCapsule</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "접힌 아이콘에서 펼쳐지는 검색 인풋입니다. 지우개·검색 이력·문법 도움말을 자체 내장해서, 목록이나 필터 바에서 raw input 을 다시 짤 필요가 없습니다."
            : "A search capsule — an input that expands from a collapsed icon. It bundles its own clear button, search history, and syntax help, so list/filter bars never re-implement a raw input.")}
        </p>

        {/* SearchCapsule 은 내부에서 useSearchParams() 를 쓴다 — 이 페이지는 정적 프리렌더
            대상이라 Suspense 로 감싸지 않으면 빌드가 CSR bailout 으로 실패한다. */}
        <div className={styles.componentSubLabel}>typeSelector · historyKey · showHelp</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "실제 필터 바는 이 옵션들을 한꺼번에 씁니다. 왼쪽 `typeSelector` 로 검색 범위를, 오른쪽 `?`(`showHelp`) 말풍선으로 문법·매칭 강도(prefix/regex) 도움말을 열고, `historyKey` 로 최근 검색을 저장합니다(검색어 입력 → Enter → 빈 상태로 다시 포커스하면 이력이 뜹니다)."
            : "A real filter bar uses these together: `typeSelector` scopes the search on the left, the `?` (`showHelp`) bubble opens syntax + match-strength (prefix/regex) help on the right, and `historyKey` persists recent searches (type → Enter → refocus empty to see history).")}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ minWidth: 360 }}>
            <Suspense fallback={null}>
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
            </Suspense>
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
            <Suspense fallback={null}>
              <SearchCapsule
                search={searchMorph}
                onSearchChange={setSearchMorph}
                placeholder={language === "ko" ? "클릭해서 펼치기" : "Click to expand"}
                align="left"
                historyKey={null}
                collapsible
              />
            </Suspense>
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
            <Suspense fallback={null}>
              <SearchCapsule
                search={searchDemo}
                onSearchChange={setSearchDemo}
                placeholder="size sm"
                size="sm"
                align="left"
                historyKey={null}
              />
            </Suspense>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ minWidth: 200 }}>
            <Suspense fallback={null}>
              <SearchCapsule
                search={searchDemo}
                onSearchChange={setSearchDemo}
                placeholder={language === "ko" ? "size md (기본)" : "size md (default)"}
                size="md"
                align="left"
                historyKey={null}
              />
            </Suspense>
          </motion.div>
        </div>
      </motion.div>

      {/* HighlightInput */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HighlightInput</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "native `<input>` 은 텍스트 **일부만** 색칠할 수 없어서, 초과 글자에 inline `<mark>` 하이라이트를 하려면 contentEditable 이 필요합니다 — 그걸 위한 단일행 contentEditable input 입니다(native 가 공짜로 주는 caret·IME·autofill 을 대신 손으로 재구현하는 대신 하이라이트를 얻는 트레이드오프). 하이라이트가 필요할 때만 이걸 직접 쓰고, 그 외엔 native `Input` 을 씁니다 — 둘은 완전히 분리돼 있고 서로를 모릅니다. 제한은 두 갈래 — `maxHint` 는 **권장** 한도라 초과분에 `<mark>` 와 카운터만 띄우고 자르진 않으며(붙여넣은 긴 제목 보존), `maxLength` 는 **하드** 상한이라 입력·붙여넣기 시점에 잘라냅니다. `inlineLabel` 로 KO/EN 배지를 input 안에 넣습니다."
            : "A native `<input>` can't style **part** of its text, so inline `<mark>` highlighting of overflow needs contentEditable — this is that single-line contentEditable input (the trade-off: you re-implement caret/IME/autofill that native gives for free, in exchange for the highlight). Reach for it only when you need the highlight; otherwise use native `Input` — the two are fully separate and don't know about each other. Two-tier limit: `maxHint` is a **soft** cap (marks the overflow + counter, never truncates a long pasted title), `maxLength` is a **hard** cap enforced on type/paste. `inlineLabel` adds a badge like KO/EN inside the field.")}
        </p>
        <div className={styles.componentRow} style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--spacing-sm)", maxWidth: 380 }}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
            <HighlightInput value={editableDemo} onChange={setEditableDemo} inlineLabel="KO" placeholder={language === "ko" ? "제목" : "Title"} />
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}>
            <HighlightInput value={editableLimitDemo} onChange={setEditableLimitDemo} maxHint={20} placeholder={language === "ko" ? "권장 20자" : "20 chars suggested"} />
          </motion.div>
        </div>
      </motion.div>

      <h3 className={styles.componentCategory}>Pickers & Selects</h3>

      {/* Select */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Select</div>
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
      </motion.div>

      {/* ColorPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ColorPicker</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "render-prop trigger 와 portal popover 로 이뤄집니다. trigger 를 호출부가 직접 그리기 때문에 스와치·버튼·칩 등 무엇이든 될 수 있습니다. **모바일(≤768px)에서는 dropdown 대신 bottom sheet 으로 바뀝니다.** 색을 고르려면 두 손가락만 한 면적이 필요한데, 작은 화면의 popover 로는 그만한 공간이 나오지 않기 때문입니다. `inline` 모드는 이미 제자리에 펼쳐진 형태라 sheet 전환에서 제외됩니다."
            : "A render-prop trigger with a portal popover — the caller draws the trigger, so it can be a swatch, a button, or a chip. **On mobile (≤768px) it becomes a bottom sheet instead of a dropdown** — picking a color needs roughly two fingers' worth of area, which a popover on a small screen can't give. `inline` mode is already expanded in place, so it opts out of the sheet.")}
        </p>
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
      </motion.div>

      {/* DatePicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>DatePicker</div>
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
      </motion.div>

      {/* PeriodPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>PeriodPicker</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)", maxWidth: 540 }}>
          <PeriodPicker value={period} onChange={setPeriod} />
        </motion.div>
      </motion.div>

      {/* EmojiPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>EmojiPicker</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "이모지·아이콘·커스텀 이미지를 선택합니다. 탭 전환과 검색, 셔플, 최근 사용 목록을 제공합니다."
            : "Pick an emoji, icon, or custom image — tabbed, with search, shuffle, and recents.")}
        </p>
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
      </motion.div>

      {/* FontPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>FontPicker</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "폰트를 고르는 드롭다운입니다. 각 항목이 그 폰트 그대로 렌더되기 때문에, 고르기 전에 실제 생김새를 미리 볼 수 있습니다. 폰트를 `groups` 로 묶어 넘기면 그룹마다 라벨(예: 영문·고정폭)이 붙고, 그룹이 하나뿐일 때는 `group: \"\"` 로 그 라벨만 숨길 수 있습니다. 어떤 항목에 `googleName` 을 지정해 두면 그 폰트를 고르는 순간 컴포넌트가 해당 Google Font 를 알아서 불러오므로, 호출부에서 따로 로드하지 않아도 됩니다. `preferEn` 을 켜면 한글 그룹이 목록 맨 뒤로 밀려서 영문 UI 를 우선하는 자리에 맞출 수 있습니다."
            : "A dropdown for picking a font. Each option is rendered in the very font it represents, so you can see how it actually looks before you choose. Group the options with `groups` to give each set a label (e.g. Latin, Mono); when there's only one group, pass `group: \"\"` to hide that label. Give an option a `googleName` and the component loads that Google Font automatically the moment it's chosen — the caller never has to load it. Turn on `preferEn` to push Korean groups to the end of the list for English-first surfaces.")}
        </p>
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
      </motion.div>

      <h3 className={styles.componentCategory}>Chips</h3>

      {/* Chip */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Chip</div>
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
      </motion.div>

      {/* RelatedChips */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>RelatedChips</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "관련 글이나 프로젝트를 보여 주는 칩입니다. 썸네일·제목·카테고리를 담고, `+N 더보기` 토글을 제공하며, 데스크톱에서는 hover 시 미리보기 카드를 띄웁니다."
            : "Related post / project chips — thumbnail + title + category, `+N more` toggle, hover preview card (desktop).")}
        </p>
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
      </motion.div>

      <h3 className={styles.componentCategory}>Overlays & Popovers</h3>

      {/* Modal */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Modal</div>
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
      </motion.div>

      {/* ImageViewer */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ImageViewer</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "아래 이미지를 클릭하면 뷰어가 열립니다. 확대·이동·썸네일 탐색·풀스크린을 지원합니다."
            : "Click any image below to open the viewer. Supports zoom, pan, thumbnail navigation, and fullscreen.")}
        </p>
        <div
          style={{
            display: "inline-flex",
            borderTop: "var(--border-light)",
            borderBottom: "var(--border-light)",
            lineHeight: 0,
          }}
        >
          {ivImages.map((src, i) => (
            <motion.div key={i} variants={staggerItemX} {...scrollChildX(i, ivImages.length)}>
              <Tooltip content={`Sample image ${i + 1} — Click to open ImageViewer`}>
                <Pressable
                  style={{
                    width: 120,
                    height: 68,
                    borderRadius: 0,
                    overflow: "hidden",
                    border: "none",
                    padding: 0,
                    background: "var(--bg-secondary)",
                    cursor: "pointer",
                  }}
                  onClick={() => { setIvIndex(i); setIvOpen(true); }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </Pressable>
              </Tooltip>
            </motion.div>
          ))}
        </div>
        <ImageViewer
          images={ivImages}
          index={ivIndex}
          open={ivOpen}
          onClose={() => setIvOpen(false)}
          title="Design System Preview"
        />
      </motion.div>

      {/* Popover */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Popover</div>
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
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=400&fit=crop)", backgroundSize: "cover", backgroundPosition: "center" }}
        >
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
      </motion.div>

      <h3 className={styles.componentCategory}>Feedback & Display</h3>

      {/* Toast */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Toast</div>
        <p className={styles.componentDesc}>
          {language === "ko"
            ? "스택 중 하나에 hover 하면 그 토스트만이 아니라 전체가 멈춥니다(pauseAllToasts). 하나씩만 멈추면 다른 토스트가 사라지면서 스택이 재배치되고, 커서가 저절로 벗어나기 때문입니다. 클릭하면 즉시 사라집니다."
            : "Hovering any toast pauses the whole stack, not just that one (pauseAllToasts) — pausing only the hovered one lets the others expire, and the stack reflows out from under the cursor. Click to dismiss immediately."}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}>
            <Tooltip content="variant: success"><Button variant="outline" onClick={() => showToast("Saved successfully", "success")}>Success</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}>
            <Tooltip content="variant: error (accent — 진짜 실패)"><Button variant="outline" onClick={() => showToast("Something went wrong", "error")}>Error</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}>
            <Tooltip content="variant: warning (amber — 검증·중복)"><Button variant="outline" onClick={() => showToast("Already exists", "warning")}>Warning</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}>
            <Tooltip content="variant: info"><Button variant="outline" onClick={() => showToast("Just so you know", "info")}>Info</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}>
            <Tooltip content="스택 — 하나에 hover 하면 pauseAllToasts 로 전체 타이머 정지">
              <Button
                variant="outline"
                onClick={() => {
                  showToast("Uploading cover…", "info");
                  showToast("Cover uploaded", "success");
                  showToast("Draft saved", "success");
                }}
              >
                Stack ×3
              </Button>
            </Tooltip>
          </motion.div>
        </div>
      </motion.div>

      {/* Pagination */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Pagination</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
          <Pagination page={paginationPage} totalPages={12} onChange={setPaginationPage} />
        </motion.div>
      </motion.div>

      {/* TypeWriter */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)" }}>
          <div className={styles.componentGroupTitle} style={{ marginBottom: 0 }}>TypeWriter</div>
          <Pressable className={styles.replayBtn} onClick={() => setTwReplay((n) => n + 1)} aria-label="Replay">
            <RotateCcw size={14} />
          </Pressable>
        </div>
        <motion.div className={styles.typewriterDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
          <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-xl)" align="center" replayTrigger={twReplay} />
        </motion.div>
      </motion.div>

      {/* HeartIcon — wave fill + burst (size 별 단독 데모) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HeartIcon</div>
        <p className={styles.componentDesc}>state machine (empty / filling / filled / draining) · 3-layer wave fill (SVG path d 애니메이션) · 채우기 완료 시 burst 1회 · burst 거리/크기 size 비례 스케일 · stroke / fill 모두 currentColor 상속 (부모 color 따라감)</p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2xl)", cursor: "pointer", color: iconLiked ? "var(--text-accent)" : "var(--text-secondary)" }} onClick={toggleIcon}>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={14} />
            <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 14</span>
          </span>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={20} />
            <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 20</span>
          </span>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={32} />
            <span style={{ fontSize: "var(--font-size-label)", color: "var(--text-tertiary)" }}>size 32</span>
          </span>
        </motion.div>
      </motion.div>

      {/* HighlightedText */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HighlightedText</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "검색어와 일치하는 부분만 `<mark>` 로 감쌉니다. `query` 를 주지 않으면 SearchHighlightProvider context 의 값을 쓰므로, 리스트의 각 행이 검색어를 일일이 넘겨받을 필요가 없습니다. query 가 비면 그냥 평문으로 렌더되므로, 조건 분기 없이 항상 이 컴포넌트를 쓰면 됩니다."
            : "Wraps only the matched span in `<mark>`. Without an explicit `query` it reads the one from `SearchHighlightProvider` context, so list rows don't each have to thread the search term through. An empty query renders plain text, so you can use it unconditionally.")}
        </p>
        <div className={styles.componentRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--spacing-2xs)" }}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
            <HighlightedText text={language === "ko" ? "검색어가 들어간 문장입니다" : "A sentence containing the search term"} query={language === "ko" ? "검색어" : "search"} />
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ color: "var(--text-muted)", fontSize: "var(--font-size-label)" }}>
            {language === "ko" ? "query 없음 → 평문" : "no query → plain text"}: <HighlightedText text={language === "ko" ? "강조 없음" : "no highlight"} query="" />
          </motion.div>
        </div>
      </motion.div>

      {/* Inline Color Swatch */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Inline Color Swatch</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "인라인 `code` 의 내용이 색상값(`#hex` · `rgb()` · `hsl()`)이면 앞에 색 원(스와치)이 붙습니다 — GitHub 스타일. 렌더 후 `applyColorSwatches` 가 인라인 코드를 스캔해 **검증된 색만** 배경으로 주입하므로, 이름색·비색상은 평문으로 남습니다. 인라인 코드 자체는 Notion 식 배경형(보더 없음)입니다. 에디터에서는 툴바의 **색상 칩** 도구(Palette 아이콘)로 팔레트에서 고른 `#hex` 를 인라인 코드로 삽입하고, 리더가 이걸 그대로 이 스와치로 렌더합니다."
            : "When inline `code` holds a color value (`#hex` · `rgb()` · `hsl()`), a color dot (swatch) is prepended — GitHub style. After render, `applyColorSwatches` scans inline code and injects **only validated colors**, so named colors / non-colors stay plain. The inline code itself is Notion-style (borderless background). In the editor, the toolbar's **color chip** tool (Palette icon) inserts a picked `#hex` as inline code, and the reader renders exactly that as this swatch.")}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)", alignItems: "center", lineHeight: 2.2 }}>
          <code><span className="color-swatch" style={{ background: "#e11d48" }} aria-hidden />#e11d48</code>
          <code><span className="color-swatch" style={{ background: "rgb(46, 204, 113)" }} aria-hidden />rgb(46, 204, 113)</code>
          <code><span className="color-swatch" style={{ background: "hsl(280, 70%, 55%)" }} aria-hidden />hsl(280, 70%, 55%)</code>
          <code>not-a-color</code>
        </motion.div>
      </motion.div>

      {/* Code Block Controls */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Code Block Controls</div>
        <p className={styles.componentDesc}>
          {md(language === "ko"
            ? "리더/미리보기에서 코드블록 위에 붙는 바 — 좌측 언어 라벨 + 우측 복사·줄바꿈 토글. 두 버튼은 각자 떠오른 **emboss 타일**로 구분되고, 코드블록 위 세로 스크롤은 페이지로 통과합니다(축 기반 wheel 라우팅). 런타임엔 `attachCodeWrapToggle` 이 주입합니다."
            : "The bar above a code block in the reader/preview — a language label on the left, copy and wrap toggles on the right. The two buttons read as raised **emboss tiles**, and vertical scroll over a code block passes through to the page (axis-based wheel routing). At runtime it's injected by `attachCodeWrapToggle`.")}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
          <div className="code-block-wrap has-code-bar" style={{ maxWidth: 440 }}>
            <div className="code-block-bar" style={{ position: "relative" }}>
              <span className="code-lang-label">css</span>
              <div className="code-block-controls">
                <button className="code-copy-btn" type="button" tabIndex={-1} aria-hidden>
                  <span className="code-copy-labels"><span className="code-copy-default">Copy</span></span>
                </button>
                <button className="code-wrap-toggle" type="button" tabIndex={-1} aria-hidden>
                  <span className="code-wrap-label-default">↔ Scroll</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

    </section>
  );
}

export default memo(ComponentsSection);
