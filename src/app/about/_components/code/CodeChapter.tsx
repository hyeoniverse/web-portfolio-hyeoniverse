"use client";

/* 코드 장 — 프레임 둘. 첫 프레임(code)은 장 표지: 장 머리와 다섯 파일의 목차(경로).
   둘째 프레임(code-editor)은 편집기 창 하나가 화면을 채운다. 제목 막대의 파일 탭이 스니펫 다섯 개이고, 휠 · 키 한 번에
   파일 하나씩 넘어간다(탭을 눌러도, 탭에 초점이 있으면 ← → 로도). 몸통은 왼쪽 코드(줄 번호) · 오른쪽 미리보기와 설명,
   바닥은 상태 막대. 낮은 넓은 화면은 파일마다 미리보기 → 설명 두 단계(코드는 그대로), 좁은 화면은 설명 → 미리보기 → 코드 세 단계.
   데모는 지금 파일 하나만, 이 프레임이 지금 프레임일 때만 돈다 — Sandpack 은 iframe 마다 번들러가 돌아 무겁다 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import Pressable from "@/components/ui/Pressable";
import { FileCode2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { codeExamples } from "@/data/about/codeExamples";
import CodeDemoSlot from "@/app/about/_panels/panels/CodeDemoSlot";
import { codeChapter, codeSources } from "../../_data/code";
import { useFrameSteps } from "../prezi/context";
import { useL, useWide } from "../features/shared";
import ChapterCover from "../design/ChapterCover";
import styles from "./Code.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/* 탭 이름 — 제목 끝 괄호 설명은 뺀다("3D Scroll Torus (Lissajous Curve)" → "3D Scroll Torus") */
const tabName = (title: string) => title.replace(/\s*\(.*\)\s*$/, "");

const LANG_LABEL: Record<string, string> = { tsx: "TSX", typescript: "TypeScript", ts: "TypeScript", css: "CSS" };

/* 앱 토큰 기반 구문 색 — 샌드박스 데모(CodeDemoSandbox)와 같은 짝. 창이 늘 밤 하늘(color-scheme: dark) 위라 토큰이 밝은 쪽으로 온다 */
const PRISM_THEME: PrismTheme = {
  plain: { color: "var(--text-primary)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "var(--text-muted)", fontStyle: "italic" } },
    { types: ["keyword", "tag", "builtin", "important"], style: { color: "var(--text-accent)" } },
    { types: ["punctuation", "operator"], style: { color: "var(--text-secondary)" } },
    { types: ["function", "class-name", "attr-name", "property"], style: { color: "var(--text-info)" } },
    { types: ["number", "boolean", "constant", "symbol"], style: { color: "var(--text-warning)" } },
    { types: ["string", "template-string", "char", "attr-value", "regex"], style: { color: "var(--text-success)" } },
  ],
};

/** 설명 속 **굵게** 와 `코드` 만 살린다 */
function Rich({ text }: { text: string }): ReactNode {
  return text.split("**").map((part, i) => {
    const inner = part.split("`").map((p, j) => (j % 2 ? <code key={j} className={styles.inline}>{p}</code> : p));
    return i % 2 ? <strong key={i}>{inner}</strong> : <span key={i}>{inner}</span>;
  });
}

/** 줄 번호가 붙은 코드 */
function CodeLines({ code, language }: { code: string; language: string }) {
  return (
    <Highlight theme={PRISM_THEME} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className={styles.pre}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, className: styles.line })}>
                <span className={styles.ln} aria-hidden>{i + 1}</span>
                <span className={styles.lc}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

/** 낮은 화면인지 — 오른쪽 칸에 미리보기와 설명이 함께 들어가지 않는다(1280×720 등) */
function useShort() {
  const [short, setShort] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(height <= 820px)");
    const sync = () => setShort(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return short;
}

/** 파일 하나의 단계 — 몸통에 무엇을 보이는지 */
type Pane = "all" | "preview" | "desc" | "code";

/** 첫 프레임 — 장 표지. 목차는 파일 이름과 실제 경로 */
export function CodeCover() {
  return (
    <ChapterCover
      id="code"
      eyebrow={codeChapter.eyebrow}
      title={codeChapter.title}
      note={codeChapter.note}
      items={codeExamples.map((ex) => ({ key: ex.title, label: tabName(ex.title), sub: codeSources[ex.title], mono: true }))}
    />
  );
}

/** 둘째 프레임 — 편집기. 넓고 높은 화면은 파일 하나가 한 단계, 낮으면 두 단계, 좁으면 세 단계 */
export function CodeEditor() {
  const L = useL();
  const { language } = useLanguage();
  const wide = useWide();
  const short = useShort();
  const n = codeExamples.length;
  const panes: Pane[] = !wide ? ["desc", "preview", "code"] : short ? ["preview", "desc"] : ["all"];
  const per = panes.length;
  const { step, setStep, current: live } = useFrameSteps(n * per);
  const current = Math.floor(step / per);
  const pane = panes[step % per];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const ex = codeExamples[current];
  const path = codeSources[ex.title];
  const slash = path ? path.lastIndexOf("/") + 1 : 0;
  const lineCount = ex.code.split("\n").length;

  const select = (i: number, focus = false) => {
    const next = (i + n) % n;
    setStep(next * per);
    if (focus) tabRefs.current[next]?.focus();
  };
  /* ← → 로 탭 사이를 옮긴다(탭 목록 안에 초점이 있을 때 — 프레지는 탭 목록 안의 ← → 를 넘김으로 쓰지 않는다) */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); select(current + 1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); select(current - 1, true); }
    else if (e.key === "Home") { e.preventDefault(); select(0, true); }
    else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
  };

  return (
    <section className={styles.frame} data-live={live || undefined}>
      <div className={styles.stage}>
      <div className={styles.window}>
        {/* 제목 막대 — 점 셋 · 파일 탭 · 몇 번째 */}
        <div className={styles.titleBar}>
          <span className={styles.lights} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <div className={styles.tabs} role="tablist" aria-label={L(codeChapter.files)} onKeyDown={onKeyDown}>
            {codeExamples.map((it, i) => {
              const on = i === current;
              return (
                <Pressable
                  key={it.title}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  role="tab"
                  id={`code-tab-${i}`}
                  aria-selected={on}
                  aria-controls="code-panel"
                  tabIndex={on ? 0 : -1}
                  className={styles.tab}
                  data-on={on || undefined}
                  title={tabName(it.title)}
                  noTapScale
                  onClick={() => select(i)}
                >
                  <span className={styles.tabIcon}>
                    <FileCode2 size={14} aria-hidden />
                    {/* 길잡이 별이 앉는 자리 — 지금 탭의 파일 아이콘 위(이름은 가리지 않는다) */}
                    {on && live && <span className={styles.guide} data-guide="" data-guide-priority="1" aria-hidden />}
                  </span>
                  <span className={styles.tabLabel}>{tabName(it.title)}</span>
                </Pressable>
              );
            })}
          </div>
          <span className={styles.counter}>{pad(current + 1)} / {pad(n)}</span>
        </div>

        {/* 몸통 — 코드 · (미리보기 + 설명). 파일이 바뀌면 안이 다가오며 바뀐다 */}
        <div className={styles.body} id="code-panel" role="tabpanel" aria-labelledby={`code-tab-${current}`} data-pane={pane}>
          <div className={styles.code} tabIndex={0} aria-label={tabName(ex.title)}>
            <div key={current} className={styles.swap}>
              <CodeLines code={ex.code} language={ex.language} />
            </div>
          </div>
          <div className={styles.side}>
            <div className={styles.preview}>
              <div className={styles.previewHead}>
                <span className={styles.pulse} aria-hidden />
                {L(codeChapter.preview)}
              </div>
              <div key={current} className={styles.demo} data-mode={ex.demoMode}>
                <CodeDemoSlot
                  mode={ex.demoMode}
                  media={ex.demoMedia}
                  files={ex.demoFiles}
                  template={ex.demoTemplate}
                  demoKey={ex.demoKey}
                  active={live && (pane === "all" || pane === "preview")}
                />
              </div>
            </div>
            {/* 지금 스니펫이 하는 일 */}
            <div key={current} className={styles.desc}>
              <div className={styles.descHead}>
                <span className={styles.descNum}>{pad(current + 1)}</span>
                <h3 className={styles.descTitle}>{ex.title}</h3>
              </div>
              <p className={styles.descBody}>
                <Rich text={ex.description[language] ?? ex.description.ko} />
              </p>
            </div>
          </div>
        </div>

        {/* 상태 막대 — 파일 경로(발췌) · 언어 · 줄 수 · 데모 종류 · 단축키 */}
        <div className={styles.statusBar}>
          <span className={styles.path}>
            {path ? (
              <>
                <span className={styles.dir}>{path.slice(0, slash)}</span>
                <span className={styles.file}>{path.slice(slash)}</span>
              </>
            ) : (
              <span className={styles.file}>{ex.title}</span>
            )}
            <span className={styles.excerpt}>{L(codeChapter.excerpt)}</span>
          </span>
          <span className={`${styles.statusItem} ${styles.statusLang}`}>{LANG_LABEL[ex.language] ?? ex.language}</span>
          <span className={styles.statusItem}>
            {lineCount} {L(codeChapter.lines)}
          </span>
          <span className={`${styles.statusItem} ${styles.statusLive}`}>
            <span className={styles.pulse} aria-hidden />
            {L(ex.demoMode === "sandbox" ? codeChapter.sandbox : codeChapter.live)}
          </span>
          <span className={styles.statusKeys}>{L(codeChapter.keys)}</span>
        </div>
      </div>
      </div>
    </section>
  );
}
