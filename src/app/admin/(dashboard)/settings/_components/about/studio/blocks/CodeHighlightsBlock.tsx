"use client";

import { useRef, useState } from "react";
import css from "../../AboutStudio.module.css";
import { CodeBlockEditor, DemoFilesEditor } from "../lazyEditors";
import { EditableText, PanelStage, StageTabs, sec } from "../primitives";
import CodeDemoSlot, { type CodeDemoMode } from "@/app/about/_components/panels/CodeDemoSlot";
import ch from "@/app/about/_components/panels/CodeHighlightsPanel.module.css";
import { Code2, ImageIcon, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import ColorPicker from "@/components/ui/ColorPicker";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { codeExamples } from "@/data/about/codeExamples";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
/* ═══════════ Code Highlights ═══════════ */
export type CodeItem = { title: string; description_ko: string; description_en: string; language: string; code: string;
  demoMode?: CodeDemoMode; demoMedia?: string; demoFiles?: Record<string, string>; demoTemplate?: string; demoBg?: string };

/* sandbox 기본 파일 — react-ts 템플릿의 index.tsx 가 ./styles.css 를 import 하므로 그대로 스타일이 먹는다 */
const DEMO_FILE_SEED: Record<string, string> = {
  "/App.tsx": `export default function App() {
  return <button className="demo">Hover Me</button>;
}
`,
  "/styles.css": `body {
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: transparent;
  font-family: system-ui, sans-serif;
}
.demo {
  padding: 12px 24px;
  border: 1px solid crimson;
  border-radius: 999px;
  background: transparent;
  color: crimson;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.demo:hover {
  background: crimson;
  color: white;
}
`,
};

export const seedCode = (): CodeItem[] => codeExamples.map((c) => ({
  title: c.title, description_ko: c.description.ko, description_en: c.description.en,
  language: c.language, code: c.code,
  demoMode: c.demoMode, demoMedia: c.demoMedia,
  demoFiles: c.demoFiles, demoTemplate: c.demoTemplate, demoBg: c.demoBg,
}));

/* 실제 패널과 동일 — 번호 + 제목/설명 헤더, 본문은 데모 + 코드 2단.
   실제도 스크롤로 한 패인씩 넘겨 보므로 스튜디오도 탭으로 전환하며 하나씩 편집. */
export function CodeHighlightsBlock({ value, onChange, lang, t, title }: {
  value: CodeItem[]; onChange: (v: CodeItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const [dropOver, setDropOver] = useState(false);

  const [dropErr, setDropErr] = useState(false);
  const [tab, setTab] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const MAX = 8;
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<CodeItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  /* 아무 입력 없는 스니펫 — 추가만 하고 이탈하면 자동 삭제 */
  /* 데모가 실제로 채워졌는지 — 모드만 골라둔 상태는 아직 빈 것으로 본다 */
  const hasDemo = it
    ? it.demoMode === "media"
      ? !!it.demoMedia?.trim()
      : it.demoMode === "sandbox"
        ? Object.values(it.demoFiles ?? {}).some((c) => c.trim())
        : false
    : false;
  /* sandbox 로 바꾸는 순간 기본 파일을 실제로 저장해야 슬롯이 안 빈다 */
  const setDemoMode = (m: CodeDemoMode) =>
    set(m === "sandbox" && !it?.demoFiles ? { demoMode: m, demoFiles: DEMO_FILE_SEED } : { demoMode: m });

  const isEmptySnippet = (c: CodeItem) =>
    !c.title.trim() && !c.description_ko.trim() && !c.description_en.trim() && !c.code.trim();
  const add = () => {
    onChange([...value, { title: "", description_ko: "", description_en: "", language: "tsx", code: "" }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  /* 탭 전환 — 떠나는 스니펫이 비어있으면 버리고 대상 인덱스 보정 */
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmptySnippet(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };
  return (
    <section className={css.block}>
      <div className={css.slideTabs} ref={tabsRef}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < MAX}
          addLabel={lang === "ko" ? "코드 추가" : "Add snippet"}
          labelOf={(i) => value[i]?.title || (lang === "ko" ? "새 스니펫" : "Untitled")} />
      </div>
      {it && (
        <PanelStage>
          {/* key = 스니펫별 remount — 같은 input 을 재사용하면 autoFocus 가 안 걸린다 */}
          <div key={cur} className={css.chStage}
            onBlur={(e) => {
              const rt = e.relatedTarget as Node | null;
              if (rt && e.currentTarget.contains(rt)) return;   // 패인 내부 이동
              if (rt && tabsRef.current?.contains(rt)) return;  // 탭 클릭 → selectTab 이 처리
              if (isEmptySnippet(it)) removeAt(cur);            // 입력 없이 이탈 → 빈 스니펫 삭제
            }}>
            <div className={css.chTools}>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>
            <div className={css.chPane}>
              <div className={ch.codeSingleHeader}>
                <span className={ch.codeSingleNumber}>{String(cur + 1).padStart(2, "0")}</span>
                <div className={ch.codeSingleMeta}>
                  <EditableText wrap className={css.chTitle} value={it.title} autoFocus={isEmptySnippet(it)}
                    onChange={(v) => set({ title: v })} placeholder="StaggerText Component" ariaLabel="title" />
                  <EditableText multiline className={ch.codeSingleDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                    onChange={(v) => set(lang === "ko" ? { description_ko: v } : { description_en: v })}
                    placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                </div>
              </div>
              <div className={`${ch.codeSingleBody} ${css.chBody}`}>
                <div className={`${ch.codeDemo} ${dropOver ? css.demoDropOver : ""}`}
                  style={it.demoBg ? { background: it.demoBg } : undefined}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes("Files")) return;
                    e.preventDefault();
                    setDropOver(true);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setDropOver(false);
                  }}
                  onDrop={(e) => {
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    e.preventDefault();
                    setDropOver(false);
                    /* 끌어다 놓으면 미디어 모드로 자동 전환 — 코드 모드에서 떨어뜨려도 의도대로 */
                    void uploadDemoFile(file)
                      .then((u) => set({ demoMode: "media", demoMedia: u }))
                      .catch(() => setDropErr(true));
                  }}>
                  <CodeDemoSlot mode={it.demoMode} media={it.demoMedia} files={it.demoFiles} template={it.demoTemplate} />
                  {hasDemo ? (
                    /* 채워진 뒤엔 데모를 가리지 않게 좌상단에서 hover 로만 */
                    <div className={css.demoEdit}>
                      <SegmentedControl size="sm" value={it.demoMode ?? "sandbox"}
                        onChange={(v) => setDemoMode(v as CodeDemoMode)}
                        items={[
                          { value: "media", label: lang === "ko" ? "미디어" : "Media" },
                          { value: "sandbox", label: lang === "ko" ? "코드" : "Code" },
                        ]} />
                      {/* 미설정(투명)일 때 피커 초기값 — 저장 전까진 demoBg 가 undefined 라 투명 유지 */}
                      <ColorPicker value={it.demoBg || "#ffffff"} onChange={(c) => set({ demoBg: c.hex })}>
                        {({ toggle }) => (
                          <Pressable className={css.demoBgSwatch}
                            style={it.demoBg ? { background: it.demoBg } : undefined}
                            onClick={toggle} title={lang === "ko" ? "데모 배경색" : "Demo background"}
                            aria-label={lang === "ko" ? "데모 배경색" : "Demo background"} />
                        )}
                      </ColorPicker>
                      {it.demoBg && (
                        <Button variant="subtle" shape="circle" size="2xs" onClick={() => set({ demoBg: undefined })}
                          aria-label={lang === "ko" ? "배경색 지우기" : "Clear background"}>
                          <X size={11} />
                        </Button>
                      )}
                      {it.demoMode === "media"
                        ? <DemoMediaUpload lang={lang} url={it.demoMedia} onChange={(u) => set({ demoMedia: u })} />
                        : <Popover placement="top-start" trigger={
                            <Button variant="subtle" size="sm" icon={<Code2 size={15} />}>
                              {lang === "ko" ? "코드 편집" : "Edit code"}
                            </Button>
                          }>
                            <DemoFilesEditor key={cur} lang={lang}
                              files={it.demoFiles ?? DEMO_FILE_SEED}
                              onChange={(f) => set({ demoFiles: f })} />
                          </Popover>}
                    </div>
                  ) : (
                    /* 비었을 때는 칸 한가운데서 어떤 데모를 만들지 고르게 */
                    <div className={css.demoEmpty}>
                      <div className={css.demoEmptyInner}>
                      {it.demoMode === "media" ? (
                        <>
                          <span className={css.demoEmptyLabel}>
                            {lang === "ko" ? "실행 화면 녹화물을 올립니다" : "Upload a recording"}
                          </span>
                          <DemoMediaUpload lang={lang} url={it.demoMedia} onChange={(u) => set({ demoMedia: u })} />
                          <Pressable className={css.demoSwitch} onClick={() => setDemoMode("sandbox")}>
                            {lang === "ko" ? "직접 코드로 만들기" : "Write code instead"}
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <span className={css.demoEmptyLabel}>{lang === "ko" ? "데모 추가" : "Add a demo"}</span>
                          <div className={css.demoEmptyActions}>
                            <Button variant="outline" size="sm" icon={<ImageIcon size={16} />}
                              onClick={() => setDemoMode("media")}>
                              {lang === "ko" ? "미디어 업로드" : "Upload media"}
                            </Button>
                            <Button variant="outline" size="sm" icon={<Code2 size={16} />}
                              onClick={() => setDemoMode("sandbox")}>
                              {lang === "ko" ? "코드" : "Code"}
                            </Button>
                          </div>
                        </>
                      )}
                      </div>
                    </div>
                  )}
                  {dropErr && (
                    <span className={css.demoDropErr}>
                      {lang === "ko" ? "업로드에 실패했습니다." : "Upload failed."}
                    </span>
                  )}
                </div>
                <div className={ch.codeScrollWrap}>
                  <CodeBlockEditor code={it.code} onChange={(v) => set({ code: v })} />
                </div>
              </div>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* 데모 미디어 업로드 — 실행 화면 녹화물(gif/mp4)이라 cover picker(언스플래시·그라디언트)는 안 맞는다.
   그냥 파일 하나 고르는 버튼. */
/* 이미지·영상 업로드 — 버튼과 drop 양쪽에서 쓴다 */
async function uploadDemoFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json?.url) throw new Error(json?.error || "upload failed");
  return json.url as string;
}

function DemoMediaUpload({ url, onChange, lang }: {
  url?: string; onChange: (u: string) => void; lang: Language;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      onChange(await uploadDemoFile(file));
    } catch {
      setErr(lang === "ko" ? "업로드에 실패했습니다." : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const name = url ? url.split("/").pop()?.slice(0, 28) : null;
  return (
    <>
      <input ref={inputRef} type="file" hidden accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }} />
      <Button variant="subtle" size="xs" icon={<ImageIcon size={14} />} disabled={busy}
        onClick={() => inputRef.current?.click()}>
        {busy ? (lang === "ko" ? "업로드 중" : "Uploading")
          : url ? (lang === "ko" ? "변경" : "Change")
            : (lang === "ko" ? "업로드" : "Upload")}
      </Button>
      {name && <span className={css.mediaName}>{name}</span>}
      {url && (
        <Button variant="subtle" shape="circle" size="2xs" onClick={() => onChange("")} aria-label="remove media">
          <X size={11} />
        </Button>
      )}
      {err && <span className={css.demoUploadErr}>{err}</span>}
    </>
  );
}
