"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Star, ArrowRight, Zap, Minus, Plus } from "@/components/icons";
import Button from "@/components/ui/Button";
import HelpButton from "@/components/ui/HelpButton";
import MenuDots from "@/components/ui/MenuDots";
import SpinButton from "@/components/ui/SpinButton";
import { showToast } from "@/stores/toastStore";
import CloseButton from "@/components/ui/CloseButton";
import Tooltip from "@/components/ui/Tooltip";
import Popover from "@/components/ui/Popover";
import TextLink from "@/components/ui/TextLink";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import Pressable from "@/components/ui/Pressable";
import { md, DemoGroup, useDemo } from "./demoShared";

/** Buttons & Actions — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function ButtonsActionsDemos() {
  const { language, scrollChildX } = useDemo();
  const [menuDotsOpen, setMenuDotsOpen] = useState(false);
  const [menuDotsClosing, setMenuDotsClosing] = useState(false);
  // SpinButton 데모 — 누르고 있으면 가속 반복되는 걸 카운터로 보여줌
  const [spinCount, setSpinCount] = useState(0);

  return (
    <>
        <h3 className={styles.componentCategory}>Buttons & Actions</h3>

        {/* Button */}
        <DemoGroup title="Button">
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
        </DemoGroup>

        {/* Pressable */}
        <DemoGroup
          title="Pressable"
          ko={"눌리는 것의 **동작만** 담는 기반입니다 — `type=\"button\"` · 클릭/호버 사운드 · disabled · 누를 때 축소. 생김새는 주지 않으므로 `className` 으로 쓰는 쪽이 정합니다. MUI 의 `ButtonBase`, React Aria 의 `useButton` 과 같은 구조입니다.\n\n버튼처럼 생긴 것은 `Button` 을, 절대위치로 깔린 클릭 영역·부모 글꼴을 물려받는 페이지 번호·`::after` 로 밑줄을 그리는 칩처럼 **생김새를 통일하면 안 되는 자리**는 `Pressable` 을 씁니다. raw `<button>` 은 쓰지 않습니다 — 사운드가 빠지고 `type` 누락 시 폼이 제출됩니다."}
          en={"The behavior-only base for anything pressable — `type=\"button\"`, click/hover sound, disabled, tap scale. It gives no appearance, so the caller supplies `className`. Same structure as MUI's `ButtonBase` or React Aria's `useButton`.\n\nUse `Button` for things that look like buttons; use `Pressable` where the appearance must NOT be unified — absolutely positioned hit areas, page numbers that inherit the parent font, chips that draw an underline with `::after`. Never a raw `<button>`: it loses the sound, and a missing `type` submits the form."}
        >
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
        </DemoGroup>

        {/* HelpButton */}
        <DemoGroup
          title="HelpButton"
          ko={"도움말 `?` 버튼으로, Button 의 subtle/circle 을 고정한 wrapper 입니다. variant·shape·children 은 일관성을 위해 고정하고 size 만 열어 둡니다(폼 라벨 옆에는 2xs, 섹션 헤더에는 sm 을 씁니다). 나머지 props 는 Button 으로 그대로 흘려보내므로 Popover/Tooltip 의 trigger 로 바로 쓸 수 있습니다."}
          en={"The help `?` button — a fixed Button subtle/circle wrapper. variant/shape/children are locked for consistency; only size is open (2xs next to a form label, sm in a section header). All other props pass through to Button, so it works directly as a Popover/Tooltip trigger."}
        >
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
        </DemoGroup>

        {/* TextLink */}
        <DemoGroup title="TextLink">
          <div className={styles.componentRow}>
            <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}><TextLink href="/design-system">Internal Link</TextLink></motion.div>
            <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}><TextLink href="https://fonts.google.com" external>External Link</TextLink></motion.div>
          </div>
        </DemoGroup>

        {/* SpinButton — long-press 가속 반복 */}
        <DemoGroup
          title="SpinButton"
          ko={"누르고 있으면 action 을 가속하며 반복합니다. 클릭하면 즉시 한 번 실행하고, 380ms 이상 누르고 있으면 반복을 시작합니다(130ms 에서 28ms 로 점점 빨라집니다). 버튼 밖에서 손을 떼도 pointerCapture 로 안전하게 멈춥니다. 자체 시각 스타일은 없고, 놓이는 자리의 모양을 className 으로 받습니다(NumberInput 의 스텝퍼가 그 예입니다)."}
          en={"Hold to repeat the action with acceleration — one immediate fire, then repeat after a 380ms hold (130ms → 28ms, speeding up). pointerCapture stops it safely even if you release outside the button. It ships no visual style — the host passes the look via className (NumberInput's stepper being the example)."}
        >
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
        </DemoGroup>

        {/* CloseButton */}
        <DemoGroup
          title="CloseButton"
          ko={"닫기 버튼입니다. 평소엔 minus(하단 line 하나)였다가 hover 하면 두 line 이 X 로 morph 합니다(`[data-active]` 로 강제 X 상태도 가능). vector line 을 `top: 50%; left: 50%` + negative margin 으로 sub-pixel 정렬해 어느 크기에서도 정확히 겹칩니다. 아래 버튼에 마우스를 올려 보세요."}
          en={"A close button — a single minus line at rest that morphs into an X on hover (or force the X via `[data-active]`). The lines are sub-pixel aligned with `top: 50%; left: 50%` + negative margins so they meet cleanly at any size. Hover the buttons below."}
        >
          <div className={styles.componentRow} style={{ gap: "var(--spacing-2xl)", alignItems: "flex-end" }}>
            {([["xs", "20px"], ["sm", "24px"], ["md", "32px"], ["lg", "38px"]] as const).map(([size, px], i) => (
              <motion.div key={size} variants={staggerItemX} {...scrollChildX(i, 4)} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-2xs)" }}>
                <CloseButton size={size} onClick={() => showToast("Closed!", "info")} ariaLabel="close" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-hint)", color: "var(--text-muted)" }}>{size} · {px}</span>
              </motion.div>
            ))}
          </div>
        </DemoGroup>

        {/* MenuDots */}
        <DemoGroup
          title="MenuDots"
          ko={"메뉴 버튼 아이콘입니다. 9-dot 격자가 눌리면 X 로 모였다가 닫힐 때 다시 흩어집니다. 사이트 Navigation 메뉴 버튼과 admin/settings 서랍 토글이 같은 아이콘을 쓰도록 공용화했습니다. viewBox 8×8 의 vector circle 이라 어떤 크기에서도 완전한 원을 유지합니다(작은 span 에서는 subpixel 안티앨리어싱이 dot 마다 달라 타원처럼 보였습니다). 클릭해 보세요."}
          en={"A menu-button icon — a 9-dot grid that collapses into an X when opened, and back out when closing. Shared so the site Navigation menu button and the admin/settings drawer toggle use one icon. Vector circles in an 8×8 viewBox keep perfect circles at any size (tiny spans made subpixel anti-aliasing differ per dot, so they read as ovals). Click it."}
        >
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
        </DemoGroup>

    </>
  );
}
