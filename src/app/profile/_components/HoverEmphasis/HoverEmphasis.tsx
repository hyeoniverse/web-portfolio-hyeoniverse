"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { EMPHASIS_PATTERN } from "./emphasisTerms";
import styles from "./HoverEmphasis.module.css";

/** 한 행에서 본문 키워드를 몇 개까지 잡을지. 다 강조하면 강조가 아니다. */
const MAX_KEYWORDS_PER_ROW = 5;
/** 한 단어가 다 맞춰지는 데 걸리는 시간(ms). 길이와 상관없이 같다 — 긴 단어만 늦게 끝나면 늘어진다. */
const TERM_MS = 450;
/** 다음 단어가 시작하기까지(ms). 단어들이 차례로 풀리며 시선이 따라간다. */
const TERM_GAP_MS = 90;
/** 무작위 글자가 바뀌는 주기(ms). 매 프레임 바꾸면 너무 빨라 글자가 아니라 얼룩으로 보인다. */
const NOISE_MS = 45;

/** 되돌리기용 기록 — 원래 텍스트 노드와 그 자리에 끼워 넣은 것들. */
interface Patch {
  text: Text;
  nodes: Node[];
}

/** 쪼개 둔 한 행. `at` 은 행이 시작하고 몇 ms 뒤에 이 글자가 제자리를 찾는지,
    `step` 은 무작위 글자를 마지막으로 바꾼 주기 번호. */
interface Char {
  el: HTMLElement;
  real: string;
  at: number;
  step: number;
}

interface Row {
  el: HTMLElement;
  chars: Char[];
}

/**
 * 행에 커서를 올리면 그 안의 핵심 단어가 무작위 글자로 잠깐 흔들리다 제 글자로 맞춰진다.
 * 맞춰진 글자는 accent 색으로 남아서, 커서가 떠나도 지나온 자리가 표시로 남는다.
 *
 * 무엇이 핵심인가는 두 갈래로 정한다. 하나는 마크업이 이미 알고 있는 것 —
 * 직무명·기술명·원칙 제목처럼 `data-emph` 가 붙은 요소다. 다른 하나는 설명 문장 안에 섞인
 * 말로, `emphasisTerms` 의 사전으로 찾는다. 행의 경계는 `data-emph-row` 가 정한다.
 *
 * 표시는 패널이 화면에서 사라질 때 지운다. 그 안에 있는 동안은 커서를 어디로 옮기든 그대로
 * 남고, 다른 패널로 넘어갔다 돌아오면 처음부터 다시 풀린다.
 *
 * 쪼개는 건 커서가 처음 들어왔을 때 한 번만 한다. 이 패널은 무한 스크롤이라 사본이 세 벌씩
 * 있어서, 처음부터 다 쪼개면 안 볼 것까지 수천 개의 span 을 만들게 된다.
 *
 * 언어를 바꾸면 되돌린다. React 는 자기가 만든 텍스트 노드에 새 글을 적는데, 우리가 그 노드를
 * span 으로 갈아 끼운 뒤라 화면에는 반영되지 않는다. 그 노드를 그대로 들고 있다가 도로
 * 꽂으면 React 가 적어 둔 새 글이 딸려 온다.
 */
export default function HoverEmphasis({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const patchesRef = useRef<Patch[]>([]);
  const rowsRef = useRef<Map<HTMLElement, Row>>(new Map());
  /** 지금 풀리고 있는 행과 그 시작 시각. */
  const runningRef = useRef<Map<HTMLElement, { row: Row; from: number }>>(new Map());
  const rafRef = useRef(0);
  const { language } = useLanguage();

  /* 훅으로 감싸지 않는다. 자기 자신을 다시 예약하는 함수라 useCallback 안에서는 아직 선언되지
     않은 이름을 가리키게 된다. 이 함수의 정체성에 기대는 곳이 없어서 매 렌더 새로 만들어도 된다. */
  function tick(now: number) {
    rafRef.current = 0;
    /* 무작위 글자는 프레임마다가 아니라 이 주기로만 바꾼다. */
    const noiseStep = Math.floor(now / NOISE_MS);
    for (const [key, run] of runningRef.current) {
      const t = now - run.from;
      let pending = 0;
      for (const c of run.row.chars) {
        if (t >= c.at) {
          if (c.el.textContent !== c.real) c.el.textContent = c.real;
          /* 글자가 이미 맞는지와 따로 지운다. 무작위 글자가 우연히 제 글자와 같으면
             위 조건이 안 걸려서 흐린 채로 굳어 버린다. */
          c.el.classList.remove(styles.noise);
          continue;
        }
        pending += 1;
        if (c.step !== noiseStep) {
          c.step = noiseStep;
          c.el.textContent = noiseFor(c.real);
        }
      }
      if (pending === 0) runningRef.current.delete(key);
    }
    if (runningRef.current.size > 0) rafRef.current = requestAnimationFrame(tick);
  }

  /** 지나온 표시를 다 지운다. 다음에 다시 오면 처음부터 풀린다. */
  const reset = useCallback(() => {
    runningRef.current.clear();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    for (const row of rowsRef.current.values()) {
      row.el.removeAttribute("data-emph-on");
      settle(row);
    }
    wrapRef.current?.removeAttribute("data-emph-on");
  }, []);

  const restore = useCallback(() => {
    reset();
    rowsRef.current.clear();
    for (const patch of patchesRef.current.reverse()) {
      const first = patch.nodes[0];
      /* 그 사이에 React 가 부모째 걷어냈으면 되돌릴 자리가 없다. */
      if (!first?.parentNode) continue;
      first.parentNode.replaceChild(patch.text, first);
      for (const node of patch.nodes.slice(1)) node.parentNode?.removeChild(node);
    }
    patchesRef.current = [];
  }, [reset]);

  useEffect(() => {
    /* 언어가 바뀐 뒤에 돈다 — React 가 (떨어져 나간) 텍스트 노드에 새 글을 적은 다음이다. */
    restore();
  }, [language, restore]);

  useEffect(() => {
    const parent = wrapRef.current?.parentElement;
    /* 경계는 패널이다. 감싼 div 는 글이 놓인 상자까지만 덮어서, 그걸 기준으로 삼으면 커서를
       패널 여백으로 조금만 옮겨도 지워진다. 감싼 div 자체는 자리를 차지하지 않아 관찰 대상이
       못 되므로 부모에서 위로 올라가 패널을 찾는다. */
    const panel = parent?.closest("[data-emph-panel]") ?? parent;
    if (!panel) return;
    /* 벗어났다는 신호는 화면에서 사라지는 것으로 잡는다. 가로 스크롤이라 패널은 커서를
       안 움직여도 지나가고, 커서가 나가는 것만 보면 다시 왔을 때 이미 다 풀려 있다.
       반대로 커서로 판정하면 위에 떠 있는 몽이나 말풍선 위를 지날 때 엉뚱하게 지워진다. */
    const io = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) reset(); },
      { threshold: 0 },
    );
    io.observe(panel);
    return () => io.disconnect();
  }, [reset]);

  useEffect(() => {
    /* 글자마다 박아 둔 너비는 잰 그 순간의 값이다. 창 크기가 바뀌면 글자 크기도 같이 바뀌는
       자리가 있어서(원칙 제목은 vw 로 큰다) 그 값이 어긋난다. 통째로 되돌려 두면 다음에
       커서가 들어올 때 새 크기로 다시 쪼갠다. */
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(restore, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [restore]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onOver = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (patchesRef.current.length === 0) {
      const found = wrap.querySelectorAll<HTMLElement>("[data-emph-row]");
      for (const el of found.length > 0 ? Array.from(found) : [wrap]) {
        const row = splitRow(el, patchesRef.current);
        if (row.chars.length > 0) rowsRef.current.set(el, row);
      }
    }
    const target = (e.target as HTMLElement | null)?.closest?.("[data-emph-row]");
    const el = target instanceof HTMLElement ? target : wrap;
    const row = rowsRef.current.get(el);
    /* 이미 풀린 행은 다시 풀지 않는다 — 안에서 커서를 움직일 때마다 다시 시작하면 어지럽다. */
    if (!row || el.hasAttribute("data-emph-on")) return;
    el.setAttribute("data-emph-on", "");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      settle(row);
      return;
    }
    for (const c of row.chars) {
      if (c.at > 0) c.el.classList.add(styles.noise);
    }
    runningRef.current.set(el, { row, from: performance.now() });
    if (rafRef.current === 0) rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div
      ref={wrapRef}
      className={className ? `${styles.wrap} ${className}` : styles.wrap}
      onPointerOver={onOver}
    >
      {children}
    </div>
  );
}

/** 한 행 안의 강조 대상을 찾아 글자 단위로 쪼갠다. 풀리는 순서는 단어 단위로 이어진다. */
function splitRow(el: HTMLElement, patches: Patch[]): Row {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  /* 같은 말이 한 행에서 여러 번 나오면 처음 것만 강조한다. */
  const seen = new Set<string>();
  const chars: Row["chars"] = [];
  let keywords = 0;
  let termIndex = 0;

  for (const text of texts) {
    const raw = text.textContent ?? "";
    let pieces: { body: string; hit: boolean }[];
    if (text.parentElement?.closest("[data-emph]")) {
      pieces = [{ body: raw, hit: true }];
      /* 제목에 이미 나온 말은 본문에서 다시 고르지 않는다 — 한 행에서 같은 말이 두 번
         풀리면 자리만 차지하고 새로 알려 주는 게 없다. 마크업이 정한 것이 먼저 걸리도록
         문서 순서대로 훑는다. */
      seen.add(raw.trim().toLowerCase());
    } else {
      pieces = findKeywords(raw, seen, MAX_KEYWORDS_PER_ROW - keywords);
    }
    if (pieces.length === 0) continue;

    const frag = document.createDocumentFragment();
    const nodes: Node[] = [];
    for (const piece of pieces) {
      if (!piece.hit) {
        const plain = document.createTextNode(piece.body);
        frag.append(plain);
        nodes.push(plain);
        continue;
      }
      keywords += 1;
      const term = document.createElement("span");
      term.className = styles.term;
      const letters = [...piece.body];
      const start = termIndex * TERM_GAP_MS;
      termIndex += 1;
      letters.forEach((letter, i) => {
        const box = document.createElement("span");
        box.className = styles.ch;
        box.textContent = letter;
        term.append(box);
        /* 공백은 흔들 게 없다 — 처음부터 제자리다. */
        const at = letter.trim() ? start + ((i + 1) / letters.length) * TERM_MS : 0;
        chars.push({ el: box, real: letter, at, step: -1 });
      });
      frag.append(term);
      nodes.push(term);
    }
    text.parentNode?.replaceChild(frag, text);
    patches.push({ text, nodes });
  }

  /* 너비는 다 끼워 넣은 뒤에 한꺼번에 잰다 — 하나 넣고 하나 재면 그때마다 배치를 다시 잡는다. */
  const widths = chars.map((c) => c.el.getBoundingClientRect().width);
  chars.forEach((c, i) => { c.el.style.width = `${widths[i]}px`; });

  return { el, chars };
}

/** 사전에 걸리는 말을 찾아 [평범한 조각 | 강조할 조각] 순서로 잘라 준다. 없으면 빈 배열. */
function findKeywords(
  raw: string,
  seen: Set<string>,
  budget: number,
): { body: string; hit: boolean }[] {
  if (budget <= 0) return [];
  const pieces: { body: string; hit: boolean }[] = [];
  let cursor = 0;
  let left = budget;

  EMPHASIS_PATTERN.lastIndex = 0;
  for (let m = EMPHASIS_PATTERN.exec(raw); m && left > 0; m = EMPHASIS_PATTERN.exec(raw)) {
    const word = m[2];
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    left -= 1;
    /* 앞 경계로 한 글자를 먹었으므로 그만큼 밀어서 말의 시작을 잡는다. */
    const at = m.index + m[1].length;
    if (at > cursor) pieces.push({ body: raw.slice(cursor, at), hit: false });
    pieces.push({ body: word, hit: true });
    cursor = at + word.length;
  }

  if (pieces.length === 0) return [];
  if (cursor < raw.length) pieces.push({ body: raw.slice(cursor), hit: false });
  return pieces;
}

/** 다 맞춰진 모습으로 돌려놓는다 — 흔들림은 멈추고 글자는 제 글자로. */
function settle(row: Row): void {
  for (const c of row.chars) {
    c.el.textContent = c.real;
    c.el.classList.remove(styles.noise);
  }
}

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "#$%&*+-<>=?@/\\|~^";
/** 한글 음절 영역 — 가 ~ 힣. */
const HANGUL_FIRST = 0xac00;
const HANGUL_COUNT = 0xd7a3 - 0xac00 + 1;

/**
 * 이 글자 자리에 잠깐 세워 둘 아무 글자.
 *
 * 같은 갈래에서 고른다 — 한글 자리엔 한글, 숫자 자리엔 숫자. 갈래가 섞이면 폭이 널뛰고,
 * 무엇보다 "원래 뭐였는지" 가 안 읽혀서 맞춰지는 맛이 없다.
 */
function noiseFor(real: string): string {
  const code = real.codePointAt(0) ?? 0;
  if (code >= HANGUL_FIRST && code <= 0xd7a3) {
    return String.fromCodePoint(HANGUL_FIRST + Math.floor(Math.random() * HANGUL_COUNT));
  }
  const pool = /\d/.test(real) ? DIGITS : /[A-Za-z]/.test(real) ? LATIN : SYMBOLS;
  return pool[Math.floor(Math.random() * pool.length)];
}
