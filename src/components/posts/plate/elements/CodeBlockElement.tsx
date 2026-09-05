import React, { useState, useCallback, useRef, useEffect } from "react";

import type { SelectOption } from "@/types";

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";

import { showToast } from "@/stores/toastStore";

import { BlockDropZone, useBlockDrag } from "../BlockDragHandle";
import TBtn from "../TBtn";
import { formatCode, isFormattable } from "../formatCode";
import MermaidPreview from "../MermaidPreview";
import HelpButton from "@/components/ui/HelpButton";
import FloatingBar from "../toolbars/FloatingBar";
import BlockActionsMenu from "../BlockActionsMenu";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useModalStore } from "@/stores/modalStore";

import { Check, Copy, WrapText, MoreHorizontal, ChevronRight, Search, Sparkles, ExternalLink } from "@/components/icons";

import Popover from "@/components/ui/Popover";
import base from "../../RichTextEditor.module.css";
import code from "../../EditorCode.module.css";
import diagram from "../../EditorDiagram.module.css";
import media from "../../EditorMedia.module.css";
const styles = { ...base, ...code, ...diagram, ...media };
import Pressable from "@/components/ui/Pressable";
import { MermaidHelpModal } from "./MermaidHelp";

/* 코드블록 — 언어 선택기와 요소 — elements.tsx 에서 분리 (#680). */

type CodeLang = SelectOption & { terms?: string[] };

const CODE_BLOCK_LANGS: ReadonlyArray<CodeLang> = [
  { value: "plaintext", label: "Plain text", terms: ["text", "txt"] },
  { value: "actionscript", label: "ActionScript", terms: ["as", "flash"] },
  { value: "apache", label: "Apache", terms: ["apacheconf", "httpd"] },
  { value: "applescript", label: "AppleScript", terms: ["osascript"] },
  { value: "x86asm", label: "Assembly", terms: ["asm", "nasm", "x86"] },
  { value: "autohotkey", label: "AutoHotkey", terms: ["ahk"] },
  { value: "awk", label: "AWK" },
  { value: "bash", label: "Bash", terms: ["shell", "sh", "zsh"] },
  { value: "basic", label: "BASIC" },
  { value: "c", label: "C" },
  { value: "clojure", label: "Clojure", terms: ["clj"] },
  { value: "cmake", label: "CMake" },
  { value: "coffeescript", label: "CoffeeScript", terms: ["coffee"] },
  { value: "cpp", label: "C++", terms: ["c++", "cplusplus"] },
  { value: "crystal", label: "Crystal", terms: ["cr"] },
  { value: "csharp", label: "C#", terms: ["c#", "cs", "dotnet"] },
  { value: "css", label: "CSS" },
  { value: "d", label: "D" },
  { value: "dart", label: "Dart" },
  { value: "delphi", label: "Delphi / Pascal", terms: ["pascal", "object pascal"] },
  { value: "diff", label: "Diff", terms: ["patch"] },
  { value: "django", label: "Django", terms: ["jinja", "jinja2"] },
  { value: "dockerfile", label: "Dockerfile", terms: ["docker"] },
  { value: "elixir", label: "Elixir", terms: ["ex"] },
  { value: "elm", label: "Elm" },
  { value: "erlang", label: "Erlang", terms: ["erl"] },
  { value: "fortran", label: "Fortran", terms: ["f90"] },
  { value: "fsharp", label: "F#", terms: ["f#", "fs"] },
  { value: "gherkin", label: "Gherkin", terms: ["cucumber"] },
  { value: "glsl", label: "GLSL", terms: ["shader"] },
  { value: "go", label: "Go", terms: ["golang"] },
  { value: "gradle", label: "Gradle" },
  { value: "graphql", label: "GraphQL", terms: ["gql"] },
  { value: "groovy", label: "Groovy" },
  { value: "haml", label: "Haml" },
  { value: "handlebars", label: "Handlebars", terms: ["hbs", "mustache"] },
  { value: "haskell", label: "Haskell", terms: ["hs"] },
  { value: "haxe", label: "Haxe", terms: ["hx"] },
  { value: "http", label: "HTTP" },
  { value: "ini", label: "INI", terms: ["conf", "properties"] },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript", terms: ["js", "node", "jsx"] },
  { value: "json", label: "JSON" },
  { value: "julia", label: "Julia", terms: ["jl"] },
  { value: "kotlin", label: "Kotlin", terms: ["kt"] },
  { value: "latex", label: "LaTeX", terms: ["tex"] },
  { value: "less", label: "Less" },
  { value: "lisp", label: "Lisp", terms: ["commonlisp", "elisp", "clisp"] },
  { value: "livescript", label: "LiveScript", terms: ["ls"] },
  { value: "lua", label: "Lua" },
  { value: "makefile", label: "Makefile", terms: ["make"] },
  { value: "markdown", label: "Markdown", terms: ["md"] },
  { value: "mathematica", label: "Mathematica", terms: ["wolfram", "wl"] },
  { value: "matlab", label: "MATLAB" },
  { value: "mermaid", label: "Mermaid", terms: ["diagram"] },
  { value: "nginx", label: "Nginx" },
  { value: "nim", label: "Nim" },
  { value: "nix", label: "Nix" },
  { value: "objectivec", label: "Objective-C", terms: ["objc", "obj-c"] },
  { value: "ocaml", label: "OCaml", terms: ["ml"] },
  { value: "perl", label: "Perl", terms: ["pl"] },
  { value: "php", label: "PHP" },
  { value: "powershell", label: "PowerShell", terms: ["ps", "ps1"] },
  { value: "prisma", label: "Prisma" },
  { value: "prolog", label: "Prolog" },
  { value: "protobuf", label: "Protocol Buffers", terms: ["proto", "protobuf", "grpc"] },
  { value: "puppet", label: "Puppet" },
  { value: "python", label: "Python", terms: ["py"] },
  { value: "r", label: "R" },
  { value: "reasonml", label: "Reason", terms: ["re", "reason"] },
  { value: "ruby", label: "Ruby", terms: ["rb"] },
  { value: "rust", label: "Rust", terms: ["rs"] },
  { value: "scala", label: "Scala" },
  { value: "scheme", label: "Scheme" },
  { value: "scss", label: "SCSS", terms: ["sass"] },
  { value: "smalltalk", label: "Smalltalk" },
  { value: "sml", label: "Standard ML", terms: ["sml"] },
  { value: "solidity", label: "Solidity", terms: ["sol"] },
  { value: "sql", label: "SQL" },
  { value: "stylus", label: "Stylus", terms: ["styl"] },
  { value: "svelte", label: "Svelte" },
  { value: "swift", label: "Swift" },
  { value: "tcl", label: "Tcl" },
  { value: "thrift", label: "Thrift" },
  { value: "toml", label: "TOML" },
  { value: "twig", label: "Twig" },
  { value: "typescript", label: "TypeScript", terms: ["ts", "tsx"] },
  { value: "vala", label: "Vala" },
  { value: "vbnet", label: "VB.NET", terms: ["vb", "visualbasic"] },
  { value: "vbscript", label: "VBScript", terms: ["vbs"] },
  { value: "verilog", label: "Verilog", terms: ["v"] },
  { value: "vhdl", label: "VHDL" },
  { value: "vim", label: "Vim Script", terms: ["vimscript"] },
  { value: "vue", label: "Vue" },
  { value: "wasm", label: "WebAssembly", terms: ["wat"] },
  { value: "xml", label: "HTML / XML", terms: ["html", "xhtml", "svg"] },
  { value: "yaml", label: "YAML", terms: ["yml"] },
  // ── 추가 언어 (lowlight `all` 지원 = 하이라이팅 됨) ──
  { value: "ada", label: "Ada" },
  { value: "angelscript", label: "AngelScript", terms: ["asc"] },
  { value: "arduino", label: "Arduino", terms: ["ino"] },
  { value: "armasm", label: "ARM Assembly", terms: ["arm", "asm"] },
  { value: "asciidoc", label: "AsciiDoc", terms: ["adoc"] },
  { value: "autoit", label: "AutoIt", terms: ["au3"] },
  { value: "avrasm", label: "AVR Assembly", terms: ["avr", "asm"] },
  { value: "brainfuck", label: "Brainfuck", terms: ["bf"] },
  { value: "capnproto", label: "Cap'n Proto", terms: ["capnp"] },
  { value: "ceylon", label: "Ceylon" },
  { value: "coq", label: "Coq" },
  { value: "dos", label: "Batch / DOS", terms: ["bat", "cmd", "batch", "dos"] },
  { value: "dts", label: "Device Tree", terms: ["dts", "dtsi"] },
  { value: "ebnf", label: "EBNF" },
  { value: "erb", label: "ERB", terms: ["eruby", "rhtml"] },
  { value: "excel", label: "Excel", terms: ["xlsx", "formula"] },
  { value: "gcode", label: "G-code", terms: ["nc"] },
  { value: "gml", label: "GameMaker (GML)", terms: ["gamemaker"] },
  { value: "hy", label: "Hy", terms: ["hylang"] },
  { value: "llvm", label: "LLVM IR", terms: ["ll"] },
  { value: "mipsasm", label: "MIPS Assembly", terms: ["mips", "asm"] },
  { value: "moonscript", label: "MoonScript", terms: ["moon"] },
  { value: "n1ql", label: "N1QL", terms: ["couchbase"] },
  { value: "openscad", label: "OpenSCAD", terms: ["scad"] },
  { value: "pgsql", label: "PostgreSQL", terms: ["postgres", "postgresql", "psql"] },
  { value: "pony", label: "Pony" },
  { value: "processing", label: "Processing", terms: ["pde"] },
  { value: "purebasic", label: "PureBasic", terms: ["pb"] },
  { value: "q", label: "Q / kdb+", terms: ["kdb"] },
  { value: "qml", label: "QML", terms: ["qt"] },
  { value: "sas", label: "SAS" },
  { value: "scilab", label: "Scilab", terms: ["sci"] },
  { value: "smali", label: "Smali", terms: ["dalvik"] },
  { value: "stata", label: "Stata" },
  { value: "wren", label: "Wren" },
  { value: "xquery", label: "XQuery", terms: ["xq", "xqy"] },
  { value: "zephir", label: "Zephir", terms: ["zep"] },
];

// 언어별 메타 — 한글명(검색), 브랜드색·약어(아이콘 배지), popular(자주 쓰는 그룹).
const LANG_META: Record<string, { ko?: string; color?: string; abbr?: string; popular?: boolean }> = {
  javascript: { ko: "자바스크립트", color: "#f7df1e", abbr: "JS", popular: true },
  typescript: { ko: "타입스크립트", color: "#3178c6", abbr: "TS", popular: true },
  python: { ko: "파이썬", color: "#3776ab", abbr: "Py", popular: true },
  java: { ko: "자바", color: "#e76f00", abbr: "Ja", popular: true },
  cpp: { ko: "씨쁠쁠", color: "#00599c", abbr: "C+", popular: true },
  c: { ko: "씨", color: "#5c6bc0", abbr: "C", popular: true },
  csharp: { ko: "씨샵", color: "#68217a", abbr: "C#" },
  go: { ko: "고", color: "#00add8", abbr: "Go", popular: true },
  rust: { ko: "러스트", color: "#dea584", abbr: "Rs", popular: true },
  sql: { ko: "에스큐엘", color: "#e38c00", abbr: "SQL", popular: true },
  json: { ko: "제이슨", color: "#5a5a5a", abbr: "{}", popular: true },
  bash: { ko: "배시", color: "#4eaa25", abbr: "$_", popular: true },
  xml: { ko: "에이치티엠엘", color: "#e34f26", abbr: "<>", popular: true },
  css: { ko: "씨에스에스", color: "#1572b6", abbr: "CSS", popular: true },
  ruby: { ko: "루비", color: "#cc342d", abbr: "Rb" },
  php: { ko: "피에이치피", color: "#777bb4", abbr: "Php" },
  swift: { ko: "스위프트", color: "#f05138", abbr: "Sw" },
  kotlin: { ko: "코틀린", color: "#7f52ff", abbr: "Kt" },
  dart: { ko: "다트", color: "#0175c2", abbr: "Da" },
  scala: { ko: "스칼라", color: "#dc322f", abbr: "Sc" },
  haskell: { ko: "하스켈", color: "#5e5086", abbr: "Hs" },
  elixir: { ko: "엘릭서", color: "#6e4a7e", abbr: "Ex" },
  erlang: { ko: "얼랭", color: "#a90533", abbr: "Er" },
  clojure: { ko: "클로저", color: "#5881d8", abbr: "Cl" },
  lua: { ko: "루아", color: "#2c2d72", abbr: "Lu" },
  perl: { ko: "펄", color: "#39457e", abbr: "Pl" },
  r: { ko: "알", color: "#276dc3", abbr: "R" },
  julia: { ko: "줄리아", color: "#9558b2", abbr: "Jl" },
  objectivec: { ko: "오브젝티브씨", color: "#438eff", abbr: "OC" },
  scss: { ko: "에스씨에스에스", color: "#cc6699", abbr: "SC" },
  less: { ko: "레스", color: "#1d365d", abbr: "Le" },
  vue: { ko: "뷰", color: "#41b883", abbr: "Vue" },
  svelte: { ko: "스벨트", color: "#ff3e00", abbr: "Sv" },
  solidity: { ko: "솔리디티", color: "#363636", abbr: "Sol" },
  graphql: { ko: "그래프큐엘", color: "#e10098", abbr: "GQ" },
  markdown: { ko: "마크다운", color: "#5a5a5a", abbr: "Md" },
  yaml: { ko: "야믈", color: "#cb171e", abbr: "Ym" },
  toml: { ko: "토믈", color: "#9c4221", abbr: "Tm" },
  dockerfile: { ko: "도커", color: "#2496ed", abbr: "Dk" },
  nginx: { ko: "엔진엑스", color: "#009639", abbr: "Ng" },
  latex: { ko: "라텍", color: "#008080", abbr: "TeX" },
  mermaid: { ko: "머메이드", color: "#ff3670", abbr: "Mm" },
  wasm: { ko: "웹어셈블리", color: "#654ff0", abbr: "Wa" },
  fsharp: { color: "#378bba", abbr: "F#" },
  ocaml: { color: "#ec6813", abbr: "ML" },
  x86asm: { ko: "어셈블리", color: "#6e4c13", abbr: "Asm" },
  prisma: { color: "#2d3748", abbr: "Pr" },
  groovy: { color: "#4298b8", abbr: "Gr" },
  crystal: { color: "#333333", abbr: "Cr" },
  nim: { color: "#ffe953", abbr: "Nim" },
  zig: { color: "#f7a41d", abbr: "Zg" },
  arduino: { ko: "아두이노", color: "#00979d", abbr: "Ar" },
  pgsql: { ko: "포스트그레스", color: "#336791", abbr: "Pg" },
  ada: { ko: "에이다", color: "#02f88c", abbr: "Ada" },
  dos: { ko: "배치", color: "#4d4d4d", abbr: ">_" },
  erb: { ko: "이알비", color: "#cc342d", abbr: "Erb" },
  llvm: { ko: "엘엘브이엠", color: "#09627d", abbr: "LL" },
  processing: { ko: "프로세싱", color: "#006699", abbr: "Ps" },
  qml: { ko: "큐엠엘", color: "#41cd52", abbr: "QML" },
  asciidoc: { ko: "아스키닥", color: "#e40046", abbr: "Ad" },
  plaintext: { ko: "일반 텍스트", abbr: "Aa" },
};

// 한글 → 초성 (검색용). "자바" → "ㅈㅂ"
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function choseong(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) out += CHO[Math.floor((c - 0xac00) / 588)];
    else out += ch;
  }
  return out;
}
// 언어의 전체 검색 토큰 (영문 terms + 한글명 + 초성)
function langSearchTerms(l: CodeLang): string[] {
  const ko = LANG_META[l.value]?.ko;
  return [
    l.value, l.label.toLowerCase(),
    ...(l.terms ?? []),
    ...(ko ? [ko, choseong(ko)] : []),
  ];
}
// 언어 아이콘 배지 — 브랜드색 + 약어. 색 없으면 중립 배지.
function LangIcon({ value, label }: SelectOption) {
  const meta = LANG_META[value];
  const abbr = meta?.abbr ?? (label.replace(/[^A-Za-z0-9#+.]/g, "").slice(0, 2) || "?");
  if (!meta?.color) {
    return <span className={`${styles.codeLangIcon} ${styles.codeLangIconPlain}`}>{abbr}</span>;
  }
  const c = meta.color.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return <span className={styles.codeLangIcon} style={{ background: meta.color, color: lum > 0.6 ? "#1a1a1a" : "#fff" }}>{abbr}</span>;
}

// ── 최근 사용 언어 (localStorage, 최대 5개, value 저장) ──
const RECENT_LANG_KEY = "code-lang-recent";
function readRecentLangs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_LANG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch { return []; }
}
function pushRecentLang(value: string) {
  if (!value || value === "plaintext") return; // 기본값(plaintext)은 최근에 안 쌓음
  try {
    const cur = readRecentLangs().filter((v) => v !== value);
    cur.unshift(value);
    localStorage.setItem(RECENT_LANG_KEY, JSON.stringify(cur.slice(0, 5)));
  } catch { /* noop */ }
}

// 검색 정확도 점수 — 높을수록 우선(-1=미매치). 동점은 호출부에서 label 철자순 tie-break.
// 완전일치 > 별칭 완전일치 > 이름 접두 > 별칭/한글/초성 접두 > 부분 포함
function scoreLang(l: CodeLang, ql: string): number {
  const label = l.label.toLowerCase();
  const value = l.value.toLowerCase();
  if (value === ql || label === ql) return 100;
  let best = -1;
  if (value.startsWith(ql) || label.startsWith(ql)) best = 80;
  for (const term of langSearchTerms(l)) {
    if (term === ql) best = Math.max(best, 90);
    else if (term.startsWith(ql)) best = Math.max(best, 60);
    else if (term.includes(ql)) best = Math.max(best, 30);
  }
  return best;
}

// ── 공통 코드블록 언어 피커 — 트리거(현재 언어) + Popover(검색·최근·자주 쓰는·A–Z). 유일한 언어 선택 UI. ──
function CodeLangPicker({ value, onChange, language }: { value: string; onChange: (v: string) => void; language: string }) {
  const curLabel = CODE_BLOCK_LANGS.find((l) => l.value === value)?.label ?? "Plain text";
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-start" contentClassName={styles.codeMenuPopover}
      trigger={
        <Pressable noTapScale
          className={styles.codeLangTrigger}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          aria-label={language === "ko" ? "언어 선택" : "Select language"}
        >
          <LangIcon value={value} label={curLabel} />
          <span className={styles.codeLangName}>{curLabel}</span>
          {/* 초기 > (오른쪽), 펼치면 90° 시계방향 회전 → 아래 */}
          <ChevronRight size={12} className={`${styles.codeLangCaret}${open ? ` ${styles.codeLangCaretOpen}` : ""}`} />
        </Pressable>
      }
    >
      {({ close }) => <CodeLangPickerBody value={value} onChange={onChange} language={language} close={close} />}
    </Popover>
  );
}

function CodeLangPickerBody({ value, onChange, language, close }: { value: string; onChange: (v: string) => void; language: string; close: () => void }) {
  const ko = language === "ko";
  const L = (k: string, e: string) => (ko ? k : e);
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const searching = ql.length > 0;
  const recentVals = React.useMemo(() => readRecentLangs(), []); // popover 열릴 때 1회 스냅샷
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [activeLetter, setActiveLetter] = useState("");
  const [railVisible, setRailVisible] = useState(false); // A–Z 영역에 들어왔을 때만 인덱스 노출
  const [active, setActive] = useState(0); // 화살표 네비게이션 활성 항목(플랫 인덱스)
  const pick = (v: string) => { onChange(v); pushRecentLang(v); close(); };

  // 리스트 스크롤 → 현재 위치 알파벳 계산 + A–Z 영역 진입 여부(그때만 인덱스 노출)
  const syncActive = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const anchors = Array.from(list.querySelectorAll<HTMLElement>("[data-letter]"));
    if (!anchors.length) { setRailVisible(false); return; }
    const firstTop = anchors[0].offsetTop;
    setRailVisible(list.scrollTop + list.clientHeight * 0.35 >= firstTop); // A–Z 그룹이 화면에 들어옴
    // 맨 아래까지 스크롤하면 마지막 글자(Z 등)를 active 로 — 안 그러면 하단 섹션이 감지선을 못 넘어 마지막 글자에 못 닿음
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
    let cur = anchors[0].dataset.letter || "";
    if (atBottom) {
      cur = anchors[anchors.length - 1].dataset.letter || cur;
    } else {
      const y = list.scrollTop + 44;
      anchors.forEach((a) => { if (a.offsetTop <= y) cur = a.dataset.letter || cur; });
    }
    setActiveLetter((p) => (p === cur ? p : cur));
  }, []);
  // activeLetter 바뀌면 rail 을 그 글자가 중앙에 오도록 스크롤(룰렛 회전)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !activeLetter) return;
    const btn = rail.querySelector<HTMLElement>(`[data-rail-letter="${activeLetter}"]`);
    if (btn) rail.scrollTo({ top: btn.offsetTop - rail.clientHeight / 2 + btn.clientHeight / 2, behavior: "smooth" });
  }, [activeLetter]);
  // 브라우징 진입 시 1회 동기화(초기 active/visible)
  useEffect(() => { if (!searching) syncActive(); }, [searching, syncActive]);
  // 검색어/모드 바뀌면 활성 항목을 맨 위로 리셋
  useEffect(() => { setActive(0); }, [ql]);
  // 활성 항목이 바뀌면 리스트가 자동으로 스크롤돼 항상 보이게(scrollIntoView)
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, ql]);
  // idx: 화살표 네비게이션용 플랫 인덱스, dataLetter: A–Z 그룹 첫 항목 앵커(rail 점프용)
  const renderItem = (l: CodeLang, idx: number, dataLetter?: string) => (
    <Pressable noTapScale key={l.value} className={styles.codeMenuItem} data-idx={idx} data-letter={dataLetter}
      data-active={idx === active ? "" : undefined} onMouseMove={() => setActive(idx)} onClick={() => pick(l.value)}>
      <LangIcon value={l.value} label={l.label} />
      <span className={styles.codeLangName}>{l.label}</span>
      {value === l.value && <Check size={13} className={styles.codeMenuTrailing} />}
    </Pressable>
  );

  let body: React.ReactNode;
  const azLetters: string[] = [];
  let items: CodeLang[] = []; // 화살표 네비게이션 대상(렌더 순서대로 플랫)
  if (searching) {
    // 검색: 정확도순 정렬 + 동점은 철자순, 그룹 없이 플랫
    const scored = CODE_BLOCK_LANGS
      .map((l) => ({ l, s: scoreLang(l, ql) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.l.label.localeCompare(b.l.label));
    items = scored.map((x) => x.l);
    body = items.length
      ? items.map((l, i) => renderItem(l, i))
      : <div className={styles.codeMenuEmpty}>{L("결과 없음", "No results")}</div>;
  } else {
    // 브라우징: 최근 → 자주 쓰는 → A–Z(철자순 + 알파벳 인덱스)
    const recentSet = new Set(recentVals);
    const recent = recentVals
      .map((v) => CODE_BLOCK_LANGS.find((l) => l.value === v))
      .filter((l): l is CodeLang => !!l);
    const popular = CODE_BLOCK_LANGS.filter((l) => LANG_META[l.value]?.popular && !recentSet.has(l.value));
    const rest = CODE_BLOCK_LANGS
      .filter((l) => !LANG_META[l.value]?.popular && !recentSet.has(l.value))
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    items = [...recent, ...popular, ...rest];
    const baseAz = recent.length + popular.length;
    // 첫 글자(A–Z, 그 외는 "#") 그룹 — 각 그룹 첫 항목에만 data-letter 앵커
    const letterOf = (label: string) => { const c = (label[0] || "#").toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };
    let lastLetter = "";
    const azNodes = rest.map((l, i) => {
      const letter = letterOf(l.label);
      const isFirst = letter !== lastLetter;
      if (isFirst) { azLetters.push(letter); lastLetter = letter; }
      return renderItem(l, baseAz + i, isFirst ? letter : undefined);
    });
    body = (
      <>
        {recent.length > 0 && (<><div className={styles.codeMenuGroupLabel}>{L("최근", "Recent")}</div>{recent.map((l, i) => renderItem(l, i))}</>)}
        {popular.length > 0 && (<><div className={styles.codeMenuGroupLabel}>{L("자주 쓰는", "Popular")}</div>{popular.map((l, i) => renderItem(l, recent.length + i))}</>)}
        <div className={styles.codeMenuGroupLabel}>{L("A–Z", "A–Z")}</div>
        {azNodes}
      </>
    );
  }
  // 화살표 네비게이션 — active 이동 + Enter 선택
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { const it = items[active]; if (it) { e.preventDefault(); pick(it.value); } }
  };

  // 알파벳 인덱스 클릭 → 해당 글자 첫 항목으로 리스트 스크롤(한 번에 이동) + 인덱스 갱신
  const jumpTo = (letter: string) => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    // sticky "A–Z" 그룹 라벨 높이만큼 빼서 항목이 라벨 아래로 노출되게
    if (el) { list.scrollTop = Math.max(0, el.offsetTop - 30); setActiveLetter(letter); setRailVisible(true); }
  };

  return (
    <div className={styles.codeMenu} onKeyDown={onMenuKeyDown}>
      <div className={styles.codeMenuSearch}>
        <Search size={13} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L("언어 검색 (java, 자바, ㅈㅂ)", "Search (java, 자바, ㅈㅂ)")}
          spellCheck={false}
        />
      </div>
      {searching ? (
        <div className={styles.codeMenuLangList}>
          {/* 검색 결과는 정확도순 — Hint 표시 */}
          <div className={styles.codeMenuHint}>{L("정확도순 정렬", "Sorted by relevance")}</div>
          {body}
        </div>
      ) : (
        <div className={styles.codeMenuBrowse}>
          {/* 왼쪽 알파벳 인덱스 — 룰렛(위아래 그라데이션 마스크 + 현재 글자 중앙 정렬, circle indicator).
              A–Z 영역에 들어왔을 때만 노출. 클릭 시 해당 글자로 점프. */}
          {azLetters.length > 1 && (
            <div className={styles.codeAzRail} ref={railRef} data-visible={railVisible ? "" : undefined} aria-hidden={!railVisible}>
              {azLetters.map((lt) => (
                <Pressable noTapScale key={lt} data-rail-letter={lt} data-active={lt === activeLetter ? "" : undefined}
                  className={styles.codeAzLetter} tabIndex={railVisible ? 0 : -1}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => jumpTo(lt)}>{lt}</Pressable>
              ))}
            </div>
          )}
          <div className={styles.codeMenuLangList} ref={listRef} onScroll={syncActive}>{body}</div>
        </div>
      )}
    </div>
  );
}

export function CodeBlockElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { t, language } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const [uiFocused, setUiFocused] = useState(false); // 컨트롤(popover 등) 상호작용 시 바 유지
  const el = props.element as Record<string, unknown>;
  const wrap = (el.wrap as boolean) ?? false;
  const lang = el.lang as string | undefined;
  const isMermaid = lang === "mermaid";
  /* 그래프 블록 뷰 — 코드만 / 다이어그램만 / 나란히(split).
     **노드에 저장한다**(로컬 state 아님). 의도가 다른 두 경우를 갈라야 하기 때문:
       · 다이어그램을 직접 추가(슬래시/툴바) → 삽입할 때 graphView:"split" 을 박아 넣는다 → 나란히
       · 코드블록에 mermaid 를 쓰거나 붙여넣어 lang 만 mermaid 가 된 경우 → graphView 없음 → 코드만
     로컬 state 로는 이 둘이 구분이 안 돼서, 기본 split 이면 코드블록이 제멋대로 다이어그램이 되고
     기본 code 면 다이어그램을 추가해도 코드만 보였다.
     덤으로 사용자가 고른 뷰가 저장되고 다시 열어도 유지된다. */
  const graphView = ((el.graphView as "code" | "diagram" | "split") ?? "split");
  /* **다이어그램 블록인가**는 lang 이 아니라 graphView 유무로 정한다.
     다이어그램 블록은 code_block + lang:"mermaid" 로 구현돼 있어서 lang 만으로 가르면,
     코드블록에서 mermaid 를 고르거나 붙여넣기로 감지되는 순간 언어 피커가 뷰 토글로 바뀌고
     그래프까지 떠서 사실상 블록 종류가 바뀌어 버린다.
     → graphView 는 "다이어그램으로 추가했다"는 의도 표시다. 슬래시/툴바로 삽입할 때만 박힌다.
       lang:"mermaid" 만 있는 코드블록은 mermaid **하이라이팅만** 받고 코드블록으로 남는다. */
  const isDiagram = isMermaid && el.graphView != null;
  const showCode = !isDiagram || graphView !== "diagram";
  const showDiagram = isDiagram && graphView !== "code";
  const isSplit = isDiagram && graphView === "split";
  // split 시 코드/그래프 폭 비율(%) — 가운데 핸들 드래그로 조절
  const [splitPct, setSplitPct] = useState(50);
  const splitRef = useRef<HTMLDivElement>(null);
  const onSplitHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  /* 빈 코드블록 판정. 자식이 code_line 이 아니라 raw 텍스트인 깨진 구조(→ plugins/code-block-kit 의
     CodeBlockStructureKit 참고)에서도 오판하지 않게 텍스트 노드도 같이 본다.
     예전엔 line.children 만 봐서, 텍스트 자식이면 undefined → "비었다"로 판정 →
     글자가 멀쩡히 있는데 placeholder 가 겹쳐 보였다. */
  const isEmpty = !el.children || (el.children as Array<{ text?: string; children?: Array<{ text?: string }> }>).every(
    (line) => !(line.text && line.text.length > 0)
      && !line.children?.some((leaf) => leaf.text && leaf.text.length > 0),
  );
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const setGraphView = (v: "code" | "diagram" | "split") => {
    if (elPath) editor.tf.setNodes({ graphView: v }, { at: elPath });
  };
  const { blockDragProps } = useBlockDrag(elPath);
  // 코드블록 위에 뜨는 floating bar 앵커 — 코드블록 DOM(pre) rect
  const getAnchorRect = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dom = editor.api.toDOMNode(props.element as any);
      return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
    } catch { return new DOMRect(); }
  };
  // code_line 들을 \n 으로 join (api.string 은 줄바꿈을 안 넣음 → mermaid 파싱 실패)
  const mermaidSource = isDiagram
    ? ((el.children as Array<{ children?: Array<{ text?: string }> }>) || [])
        .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
        .join("\n")
    : "";

  const toggleWrap = () => {
    if (elPath) editor.tf.setNodes({ wrap: !wrap }, { at: elPath });
  };

  // ── 코드블록 "..." 메뉴 액션 핸들러 ──
  const getCodeText = () =>
    ((el.children as Array<{ children?: Array<{ text?: string }> }>) || [])
      .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
      .join("\n");
  const handleCopy = () => {
    navigator.clipboard?.writeText(getCodeText());
    showToast(language === "ko" ? "코드 복사됨" : "Code copied", "success");
  };
  const setLang = (v: string) => {
    if (elPath) editor.tf.setNodes({ lang: v }, { at: elPath });
  };
  // 깊은 복제 시 Plate id 충돌 방지 — id 재귀 제거(normalize 가 새 id 부여)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripIds = (n: any): any => {
    if (Array.isArray(n)) return n.map(stripIds);
    if (n && typeof n === "object") {
      const { id: _id, ...rest } = n as Record<string, unknown>;
      void _id;
      if ("children" in rest) rest.children = stripIds(rest.children);
      return rest;
    }
    return n;
  };
  const handleDuplicate = () => {
    if (!elPath) return;
    const nextPath = [...elPath.slice(0, -1), elPath[elPath.length - 1] + 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { editor.tf.insertNodes(stripIds(props.element) as any, { at: nextPath }); } catch { /* noop */ }
  };
  const handleMoveUp = () => {
    if (!elPath) return;
    const i = elPath[elPath.length - 1];
    if (i <= 0) return;
    try { editor.tf.moveNodes({ at: elPath, to: [...elPath.slice(0, -1), i - 1] }); } catch { /* noop */ }
  };
  const handleMoveDown = () => {
    if (!elPath) return;
    const i = elPath[elPath.length - 1];
    try { editor.tf.moveNodes({ at: elPath, to: [...elPath.slice(0, -1), i + 1] }); } catch { /* noop */ }
  };
  const handleDelete = () => {
    if (!elPath) return;
    try { editor.tf.removeNodes({ at: elPath }); } catch { /* noop */ }
  };
  /* 내용 제거 — 블록 노드는 **그대로 두고** 안의 텍스트만 지운다.
     예전엔 removeNodes + insertNodes 로 블록을 통째로 갈아치웠는데, removeNodes 가 selection 을
     날려서 커서가 이전 형제 블록으로 튕겨나갔다. 그 상태로 붙여넣으면 Plate 의 코드블록 붙여넣기
     핸들러가 `api.block()` 이 code_line 이 아니라며 건너뛰고 기본 붙여넣기로 떨어져서,
     내용이 코드블록이 아니라 엉뚱한 블록에 꽂히고 코드블록은 빈 채(=placeholder 그대로) 남았다.
     노드를 유지하면 lang/wrap/graphView 도 자동으로 보존된다. */
  const handleClear = () => {
    if (!elPath) return;
    try {
      const start = editor.api.start(elPath);
      const end = editor.api.end(elPath);
      if (start && end) editor.tf.delete({ at: { anchor: start, focus: end } });
      // 커서를 블록 안에 되돌려 놓는다 — 지운 직후 바로 붙여넣기/타이핑이 이어지므로.
      const caret = editor.api.start(elPath);
      if (caret) editor.tf.select(caret);
    } catch { /* noop */ }
  };
  // 코드 포맷팅 — Prettier 지연 로딩. 코드블록 전체를 포맷 결과(code_line 들)로 교체.
  const handleFormat = async () => {
    if (!elPath || !lang) return;
    const code = getCodeText();
    if (!code.trim()) return;
    try {
      const out = await formatCode(lang, code);
      if (out === code) {
        showToast(language === "ko" ? "이미 포맷되어 있습니다." : "Already formatted.", "info");
        return;
      }
      const lineType = ((el.children as Array<{ type?: string }>)[0]?.type as string) || "code_line";
      const codeType = (el.type as string) || "code_block";
      const newChildren = out.split("\n").map((line) => ({ type: lineType, children: [{ text: line }] }));
      editor.tf.withoutNormalizing(() => {
        editor.tf.removeNodes({ at: elPath });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.insertNodes({ type: codeType, ...(lang ? { lang } : {}), ...(wrap ? { wrap } : {}), children: newChildren } as any, { at: elPath });
      });
      showToast(language === "ko" ? "코드 포맷팅 완료" : "Code formatted", "success");
    } catch {
      showToast(language === "ko" ? "포맷팅에 실패했습니다 — 문법 오류일 수 있습니다." : "Format failed — check syntax.", "error");
    }
  };

  return (
    <BlockDropZone path={elPath}>
    {/* 언어 변경 시 code-syntax 재decoration 으로 leaf 의 hook 구조가 바뀌어 React hook 순서 에러 →
        lang 을 key 로 줘서 변경 시 subtree 를 새로 마운트(leaf 를 fresh 하게)해 비교 자체를 피한다. */}
    <div key={`cb-${lang ?? "plaintext"}`} {...blockDragProps} style={{ cursor: "default" }}>
    {/* 코드블록 floating bar — 선택/포커스 시 코드블록 위에 뜸(다른 블록과 동일 패턴).
        줄바꿈·복사는 항상, 포맷/다이어그램 컨트롤은 조건부, ⋯ 는 블록 관리. keepInView 로 스크롤 추적. */}
    <FloatingBar open={selected || uiFocused} getAnchorRect={getAnchorRect} inline keepInView
      onFocusCapture={() => setUiFocused(true)}
      onBlurCapture={() => setUiFocused(false)}>
      {/* 언어 선택 — 일반 코드블록(다이어그램은 mermaid 고정이라 대신 뷰 토글). */}
      {!isDiagram && (
        <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "inline-flex", marginRight: "var(--spacing-3xs)" }}>
          <CodeLangPicker value={lang ?? "plaintext"} onChange={setLang} language={language} />
        </span>
      )}
      {/* 다이어그램 뷰 토글(코드/다이어그램/스플릿) — 다이어그램 블록에서만. */}
      {isDiagram && (
        <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "inline-flex", marginRight: "var(--spacing-3xs)" }}>
          <SegmentedControl<"code" | "diagram" | "split">
            items={[
              { value: "code", label: language === "ko" ? "코드" : "Code" },
              { value: "diagram", label: language === "ko" ? "다이어그램" : "Diagram" },
              { value: "split", label: language === "ko" ? "스플릿" : "Split" },
            ]}
            value={graphView}
            onChange={setGraphView}
            size="sm"
          />
        </span>
      )}
      {isFormattable(lang) && (
        <TBtn onClick={handleFormat} tooltip={language === "ko" ? "포맷" : "Format"}>
          <span className={styles.tblBarLabel}><Sparkles size={15} strokeWidth={1.75} />{language === "ko" ? "포맷" : "Format"}</span>
        </TBtn>
      )}
      {/* 줄바꿈 · 복사 — 모든 코드블록에서 항상(창 헤더와 별개로 floating 바에도) */}
      <TBtn active={wrap} onClick={toggleWrap} tooltip={language === "ko" ? "줄바꿈" : "Wrap"}>
        <span className={styles.tblBarLabel}><WrapText size={15} strokeWidth={1.75} />{language === "ko" ? "줄바꿈" : "Wrap"}</span>
      </TBtn>
      <TBtn square onClick={handleCopy} tooltip={language === "ko" ? "코드 복사" : "Copy code"}>
        <Copy size={15} strokeWidth={1.75} />
      </TBtn>
      {isDiagram && (
        <>
          <HelpButton
            size="sm"
            soundDisabled
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => openModal(<MermaidHelpModal language={language} />, {
              header: {
                title: language === "ko" ? "Mermaid 문법 도움말" : "Mermaid syntax help",
                actions: (
                  <a className={styles.mermaidHelpLink} href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">
                    {language === "ko" ? "전체 문서 보기" : "Full documentation"} <ExternalLink size={12} />
                  </a>
                ),
              },
              width: "min(56rem, 94vw)",
            })}
            aria-label={language === "ko" ? "Mermaid 문법 도움말" : "Mermaid syntax help"}
          />
        </>
      )}
      <Popover
        openOnHover
        placement="bottom-end"
        contentClassName={styles.codeMenuPopover}
        trigger={
          <TBtn square tooltip={language === "ko" ? "더보기" : "More"}>
            <MoreHorizontal size={15} strokeWidth={1.75} />
          </TBtn>
        }
      >
        {({ close }) => (
          <BlockActionsMenu
            close={close}
            language={language}
            actions={{
              onDuplicate: handleDuplicate,
              onMoveUp: handleMoveUp,
              onMoveDown: handleMoveDown,
              onClear: handleClear,
              onDelete: handleDelete,
            }}
          />
        )}
      </Popover>
    </FloatingBar>
    {isDiagram ? (
      /* mermaid: 뷰 토글에 따라 코드/다이어그램/나란히. split 은 코드·그래프가 같은 컨테이너(동일 높이)에
         좌우로 들어가고 가운데 핸들로 폭 비율 조절(넓으면 좌우, 좁으면 위아래로 스택). */
      <div
        className={isSplit ? styles.graphSplit : showCode ? styles.graphCodeShell : undefined}
        ref={splitRef}
        style={isSplit ? ({ ["--split-pct" as string]: `${splitPct}%` } as React.CSSProperties) : undefined}
      >
        <PlateElement
          {...props}
          as="pre"
          className={isSplit ? styles.graphSplitCode : undefined}
          style={{
            ...props.style,
            position: "relative",
            ...(showCode ? {} : { display: "none" }),
            /* code-only 뷰: 마진은 graphCodeShell 이 갖고 pre 는 shell 을 꽉 채운다(오버레이 정렬용). resize 는 CSS(.slate-code_block)가 부여. */
            ...(isSplit ? { minWidth: 0, margin: 0, maxHeight: "none", resize: "none" } : { margin: 0 }),
          }}
        >
          <code
            data-code-placeholder={isEmpty ? t("editor.codeEnter") : undefined}
            style={{ position: "relative", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-all" : undefined }}
          >
            {props.children}
          </code>
        </PlateElement>
        {/* code-only 뷰 리사이즈 오버레이 — pre(.slate-code_block)의 형제로 네이티브 resizer 위에 얹혀
            시스템 커서를 가린다(일반 코드블록 codeShell·리더 code-block-outer 와 동일). */}
        {showCode && !isSplit && (
          <div
            className={styles.codeResizeHandle}
            contentEditable={false}
            data-cursor="resizeV"
            aria-hidden
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // resize 는 pre(.slate-code_block)가 가진다 — 오버레이는 pre 의 형제(previousElementSibling).
              const pre = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
              if (!pre) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              const startY = e.clientY;
              const startH = pre.offsetHeight;
              const onMove = (ev: PointerEvent) => {
                pre.style.height = `${Math.max(80, Math.min(window.innerHeight * 0.8, startH + (ev.clientY - startY)))}px`;
                pre.style.maxHeight = "none";
              };
              const onUp = () => {
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
              };
              document.addEventListener("pointermove", onMove);
              document.addEventListener("pointerup", onUp);
            }}
          />
        )}
        {isSplit && showDiagram && (
          <div className={styles.graphSplitHandle} contentEditable={false} role="separator" aria-label="resize"
            data-cursor="resizeH"
            onMouseDown={(e) => e.stopPropagation()} onPointerDown={onSplitHandleDown}>
            <span className={styles.graphSplitHandleBar} />
          </div>
        )}
        {showDiagram && <MermaidPreview code={mermaidSource} split={isSplit} />}
      </div>
    ) : (
      /* 일반 코드블록 = 리더뷰와 같은 창(신호등 헤더 + 코드). WYSIWYG.
         언어(인터랙티브 피커)·복사·줄바꿈은 헤더 인라인 바로. 헤더는 contentEditable=false 로 Slate 밖.
         codeShell 은 리사이즈 오버레이가 창의 형제가 되게 하는 바깥 컨테이너(리더 .code-block-outer 와 동일). */
      <div className={styles.codeShell}>
      <div className={styles.codeWindow}>
        <div className={styles.codeBar} contentEditable={false} onMouseDown={(e) => e.stopPropagation()}>
          <span className={styles.codeBarLang} onMouseDown={(e) => e.stopPropagation()}>
            <CodeLangPicker value={lang ?? "plaintext"} onChange={setLang} language={language} />
          </span>
          <div className={styles.codeBarControls}>
            <Pressable noTapScale
              className={styles.codeBarCtrl}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(); }}
              aria-label={language === "ko" ? "코드 복사" : "Copy code"}
            >
              <Copy size={12} />{language === "ko" ? "복사" : "Copy"}
            </Pressable>
            <Pressable noTapScale
              className={styles.codeBarCtrl}
              data-on={wrap ? "" : undefined}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleWrap(); }}
            >
              <WrapText size={12} />{language === "ko" ? "줄바꿈" : "Wrap"}
            </Pressable>
          </div>
        </div>
        {/* placeholder 는 DOM 노드가 아니라 ::before 로 그린다(globals/_hljs.css) — Slate 경로 매핑이 어긋나지 않게. */}
        <PlateElement {...props} as="pre" style={{ ...props.style, position: "relative" }}>
          <code
            data-code-placeholder={isEmpty ? t("editor.codeEnter") : undefined}
            style={{ position: "relative", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-all" : undefined }}
          >
            {props.children}
          </code>
        </PlateElement>
        </div>
        {/* 커스텀 세로 리사이즈 핸들 — 창(codeWindow)의 형제(codeShell 안). 창의 자식이면 UA resizer 가
            오버레이 위에 그려져 시스템 커서가 샌다. data-cursor 로 커스텀 커서, cursor:none 로 시스템 커서 숨김. */}
        <div
          className={styles.codeResizeHandle}
          contentEditable={false}
          data-cursor="resizeV"
          aria-hidden
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // resize 는 창(codeWindow)이 가진다 — 오버레이는 창의 형제(previousElementSibling)라 창의 네이티브 resizer 위에 얹힌다.
            const win = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
            if (!win) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const startY = e.clientY;
            const startH = win.offsetHeight;
            const onMove = (ev: PointerEvent) => {
              win.style.height = `${Math.max(128, Math.min(window.innerHeight * 0.8, startH + (ev.clientY - startY)))}px`;
              win.style.maxHeight = "none";
            };
            const onUp = () => {
              document.removeEventListener("pointermove", onMove);
              document.removeEventListener("pointerup", onUp);
            };
            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", onUp);
          }}
        />
      </div>
    )}
    </div>
    </BlockDropZone>
  );
}

// ── Paragraph 엘리먼트 (todo 체크박스 렌더링 + 블록 드롭 존) ──
// 빈 블록인지 (단일 빈 텍스트 노드) — placeholder 표시 판단용
