// ── 템플릿별 시작(스타터) 파일 ── Sandpack 기본 "Hello World" 대신 JS 동작(이벤트·상태·
// DOM·리스트)을 바로 확인할 수 있는 데모로 채운다. 색상은 플레이그라운드 콘텐츠 전용(앱 토큰 아님).

const CSS = `:root {
  --bg: #f3efe4;
  --paper: #fffdf7;
  --ink: #191712;
  --muted: #6f695c;
  --dot: rgba(25, 23, 18, .07);
  --pop-1: #ff5a36;
  --pop-2: #ffce29;
  --pop-3: #4f7bff;
  --pop-4: #22c98a;
  --bd: 2.5px solid var(--ink);
  --sh: 5px 5px 0 var(--ink);
  --sh-sm: 3px 3px 0 var(--ink);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #131109;
    --paper: #201d13;
    --ink: #f4efe2;
    --muted: #a49d8c;
    --dot: rgba(244, 239, 226, .08);
  }
}
* { box-sizing: border-box; }
html { color-scheme: light dark; }
body {
  margin: 0; min-height: 100vh;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-weight: 500;
  color: var(--ink);
  background-color: var(--bg);
  background-image: radial-gradient(var(--dot) 1.4px, transparent 1.4px);
  background-size: 22px 22px;
  -webkit-font-smoothing: antialiased;
}
/* 커서 스포트라이트 — 커서 원 안의 도트가 pop 컬러로 켜짐(JS 가 마스크 위치 갱신). 카드 아래(배경). */
.spotlight {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(var(--pop-1) 2px, transparent 2px);
  background-size: 22px 22px;
}
.app { position: relative; z-index: 1; max-width: 440px; margin: 0 auto; padding: 44px 20px 64px; display: grid; gap: 20px; }
h1 {
  font-size: 2.4rem; font-weight: 900; line-height: .98; letter-spacing: -.04em;
  margin: 0 0 4px; text-transform: uppercase;
}
h1::after {
  content: ""; display: block; width: 64px; height: 8px; margin-top: 12px;
  background: var(--pop-1); border: var(--bd); border-radius: 4px;
}
.card {
  position: relative;
  background: var(--paper);
  border: var(--bd); border-radius: 16px;
  padding: 22px; box-shadow: var(--sh);
}
h2 {
  display: inline-flex; align-items: center; margin: 0 0 18px;
  padding: 4px 11px; border: var(--bd); border-radius: 8px;
  box-shadow: var(--sh-sm);
  font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
  color: var(--ink);
}
.card:nth-of-type(1) h2 { background: var(--pop-2); }
.card:nth-of-type(2) h2 { background: var(--pop-3); color: #fff; }
.card:nth-of-type(3) h2 { background: var(--pop-4); }
.counter { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.counter output {
  font-size: 3.4rem; font-weight: 900; letter-spacing: -.05em;
  font-variant-numeric: tabular-nums; line-height: 1;
}
button {
  cursor: pointer; font: inherit; font-weight: 800; color: var(--ink);
  border: var(--bd); border-radius: 13px; padding: 12px 18px;
  background: var(--pop-2); box-shadow: var(--sh-sm);
  transition: transform .1s ease, box-shadow .1s ease, filter .15s;
}
.counter button {
  width: 56px; height: 56px; padding: 0; font-size: 1.7rem; border-radius: 15px;
}
.counter button:first-child { background: var(--paper); }
.counter button:last-child { background: var(--pop-1); color: #fff; }
button:hover { filter: brightness(1.03); }
button:active { transform: translate(3px, 3px); box-shadow: 0 0 0 var(--ink); }
input {
  width: 100%; font: inherit; font-weight: 600; color: var(--ink);
  padding: 13px 15px; border: var(--bd); border-radius: 12px;
  background: var(--paper); box-shadow: var(--sh-sm);
  transition: box-shadow .12s ease, transform .12s ease;
}
input::placeholder { color: var(--muted); font-weight: 500; }
input:focus {
  outline: none; box-shadow: 5px 5px 0 var(--pop-3); transform: translate(-1px, -1px);
}
p { margin: 16px 0 0; color: var(--muted); font-size: .95rem; font-weight: 600; }
p strong {
  color: var(--ink); font-weight: 800;
  box-shadow: inset 0 -.5em 0 var(--pop-2); padding: 0 2px;
}
ul { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 9px; }
li {
  display: flex; align-items: center; gap: 12px; font-weight: 700;
  padding: 12px 14px; border: var(--bd); border-radius: 11px;
  background: var(--paper); box-shadow: var(--sh-sm); cursor: pointer;
  transition: transform .1s ease, box-shadow .1s ease, opacity .15s;
}
li::before {
  content: "✓"; display: grid; place-items: center; flex: none;
  width: 22px; height: 22px; border: var(--bd); border-radius: 7px;
  background: var(--pop-4); color: var(--ink); font-size: .8rem; font-weight: 900;
}
li:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 var(--ink); }
li:active { opacity: .5; transform: translate(3px, 3px); box-shadow: 0 0 0 var(--ink); }
.hint { font-size: .76rem; color: var(--muted); font-weight: 600; margin: 14px 2px 0; }
`;

// 공용 HTML 마크업 (static / vanilla)
const HTML_BODY = `  <main class="app">
    <h1>🧪 JS Playground</h1>

    <section class="card">
      <h2>카운터 · 클릭 이벤트</h2>
      <div class="counter">
        <button id="dec">−</button>
        <output id="count">0</output>
        <button id="inc">+</button>
      </div>
    </section>

    <section class="card">
      <h2>실시간 입력 · input 이벤트</h2>
      <input id="name" placeholder="이름을 입력하세요" />
      <p>안녕하세요, <strong id="echo">방문자</strong>님 👋</p>
    </section>

    <section class="card">
      <h2>할 일 · 폼/배열/렌더</h2>
      <form id="todoForm"><input id="todoInput" placeholder="할 일 입력 후 Enter" /></form>
      <ul id="todoList"></ul>
      <p class="hint">항목을 클릭하면 삭제됩니다.</p>
    </section>
  </main>`;

// 공용 바닐라 JS 로직 (static / vanilla / vanilla-ts)
// 번들러가 스크립트를 head 로 옮기거나 defer 처리해도 안전하도록 DOM 준비 후 실행.
const VANILLA_JS = `function init() {
  // 0) 커서 스포트라이트 — 커서 원 안 도트가 켜지고, 부드럽게 따라옴
  const spot = document.createElement("div");
  spot.className = "spotlight";
  document.body.appendChild(spot);
  const at = (x, y) => "radial-gradient(circle 135px at " + x + "px " + y + "px, #000 0%, #000 52%, transparent 100%)";
  let tx = -500, ty = -500, cx = -500, cy = -500;
  spot.style.webkitMaskImage = spot.style.maskImage = at(cx, cy);
  window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;   // 부드러운 이징
    spot.style.webkitMaskImage = spot.style.maskImage = at(cx, cy);
    requestAnimationFrame(loop);
  })();

  // 1) 카운터 — 클릭 이벤트 + 상태
  let n = 0;
  const count = document.getElementById("count");
  const render = () => { count.textContent = String(n); };
  document.getElementById("inc").addEventListener("click", () => { n += 1; render(); });
  document.getElementById("dec").addEventListener("click", () => { n -= 1; render(); });

  // 2) 실시간 입력 — input 이벤트로 DOM 갱신
  const echo = document.getElementById("echo");
  document.getElementById("name").addEventListener("input", (e) => {
    echo.textContent = e.target.value.trim() || "방문자";
  });

  // 3) 할 일 — 폼 제출 → 배열 상태 → 리스트 렌더 + 클릭 삭제
  const todos = [];
  const list = document.getElementById("todoList");
  const drawTodos = () => {
    list.innerHTML = "";
    todos.forEach((text, i) => {
      const li = document.createElement("li");
      li.textContent = text;
      li.addEventListener("click", () => { todos.splice(i, 1); drawTodos(); });
      list.appendChild(li);
    });
  };
  const input = document.getElementById("todoInput");
  document.getElementById("todoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push(text);
    input.value = "";
    drawTodos();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
`;

const STATIC_HTML = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
${HTML_BODY}
  <script>
${VANILLA_JS}  </script>
</body>
</html>
`;

// parcel 은 JS entry 의 import 로 CSS 를 주입(HTML <link> 는 안 물어옴) → entry 에서 styles import
const vanillaHtml = (entry: string) => `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
${HTML_BODY}
  <script src="${entry}"></script>
</body>
</html>
`;
const vanillaEntry = `import "./styles.css";\n\n${VANILLA_JS}`;

// React (JSX/TSX) — useState 로 동일 데모
const reactApp = (ts: boolean) => `import React, { useState, useEffect } from "react";
import "./styles.css";

export default function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [todos, setTodos] = useState${ts ? "<string[]>" : ""}([]);
  const [draft, setDraft] = useState("");

  // 커서 스포트라이트 — 커서 원 안 도트가 켜지고, 부드럽게 따라옴
  useEffect(() => {
    const spot = document.createElement("div");
    spot.className = "spotlight";
    document.body.appendChild(spot);
    const at = (x${ts ? ": number" : ""}, y${ts ? ": number" : ""}) => "radial-gradient(circle 135px at " + x + "px " + y + "px, #000 0%, #000 52%, transparent 100%)";
    let tx = -500, ty = -500, cx = -500, cy = -500, raf = 0;
    spot.style.webkitMaskImage = spot.style.maskImage = at(cx, cy);
    const onMove = (e${ts ? ": PointerEvent" : ""}) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
      spot.style.webkitMaskImage = spot.style.maskImage = at(cx, cy);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); spot.remove(); };
  }, []);

  const addTodo = (e${ts ? ": React.FormEvent" : ""}) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...prev, text]);
    setDraft("");
  };

  return (
    <main className="app">
      <h1>⚛️ React Playground</h1>

      <section className="card">
        <h2>카운터 · 상태(useState)</h2>
        <div className="counter">
          <button onClick={() => setCount((c) => c - 1)}>−</button>
          <output>{count}</output>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
        </div>
      </section>

      <section className="card">
        <h2>실시간 입력 · onChange</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" />
        <p>안녕하세요, <strong>{name.trim() || "방문자"}</strong>님 👋</p>
      </section>

      <section className="card">
        <h2>할 일 · 배열 렌더 ({todos.length})</h2>
        <form onSubmit={addTodo}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="할 일 입력 후 Enter" />
        </form>
        <ul>
          {todos.map((t, i) => (
            <li key={i} onClick={() => setTodos((prev) => prev.filter((_, j) => j !== i))}>{t}</li>
          ))}
        </ul>
        <p className="hint">항목을 클릭하면 삭제됩니다.</p>
      </section>
    </main>
  );
}
`;

/** 템플릿 → 시작 파일 맵. 없으면 Sandpack 기본 파일 사용. */
export const STARTER_FILES: Record<string, Record<string, string>> = {
  // 자체 srcdoc 러너 — html(본문)·css·js 분리
  html: { "/index.html": HTML_BODY, "/styles.css": CSS, "/script.js": VANILLA_JS },
  static: { "/index.html": STATIC_HTML, "/styles.css": CSS },
  vanilla: { "/index.html": vanillaHtml("index.js"), "/styles.css": CSS, "/index.js": vanillaEntry },
  "vanilla-ts": { "/index.html": vanillaHtml("index.ts"), "/styles.css": CSS, "/index.ts": vanillaEntry },
  react: { "/App.js": reactApp(false), "/styles.css": CSS },
  "react-ts": { "/App.tsx": reactApp(true), "/styles.css": CSS },
};

export function starterFiles(template: string): Record<string, string> {
  return STARTER_FILES[template] ? { ...STARTER_FILES[template] } : {};
}
