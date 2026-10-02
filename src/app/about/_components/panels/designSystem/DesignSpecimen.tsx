"use client";

import type { Language } from "@/providers/LanguageProvider";
import { Bell, Bookmark, Calendar, ArrowUpRight, Asterisk, BookOpen, Archive, Bug } from "@/components/icons";
import Button from "@/components/ui/Button";
import PinnedTitleRow from "../../PinnedTitleRow";
import styles from "./DesignSpecimen.module.css";

/* 견본은 사이트 토큰을 그대로 칠한다 — 값이 바뀌면 이 표도 따라 바뀐다 */
const COLORS = [
  { name: "accent", token: "--text-accent" },
  { name: "text", token: "--text-primary" },
  { name: "text-2", token: "--text-secondary" },
  { name: "text-3", token: "--text-tertiary" },
  { name: "bg", token: "--bg-primary" },
  { name: "bg-2", token: "--bg-secondary" },
  { name: "bg-3", token: "--bg-tertiary" },
  { name: "inverse", token: "--bg-inverse" },
];

const FONTS = [
  { name: "Instrument Serif", role: { ko: "제목", en: "Display" }, token: "--font-family-display", italic: true },
  { name: "Inter", role: { ko: "UI", en: "UI" }, token: "--font-sans" },
  { name: "Space Grotesk", role: { ko: "보조", en: "Support" }, token: "--font-grotesk" },
  { name: "JetBrains Mono", role: { ko: "코드", en: "Code" }, token: "--font-mono" },
];

const SPACING = ["2", "4", "8", "12", "16", "20", "24", "32", "48"];
const RADII = ["24", "full", "circle"];
const EASINGS = ["ease-material", "ease-bounce", "ease-out-expo"];
const ICONS = [Bell, Bookmark, Calendar, ArrowUpRight, Asterisk, BookOpen, Archive, Bug];

const LABEL = {
  color: { ko: "색", en: "Color" },
  type: { ko: "서체", en: "Typography" },
  space: { ko: "간격", en: "Spacing" },
  radius: { ko: "모서리", en: "Radius" },
  motion: { ko: "움직임", en: "Motion" },
  icon: { ko: "아이콘", en: "Iconography" },
};

/** Design System 데스크톱 — 토큰 견본표. 한 화면에 색·서체·간격·모서리·움직임·아이콘 견본을 격자로 */
export default function DesignSpecimen({ language }: { language: Language }) {
  return (
    <div className={styles.specimen}>
      <PinnedTitleRow
        panelKey="designSystem"
        rightContent={
          <Button variant="link" href="/design-system" external icon={<span>↗</span>} iconPosition="right" soundDisabled>
            Open
          </Button>
        }
      />
      <div className={styles.board}>
        <section className={`${styles.cell} ${styles.cellColor}`}>
          <h4 className={styles.cellTitle}>{LABEL.color[language]}</h4>
          <div className={styles.swatches}>
            {COLORS.map((c) => (
              <div key={c.name} className={styles.swatch}>
                <span className={styles.chip} style={{ background: `var(${c.token})` }} />
                <span className={styles.tokenName}>{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.cell} ${styles.cellType}`}>
          <h4 className={styles.cellTitle}>{LABEL.type[language]}</h4>
          <div className={styles.fonts}>
            {FONTS.map((f) => (
              <div key={f.name} className={styles.font}>
                <span className={styles.fontSample} style={{ fontFamily: `var(${f.token})`, fontStyle: f.italic ? "italic" : undefined }}>
                  Aa
                </span>
                <span className={styles.fontName}>{f.name}</span>
                <span className={styles.tokenName}>{f.role[language]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cell}>
          <h4 className={styles.cellTitle}>{LABEL.space[language]}</h4>
          <div className={styles.spaces}>
            {SPACING.map((s) => (
              <div key={s} className={styles.space}>
                <span className={styles.spaceBar} style={{ height: `var(--spacing-${s})` }} />
                <span className={styles.tokenName}>{s}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cell}>
          <h4 className={styles.cellTitle}>{LABEL.radius[language]}</h4>
          <div className={styles.radii}>
            {RADII.map((r) => (
              <div key={r} className={styles.radius}>
                <span className={styles.radiusBox} style={{ borderRadius: `var(--radius-${r})` }} />
                <span className={styles.tokenName}>{r}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cell}>
          <h4 className={styles.cellTitle}>{LABEL.motion[language]}</h4>
          <div className={styles.easings}>
            {EASINGS.map((e) => (
              <div key={e} className={styles.easing}>
                <span className={styles.track}>
                  <span className={styles.dot} style={{ animationTimingFunction: `var(--${e})` }} />
                </span>
                <span className={styles.tokenName}>{e.replace("ease-", "")}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cell}>
          <h4 className={styles.cellTitle}>{LABEL.icon[language]}</h4>
          <div className={styles.icons}>
            {ICONS.map((Icon, i) => (
              <Icon key={i} size={22} strokeWidth={1.5} />
            ))}
          </div>
          <span className={styles.tokenName}>lucide · 1.5px stroke</span>
        </section>
      </div>
    </div>
  );
}
