"use client";

import { Suspense, useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { useTheme } from "@/providers/ThemeProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { createSafeRenderer } from "@/utils/three";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import styles from "./FloatingObject.module.css";
import BunnyStardust from "./BunnyStardust";
import { useSoundManager } from "@/hooks/useSoundManager";

const FloatingScene = dynamic(() => import("./FloatingScene"), { ssr: false });

/** 한 글자 찍는 간격(ms).
    useSoundManager 는 타이핑 소리를 50ms 안에 겹치면 버린다 — 그보다 조금 길게 잡아야
    글자마다 소리가 하나씩 난다. 42ms 로 뒀더니 대부분 걸러져 두어 번만 났다. */
const TYPE_INTERVAL_MS = 55;
/** 말풍선이 화면 끝에서 남겨 두는 여백(px). */
const BUBBLE_EDGE_PAD = 12;
const TAIL_SIZE = 10;
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
  const screenPosRef = useRef({ x: 0, y: 0 });
  const smileRef = useRef(false);
  const scrollVelRef = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  /** 말풍선 크기 — 글이 바뀔 때만 다시 잰다. */
  const bubbleSizeRef = useRef({ w: 0, h: 0 });
  const bubbleTextRef = useRef<HTMLDivElement>(null);
  const bubbleTailRef = useRef<HTMLDivElement>(null);
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

  const cameraConfig = useMemo(
    () => ({
      position: [0, 0, 8] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 100,
    }),
    []
  );

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
     transform 이 아니라 left/top 으로 옮긴다. transform 은 stacking context 를 만들고,
     그러면 안쪽 글자의 반전(mix-blend-mode: difference)이 페이지가 아니라 말풍선 자신을
     대상으로 계산돼 흰 글자가 흰 글자로 남는다. 가운데·아래 정렬은 크기를 재서 직접 뺀다.
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
      const left = `${Math.max(BUBBLE_EDGE_PAD, Math.min(window.innerWidth - w - BUBBLE_EDGE_PAD, rawLeft))}px`;
      const top = `${screenPosRef.current.y + BUBBLE_OFFSET_Y - h}px`;
      el.style.left = left;
      el.style.top = top;
      const txt = bubbleTextRef.current;
      if (txt) { txt.style.left = left; txt.style.top = top; }
      /* 꼬리는 껍데기 크기와 무관하다 — 말풍선 아래 끝이 곧 몽이 쪽을 가리키는 지점이다. */
      const tail = bubbleTailRef.current;
      if (tail) {
        tail.style.left = `${screenPosRef.current.x - TAIL_SIZE / 2}px`;
        tail.style.top = `${screenPosRef.current.y + BUBBLE_OFFSET_Y - TAIL_SIZE / 2}px`;
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
      {/* 캔버스보다 앞에 둬서 몽이 뒤에 깔린다 — 별가루가 캐릭터를 덮으면 안 된다. */}
      <BunnyStardust screenPosRef={screenPosRef} />
      <Canvas
        camera={cameraConfig}
        dpr={dpr}
        gl={(d) =>
          createSafeRenderer(d, {
            alpha: true,
            antialias: !isTouch,
            powerPreference: "high-performance",
          })
        }
        style={{ background: "transparent" }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <FloatingScene
            theme={theme}
            isMobile={isMobile}
            mouseNDC={mouseNDC}
            pointerActive={pointerActive}
            screenPosRef={screenPosRef}
            smileRef={smileRef}
            scrollVelRef={scrollVelRef}
          />
        </Suspense>
      </Canvas>
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
          둘은 같은 rAF 에서 같은 left/top 을 받고 글·여백·글꼴이 같아 정확히 겹친다. */}
      <div
        ref={bubbleRef}
        className={`${styles.speechBubble} ${showBubble ? styles.speechBubbleVisible : ""}`}
        aria-hidden
      >
        {bubbleText}
      </div>
      {/* 꼬리도 따로 띄운다. 껍데기 안에 두면 껍데기에 건 mask(꼬리 자리의 테두리를 도려내는)에
          같이 잘려 사라진다 — mask 는 가상요소·자식까지 함께 자른다. */}
      <div
        ref={bubbleTailRef}
        className={`${styles.speechBubbleTail} ${showBubble ? styles.speechBubbleVisible : ""}`}
        aria-hidden
      />
      <div
        ref={bubbleTextRef}
        className={`${styles.speechBubbleText} ${showBubble ? styles.speechBubbleVisible : ""}`}
      >
        <span ref={typedRef} />
        <span ref={caretRef} className={styles.caret} />
      </div>
    </>
  );
}
