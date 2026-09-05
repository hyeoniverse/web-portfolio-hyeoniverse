import React, { useState, useRef, useEffect, useMemo } from "react";


import { showToast } from "@/stores/toastStore";

import MermaidPreview from "../MermaidPreview";

import { lowlight } from "../lowlightInstance";

import SegmentedControl from "@/components/ui/SegmentedControl";

import { Copy, ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2 } from "@/components/icons";
import { createPortal } from "react-dom";

import base from "../../RichTextEditor.module.css";
import code from "../../EditorCode.module.css";
import diagram from "../../EditorDiagram.module.css";
import media from "../../EditorMedia.module.css";
const styles = { ...base, ...code, ...diagram, ...media };
import Pressable from "@/components/ui/Pressable";

/* mermaid 도움말 — 예제 목록과 모달 — elements.tsx 에서 분리 (#680). */

function MermaidExample({ label, code, wide, ko, onCopy }: { label: string; code: string; wide?: boolean; ko: boolean; onCopy: (c: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const clamp = (z: number) => Math.min(3, Math.max(0.5, Math.round(z * 10) / 10));
  // 롱프레스로 연속 확대/축소 — 누르면 즉시 1회, 계속 누르면 반복
  const repeat = useRef<{ t1: ReturnType<typeof setTimeout> | null; iv: ReturnType<typeof setInterval> | null }>({ t1: null, iv: null });
  const stopRepeat = () => {
    if (repeat.current.t1) clearTimeout(repeat.current.t1);
    if (repeat.current.iv) clearInterval(repeat.current.iv);
    repeat.current = { t1: null, iv: null };
  };
  const startRepeat = (fn: () => void) => {
    stopRepeat();
    fn();
    repeat.current.t1 = setTimeout(() => { repeat.current.iv = setInterval(fn, 90); }, 350);
  };
  useEffect(() => () => stopRepeat(), []);
  // 드래그로 차트 이동(pan) — 스크롤 위치 조작. 인라인/전체화면 두 뷰포트 공용(currentTarget 기준).
  const viewportRef = useRef<HTMLDivElement>(null);
  const fsViewportRef = useRef<HTMLDivElement>(null);
  const dragEl = useRef<HTMLElement | null>(null);
  const drag = useRef({ active: false, x: 0, y: 0, sl: 0, st: 0 });
  const onPanDown = (e: React.PointerEvent) => {
    const vp = e.currentTarget as HTMLElement;
    dragEl.current = vp;
    drag.current = { active: true, x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
    vp.setPointerCapture?.(e.pointerId);
  };
  const onPanMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const vp = dragEl.current; if (!vp) return;
    vp.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
    vp.scrollTop = drag.current.st - (e.clientY - drag.current.y);
  };
  const onPanUp = (e: React.PointerEvent) => {
    drag.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const focus = () => { setZoom(1); [viewportRef.current, fsViewportRef.current].forEach((vp) => { if (vp) { vp.scrollLeft = 0; vp.scrollTop = 0; } }); };

  // 컨트롤 버튼(축소/배율/확대/포커스/전체화면 토글) — 인라인·전체화면 공용. fs 면 전체화면 버튼→축소.
  const ctrlButtons = (fs: boolean) => (
    <>
      <Pressable noTapScale className={styles.mermaidHelpIconBtn} title={ko ? "축소 (길게 눌러 연속)" : "Zoom out (hold)"}
        onPointerDown={() => startRepeat(() => setZoom((z) => clamp(z - 0.2)))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}><ZoomOut size={14} /></Pressable>
      <span className={styles.mermaidHelpZoomVal}>{Math.round(zoom * 100)}%</span>
      <Pressable noTapScale className={styles.mermaidHelpIconBtn} title={ko ? "확대 (길게 눌러 연속)" : "Zoom in (hold)"}
        onPointerDown={() => startRepeat(() => setZoom((z) => clamp(z + 0.2)))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}><ZoomIn size={14} /></Pressable>
      <Pressable noTapScale className={styles.mermaidHelpIconBtn} title={ko ? "포커스(초기화)" : "Focus (reset)"} onClick={focus}><Maximize size={14} /></Pressable>
      <Pressable noTapScale className={styles.mermaidHelpIconBtn} title={fs ? (ko ? "전체화면 종료 (Esc)" : "Exit fullscreen (Esc)") : (ko ? "전체화면" : "Fullscreen")} onClick={() => setFull(!fs)}>{fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</Pressable>
    </>
  );
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setFull(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <div className={`${styles.mermaidHelpExample}${wide ? ` ${styles.mermaidHelpExampleWide}` : ""}`}>
      <div className={styles.mermaidHelpLabelRow}>
        <div className={styles.mermaidHelpLabel}>{label}</div>
        <Pressable noTapScale className={styles.mermaidHelpCopy} onClick={() => onCopy(code)}><Copy size={13} />{ko ? "코드 복사" : "Copy code"}</Pressable>
      </div>
      <div className={styles.mermaidHelpExampleBody}>
        <MermaidCode code={code} className={styles.mermaidHelpCode} />
        {/* 차트 컨테이너 — 우상단에 확대/축소/전체화면 컨트롤(스크롤에 안 딸려가게 뷰포트 밖) */}
        <div className={styles.mermaidHelpDiagramWrap}>
          <div className={styles.mermaidHelpDiagramCtrls}>
            {ctrlButtons(false)}
          </div>
          <div className={styles.mermaidHelpDiagram} ref={viewportRef}
            onPointerDown={onPanDown} onPointerMove={onPanMove} onPointerUp={onPanUp} onPointerCancel={onPanUp}>
            <div className={styles.mermaidHelpZoomInner} style={{ transform: `scale(${zoom})` }}>
              <MermaidPreview code={code} />
            </div>
          </div>
        </div>
      </div>
      {full && createPortal(
        <div className={styles.mermaidHelpFsOverlay}>
          <div className={styles.mermaidHelpFsBar}>
            <span className={styles.mermaidHelpFsTitle}>{label}</span>
            {/* X 대신 인라인과 동일한 툴바 — 전체화면 버튼만 축소로 전환 */}
            <div className={styles.mermaidHelpFsCtrls}>
              {ctrlButtons(true)}
            </div>
          </div>
          <div className={`${styles.mermaidHelpFsBody} ${styles.mermaidHelpFsViewport}`} ref={fsViewportRef}
            onPointerDown={onPanDown} onPointerMove={onPanMove} onPointerUp={onPanUp} onPointerCancel={onPanUp}>
            <div className={styles.mermaidHelpZoomInner} style={{ transform: `scale(${zoom})` }}>
              <MermaidPreview code={code} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** mermaid 문법 도움말 (공통 Modal 콘텐츠) — 각 예시를 코드 + 실제 렌더 그래프로 나란히 보여준다. */
/* lowlight(hast) → React. mermaid 문법은 lowlightInstance 에서 등록해 둔다.
   도움말의 예제/치트시트도 에디터 코드블록과 **같은 팔레트**(globals/_hljs.css)를 쓰게 하려고
   같은 hljs-* 클래스를 그대로 내보낸다 — 여기서 색을 따로 정의하면 셋째 팔레트가 또 생긴다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hastToReact(node: any, i: number): React.ReactNode {
  if (node.type === "text") return node.value;
  const cls = (node.properties?.className || []).join(" ") || undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <span key={i} className={cls}>{(node.children || []).map((c: any, j: number) => hastToReact(c, j))}</span>;
}

/** mermaid 코드 — 하이라이팅해서 보여준다. 문법을 못 읽으면 평문 그대로(색만 없음). */
function MermaidCode({ code, className, inline }: { code: string; className?: string; inline?: boolean }) {
  const nodes = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (lowlight.highlight("mermaid", code).children as any[]).map((n, i) => hastToReact(n, i));
    } catch { return null; }
  }, [code]);
  const body = <code>{nodes ?? code}</code>;
  return inline ? body : <pre className={className}>{body}</pre>;
}

export function MermaidHelpModal({ language }: { language: string }) {
  const ko = language === "ko";
  type MRule = { code: string; desc: string };
  type MType = { key: string; label: string; intro: string; example: string; wide?: boolean; rules: MRule[]; advanced: MRule[] };
  const TYPES: MType[] = ko ? [
    {
      key: "flowchart", label: "플로우차트",
      intro: "순서도·프로세스·의사결정 흐름을 표현합니다.",
      example: "graph TD\n  A[시작] --> B{조건}\n  B -->|예| C[처리]\n  B -->|아니오| D[종료]",
      rules: [
        { code: "graph TD", desc: "첫 줄에 종류와 방향을 지정합니다. TD는 위에서 아래로, LR은 왼쪽에서 오른쪽으로 흐릅니다." },
        { code: "A[사각형]", desc: "id 와 [라벨]로 노드를 정의합니다. 같은 id 를 다시 쓰면 같은 노드를 가리킵니다." },
        { code: "B(둥근)", desc: "괄호 모양으로 도형이 바뀝니다. ( )는 둥근, ([ ])는 알약, (( ))는 원입니다." },
        { code: "C{조건}", desc: "{ }는 마름모(분기), {{ }}는 육각형입니다." },
        { code: "A --> B", desc: "화살표로 두 노드를 연결합니다. -.->는 점선, ==>는 굵은 선입니다." },
        { code: "A -->|예| B", desc: "화살표 중간의 |글자|는 연결선 라벨이 됩니다." },
      ],
      advanced: [
        { code: "subgraph 그룹 … end", desc: "여러 노드를 subgraph 이름 … end 로 묶어 하나의 그룹(영역)으로 표시합니다." },
        { code: "style A fill:#f9d", desc: "style 노드id 속성:값 으로 특정 노드의 색·테두리를 직접 지정합니다." },
        { code: "classDef 강조 fill:#faa", desc: "classDef 로 스타일을 정의하고 class 노드 강조 로 여러 노드에 한꺼번에 적용합니다." },
        { code: 'click A "https://…"', desc: 'click 노드 "URL" 로 노드를 클릭하면 링크가 열리게 합니다.' },
      ],
    },
    {
      key: "sequence", label: "시퀀스",
      intro: "참여자(객체) 사이에 시간 순서로 오가는 메시지를 표현합니다.",
      example: "sequenceDiagram\n  participant 사용자\n  participant 서버\n  사용자->>서버: 로그인 요청\n  서버-->>사용자: 토큰 응답",
      rules: [
        { code: "sequenceDiagram", desc: "이 줄로 시퀀스 다이어그램을 시작합니다." },
        { code: "participant 서버", desc: "참여자를 선언합니다. 생략하면 등장 순서대로 자동 생성됩니다." },
        { code: "A->>B: 메시지", desc: "실선 화살표로 A 가 B 에게 보내는 메시지입니다. 콜론 뒤가 내용입니다." },
        { code: "B-->>A: 응답", desc: "점선 화살표는 보통 응답(반환)에 사용합니다." },
        { code: "loop / alt / opt", desc: "loop(반복)·alt(분기)·opt(선택) 블록으로 구간을 묶습니다." },
      ],
      advanced: [
        { code: "A->>+B: 요청", desc: "화살표에 +/- 를 붙이면 활성 막대(activation)가 켜지고 꺼집니다." },
        { code: "Note over A,B: 메모", desc: "Note left of / right of / over 로 참여자 위에 주석을 답니다." },
        { code: "par … and … end", desc: "par 블록으로 동시에 일어나는 병렬 메시지를 표현합니다." },
        { code: "autonumber", desc: "맨 위에 넣으면 메시지에 순번이 자동으로 붙습니다." },
      ],
    },
    {
      key: "class", label: "클래스",
      intro: "클래스의 속성·메서드와 클래스 간 관계를 표현합니다.",
      example: "classDiagram\n  Animal <|-- Dog\n  Animal : +name\n  Animal : +eat()",
      rules: [
        { code: "classDiagram", desc: "이 줄로 클래스 다이어그램을 시작합니다." },
        { code: "class Animal", desc: "클래스를 정의합니다. 관계에 처음 등장하면 자동 생성됩니다." },
        { code: "Animal : +name", desc: "속성·메서드를 추가합니다. +는 public, -는 private 입니다." },
        { code: "Animal <|-- Dog", desc: "상속 관계입니다. Dog 가 Animal 을 상속합니다." },
        { code: "A *-- B / A o-- B", desc: "*--는 합성, o--는 집합 관계입니다." },
      ],
      advanced: [
        { code: "Animal : +int age", desc: "타입을 앞에 붙여 +타입 이름 형식으로 필드를 적습니다." },
        { code: "<<interface>> Shape", desc: "<<interface>>·<<abstract>> 등 스테레오타입을 표시합니다." },
        { code: 'Owner "1" --> "*" Pet', desc: '관계 양끝에 "1"·"*" 로 다중도(cardinality)를 적습니다.' },
        { code: "A ..> B : uses", desc: "..>는 의존 관계이며 : 뒤에 관계 설명을 답니다." },
      ],
    },
    {
      key: "state", label: "상태",
      intro: "상태와 상태 전이(상태 기계)를 표현합니다.",
      example: "stateDiagram-v2\n  [*] --> 대기\n  대기 --> 진행 : 시작\n  진행 --> 완료\n  완료 --> [*]",
      rules: [
        { code: "stateDiagram-v2", desc: "이 줄로 상태 다이어그램을 시작합니다." },
        { code: "[*] --> 대기", desc: "[*]는 시작·종료 지점을 나타냅니다." },
        { code: "대기 --> 진행", desc: "화살표로 상태 전이를 그립니다." },
        { code: "진행 --> 완료 : 조건", desc: "콜론 뒤에 전이 조건(이벤트)을 적습니다." },
      ],
      advanced: [
        { code: "state 진행 { … }", desc: "중괄호로 상태 안에 하위 상태를 넣어 복합 상태를 만듭니다." },
        { code: "state f <<fork>>", desc: "<<fork>>·<<join>> 으로 병렬 분기와 합류를 표현합니다." },
        { code: "note right of 대기", desc: "note right of / left of 상태 로 주석을 답니다." },
        { code: "--", desc: "복합 상태 안에서 -- 로 동시에 활성인 영역(병렬 상태)을 나눕니다." },
      ],
    },
    {
      key: "pie", label: "파이",
      intro: "전체 대비 비율을 원그래프로 표현합니다.",
      example: 'pie showData\n  title 과일 선호도\n  "사과" : 40\n  "바나나" : 35\n  "체리" : 25',
      rules: [
        { code: "pie showData", desc: "이 줄로 파이 차트를 시작합니다. showData 는 값을 함께 표시하는 옵션입니다." },
        { code: "title 제목", desc: "차트 제목을 지정합니다(선택)." },
        { code: '"사과" : 40', desc: '"항목" : 값 형식으로 조각을 추가합니다. 값의 비율로 크기가 정해집니다.' },
      ],
      advanced: [
        { code: "pie", desc: "showData 를 빼면 조각의 값 숫자는 숨기고 비율만 보여줍니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다(모든 다이어그램 공통)." },
      ],
    },
    {
      key: "gantt", label: "간트", wide: true,
      intro: "작업 일정을 시간축 막대로 표현합니다.",
      example: "gantt\n  title 프로젝트 일정\n  dateFormat YYYY-MM-DD\n  section 기획\n  요구분석 :a1, 2024-01-01, 3d\n  설계 :after a1, 2d\n  section 개발\n  구현 :after a1, 5d",
      rules: [
        { code: "gantt", desc: "이 줄로 간트 차트를 시작합니다." },
        { code: "dateFormat YYYY-MM-DD", desc: "날짜 입력 형식을 지정합니다." },
        { code: "section 기획", desc: "작업을 구획(섹션)으로 묶습니다." },
        { code: "작업 :a1, 2024-01-01, 3d", desc: "작업명 :아이디, 시작일, 기간 형식입니다. 3d 는 3일을 뜻합니다." },
        { code: "설계 :after a1, 2d", desc: "after 아이디로 앞 작업이 끝난 뒤에 이어붙입니다." },
      ],
      advanced: [
        { code: ":done / :active / :crit", desc: "작업 태그로 완료·진행 중·중요(critical) 상태를 표시합니다." },
        { code: "MS :milestone, m1, …, 0d", desc: "milestone 태그로 기간 0의 마일스톤을 찍습니다." },
        { code: "excludes weekends", desc: "주말이나 특정 날짜를 일정 계산에서 제외합니다." },
        { code: "axisFormat %m-%d", desc: "하단 시간축의 날짜 표시 형식을 바꿉니다." },
      ],
    },
    {
      key: "er", label: "ER",
      intro: "엔터티(테이블)와 그들 사이의 관계·다중도를 표현합니다.",
      example: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }",
      rules: [
        { code: "erDiagram", desc: "이 줄로 ER 다이어그램을 시작합니다." },
        { code: "CUSTOMER ||--o{ ORDER : places", desc: "두 엔터티를 관계선으로 잇고 : 뒤에 관계 이름을 적습니다." },
        { code: "||   o{   |{", desc: "선 끝 기호가 다중도입니다. ||=정확히 1, o{=0개 이상, |{=1개 이상." },
        { code: "CUSTOMER { string name }", desc: "중괄호 안에 타입과 속성명을 적어 엔터티의 필드를 정의합니다." },
      ],
      advanced: [
        { code: "string id PK", desc: "속성 뒤에 PK·FK 를 붙여 기본키·외래키를 표시합니다." },
        { code: 'string name "설명"', desc: "속성 끝에 따옴표로 주석(코멘트)을 답니다." },
      ],
    },
    {
      key: "journey", label: "여정",
      intro: "사용자가 목표를 이루기까지의 단계별 경험과 만족도를 표현합니다.",
      example: "journey\n  title 쇼핑 여정\n  section 방문\n    홈 접속: 5: 고객\n    검색: 3: 고객\n  section 구매\n    장바구니: 4: 고객\n    결제: 2: 고객, 시스템",
      rules: [
        { code: "journey", desc: "이 줄로 사용자 여정 다이어그램을 시작합니다." },
        { code: "title 제목", desc: "여정의 제목을 답니다." },
        { code: "section 방문", desc: "여정을 단계(구간)로 나눕니다." },
        { code: "작업: 5: 고객", desc: "작업: 점수(1~5): 참여자 형식입니다. 점수가 만족도이며 높을수록 좋습니다." },
      ],
      advanced: [
        { code: "결제: 2: 고객, 시스템", desc: "쉼표로 한 작업에 여러 참여자를 함께 적습니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다." },
      ],
    },
    {
      key: "git", label: "Git",
      intro: "커밋·브랜치·병합 등 git 흐름을 표현합니다.",
      example: "gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop",
      rules: [
        { code: "gitGraph", desc: "이 줄로 git 그래프를 시작합니다." },
        { code: "commit", desc: "현재 브랜치에 커밋을 추가합니다." },
        { code: "branch develop", desc: "새 브랜치를 만듭니다." },
        { code: "checkout develop", desc: "해당 브랜치로 전환합니다." },
        { code: "merge develop", desc: "현재 브랜치에 다른 브랜치를 병합합니다." },
      ],
      advanced: [
        { code: 'commit id: "v1" tag: "release"', desc: "커밋에 id·tag 를 붙여 표시합니다." },
        { code: "commit type: HIGHLIGHT", desc: "type 으로 커밋 모양을 바꿉니다(NORMAL·REVERSE·HIGHLIGHT)." },
      ],
    },
    {
      key: "mindmap", label: "마인드맵",
      intro: "중심 주제에서 뻗어나가는 생각을 계층 구조로 표현합니다.",
      example: "mindmap\n  root((핵심))\n    기획\n      리서치\n      기획서\n    개발\n      프론트\n      백엔드",
      rules: [
        { code: "mindmap", desc: "이 줄로 마인드맵을 시작합니다." },
        { code: "  들여쓰기", desc: "들여쓰기 깊이로 계층을 만듭니다. 더 깊게 들여쓰면 하위 노드입니다." },
        { code: "root((핵심))", desc: "괄호 모양으로 노드 도형을 바꿉니다. (( ))=원, [ ]=사각, ) (=구름." },
      ],
      advanced: [
        { code: "::icon(fa fa-book)", desc: "노드 아래 줄에 아이콘을 붙입니다(폰트어썸 등)." },
        { code: ":::className", desc: "노드에 CSS 클래스를 지정해 스타일을 적용합니다." },
      ],
    },
    {
      key: "timeline", label: "타임라인",
      intro: "시간 순서로 사건을 나열해 연대기를 표현합니다.",
      example: "timeline\n  title 제품 로드맵\n  2023 : 기획 : 프로토타입\n  2024 : 베타 출시\n  2025 : 정식 출시",
      rules: [
        { code: "timeline", desc: "이 줄로 타임라인을 시작합니다." },
        { code: "title 제목", desc: "타임라인의 제목을 답니다." },
        { code: "2024 : 사건", desc: "기간 : 사건 형식으로 한 시점을 적습니다." },
        { code: "2024 : 사건A : 사건B", desc: "콜론으로 한 시점에 여러 사건을 나열합니다." },
      ],
      advanced: [
        { code: "section 1기", desc: "여러 시점을 구간(section)으로 묶어 그룹화합니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다." },
      ],
    },
  ] : [
    {
      key: "flowchart", label: "Flowchart",
      intro: "Shows flows, processes, and decision paths.",
      example: "graph TD\n  A[Start] --> B{Condition}\n  B -->|Yes| C[Handle]\n  B -->|No| D[End]",
      rules: [
        { code: "graph TD", desc: "The first line sets the type and direction. TD is top-to-bottom, LR is left-to-right." },
        { code: "A[Box]", desc: "Defines a node with an id and a [label]. Reusing an id refers to the same node." },
        { code: "B(Round)", desc: "The bracket sets the shape: ( ) round, ([ ]) stadium, (( )) circle." },
        { code: "C{If}", desc: "{ } is a diamond (branch); {{ }} is a hexagon." },
        { code: "A --> B", desc: "Connects two nodes. -.-> is dotted, ==> is a thick line." },
        { code: "A -->|Yes| B", desc: "The |text| in the middle becomes the connection's label." },
      ],
      advanced: [
        { code: "subgraph G … end", desc: "Wrap nodes in subgraph name … end to show a group/boundary." },
        { code: "style A fill:#f9d", desc: "style <id> prop:value sets a single node's color/border directly." },
        { code: "classDef big fill:#faa", desc: "Define a style with classDef, then apply it to many nodes via class <id> big." },
        { code: 'click A "https://…"', desc: 'click <id> "URL" opens a link when the node is clicked.' },
      ],
    },
    {
      key: "sequence", label: "Sequence",
      intro: "Shows messages exchanged between participants over time.",
      example: "sequenceDiagram\n  participant User\n  participant Server\n  User->>Server: Login request\n  Server-->>User: Token response",
      rules: [
        { code: "sequenceDiagram", desc: "Starts a sequence diagram." },
        { code: "participant Server", desc: "Declares a participant. If omitted, participants are created in order of appearance." },
        { code: "A->>B: Message", desc: "A solid arrow is a message from A to B. Text after the colon is the content." },
        { code: "B-->>A: Reply", desc: "A dotted arrow is typically used for a response/return." },
        { code: "loop / alt / opt", desc: "Group regions with loop (repeat), alt (branch), opt (optional)." },
      ],
      advanced: [
        { code: "A->>+B: req", desc: "Adding +/- to arrows turns an activation bar on and off." },
        { code: "Note over A,B: memo", desc: "Add notes with Note left of / right of / over." },
        { code: "par … and … end", desc: "A par block shows parallel messages happening at once." },
        { code: "autonumber", desc: "Put it at the top to number messages automatically." },
      ],
    },
    {
      key: "class", label: "Class",
      intro: "Shows class attributes, methods, and relationships.",
      example: "classDiagram\n  Animal <|-- Dog\n  Animal : +name\n  Animal : +eat()",
      rules: [
        { code: "classDiagram", desc: "Starts a class diagram." },
        { code: "class Animal", desc: "Defines a class (also auto-created when first used in a relation)." },
        { code: "Animal : +name", desc: "Adds an attribute/method. + is public, - is private." },
        { code: "Animal <|-- Dog", desc: "Inheritance — Dog extends Animal." },
        { code: "A *-- B / A o-- B", desc: "*-- is composition, o-- is aggregation." },
      ],
      advanced: [
        { code: "Animal : +int age", desc: "Prefix a type — fields are written as +type name." },
        { code: "<<interface>> Shape", desc: "Show stereotypes like <<interface>> or <<abstract>>." },
        { code: 'Owner "1" --> "*" Pet', desc: 'Add cardinality with "1" / "*" at each end of a relation.' },
        { code: "A ..> B : uses", desc: "..> is a dependency; text after : labels the relation." },
      ],
    },
    {
      key: "state", label: "State",
      intro: "Shows states and transitions (a state machine).",
      example: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start\n  Running --> Done\n  Done --> [*]",
      rules: [
        { code: "stateDiagram-v2", desc: "Starts a state diagram." },
        { code: "[*] --> Idle", desc: "[*] marks the start/end point." },
        { code: "Idle --> Running", desc: "An arrow draws a state transition." },
        { code: "Running --> Done : cond", desc: "Text after the colon is the transition trigger." },
      ],
      advanced: [
        { code: "state Running { … }", desc: "Nest sub-states inside braces to make a composite state." },
        { code: "state f <<fork>>", desc: "Use <<fork>> / <<join>> for a parallel split and merge." },
        { code: "note right of Idle", desc: "Add notes with note right of / left of <state>." },
        { code: "--", desc: "Inside a composite state, -- separates concurrent (parallel) regions." },
      ],
    },
    {
      key: "pie", label: "Pie",
      intro: "Shows proportions of a whole as a pie chart.",
      example: 'pie showData\n  title Fruit poll\n  "Apple" : 40\n  "Banana" : 35\n  "Cherry" : 25',
      rules: [
        { code: "pie showData", desc: "Starts a pie chart. showData also prints the values." },
        { code: "title Text", desc: "Sets a chart title (optional)." },
        { code: '"Apple" : 40', desc: 'Add a slice as "label" : value. Size is proportional to the value.' },
      ],
      advanced: [
        { code: "pie", desc: "Without showData, values are hidden and only proportions show." },
        { code: "%% comment", desc: "Lines starting with %% are comments (works in every diagram)." },
      ],
    },
    {
      key: "gantt", label: "Gantt", wide: true,
      intro: "Shows a schedule as bars along a time axis.",
      example: "gantt\n  title Project plan\n  dateFormat YYYY-MM-DD\n  section Planning\n  Research :a1, 2024-01-01, 3d\n  Design :after a1, 2d\n  section Build\n  Implement :after a1, 5d",
      rules: [
        { code: "gantt", desc: "Starts a Gantt chart." },
        { code: "dateFormat YYYY-MM-DD", desc: "Sets the input date format." },
        { code: "section Planning", desc: "Groups tasks into a section." },
        { code: "Task :a1, 2024-01-01, 3d", desc: "Format is name :id, start, duration. 3d means 3 days." },
        { code: "Design :after a1, 2d", desc: "after <id> chains a task right after another." },
      ],
      advanced: [
        { code: ":done / :active / :crit", desc: "Task tags mark done, in-progress, and critical tasks." },
        { code: "MS :milestone, m1, …, 0d", desc: "The milestone tag places a zero-length milestone." },
        { code: "excludes weekends", desc: "Exclude weekends or specific dates from the schedule." },
        { code: "axisFormat %m-%d", desc: "Change the date format of the bottom time axis." },
      ],
    },
    {
      key: "er", label: "ER",
      intro: "Shows entities (tables) and the relationships and cardinality between them.",
      example: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }",
      rules: [
        { code: "erDiagram", desc: "Starts an ER diagram." },
        { code: "CUSTOMER ||--o{ ORDER : places", desc: "Connects two entities with a relation; text after : names it." },
        { code: "||   o{   |{", desc: "End symbols are cardinality: || exactly one, o{ zero-or-more, |{ one-or-more." },
        { code: "CUSTOMER { string name }", desc: "Define fields inside braces as type and attribute name." },
      ],
      advanced: [
        { code: "string id PK", desc: "Append PK / FK to an attribute to mark primary/foreign keys." },
        { code: 'string name "note"', desc: "Add a comment to an attribute with a quoted string." },
      ],
    },
    {
      key: "journey", label: "Journey",
      intro: "Shows a user's step-by-step experience and satisfaction toward a goal.",
      example: "journey\n  title Shopping journey\n  section Visit\n    Open home: 5: User\n    Search: 3: User\n  section Buy\n    Cart: 4: User\n    Checkout: 2: User, System",
      rules: [
        { code: "journey", desc: "Starts a user journey diagram." },
        { code: "title Text", desc: "Sets the journey title." },
        { code: "section Visit", desc: "Splits the journey into stages." },
        { code: "Task: 5: User", desc: "Format is Task: score(1-5): actor. The score is satisfaction (higher is better)." },
      ],
      advanced: [
        { code: "Checkout: 2: User, System", desc: "List several actors for one task, separated by commas." },
        { code: "%% comment", desc: "Lines starting with %% are comments." },
      ],
    },
    {
      key: "git", label: "Git",
      intro: "Shows a git flow — commits, branches, and merges.",
      example: "gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop",
      rules: [
        { code: "gitGraph", desc: "Starts a git graph." },
        { code: "commit", desc: "Adds a commit to the current branch." },
        { code: "branch develop", desc: "Creates a new branch." },
        { code: "checkout develop", desc: "Switches to that branch." },
        { code: "merge develop", desc: "Merges another branch into the current one." },
      ],
      advanced: [
        { code: 'commit id: "v1" tag: "release"', desc: "Attach an id and tag to a commit." },
        { code: "commit type: HIGHLIGHT", desc: "type changes the commit style (NORMAL, REVERSE, HIGHLIGHT)." },
      ],
    },
    {
      key: "mindmap", label: "Mindmap",
      intro: "Shows ideas branching out from a central topic as a hierarchy.",
      example: "mindmap\n  root((Core))\n    Plan\n      Research\n      Spec\n    Build\n      Frontend\n      Backend",
      rules: [
        { code: "mindmap", desc: "Starts a mindmap." },
        { code: "  indentation", desc: "Indentation depth builds the hierarchy — deeper indent means a child node." },
        { code: "root((Core))", desc: "Brackets set the node shape: (( )) circle, [ ] square, ) ( cloud." },
      ],
      advanced: [
        { code: "::icon(fa fa-book)", desc: "Add an icon on the line below a node (Font Awesome, etc.)." },
        { code: ":::className", desc: "Assign a CSS class to a node for styling." },
      ],
    },
    {
      key: "timeline", label: "Timeline",
      intro: "Lists events in chronological order.",
      example: "timeline\n  title Product roadmap\n  2023 : Plan : Prototype\n  2024 : Beta launch\n  2025 : GA release",
      rules: [
        { code: "timeline", desc: "Starts a timeline." },
        { code: "title Text", desc: "Sets the timeline title." },
        { code: "2024 : Event", desc: "Write one point as period : event." },
        { code: "2024 : A : B", desc: "List several events at one point using colons." },
      ],
      advanced: [
        { code: "section Phase 1", desc: "Group several points into a section." },
        { code: "%% comment", desc: "Lines starting with %% are comments." },
      ],
    },
  ];
  const [tab, setTab] = useState(TYPES[0].key);
  const active = TYPES.find((x) => x.key === tab) ?? TYPES[0];
  const copy = (code: string) => {
    try { navigator.clipboard?.writeText(code); showToast(ko ? "코드 복사됨" : "Code copied", "success"); }
    catch { showToast(ko ? "복사 실패" : "Copy failed", "error"); }
  };
  return (
    <div className={styles.mermaidHelp}>
      <p className={styles.mermaidHelpIntro}>
        {ko ? "Mermaid 는 코드로 다이어그램을 그립니다. 종류별 문법을 확인하고, 예시 코드를 그래프 블록에 붙여넣어 시작하십시오." : "Mermaid draws diagrams from text. Check the syntax per type, then paste an example into a graph block to start."}
      </p>
      {/* 종류 탭 */}
      <div className={styles.mermaidHelpTabs}>
        <SegmentedControl<string>
          items={TYPES.map((x) => ({ value: x.key, label: x.label }))}
          value={tab} onChange={setTab} size="sm"
        />
      </div>
      {/* 선택된 종류의 설명 + 문법 + 고급 문법 + 예시 (각 섹션 label 분리) */}
      <div className={styles.mermaidHelpTabBody}>
        <p className={styles.mermaidHelpBasicsIntro}>{active.intro}</p>
        <section className={styles.mermaidHelpSection}>
          <div className={styles.mermaidHelpLabelRow}><span className={styles.mermaidHelpLabel}>{ko ? "문법" : "Syntax"}</span></div>
          <ul className={styles.mermaidHelpRules}>
            {active.rules.map((r) => (
              <li key={r.code} className={styles.mermaidHelpRule}>
                <MermaidCode code={r.code} inline />
                <span className={styles.mermaidHelpRuleDesc}>{r.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        {active.advanced.length > 0 && (
          <section className={styles.mermaidHelpSection}>
            <div className={styles.mermaidHelpLabelRow}><span className={styles.mermaidHelpLabel}>{ko ? "고급 문법" : "Advanced"}</span></div>
            <ul className={styles.mermaidHelpRules}>
              {active.advanced.map((r) => (
                <li key={r.code} className={styles.mermaidHelpRule}>
                  <MermaidCode code={r.code} inline />
                  <span className={styles.mermaidHelpRuleDesc}>{r.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <MermaidExample key={active.key} label={ko ? "예시" : "Example"} code={active.example} wide={active.wide} ko={ko} onCopy={copy} />
      </div>
    </div>
  );
}

// 코드블록 언어 — lowlight(all: highlight.js 전체) 지원. terms: 검색 별칭.
