"use client";

import { memo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Mail, Send, Star, ArrowRight, Zap, RotateCcw, Hash, Code, Minus, Plus, BookOpen, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import HelpButton from "@/components/ui/HelpButton";
import DetailActionButton from "@/components/ui/DetailActionButton";
import SortControl from "@/components/ui/SortControl";
import SegmentedControl from "@/components/ui/SegmentedControl";
import PageTitle from "@/components/ui/PageTitle";
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
import CloseButton from "@/components/ui/CloseButton";
import CloseIcon from "@/components/ui/CloseIcon";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import type { DatePeriod } from "@/data/profile";
import Logo from "@/components/common/Logo";
import TypeWriter from "@/components/effects/TypeWriter";
import Tooltip from "@/components/ui/Tooltip";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import { MoreVertical, ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "lucide-react";
import TextLink from "@/components/ui/TextLink";
import Pagination from "@/components/ui/Pagination";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import BilingualInputPair, { type BilingualValue } from "@/components/admin/BilingualInputPair";
import TagNotesEditor, { type TagNote } from "@/components/admin/TagNotesEditor";
import AdminNotFound from "@/components/admin/AdminNotFound";
import { LikeButton } from "@/components/layout/DetailLayout";
import HeartIcon from "@/components/ui/HeartIcon";
import Textarea from "@/components/ui/Textarea";
import LanguageToggle from "@/components/ui/LanguageToggle";
import EmojiPicker, { EmojiIcon } from "@/components/ui/EmojiPicker";
import RelatedChips from "@/components/ui/RelatedChips/RelatedChips";
import ViewModeToggle from "@/components/layout/ViewModeToggle";
import { staggerContainer, staggerItemX } from "../_data/animations";
import styles from "../DesignSystem.module.css";

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

function ComponentsSection({ language, setSectionRef, vpGroup, scrollChildX, nd }: ComponentsSectionProps) {
  const { openModal } = useModalStore();
  const [sliderValue, setSliderValue] = useState([40]);
  const [rangeValue, setRangeValue] = useState([20, 80]);
  const [numBasic, setNumBasic] = useState(50);
  const [numWidth, setNumWidth] = useState(320);
  const [numPlain, setNumPlain] = useState(12);
  const [numGauge, setNumGauge] = useState(50);
  // SpinButton 데모 — 누르고 있으면 가속 반복되는 걸 카운터로 보여줌
  const [spinCount, setSpinCount] = useState(0);
  // Textarea tabIndent 데모
  const [tabDemo, setTabDemo] = useState("");
  const [sortDemo, setSortDemo] = useState<"registered" | "reactions">("registered");
  const [sortDirDemo, setSortDirDemo] = useState<"asc" | "desc">("asc");
  const [segDemo, setSegDemo] = useState("all");
  const [segSubtleDemo, setSegSubtleDemo] = useState("month");
  const [switchOn, setSwitchOn] = useState(false);
  const [switchAccent, setSwitchAccent] = useState(true);
  const [switchMd, setSwitchMd] = useState(true);
  const [switchLabeled, setSwitchLabeled] = useState(true);
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
  const [selectChildren, setSelectChildren] = useState("b");
  const [selectEmpty, setSelectEmpty] = useState("");
  const [comboInput, setComboInput] = useState("");
  const [comboTags, setComboTags] = useState<string[]>(["React"]);
  const [bubbleVal, setBubbleVal] = useState("normal");
  const [dpFormat, setDpFormat] = useState<"year" | "yearMonth" | "date">("date");
  const [dpDate, setDpDate] = useState({ year: "2024", month: "03", day: "15" });
  const [period, setPeriod] = useState<DatePeriod>({ start: "2024-03", end: "2024-12", format: "yearMonth" });
  const [twReplay, setTwReplay] = useState(0);
  const [paginationPage, setPaginationPage] = useState(3);
  const [pickerColor, setPickerColor] = useState("#d01046");
  const [dragTags, setDragTags] = useState(["React", "Next.js", "TypeScript", "GSAP"]);
  const [bilingualValue, setBilingualValue] = useState<BilingualValue>({ ko: "", en: "" });
  const [tagItems, setTagItems] = useState(["react", "typescript", "framer-motion"]);
  const [tagNotes, setTagNotes] = useState<Record<string, TagNote>>({
    react: { ko: "서버 컴포넌트로 초기 페이로드 절감", en: "Reduced initial payload via server components" },
  });
  // LikeButton demo state — 좋아요 toggle + busy (wave 채우기 / 비우기) 시뮬레이션
  const [likeCount, setLikeCount] = useState(42);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
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
  const handleLikeToggle = useCallback(() => {
    setLikeBusy(true);
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => c + (next ? 1 : -1));
      return next;
    });
    // 데모용 — 실제 페이지에선 API 응답까지 busy 유지. 여기선 200ms 후 해제 → LikeButton 안의 minDuration(2s) 로직이 wave 완료까지 유지
    setTimeout(() => setLikeBusy(false), 200);
  }, []);
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

      {/* PageTitle */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>PageTitle</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "posts 계열 브라우즈 페이지 공통 대형 타이틀 — instrument italic. icon 은 타이틀 font-size 에 em 비례로 같이 커지고, 기울지 않는다(텍스트만 italic)."
            : "Shared large title for the posts browse pages — instrument italic. The icon scales with the title font-size in em units and stays upright (only the text is italic)."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}>
          <PageTitle>Posts</PageTitle>
        </motion.div>
        <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ marginTop: "var(--spacing-md)" }}>
          <PageTitle icon={<BookOpen />}>Series</PageTitle>
        </motion.div>
      </motion.div>

      {/* Button — Variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Variants</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 7)}><Tooltip content="variant: primary"><Button variant="primary">Primary</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 7)}><Tooltip content="variant: outline"><Button variant="outline">Outline</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 7)}><Tooltip content="variant: subtle — 옅은 보더 저강조. HelpButton 이 이걸 쓴다"><Button variant="subtle">Subtle</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 7)}><Tooltip content="variant: ghost"><Button variant="ghost">Ghost</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 7)}><Tooltip content="variant: link — hover 시 밑줄 draw"><Button variant="link">Link</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(5, 7)}><Tooltip content="variant: difference — mix-blend-mode + hover backdrop blur"><Button variant="difference">Difference</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(6, 7)}><Tooltip content="disabled"><Button disabled>Disabled</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Button — Sizes */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Sizes</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 6)}><Tooltip content="size: 2xs"><Button variant="outline" size="2xs">2XS</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 6)}><Tooltip content="size: xs"><Button variant="outline" size="xs">XS</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 6)}><Tooltip content="size: sm"><Button variant="outline" size="sm">Small</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 6)}><Tooltip content="size: md"><Button variant="outline" size="md">Medium</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 6)}><Tooltip content="size: lg"><Button variant="outline" size="lg">Large</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(5, 6)}><Tooltip content="size: xl"><Button variant="outline" size="xl">XL</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Button — Shapes */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Shapes</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}><Tooltip content="shape: circle, primary"><Button variant="primary" shape="circle" icon={<Star size={16} />} /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}><Tooltip content="shape: circle, outline"><Button variant="outline" shape="circle" icon={<Mail size={16} />} /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}><Tooltip content="shape: square, ghost"><Button variant="ghost" shape="square" icon={<Zap size={16} />} /></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Button — Icons & States */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Icons & States</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="icon + text"><Button variant="primary" icon={<Send size={16} />}>Send</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="iconPosition: right"><Button variant="outline" icon={<ArrowRight size={16} />} iconPosition="right">Next</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="active state"><Button variant="outline" active>Active</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="fullWidth"><Button variant="outline" fullWidth>Full Width</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Button — Tones */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Tones</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "tone 은 variant 위에 의미(색)를 얹는다 — 모든 조합이 정의된 건 아니고 쓰이는 조합만 있다. accent 와 danger 는 둘 다 ghost 에서 색이 시작하지만 hover 방향이 반대다: accent 는 text-primary 로 가라앉고(강조 → 평상), danger 는 text-error 로 올라온다(평상 → 경고)."
            : "tone layers meaning (color) on top of variant — only the combinations actually used are defined. accent and danger both start colored on ghost but hover in opposite directions: accent settles to text-primary (emphasis → calm), danger rises to text-error (calm → warning)."}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}><Tooltip content='ghost + tone="accent" — accent 로 시작, hover 시 text-primary'><Button variant="ghost" tone="accent">Accent</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}><Tooltip content='ghost + tone="danger" — hover 시 text-error'><Button variant="ghost" tone="danger">Danger</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}><Tooltip content='outline + tone="danger"'><Button variant="outline" tone="danger">Danger</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}><Tooltip content='primary + tone="danger" — 되돌릴 수 없는 확정 액션'><Button variant="primary" tone="danger">Delete</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}><Tooltip content='primary + tone="success"'><Button variant="primary" tone="success">Success</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* HelpButton */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HelpButton</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "도움말 `?` 버튼 — Button subtle/circle 고정 wrapper. variant·shape·children 은 통일이 목적이라 못 바꾸고 size 만 연다(폼 라벨 옆은 2xs, 섹션 헤더는 sm). 나머지 props 는 Button 으로 그대로 흘려보내서 Popover/Tooltip trigger 로 바로 쓸 수 있다."
            : "The help `?` button — a fixed Button subtle/circle wrapper. variant/shape/children are locked for consistency; only size is open (2xs next to a form label, sm in a section header). All other props pass through to Button, so it works directly as a Popover/Tooltip trigger."}
        </p>
        <div className={styles.componentRow}>
          {(["2xs", "xs", "sm", "md", "lg", "xl"] as const).map((s, i, arr) => (
            <motion.div key={s} variants={staggerItemX} {...scrollChildX(i, arr.length + 1)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
              <HelpButton size={s} aria-label={`help ${s}`} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>{s}</span>
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
                  ? "Popover trigger 로 쓴 예 — HelpButton 이 ref/onClick 을 그대로 넘겨받는다."
                  : "Used as a Popover trigger — HelpButton forwards ref/onClick untouched."}
              </div>
            </Popover>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>+ Popover</span>
          </motion.div>
        </div>
      </motion.div>

      {/* DetailActionButton */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>DetailActionButton</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "상세 페이지 하단 액션 버튼 껍데기 — 좋아요·공유가 공유하는 단일 소스. 예전엔 각자 CSS 에 값이 따로 적혀 있어서 share 만 작고(28 vs 47) 진했다. active 는 두 버튼 모두 accent(좋아요=누름, 공유=복사됨). 공통 Button 을 못 쓰는 이유는 size 가 md 32 / lg 36 / xl 40 뿐이라 이 47px 규격이 없어서다."
            : "The shell for detail-page bottom actions — the single source shared by like and share. Their values used to live in each component's CSS, so share alone was smaller (28 vs 47) and heavier. active is accent for both (like = liked, share = copied). The shared Button can't be used: its sizes are md 32 / lg 36 / xl 40 — there is no 47px."}
        </p>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
            <DetailActionButton onClick={() => {}}><HeartIcon size={18} liked={false} /><span>Like</span></DetailActionButton>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>default</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
            <DetailActionButton active onClick={() => {}}><HeartIcon size={18} liked /><span>Liked</span></DetailActionButton>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>active</span>
          </motion.div>
        </div>
      </motion.div>

      {/* SortControl */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SortControl</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "정렬 필드 Select + 역순 토글을 하나의 pill 로 결합. 달력 블록 툴바와 댓글이 같이 쓴다 — 예전엔 달력은 pill, 댓글은 gap 배치 + 고정 아이콘이라 같은 기능이 서로 다르게 보였다. 역순 아이콘은 현재 방향을 반영한다(고정 아이콘은 '누르면 뒤집힌다'만 알려줄 뿐 지금 방향을 못 알려준다)."
            : "A sort-field Select joined with a reverse toggle in one pill. Shared by the calendar block toolbar and comments — the calendar used a pill while comments used a gap layout with a fixed icon, so the same feature looked different in each. The reverse icon reflects the current direction (a fixed icon only says 'this flips', never which way you are)."}
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
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "캡슐 안에서 하나를 고르는 컨트롤 — posts 정렬 · 시리즈/태그 필터 · 달력 뷰 전환 등 33곳이 쓴다. 테두리를 border 가 아니라 inset box-shadow 로 그린다: border 는 layout 에 영향을 줘서 전체 높이 = 버튼 높이 + padding 으로 못 잡기 때문이다(그래서 색만 바꾸려 해도 border-color 로는 안 먹는다). variant 는 테두리 세기만 가른다 — subtle 은 주변이 전부 border-light 결인 자리(달력 블록)에서 기본값이 혼자 진하게 튀는 걸 막는다."
            : "A capsule control for picking one of several — used in 33 places (post sorting, series/tag filters, calendar view switching). Its outline is an inset box-shadow, not a border: a real border affects layout and breaks the \"total height = button height + padding\" rule (which is also why border-color won't override it). variant only changes outline weight — subtle keeps the default from standing out where everything around it is border-light, like the calendar block."}
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>default</span>
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", color: "var(--text-muted)" }}>subtle</span>
          </motion.div>
        </div>
      </motion.div>

      {/* TextLink */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TextLink</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}><TextLink href="/design-system">Internal Link</TextLink></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}><TextLink href="https://fonts.google.com" external>External Link ↗</TextLink></motion.div>
        </div>
      </motion.div>

      {/* Input — Variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Input — Variants</div>
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
      </motion.div>

      {/* Input — Sizes & States */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Input — Sizes & States</div>
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
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>Default (sm)</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
            <Switch checked={switchAccent} onCheckedChange={setSwitchAccent} variant="accent" />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>Accent</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
            <Switch disabled />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>Disabled</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
            <Switch disabled defaultChecked />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>Disabled On</span>
          </motion.div>
        </div>
        {/* size="md" + label — form row 용. admin 설정에 쓰던 Toggle 컴포넌트가 이 두 prop 으로 흡수됨 */}
        <div className={styles.componentRow} style={{ marginTop: "var(--spacing-sm)" }}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
            <Switch size="md" checked={switchMd} onCheckedChange={setSwitchMd} />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>size=&quot;md&quot;</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ minWidth: 220 }}>
            <Switch size="md" label="With label" checked={switchLabeled} onCheckedChange={setSwitchLabeled} />
          </motion.div>
        </div>
      </motion.div>

      {/* LanguageToggle — 사이즈 md / sm */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>LanguageToggle</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <LanguageToggle lang={langMd} onLangChange={setLangMd} />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>Default (md, 28px)</span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <LanguageToggle lang={langSm} onLangChange={setLangSm} size="sm" />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>size=&quot;sm&quot; (22px)</span>
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
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(3, 4)}>
            <span className={styles.sliderLabel}>No stepper — {numPlain}</span>
            <Tooltip content="stepper={false} — ↑/↓ 키로만 증감">
              <NumberInput value={numPlain} onCommit={setNumPlain} min={0} stepper={false} />
            </Tooltip>
          </motion.div>
        </div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          {language === "ko"
            ? "스텝퍼는 SpinButton — 누르고 있으면 가속 반복. 경계값에 닿으면 toast 로 알리되 hold-repeat 도배를 막으려 1.2초당 1회만."
            : "The steppers are SpinButtons — hold to repeat with acceleration. Hitting a bound raises a toast, throttled to once per 1.2s so hold-repeat can't spam it."}
        </span>
      </motion.div>

      {/* SpinButton — long-press 가속 반복 */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>SpinButton</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "누르고 있으면 action 을 가속 반복 — 클릭 시 즉시 1회, 380ms 유지하면 반복 시작(130ms → 28ms 로 점점 빠르게). 버튼 밖에서 떼도 pointerCapture 로 안전하게 멈춘다. 시각 스타일은 없다 — 놓이는 자리 모양을 className 으로 받는다(NumberInput 스텝퍼가 그 예)."
            : "Hold to repeat the action with acceleration — one immediate fire, then repeat after a 380ms hold (130ms → 28ms, speeding up). pointerCapture stops it safely even if you release outside the button. It ships no visual style — the host passes the look via className (NumberInput's stepper being the example)."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <SpinButton className={styles.spinBtn} ariaLabel="감소" onStep={() => setSpinCount((n) => n - 1)}>
            <Minus size={14} strokeWidth={2.5} />
          </SpinButton>
          <span className={styles.spinValue}>{spinCount}</span>
          <SpinButton className={styles.spinBtn} ariaLabel="증가" onStep={() => setSpinCount((n) => n + 1)}>
            <Plus size={14} strokeWidth={2.5} />
          </SpinButton>
          <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)", marginLeft: "var(--spacing-sm)" }}>
            {language === "ko" ? "꾹 눌러보세요" : "Press and hold"}
          </span>
        </motion.div>
      </motion.div>

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
          <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}>
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
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}>
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
                        ? "header.actions 는 헤더 우측 액션 영역(닫기 왼쪽), subButtons 는 X 버튼에 바로 붙는 자리 — 뒤로/앞으로 같은 네비게이션용."
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

      {/* Select — Variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Select — Variants</div>
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
            <Tooltip content="variant: compact">
              <Select
                value={selectCompact}
                options={[
                  { value: "option1", label: "Option One" },
                  { value: "option2", label: "Option Two" },
                  { value: "option3", label: "Option Three" },
                ]}
                onChange={setSelectCompact}
                variant="compact"
              />
            </Tooltip>
          </motion.div>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
            <Tooltip content="children (custom content)">
              <Select
                value={selectChildren}
                onChange={setSelectChildren}
                variant="compact"
                renderValue={() => selectChildren === "a" ? "Option A" : selectChildren === "b" ? "Option B" : "Option C"}
              >
                {({ close }) => (
                  <>
                    <div style={{ padding: "var(--spacing-3xs) var(--spacing-xs)", fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--text-muted)" }}>Group</div>
                    {[{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }, { value: "c", label: "Option C" }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        data-active={selectChildren === opt.value ? "" : undefined}
                        style={{
                          display: "flex", alignItems: "center", gap: "var(--spacing-2xs)",
                          padding: "var(--spacing-2xs) var(--spacing-sm)",
                          border: "none", borderRadius: "var(--radius-capsule)",
                          background: selectChildren === opt.value ? "#1E90FF" : "transparent",
                          color: selectChildren === opt.value ? "#fff" : "var(--text-primary)",
                          fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-sm)",
                          width: "100%", textAlign: "left", cursor: "default",
                        }}
                        onMouseEnter={(e) => { if (selectChildren !== opt.value) { e.currentTarget.style.background = "#1E90FF"; e.currentTarget.style.color = "#fff"; } }}
                        onMouseLeave={(e) => { if (selectChildren !== opt.value) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                        onClick={() => { setSelectChildren(opt.value); close(); }}
                      >
                        <span style={{ width: "1em", textAlign: "center", fontSize: "1.6em", lineHeight: 0 }}>{selectChildren === opt.value ? "✓" : "\u2002"}</span>
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
              </Select>
            </Tooltip>
          </motion.div>
        </div>
      </motion.div>

      {/* Select — States */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Select — States</div>
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
      </motion.div>

      {/* Select — Combobox & Bubble */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Select — Combobox & Bubble</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "combobox — input trigger. label + searchTerms(한글 alias) 필터, Enter/쉼표로 free text 추가, 지우개 버튼, ↑↓ 키보드 이동, group/icon 옵션. bubble — 아래가 아니라 trigger 오른쪽에 꼬리 달린 말풍선으로 열림."
            : "combobox — input trigger. filter by label + searchTerms (Korean alias), Enter/comma to add free text, clear button, ↑↓ nav, grouped options w/ icons. bubble — opens as a tailed speech-bubble to the trigger's right."}
        </p>
        <div className={styles.sliderRow}>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
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
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)} style={{ paddingLeft: "var(--spacing-md)" }}>
            <Tooltip content="bubble — right-anchored speech bubble">
              <Select
                bubble
                variant="compact"
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
      </motion.div>

      {/* ColorPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ColorPicker</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
          <Tooltip content="render-prop trigger + portal popover">
            <ColorPicker value={pickerColor} onChange={(c) => setPickerColor(c.hex)}>
              {({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: "var(--border-light)",
                    borderRadius: "var(--radius-circle)",
                    background: pickerColor,
                    cursor: "pointer",
                  }}
                  aria-label="Pick color"
                />
              )}
            </ColorPicker>
          </Tooltip>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>{pickerColor}</span>
        </motion.div>
      </motion.div>

      {/* Toast */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Toast</div>
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
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          {language === "ko"
            ? "스택 중 하나에 hover 하면 그 토스트만이 아니라 전체가 멈춘다(pauseAllToasts) — 하나씩만 멈추면 다른 토스트가 사라지며 스택이 재배치돼 커서가 저절로 벗어난다. 클릭하면 즉시 dismiss."
            : "Hovering any toast pauses the whole stack, not just that one (pauseAllToasts) — pausing only the hovered one lets the others expire, and the stack reflows out from under the cursor. Click to dismiss immediately."}
        </span>
      </motion.div>

      {/* Pagination */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Pagination</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <Tooltip content="default — `showJump` auto-enables when totalPages > 5"><div><Pagination page={paginationPage} totalPages={12} onChange={setPaginationPage} /></div></Tooltip>
          <Tooltip content="showJump={false} — hide the Go-to input"><div><Pagination page={paginationPage} totalPages={12} onChange={setPaginationPage} showJump={false} /></div></Tooltip>
          <Pagination page={1} totalPages={1} onChange={() => {}} />
        </motion.div>
      </motion.div>

      {/* Chip — variant capsule (draggable, with × remove) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Chip — draggable capsule</div>
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
      </motion.div>

      {/* Chip — variant capsule with href + count (TagPill 대체) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Chip — href + count</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "캡슐 chip — Link 로 wrap, `# + 태그명` + 선택적 카운트. 클릭 시 `/posts/tags/[tag]` 로 이동."
            : "Capsule chip — Link wrap with `# + name` + optional count. Navigates to `/posts/tags/[tag]` on click."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          {["React", "Next.js", "TypeScript"].map((tag) => (
            <Tooltip key={tag} content="basic — name only">
              <Chip variant="capsule" href={`/posts/tags/${encodeURIComponent(tag)}`}>
                <span>#{tag}</span>
              </Chip>
            </Tooltip>
          ))}
        </motion.div>
        <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          {[["GSAP", 12], ["CSS", 47], ["Plate", 3]].map(([tag, count]) => (
            <Tooltip key={tag} content="with count badge">
              <Chip variant="capsule" href={`/posts/tags/${encodeURIComponent(tag as string)}`} count={count as number}>
                <span>#{tag}</span>
              </Chip>
            </Tooltip>
          ))}
        </motion.div>
      </motion.div>

      {/* Chip — variants & states */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Chip — variants & states</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "variant capsule|bare · leftIcon · active(편집중) · onClick(button) · 핸들 위에 올리면 data-cursor 로 \"Drag\" 커서."
            : "variant capsule|bare · leftIcon · active(editing) · onClick(button) · grip shows a \"Drag\" cursor via data-cursor."}
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
      </motion.div>

      {/* RelatedChips */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>RelatedChips</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "관련 글 / 프로젝트 칩 — 썸네일 + 제목 + 카테고리, `+N 더보기` 토글, hover 시 미리보기 카드(데스크톱)."
            : "Related post / project chips — thumbnail + title + category, `+N more` toggle, hover preview card (desktop)."}
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

      {/* DatePicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>DatePicker</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>Format</span>
            <div style={{ display: "flex", border: "var(--border-light)", borderRadius: "var(--radius-capsule)", overflow: "hidden" }}>
              {(["year", "yearMonth", "date"] as const).map((f, i, arr) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDpFormat(f)}
                  style={{
                    padding: "var(--spacing-2xs) var(--spacing-sm)",
                    border: "none",
                    borderRight: i < arr.length - 1 ? "var(--border-light)" : "none",
                    borderRadius: 0,
                    background: dpFormat === f ? "var(--text-primary)" : "transparent",
                    color: dpFormat === f ? "var(--bg-primary)" : "var(--text-secondary)",
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-space-grotesk)",
                    cursor: "pointer",
                  }}
                >
                  {f === "year" ? (language === "ko" ? "연도" : "Year") : f === "yearMonth" ? (language === "ko" ? "연.월" : "Y.M") : (language === "ko" ? "연.월.일" : "Y.M.D")}
                </button>
              ))}
            </div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-primary)", marginLeft: "var(--spacing-xs)", fontFamily: "var(--font-space-grotesk)", fontWeight: 600 }}>
              {dpFormat === "year" ? dpDate.year : dpFormat === "yearMonth" ? `${dpDate.year}.${dpDate.month}` : `${dpDate.year}.${dpDate.month}.${dpDate.day}`}
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-lg)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ minWidth: 230 }}>
              <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>Spinner</div>
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
              <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>Calendar</div>
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

      {/* CloseButton */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>CloseButton</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) var(--spacing-md)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>xs (20px)</span>
              <CloseButton size="xs" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) var(--spacing-md)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>sm (24px)</span>
              <CloseButton size="sm" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) var(--spacing-md)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>md (32px)</span>
              <CloseButton size="md" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) var(--spacing-md)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>lg (38px)</span>
              <CloseButton size="lg" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>X ↔ minus morph (hover):</span>
            <div data-close-trigger style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", border: "var(--border-light)" }}>
              <CloseIcon />
            </div>
          </div>
          <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--text-tertiary)" }}>
            기본 상태는 minus(하단 line 만), hover/`[data-active]` 시 두 line 이 X 로 morph. stacking 회피 위해 line 위치는 `top: 50%; left: 50%` + negative margin 으로 sub-pixel 정렬.
          </span>
        </motion.div>
      </motion.div>

      {/* ImageViewer */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ImageViewer</div>
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
                <button
                  type="button"
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
                </button>
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
        <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
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
          <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
            anchor + portal · outside click / ESC 자동 닫힘 · 터치 디바이스에선 bottom sheet 로 자동 분기 · 모달 안에선 그 stacking context 로 portal 돼 전역 z-index 없이도 모달 위에 뜬다
          </span>
        </motion.div>
      </motion.div>

      {/* Popover — variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Popover — variants</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "예전엔 호출부마다 유리 배경을 제각각 override 했다 → variant 로 흡수. glass(기본)는 반투명 scrim + blur 라 안쪽 색이 그대로 살고, solid 는 뒤가 전혀 비치면 안 될 때, difference 는 패널째 뒤 페이지와 반전 합성해 밑에 뭐가 깔리든 대비가 자동으로 잡힌다. 대신 difference 는 subtree 가 한 덩어리로 합성돼 안쪽 색 구분이 사라지고, 배경이 임의 색이면 색이 틀어진다 — 그래서 기본이 glass. 아래 그라데이션 위에 열어 비교해보세요."
            : "Each call site used to override its own glass background → absorbed into variant. glass (default) is a translucent scrim + blur, so inner colors survive; solid is for when nothing behind may show through; difference blends the whole panel against the page so contrast holds over anything. The trade-off: difference composites the subtree as one mass, losing inner color distinctions, and shifts hue over arbitrary backgrounds — hence glass as the default. Open them over the gradient below to compare."}
        </p>
        <motion.div className={styles.popoverBackdrop} variants={staggerItemX} {...scrollChildX(0, 1)}>
          {([
            { v: "glass", label: language === "ko" ? "Glass (기본)" : "Glass (default)" },
            { v: "solid", label: "Solid" },
            { v: "difference", label: "Difference" },
          ] as const).map((o) => (
            <Popover
              key={o.v}
              variant={o.v}
              trigger={<Button variant="outline" size="sm">{o.label}</Button>}
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
      </motion.div>

      {/* Popover — openOnHover */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Popover — openOnHover</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "데스크톱에서 hover 로 열림 — 열림은 즉시, 닫힘은 500ms 지연이라 trigger↔content 사이를 지나가도 안 닫힌다. hover popover 는 한 번에 하나만 열린다(둘을 번갈아 올려보세요). 클릭도 그대로 동작하고, hover 개념이 없는 터치/sheet 모드에선 무시된다."
            : "Opens on hover on desktop — instantly on enter, with a 500ms close delay so crossing from trigger to content doesn't dismiss it. Only one hover popover stays open at a time (try alternating between the two). Click still works, and it's ignored in touch/sheet mode where hover doesn't exist."}
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
                <div style={{ minWidth: 160 }}>
                  <MenuItem icon={<Star size={14} />} label={`${label} A`} onClick={close} />
                  <MenuItem icon={<Zap size={14} />} label={`${label} B`} onClick={close} />
                </div>
              )}
            </Popover>
          ))}
        </motion.div>
      </motion.div>

      {/* EmojiPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>EmojiPicker</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "이모지 · 아이콘 · 커스텀 이미지 선택 — 탭 전환 + 검색 + 셔플 + 최근 사용."
            : "Pick an emoji, icon, or custom image — tabbed, with search, shuffle, and recents."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
          <Tooltip content="open EmojiPicker">
            <Button variant="outline" onClick={() => setDsEmojiOpen((v) => !v)}>
              {language === "ko" ? "선택하기" : "Pick"}
            </Button>
          </Tooltip>
          {dsEmoji && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <EmojiIcon value={dsEmoji} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>{dsEmoji}</span>
            </span>
          )}
          <EmojiPicker
            open={dsEmojiOpen}
            onClose={() => setDsEmojiOpen(false)}
            onSelect={(v) => { setDsEmoji(v); setDsEmojiOpen(false); }}
            currentValue={dsEmoji}
          />
        </motion.div>
      </motion.div>

      {/* ViewModeToggle */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ViewModeToggle</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "터치 기기(모바일/태블릿)에서만 노출 — PC / 모바일 viewport 를 전환. 데스크톱 브라우저에선 viewport 오버라이드가 무효라 렌더되지 않음."
            : "Only appears on touch devices (mobile/tablet) — toggles PC / mobile viewport. Renders nothing on desktop browsers, where the viewport override has no effect."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
          <ViewModeToggle />
        </motion.div>
      </motion.div>

      {/* TypeWriter */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TypeWriter</div>
        <motion.div className={styles.typewriterDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
          <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-xl)" align="center" replayTrigger={twReplay} />
          <button className={styles.replayBtn} onClick={() => setTwReplay((n) => n + 1)} aria-label="Replay">
            <RotateCcw size={14} />
          </button>
        </motion.div>
      </motion.div>

      {/* BilingualInputPair */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>BilingualInputPair</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ maxWidth: 360 }}>
          <BilingualInputPair
            value={bilingualValue}
            onChange={setBilingualValue}
            placeholder="값을 입력하세요"
          />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          KO / EN 배지 in-input · 값 있을 때 X 클리어 · IME composition 안전 onEnter
        </span>
      </motion.div>

      {/* HeartIcon — wave fill + burst (size 별 단독 데모) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>HeartIcon</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2xl)", cursor: "pointer", color: iconLiked ? "var(--text-accent)" : "var(--text-secondary)" }} onClick={toggleIcon}>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={14} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>size 14</span>
          </span>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={20} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>size 20</span>
          </span>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <HeartIcon liked={iconLiked} busy={iconBusy} size={32} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>size 32</span>
          </span>
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          state machine (empty / filling / filled / draining) · 3-layer wave fill (SVG path d 애니메이션) · 채우기 완료 시 burst 1회 · burst 거리/크기 size 비례 스케일 · stroke / fill 모두 currentColor 상속 (부모 color 따라감)
        </span>
      </motion.div>

      {/* LikeButton — HeartIcon + count + button wrapper (detail 페이지 패턴) */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>LikeButton</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)}>
          <LikeButton config={{ count: likeCount, liked, busy: likeBusy, onToggle: handleLikeToggle }} />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          HeartIcon (size=20) 를 wrap — count + outline button + hover scale. config props (count / liked / busy / onToggle) 만 받음
        </span>
      </motion.div>

      {/* Textarea (with maxHint) — contenteditable 모드 + inline highlight */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Textarea — maxHint (contenteditable highlight)</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ maxWidth: 480 }}>
          <Textarea
            value={excerptDemo}
            onChange={setExcerptDemo}
            placeholder="200자 (short) 넘게 입력하면 초과 portion 만 accent bg highlight"
            rows={3}
            maxHint="short"
          />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          maxHint 설정 시 contenteditable=&quot;plaintext-only&quot; 모드로 자동 전환 — 초과 글자에 inline &lt;mark&gt; highlight · preset (short 200 / basic 500 / long 2000) 또는 숫자 · 카운터 80% 부터 warning, 100% 부터 over · native resize 핸들 위 투명 overlay 로 커스텀 cursor 표시
        </span>
      </motion.div>

      {/* Textarea — tabIndent */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Textarea — tabIndent</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ maxWidth: 480 }}>
          <Textarea
            value={tabDemo}
            onChange={setTabDemo}
            placeholder={language === "ko" ? "Tab 을 눌러 2칸 들여쓰기" : "Press Tab to indent two spaces"}
            rows={4}
            maxHint="basic"
            tabIndent
          />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          {language === "ko"
            ? "tabIndent 는 opt-in — 기본값은 Tab=다음 포커스여야 키보드로 폼을 빠져나갈 수 있다(a11y). 코드·마크다운을 치는 칸(댓글 작성란 등)에서만 켠다. maxHint 가 있어야 동작하는 contenteditable 모드 전용."
            : "tabIndent is opt-in — Tab must default to next-focus so keyboard users can leave the form (a11y). Turn it on only where code/markdown gets typed (the comment box, etc.). Requires the contenteditable mode, which maxHint enables."}
        </span>
      </motion.div>

      {/* Collapsible */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Collapsible</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "maxHeight 를 넘을 때만 접고 더보기를 붙인다 — 안 넘치면 버튼도 페이드도 없어 짧은 내용엔 흔적이 없다. 높이 판단은 ResizeObserver: 마크다운 이미지는 늦게 로드돼 그때 높이가 바뀌는데, 한 번만 재면 \"로드 전 = 안 넘침\"으로 굳어 긴 댓글이 안 접힌다. 첫 클램프엔 애니메이션을 안 걸어 글이 저절로 접히는 연출을 피한다."
            : "Clamps and adds a show-more only when the content exceeds maxHeight — no button, no fade otherwise, so short content shows no trace of it. Height is tracked with a ResizeObserver: markdown images load late and change the height, and measuring once would freeze \"not overflowing\" from before the load, leaving long comments unclamped. The first clamp skips the animation so posts don't appear to fold themselves up."}
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

      {/* TagNotesEditor */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TagNotesEditor</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ maxWidth: 480 }}>
          <TagNotesEditor
            items={tagItems}
            notes={tagNotes}
            onItemsChange={setTagItems}
            onNotesChange={setTagNotes}
            prefix="#"
            notePlaceholder="이 태그에 대한 설명"
            addLabel="설명 추가"
            cancelLabel="취소"
            editLabel="편집"
            removeTitle="태그 제거"
            multiLine
          />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          item drag-reorder · KO / EN bilingual notes · multiLine 모드 (항목 추가 / 체크박스 일괄 삭제 / 항목별 drag)
        </span>
      </motion.div>

      {/* AdminNotFound — 중앙 정렬 not-found / empty state */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>AdminNotFound</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ border: "var(--border-light)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <AdminNotFound
            title={language === "ko" ? "게시물을 찾을 수 없습니다" : "Post not found"}
            backHref="#components"
            backLabel={language === "ko" ? "목록으로" : "Back to list"}
          />
        </motion.div>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          {language === "ko"
            ? "icon + 메시지 + 돌아가기 링크 중앙 정렬 — admin 편집/상세에서 항목을 못 찾았을 때 쓰는 empty state 패턴"
            : "Centered icon + message + back link — empty-state pattern for when an admin edit/detail view can't find the item"}
        </span>
      </motion.div>
    </section>
  );
}

export default memo(ComponentsSection);
