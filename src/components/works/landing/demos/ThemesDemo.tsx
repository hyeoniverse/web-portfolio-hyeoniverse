"use client";

/* 테마 미리보기 — 프리셋을 고르거나 라이트·다크를 바꾸면 작은 홈 화면의 색이 그 테마로 바뀌고, 대비 점검이 따라 바뀐다.
   화면에 보이는 동안 프리셋이 혼자 넘어가고, 한 번이라도 직접 고르면 멈춘다. 색 계산은 사이트와 같은 함수(lib/themeColors) */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Moon, Sun } from "@/components/icons";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { readableAccent, textOnAccent } from "@/lib/themeColors";
import { contrastLevel, contrastRatio } from "@/utils/contrast";
import { themes as copy, THEME_CYCLE_MS, THEME_FLIP_EVERY } from "./data";
import { prefersReducedMotion, useInView, useT } from "./hooks";
import styles from "./Demos.module.css";

type Mode = "light" | "dark";

const vars = (v: Record<string, string>) =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [`--${k}`, val])) as CSSProperties;

export default function ThemesDemo() {
  const { t } = useT();
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("light");
  const [touched, setTouched] = useState(false);
  const ticks = useRef(0);

  useEffect(() => {
    if (!inView || touched || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      ticks.current += 1;
      setIndex((now) => (now + 1) % THEME_PRESETS.length);
      if (ticks.current % THEME_FLIP_EVERY === 0) setMode((now) => (now === "light" ? "dark" : "light"));
    }, THEME_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [inView, touched]);

  const preset = THEME_PRESETS[index];
  const theme = preset.theme;
  const bg = mode === "light" ? theme.lightBg : theme.darkBg;
  const text = mode === "light" ? theme.lightText : theme.darkText;
  const onAccent = textOnAccent(theme, mode, theme.accentColor);
  const accentText = readableAccent(theme.accentColor, bg);
  const ratios = [
    { label: copy.body, value: contrastRatio(text, bg) ?? 1 },
    { label: copy.accentText, value: contrastRatio(accentText, bg) ?? 1, fixed: accentText !== theme.accentColor },
    { label: copy.onAccent, value: contrastRatio(onAccent, theme.accentColor) ?? 1 },
  ];
  const five = [
    [copy.five.accent, theme.accentColor],
    [copy.five.lightBg, theme.lightBg],
    [copy.five.lightText, theme.lightText],
    [copy.five.darkBg, theme.darkBg],
    [copy.five.darkText, theme.darkText],
  ] as const;

  return (
    <div ref={ref} className={`${styles.demo} ${styles.themesDemo}`}>
      <div className={styles.themes}>
        <div
          className={styles.site}
          data-mode={mode}
          style={vars({ "t-bg": bg, "t-text": text, "t-accent": theme.accentColor, "t-on": onAccent, "t-accent-text": accentText })}
          role="img"
          aria-label={t(copy.previewLabel, { name: preset.name, mode: t(mode === "light" ? copy.light : copy.dark) })}
        >
          <div className={styles.siteBar}>
            <b>HYEONIVERSE</b>
            {copy.nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {mode === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </div>
          <div className={styles.siteHero}>
            <div>
              <small>{t(copy.eyebrow)}</small>
              <p>
                {t(copy.heroLine1)}
                <br />
                {t(copy.heroLine2)}
              </p>
              <span className={styles.siteButton}>{t(copy.cta)}</span>
            </div>
            <span className={styles.torus} aria-hidden="true" />
          </div>
          <div className={styles.siteCards}>
            {copy.tags.map((tag) => (
              <div key={tag.en}>
                <span className={styles.siteThumb} />
                <em>{t(tag)}</em>
                <span className={styles.siteLine} />
                <span className={styles.siteLine} data-short="" />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.themesSide}>
          <div className={styles.themesTop}>
            <p className={styles.themesName}>{preset.name}</p>
            <div role="group" aria-label={t(copy.modeGroup)}>
            <SegmentedControl
              size="sm"
              items={(["light", "dark"] as const).map((value) => ({
                value,
                label: (
                  <span className={styles.modeLabel}>
                    {value === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                    {t(value === "light" ? copy.light : copy.dark)}
                  </span>
                ),
              }))}
              value={mode}
              onChange={(v) => {
                setTouched(true);
                setMode(v);
              }}
            />
            </div>
          </div>
          <ul className={styles.swatches} aria-label={t(copy.presets)}>
            {THEME_PRESETS.map((p, i) => (
              <li key={p.name}>
                <Pressable
                  className={styles.swatch}
                  aria-pressed={i === index}
                  aria-label={p.name}
                  title={p.name}
                  onClick={() => {
                    setTouched(true);
                    setIndex(i);
                  }}
                  style={vars({ "s-accent": p.theme.accentColor, "s-bg": mode === "light" ? p.theme.lightBg : p.theme.darkBg })}
                />
              </li>
            ))}
          </ul>
          <dl className={styles.five}>
            {five.map(([label, color]) => (
              <div key={label.en}>
                <dt>
                  <i style={vars({ swatch: color })} />
                  {t(label)}
                </dt>
                <dd>{color}</dd>
              </div>
            ))}
          </dl>
          <ul className={styles.contrast} aria-label={t(copy.contrastGroup)}>
            {ratios.map((row) => {
              const level = contrastLevel(row.value);
              return (
                <li key={row.label.en} data-grade={level}>
                  {t(row.label)} <b>{row.value.toFixed(1)}:1</b>
                  {row.fixed && <small>{t(copy.corrected, { hex: accentText })}</small>}
                  <span>{t(copy.grades[level])}</span>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>{t(copy.hint)}</p>
        </div>
      </div>
    </div>
  );
}
