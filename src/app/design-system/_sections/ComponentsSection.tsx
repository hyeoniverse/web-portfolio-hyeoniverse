"use client";

import { memo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Mail, Send, Star, ArrowRight, Zap, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm, ModalAlert } from "@/components/ui/ModalTemplates";
import Logo from "@/components/common/Logo";
import TypeWriter from "@/components/effects/TypeWriter";
import Tooltip from "@/components/ui/Tooltip";
import TextLink from "@/components/ui/TextLink";
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
  const [switchOn, setSwitchOn] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [checkSquare, setCheckSquare] = useState(false);
  const [checkCircle, setCheckCircle] = useState(true);
  const [checkIndet, setCheckIndet] = useState(false);
  const [selectValue, setSelectValue] = useState("option1");
  const [selectEmpty, setSelectEmpty] = useState("");
  const [dpFormat, setDpFormat] = useState<"year" | "yearMonth" | "date">("date");
  const [dpDate, setDpDate] = useState({ year: "2024", month: "03", day: "15" });
  const [twReplay, setTwReplay] = useState(0);
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

      {/* Button — Variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Variants</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="variant: primary"><Button variant="primary">Primary</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="variant: outline"><Button variant="outline">Outline</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="variant: ghost"><Button variant="ghost">Ghost</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled"><Button disabled>Disabled</Button></Tooltip></motion.div>
        </div>
      </motion.div>

      {/* Button — Sizes */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Sizes</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}><Tooltip content="size: xs"><Button variant="outline" size="xs">XS</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}><Tooltip content="size: sm"><Button variant="outline" size="sm">Small</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}><Tooltip content="size: md"><Button variant="outline" size="md">Medium</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}><Tooltip content="size: lg"><Button variant="outline" size="lg">Large</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}><Tooltip content="size: xl"><Button variant="outline" size="xl">XL</Button></Tooltip></motion.div>
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

      {/* TextLink */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TextLink</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}><TextLink href="/design-system">Internal Link</TextLink></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}><TextLink href="https://fonts.google.com" external>External Link ↗</TextLink></motion.div>
        </div>
      </motion.div>

      {/* Input */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Input</div>
        <div className={styles.sliderRow}>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
            <Input label="Label" value={inputValue} onChange={setInputValue} placeholder="Type something..." />
          </motion.div>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
            <Input value="Read-only value" onChange={() => {}} disabled />
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
          <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}>
            <Tooltip content="interactive"><Switch checked={switchOn} onCheckedChange={setSwitchOn} /></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", display: "inline-block", minWidth: "24px", textAlign: "center" }}>
              {switchOn ? "ON" : "OFF"}
            </span>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="disabled off"><Switch disabled /></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled on"><Switch disabled defaultChecked /></Tooltip></motion.div>
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
                    cancelText="Cancel"
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
                    <Typography variant="body2" color="secondary">A 3-layer token system powering every component with raw, semantic, and contextual variables.</Typography>
                  </div>
                ))}
              >
                Showcase
              </Button>
            </Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}>
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
        </div>
      </motion.div>

      {/* Select / Dropdown */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Select / Dropdown</div>
        <div className={styles.sliderRow}>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
            <Tooltip content="Custom dropdown select">
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
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
            <Tooltip content="Empty / placeholder state">
              <Select
                value={selectEmpty}
                options={[
                  { value: "a", label: "Alpha" },
                  { value: "b", label: "Bravo" },
                ]}
                onChange={setSelectEmpty}
                placeholder="No selection"
              />
            </Tooltip>
          </motion.div>
        </div>
      </motion.div>

      {/* DatePicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>DatePicker</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>Format</span>
            <div style={{ display: "flex", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)", overflow: "hidden" }}>
              {(["year", "yearMonth", "date"] as const).map((f, i, arr) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDpFormat(f)}
                  style={{
                    padding: "var(--spacing-2xs) var(--spacing-sm)",
                    border: "none",
                    borderRight: i < arr.length - 1 ? "1px solid var(--border-tertiary-color)" : "none",
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
              <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)" }}>Spinner</div>
              <div style={{ border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
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
              <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)" }}>Calendar</div>
              <div style={{ border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
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

      {/* ImageViewer */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ImageViewer</div>
        <div
          style={{
            display: "inline-flex",
            borderTop: "1px solid var(--border-tertiary-color)",
            borderBottom: "1px solid var(--border-tertiary-color)",
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
    </section>
  );
}

export default memo(ComponentsSection);
