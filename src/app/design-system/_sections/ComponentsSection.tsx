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
import DraggableTag, { useTagDrag } from "@/components/ui/DraggableTag";
import TagPill from "@/components/ui/TagPill";
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
  const [switchAccent, setSwitchAccent] = useState(true);
  const [switchMd, setSwitchMd] = useState(true);
  const [switchLabeled, setSwitchLabeled] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [inputUnderline, setInputUnderline] = useState("");
  const [inputSm, setInputSm] = useState("");
  const [inputInline, setInputInline] = useState("");
  const [checkSquare, setCheckSquare] = useState(false);
  const [checkCircle, setCheckCircle] = useState(true);
  const [checkIndet, setCheckIndet] = useState(false);
  const [selectValue, setSelectValue] = useState("option1");
  const [selectCompact, setSelectCompact] = useState("option1");
  const [selectChildren, setSelectChildren] = useState("b");
  const [selectEmpty, setSelectEmpty] = useState("");
  const [dpFormat, setDpFormat] = useState<"year" | "yearMonth" | "date">("date");
  const [dpDate, setDpDate] = useState({ year: "2024", month: "03", day: "15" });
  const [period, setPeriod] = useState<DatePeriod>({ start: "2024-03", end: "2024-12", format: "yearMonth" });
  const [twReplay, setTwReplay] = useState(0);
  const [paginationPage, setPaginationPage] = useState(3);
  const [pickerColor, setPickerColor] = useState("#d01046");
  const [dragTags, setDragTags] = useState(["React", "Next.js", "TypeScript", "GSAP"]);
  const { itemProps: tagItemProps } = useTagDrag((from, to) => {
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

      {/* Button — Variants */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>Button — Variants</div>
        <div className={styles.componentRow}>
          <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}><Tooltip content="variant: primary"><Button variant="primary">Primary</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}><Tooltip content="variant: outline"><Button variant="outline">Outline</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}><Tooltip content="variant: ghost"><Button variant="ghost">Ghost</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}><Tooltip content="variant: difference — mix-blend-mode + hover backdrop blur"><Button variant="difference">Difference</Button></Tooltip></motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}><Tooltip content="disabled"><Button disabled>Disabled</Button></Tooltip></motion.div>
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
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 3)}>
            <Tooltip content="variant: capsule (default)">
              <Input label="Label" value={inputValue} onChange={setInputValue} placeholder="Type something..." />
            </Tooltip>
          </motion.div>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 3)}>
            <Tooltip content="variant: underline">
              <Input label="Underline" value={inputUnderline} onChange={setInputUnderline} variant="underline" placeholder="Underline style..." />
            </Tooltip>
          </motion.div>
          <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
            <Tooltip content="inlineLabel">
              <Input inlineLabel="EN" value={inputInline} onChange={setInputInline} placeholder="Inline label..." />
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
                    <Typography variant="body2" color="secondary">A 4-tier token system: raw → semantic → component → context.</Typography>
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

      {/* ColorPicker */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>ColorPicker</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
          <Tooltip content="render-prop trigger + portal popover">
            <ColorPicker value={pickerColor} onChange={(c) => setPickerColor(c.oklch)}>
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
          <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}>
            <Tooltip content="variant: success"><Button variant="outline" onClick={() => showToast("Saved successfully", "success")}>Success</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}>
            <Tooltip content="variant: error"><Button variant="outline" onClick={() => showToast("Something went wrong", "error")}>Error</Button></Tooltip>
          </motion.div>
          <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}>
            <Tooltip content="variant: info"><Button variant="outline" onClick={() => showToast("Just so you know", "info")}>Info</Button></Tooltip>
          </motion.div>
        </div>
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

      {/* DraggableTag */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>DraggableTag</div>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          {dragTags.map((tag, i) => (
            <DraggableTag
              key={`${tag}-${i}`}
              label={tag}
              index={i}
              onRemove={() => setDragTags((prev) => prev.filter((_, j) => j !== i))}
              {...tagItemProps(i)}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* TagPill */}
      <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
        <div className={styles.componentGroupTitle}>TagPill</div>
        <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>
          {language === "ko"
            ? "캡슐 모양 태그 — `# + 태그명` + 선택적 카운트. 클릭 시 `/posts/tags/[tag]` 로 이동."
            : "Capsule-shaped tag — `# + name` + optional count. Navigates to `/posts/tags/[tag]` on click."}
        </p>
        <motion.div variants={staggerItemX} {...scrollChildX(0, 2)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          <Tooltip content="basic — name only"><TagPill tag="React" /></Tooltip>
          <Tooltip content="basic — name only"><TagPill tag="Next.js" /></Tooltip>
          <Tooltip content="basic — name only"><TagPill tag="TypeScript" /></Tooltip>
        </motion.div>
        <motion.div variants={staggerItemX} {...scrollChildX(1, 2)} style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          <Tooltip content="with count badge"><TagPill tag="GSAP" count={12} /></Tooltip>
          <Tooltip content="with count badge"><TagPill tag="CSS" count={47} /></Tooltip>
          <Tooltip content="with count badge"><TagPill tag="Plate" count={3} /></Tooltip>
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
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>sm (24px)</span>
              <CloseButton size="sm" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) var(--spacing-md)", border: "var(--border-light)", borderRadius: "var(--radius-capsule)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>md (button-h-sm)</span>
              <CloseButton size="md" onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
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
            trigger={
              <button type="button" aria-label="Row actions" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "var(--border-light)", borderRadius: "var(--radius-capsule)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                <MoreVertical size={16} />
              </button>
            }
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
            anchor + portal · outside click / ESC 자동 닫힘 · 터치 디바이스에선 bottom sheet 로 자동 분기
          </span>
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
    </section>
  );
}

export default memo(ComponentsSection);
