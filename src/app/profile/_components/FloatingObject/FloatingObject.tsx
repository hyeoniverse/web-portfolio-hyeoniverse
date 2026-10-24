"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ReadyWait } from "@/lib/readyGate";
import dynamic from "next/dynamic";
import { useTheme } from "@/providers/ThemeProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import styles from "./FloatingObject.module.css";
import BunnyStardust from "./BunnyStardust";
import BunnyHearts from "./BunnyHearts";
import { useSoundManager } from "@/hooks/useSoundManager";

/* 3D 캔버스(three · @react-three/fiber)는 따로 받는다 — 첫 로드에 three 가 실리지 않게. 준비 자리(ReadyWait "mascot")는 아래 오버레이에 늘 있다 */
const FloatingCanvas = dynamic(() => import("./FloatingCanvas"), { ssr: false });

/** 한 글자 찍는 간격(ms).
    useSoundManager 는 타이핑 소리를 50ms 안에 겹치면 버린다 — 그보다 조금 길게 잡아야
    글자마다 소리가 하나씩 난다. 42ms 로 뒀더니 대부분 걸러져 두어 번만 났다. */
const TYPE_INTERVAL_MS = 55;
/** 말풍선이 화면 끝에서 남겨 두는 여백(px). */
const BUBBLE_EDGE_PAD = 12;
const TAIL_SIZE = 10;
/* 꼬리 밑변 폭·내민 높이 — 45° 네모를 펼친 값(√2, √2/2). 외곽선 path 가 쓴다(흐림판의 --tail-w/-h 와 같은 결). */
const TAIL_W = TAIL_SIZE * 1.414;
const TAIL_H = TAIL_SIZE * 0.707;
const BUBBLE_OFFSET_Y = -110;

export default function FloatingObject() {
  const { theme } = useTheme();
  const { isMobile, isTouch } = useIsMobile();
  const { t } = useLanguage();
  const mobileLayout = useMobileLayout();
  const activeSection = useProfileSectionStore((s) => s.activeSection);

  const { lenis } = useLenis();

  const mouseNDC = useRef({ x: 0, y: 0 });
  const pointerActive = useRef(false);
  const screenPosRef = useRef<{ x: number; y: number; s?: number }>({ x: 0, y: 0 });
  const smileRef = useRef(false);
  /* 쓰다듬는 동안만 참 — BunnyHearts 가 읽는다. */
  const pettingRef = useRef(false);
  const scrollVelRef = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  /** 말풍선 크기 — 글이 바뀔 때만 다시 잰다. */
  const bubbleSizeRef = useRef({ w: 0, h: 0 });
  const bubbleTextRef = useRef<HTMLDivElement>(null);
  /** 외곽선 SVG 와 그 path — 캡슐+꼬리를 한 획으로 그린다(이음매 없음). */
  const bubbleBorderRef = useRef<SVGSVGElement>(null);
  const bubblePathRef = useRef<SVGPathElement>(null);
  const bubbleFillRef = useRef<HTMLDivElement>(null);
  /** 마지막으로 넘긴 꼬리 어긋남. 매 프레임 같은 값을 다시 쓰면 스타일 재계산만 늘어난다. */
  const tailDxRef = useRef("");
  /** 내비게이션 높이(px) — 말풍선 위쪽 한계. 아직 안 읽었으면 -1 */
  const headerPxRef = useRef(-1);
  const rafId = useRef(0);

  const [bubbleText, setBubbleText] = useState("");
  /* 찍히는 글자는 상태로 두지 않고 DOM 에 직접 쓴다. 상태로 두면 글자 하나마다
     이 컴포넌트가 다시 렌더되는데, 여기에는 3D 캔버스가 달려 있다 — 글 한 줄 찍자고
     쉰 번 넘게 다시 그릴 이유가 없다. */
  const typedRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const { playSound } = useSoundManager();
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const updateNDC = (clientX: number, clientY: number) => {
      mouseNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
      mouseNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
      pointerActive.current = true;
    };

    const onMouseMove = (e: MouseEvent) => updateNDC(e.clientX, e.clientY);

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      pointerActive.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Lenis scroll velocity → bunny에 전달
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => {
      scrollVelRef.current = (lenis as unknown as { velocity: number }).velocity;
    };
    lenis.on("scroll", onScroll);
    return () => {
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  // Bubble text fade transition on section change
  useEffect(() => {
    const baseKey = `profilePage.bubble.${activeSection}`;
    const variantKey = mobileLayout
      ? `${baseKey}_mobile`
      : `${baseKey}_desktop`;
    const variantText = t(variantKey);
    const text = variantText !== variantKey ? variantText : t(baseKey);
    /* 말풍선은 그대로 두고 글만 바꾼다. 예전엔 숨겼다가 300ms 뒤에 다시 띄웠는데,
       패널을 넘길 때마다 말풍선이 사라졌다 나타나 깜빡였다. 지금은 타이핑이 그 전환을
       대신한다 — 글자가 지워지고 새로 찍히는 것으로 바뀐 게 읽힌다. */
    const tid = window.setTimeout(() => {
      setBubbleText(text);
      setShowBubble(true);
      smileRef.current = true;
    }, 300);
    const smileTid = window.setTimeout(() => {
      smileRef.current = false;
    }, 1800);
    return () => {
      window.clearTimeout(tid);
      window.clearTimeout(smileTid);
    };
  }, [activeSection, t, mobileLayout]);

  /* rAF loop: 몽이 화면 좌표에 말풍선을 붙인다.
     transform 으로 옮긴다. left/top 으로 옮기면 움직일 때마다 레이아웃 밀림으로 잡혀서,
     몽이를 따라다니는 동안 이 화면의 밀림 수치가 0.167 까지 올라갔다(재는 동안 82번).

     예전에는 transform 이 stacking context 를 만들어 글자의 반전(mix-blend-mode: difference)이
     깨진다고 보고 left/top 을 썼다. 다시 확인해 보니 그건 **부모**에 transform 이 걸릴 때다.
     반전은 자기 자신의 배경과 섞는 것이라, 같은 요소에 transform 을 걸어도 대상이 바뀌지 않는다.
     실제로 화면을 찍어 견주니 글자가 그대로 반전된다.

     가운데·아래 정렬은 크기를 재서 직접 뺀다.
     크기는 글이 바뀔 때만 달라지므로 캐시한다 — 매 프레임 재면 레이아웃이 강제된다. */
  const syncBubble = useCallback(() => {
    const el = bubbleRef.current;
    if (el) {
      if (bubbleSizeRef.current.w === 0) {
        bubbleSizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
      }
      const { w, h } = bubbleSizeRef.current;
      /* 몽이 머리 위 가운데가 기본. 다만 화면 끝에 닿으면 말풍선만 안쪽으로 밀어 넣는다 —
         꼬리는 몽이 자리에 그대로 있으므로 누가 말하는지는 계속 가리킨다.
         몽이를 화면 안쪽으로 몰아 두긴 했지만, 자리에 앉아 있는 동안이나 앉았다 풀리는
         1초 사이에는 그 범위 밖에 있을 수 있다. */
      const rawLeft = screenPosRef.current.x - w / 2;
      const boxLeft = Math.max(BUBBLE_EDGE_PAD, Math.min(window.innerWidth - w - BUBBLE_EDGE_PAD, rawLeft));
      const lift = BUBBLE_OFFSET_Y * Math.max(1, screenPosRef.current.s ?? 1);
      /* 위쪽도 화면 끝(내비게이션 아래)에서 멈춘다 — 좁은 화면에서 몽이가 위쪽에 있으면 말풍선이 내비게이션 밑으로 들어갔다.
         내비게이션 아래 끝(높이 + 위 띄움)은 한 번 재어 둔다(px). 위 띄움(--spacing-nav-top)은 min() 식이라 변수 값을
         그대로 읽으면 숫자가 아니어서, 그 높이의 빈 상자를 잠깐 그려 잰다 */
      if (headerPxRef.current < 0) {
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;height:calc(var(--header-height) + var(--spacing-nav-top))";
        document.body.appendChild(probe);
        headerPxRef.current = probe.offsetHeight;
        probe.remove();
      }
      const boxTop = Math.max(headerPxRef.current, screenPosRef.current.y + lift - h);
      const move = `translate(${Math.round(boxLeft)}px, ${Math.round(boxTop)}px)`;
      el.style.transform = move;
      /* 흐림판·글자·외곽선 층은 껍데기와 같은 자리다. 정확히 겹쳐야 한 덩어리로 보인다. */
      for (const layer of [bubbleFillRef.current, bubbleTextRef.current, bubbleBorderRef.current]) {
        if (layer) layer.style.transform = move;
      }
      /* 꼬리는 몽이를 가리키되 **말풍선 아래선을 벗어나면 안 된다**.
         화면 끝에서 껍데기만 안쪽으로 밀리는데 꼬리를 몽이 자리에 그대로 두면, 패널을
         넘어가느라 몽이가 밖으로 빠질 때 몸통과 꼬리가 뚝 떨어져 보인다.
         캡슐 양 끝은 둥그니까 반지름(h/2)에 꼬리 반폭만큼 더 안쪽에서 멈춘다 — 거기까지가
         밑변이 평평한 구간이라, 꼬리가 늘 몸통에 붙어 있는다. */
      const tailInset = Math.min(h / 2 + TAIL_SIZE, w / 2);
      const tailX = Math.max(boxLeft + tailInset, Math.min(boxLeft + w - tailInset, screenPosRef.current.x));

      /* 외곽선 — 캡슐(반지름 h/2) + 아래 가운데 꼬리 V 를 하나의 연속 path 로 그린다.
         몸통 테두리와 꼬리 테두리를 따로 두고 이음매를 마스크로 도려내던 방식은 각진 모서리
         안티에일리어싱 잔선을 남겼다. 한 획이면 이음매 자체가 없어 잔선이 안 생긴다. */
      const svg = bubbleBorderRef.current;
      const path = bubblePathRef.current;
      if (svg && path) {
        const r = h / 2;
        const svgH = h + TAIL_H;
        if (svg.getAttribute("width") !== String(Math.round(w))) {
          svg.setAttribute("width", String(Math.round(w)));
          svg.setAttribute("height", String(Math.ceil(svgH)));
          svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);
        }
        const mouthC = tailX - boxLeft;
        const mL = mouthC - TAIL_W / 2;
        const mR = mouthC + TAIL_W / 2;
        path.setAttribute(
          "d",
          `M${r} 0 L${w - r} 0 A${r} ${r} 0 0 1 ${w - r} ${h} L${mR} ${h} L${mouthC} ${svgH} L${mL} ${h} L${r} ${h} A${r} ${r} 0 0 1 ${r} 0 Z`,
        );
      }

      /* 흐림판의 꼬리 삼각형 위치(--tail-dx) — 흐림판 마스크가 쓴다. */
      const dx = `${Math.round(tailX - (boxLeft + w / 2))}px`;
      if (dx !== tailDxRef.current) {
        tailDxRef.current = dx;
        bubbleFillRef.current?.style.setProperty("--tail-dx", dx);
      }
    }
    rafId.current = requestAnimationFrame(syncBubble);
  }, []);

  /* 글이 바뀌면 폭이 달라진다 — 다음 프레임에 다시 재게 만든다. */
  useEffect(() => { bubbleSizeRef.current = { w: 0, h: 0 }; }, [bubbleText]);

  /* 한 글자씩 찍는다. 크기는 껍데기(전체 글)가 잡으므로 말풍선이 자라지 않는다 —
     몽이를 따라 움직이는 중에 폭까지 변하면 자리가 계속 흔들린다.
     소리는 글자마다 낸다. useSoundManager 가 50ms 안에 겹치는 건 알아서 걸러 준다. */
  useEffect(() => {
    const out = typedRef.current;
    const caret = caretRef.current;
    if (!out) return;
    const done = () => { if (caret) caret.style.display = "none"; };

    if (!bubbleText) { out.textContent = ""; done(); return; }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      out.textContent = bubbleText;
      done();
      return;
    }

    out.textContent = "";
    if (caret) caret.style.display = "";
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      out.textContent = bubbleText.slice(0, i);
      /* 공백에서는 소리를 내지 않는다 — 띄어쓰기마다 같은 소리가 나면 리듬이 뭉개진다. */
      if (bubbleText[i - 1]?.trim()) playSound("typing");
      if (i >= bubbleText.length) { window.clearInterval(id); done(); }
    }, TYPE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [bubbleText, playSound]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(syncBubble);
    return () => cancelAnimationFrame(rafId.current);
  }, [syncBubble]);

  const dpr = isTouch
    ? Math.min(globalThis.devicePixelRatio ?? 1, 1.5)
    : Math.min(globalThis.devicePixelRatio ?? 1, 2);

  return (
    <>
      <div className={styles.overlay}>
      {/* 첫 화면 준비 — 몽이 모델을 받아 그린 뒤(ReadySignal) 로딩 덮개가 걷힌다 */}
      <ReadyWait id="mascot" step={0.5} />
      {/* 캔버스보다 앞에 둬서 몽이 뒤에 깔린다 — 별가루가 캐릭터를 덮으면 안 된다. */}
      <BunnyStardust screenPosRef={screenPosRef} />
      <FloatingCanvas
        dpr={dpr}
        antialias={!isTouch}
        theme={theme}
        isMobile={isMobile}
        mouseNDC={mouseNDC}
        pointerActive={pointerActive}
        screenPosRef={screenPosRef}
        smileRef={smileRef}
        pettingRef={pettingRef}
        scrollVelRef={scrollVelRef}
      />
      {/* 하트는 캔버스 다음에 둔다 — 별가루와 반대로 몽이 위에 떠야 한다.
          캔버스 앞에 두면 캔버스가 그대로 덮어 하나도 안 보인다. */}
      <BunnyHearts screenPosRef={screenPosRef} pettingRef={pettingRef} />
      </div>

      {/* 말풍선은 오버레이 밖에 둔다. 뒤 화면과 반전(mix-blend-mode: difference)시키려면
          반전할 요소가 페이지와 같은 stacking context 안에 있어야 하는데, 오버레이는
          position: fixed + z-index 라 자기 context 를 만든다. 그 안에 두면 반전 대상이
          페이지가 아니라 오버레이(투명)가 돼서 흰 글자가 그냥 흰 글자로 남는다.
          자리 잡는 방식은 그대로다 — 화면 좌표로 transform 을 찍으므로 부모가 바뀌어도 같다. */}
      {/* 말풍선을 두 층으로 나눈다 — 껍데기와 글자를 형제로 둔다.
          한 요소 안에 넣으면 글자 반전이 페이지까지 못 간다. position: fixed 자체가
          stacking context 를 만들어서, 안쪽 자식의 mix-blend-mode 는 페이지가 아니라
          그 요소 안에서 계산되기 때문이다(backdrop-filter·transform 도 마찬가지).
          형제로 두면 글자 층이 루트 위에서 섞이므로 아래에 깔린 껍데기와 페이지를 모두 본다.
          둘은 같은 rAF 에서 같은 left/top 을 받고 글·여백·글꼴이 같아 정확히 겹친다.
          말풍선은 고정폭 지면(Profile) 안에 있지만 평소 글꼴을 쓴다 — data-type="sans"(D63). */}
      {/* 흐림판이 맨 아래. 테두리보다 먼저 그려야 꼬리 흐림이 흰 테두리를 빨아들이지 않는다.
          글자를 그대로 담는 건 크기를 껍데기와 똑같이 맞추기 위해서다(보이지는 않는다). */}
      <div
        ref={bubbleFillRef}
        className={`${styles.speechBubbleFill} ${showBubble ? styles.speechBubbleVisible : ""}`}
        data-type="sans"
        aria-hidden
      >
        {bubbleText}
      </div>
      {/* 외곽선 — 캡슐 + 꼬리 V 를 한 획으로 그리는 SVG. 흐림판 위, 글자 아래.
          path 좌표·크기는 rAF 가 매 프레임 갱신한다. */}
      <svg
        ref={bubbleBorderRef}
        className={`${styles.speechBubbleBorder} ${showBubble ? styles.speechBubbleVisible : ""}`}
        aria-hidden
      >
        <path ref={bubblePathRef} />
      </svg>
      <div
        ref={bubbleRef}
        className={`${styles.speechBubble} ${showBubble ? styles.speechBubbleVisible : ""}`}
        data-type="sans"
        aria-hidden
      >
        {bubbleText}
      </div>
      <div
        ref={bubbleTextRef}
        className={`${styles.speechBubbleText} ${showBubble ? styles.speechBubbleVisible : ""}`}
        data-type="sans"
      >
        <span ref={typedRef} />
        <span ref={caretRef} className={styles.caret} />
      </div>
    </>
  );
}
