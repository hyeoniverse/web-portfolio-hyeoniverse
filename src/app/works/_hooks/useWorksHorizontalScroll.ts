"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  SCROLL_LERP,
  VELOCITY_DECAY,
  MOUSE_EFFECT_RADIUS,
  MAX_CARD_OFFSET,
  MOUSE_SENSITIVITY,
  IMAGE_PARALLAX_MULTIPLIER,
  META_REVEAL_THRESHOLD,
} from "../_constants";
import { INFINITE_SCROLL_SETS, INITIAL_MARGIN } from "@/data/projects";

/** 엔진이 DOM 을 찾을 때 쓰는 클래스 이름. 카드·인트로 CSS 모듈이 나뉘어 있어 호출부가 넘긴다. */
export interface WorksScrollClassNames {
  card: string;
  cardImage: string;
  project: string;
  intro: string;
  metaCategory: string;
  metaYear: string;
  metaTech: string;
  metaRole: string;
  metaDesc: string;
}

/* ── flow 레이아웃 데스크탑 수평 스크롤 엔진 ──
   휠 입력을 targetScrollX 에 쌓고 매 프레임 lerp 로 따라가며 슬라이더를 x 이동시킨다.
   같은 루프가 마우스 속도 기반 카드 오프셋·3D tilt·이미지 패럴랙스·메타 reveal 까지 한 번에 계산한다.
   무한 스크롤이면 한 세트 너비로 래핑하고, 아니면 트랙 끝에서 클램프한다.
   카드 롱프레스 확대는 useWorkTransition 이 card.dataset.hoverScale 로 넘겨주고 여기서 곱한다. */
/* 가운데에서 몇 벌만큼 벗어나면 되감을지. 그려 둔 벌 수(INFINITE_SCROLL_SETS)의 절반이어야
   되감기는 순간에도 화면 양옆에 이어질 내용이 남아 있다. */
const WRAP_SETS = Math.floor(INFINITE_SCROLL_SETS / 2);

export function useWorksHorizontalScroll({
  galleryRef,
  sliderRef,
  enabled,
  infiniteScroll,
  projectCount,
  cls,
  onActiveIndex,
  onIntroVisible,
}: {
  galleryRef: RefObject<HTMLDivElement | null>;
  sliderRef: RefObject<HTMLDivElement | null>;
  /** 데스크탑 가로 레이아웃일 때만 돈다 */
  enabled: boolean;
  infiniteScroll: boolean;
  projectCount: number;
  cls: WorksScrollClassNames;
  onActiveIndex: (index: number) => void;
  onIntroVisible: (visible: boolean) => void;
}) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const gallery = galleryRef.current;
    const slider = sliderRef.current;
    if (!gallery || !slider) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${cls.card}`, slider);
      const cardImages = gsap.utils.toArray<HTMLElement>(
        `.${cls.cardImage}`,
        slider,
      );
      const projectItems = gsap.utils.toArray<HTMLElement>(
        `.${cls.project}`,
        slider,
      );

      if (cards.length === 0) return;

      // 시작 위치: 무한이면 중간 인트로, 아니면 첫 인트로
      const introEls = slider.querySelectorAll(`.${cls.intro}`);
      const startIntro = infiniteScroll
        ? (introEls[Math.floor(introEls.length / 2)] as HTMLElement)
        : (introEls[0] as HTMLElement);
      const initialX = startIntro
        ? -(startIntro.offsetLeft - INITIAL_MARGIN)
        : -(projectItems[0].offsetLeft - INITIAL_MARGIN);

      // 무한 래핑을 위한 한 세트 너비 계산
      let oneSetWidth = 0;
      if (introEls.length >= 2) {
        oneSetWidth =
          (introEls[1] as HTMLElement).offsetLeft -
          (introEls[0] as HTMLElement).offsetLeft;
      }

      // 전체 트랙 너비 (클램프용)
      const totalWidth = slider.scrollWidth;

      // 스크롤 상태
      let scrollX = 0;
      let targetScrollX = 0;
      let velocity = 0;
      let imageOffset = 0;
      let targetImageOffset = 0;

      // 마우스 상태
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();
      let mouseVelocityX = 0;
      let mouseVelocityY = 0;

      // 요소별 오프셋
      const cardOffsets = cards.map(() => ({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        rotateX: 0,
        rotateY: 0,
        targetRotateX: 0,
        targetRotateY: 0,
        hoverScale: 1,
        targetHoverScale: 1,
      }));
      const imageOffsets = cardImages.map(() => ({
        x: 0,
        y: 0,
        scale: 1.2,
        targetX: 0,
        targetY: 0,
      }));

      // 이벤트 핸들러
      const handleMouseMove = (e: MouseEvent) => {
        const now = performance.now();
        const dt = (now - lastMouseTime) / 1000;

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (dt > 0) {
          mouseVelocityX = (e.clientX - lastMouseX) / dt;
          mouseVelocityY = (e.clientY - lastMouseY) / dt;
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastMouseTime = now;
      };

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetScrollX += e.deltaY;
      };

      gallery.addEventListener("mousemove", handleMouseMove);
      gallery.addEventListener("wheel", handleWheel, { passive: false });
      /* 전역 Lenis 는 defaultPrevented 를 보지 않아, 위 preventDefault 만으로는 세로 스크롤을 못 막는다.
         페이지에 세로 여지가 생기는 순간 가로와 세로가 같이 움직인다 — 프로필에서 난 문제와 같은 자리다(#1045).
         여기는 끝에서 세로로 넘기는 처리가 없어 늘 가로가 가져가므로 표시를 계속 켜 둔다. */
      gallery.setAttribute("data-lenis-prevent-wheel", "");

      // 초기 위치 설정
      gsap.set(slider, { x: initialX });

      // 애니메이션 루프
      const animate = () => {
        // 부드러운 스크롤 보간
        const prevScrollX = scrollX;
        scrollX += (targetScrollX - scrollX) * SCROLL_LERP;
        velocity = scrollX - prevScrollX;

        // 이미지 패럴랙스 + 속도 기울기
        targetImageOffset = gsap.utils.clamp(-80, 80, -velocity * 2.5);
        imageOffset += (targetImageOffset - imageOffset) * 0.08;

        // 무한 스크롤 래핑 또는 클램프
        if (infiniteScroll && oneSetWidth > 0) {
          while (scrollX > oneSetWidth * WRAP_SETS) {
            scrollX -= oneSetWidth;
            targetScrollX -= oneSetWidth;
          }
          while (scrollX < -oneSetWidth * WRAP_SETS) {
            scrollX += oneSetWidth;
            targetScrollX += oneSetWidth;
          }
        } else if (!infiniteScroll) {
          const maxScroll = totalWidth - window.innerWidth + initialX;
          targetScrollX = gsap.utils.clamp(0, maxScroll, targetScrollX);
          scrollX = gsap.utils.clamp(0, maxScroll, scrollX);
        }

        // 슬라이더 위치 업데이트
        gsap.set(slider, { x: initialX - scrollX });

        /* 활성 인덱스 업데이트 — 화면 가운데에 가장 가까운 카드가 지금 보고 있는 작품이다.
           전에는 "왼쪽 변이 화면에 들어온 마지막 카드" 로 잡아, 다음 카드가 오른쪽 끝에 겨우
           걸치기만 해도 아래 제목이 먼저 바뀌었다(#1062) */
        const viewCenter = window.innerWidth / 2;
        let activeIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect();
          const dist = Math.abs((rect.left + rect.right) / 2 - viewCenter);
          if (dist < bestDist) {
            bestDist = dist;
            activeIdx = i;
          }
        }
        onActiveIndex(activeIdx % projectCount);

        // intro가 화면에 보이면 고정 타이틀 숨김
        let introOnScreen = false;
        for (let i = 0; i < introEls.length; i++) {
          const rect = (introEls[i] as HTMLElement).getBoundingClientRect();
          if (rect.right > 0 && rect.left < window.innerWidth) {
            introOnScreen = true;
            break;
          }
        }
        onIntroVisible(introOnScreen);

        // 마우스 속도 감쇄
        mouseVelocityX *= VELOCITY_DECAY;
        mouseVelocityY *= VELOCITY_DECAY;

        // 카드별 효과 업데이트
        cards.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
          const normalizedDist = Math.min(1, distance / MOUSE_EFFECT_RADIUS);
          const strength = Math.pow(1 - normalizedDist, 2);

          // 카드 오프셋
          cardOffsets[i].targetX = gsap.utils.clamp(
            -MAX_CARD_OFFSET,
            MAX_CARD_OFFSET,
            mouseVelocityX * MOUSE_SENSITIVITY * strength,
          );
          cardOffsets[i].targetY = gsap.utils.clamp(
            -MAX_CARD_OFFSET,
            MAX_CARD_OFFSET,
            mouseVelocityY * MOUSE_SENSITIVITY * strength,
          );
          cardOffsets[i].x +=
            (cardOffsets[i].targetX - cardOffsets[i].x) * 0.04;
          cardOffsets[i].y +=
            (cardOffsets[i].targetY - cardOffsets[i].y) * 0.04;

          // 3D tilt — 마우스가 카드 위에 있을 때
          const isHovering = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
          if (isHovering) {
            const relX = (mouseX - rect.left) / rect.width - 0.5; // -0.5 ~ 0.5
            const relY = (mouseY - rect.top) / rect.height - 0.5;
            cardOffsets[i].targetRotateY = relX * 8; // max ±4deg
            cardOffsets[i].targetRotateX = -relY * 6; // max ±3deg
            cardOffsets[i].targetHoverScale = 1.02;
          } else {
            cardOffsets[i].targetRotateX = 0;
            cardOffsets[i].targetRotateY = 0;
            cardOffsets[i].targetHoverScale = 1;
          }
          cardOffsets[i].rotateX += (cardOffsets[i].targetRotateX - cardOffsets[i].rotateX) * 0.08;
          cardOffsets[i].rotateY += (cardOffsets[i].targetRotateY - cardOffsets[i].rotateY) * 0.08;
          cardOffsets[i].hoverScale += (cardOffsets[i].targetHoverScale - cardOffsets[i].hoverScale) * 0.08;

          const scale = parseFloat(card.dataset.hoverScale || "1") * cardOffsets[i].hoverScale;
          gsap.set(card, {
            x: cardOffsets[i].x,
            y: cardOffsets[i].y,
            scale,
            rotateX: cardOffsets[i].rotateX,
            rotateY: cardOffsets[i].rotateY,
          });

          // 이미지 오프셋 (패럴랙스)
          if (cardImages[i]) {
            imageOffsets[i].targetX =
              cardOffsets[i].targetX * IMAGE_PARALLAX_MULTIPLIER;
            imageOffsets[i].targetY =
              cardOffsets[i].targetY * IMAGE_PARALLAX_MULTIPLIER;
            imageOffsets[i].x +=
              (imageOffsets[i].targetX - imageOffsets[i].x) * 0.035;
            imageOffsets[i].y +=
              (imageOffsets[i].targetY - imageOffsets[i].y) * 0.035;

            const imgScale = isHovering ? 1.3 : 1.2;
            imageOffsets[i].scale = (imageOffsets[i].scale || 1.2) + (imgScale - (imageOffsets[i].scale || 1.2)) * 0.06;
            gsap.set(cardImages[i], {
              x: imageOffset + imageOffsets[i].x,
              y: imageOffsets[i].y,
              scale: imageOffsets[i].scale,
            });
          }

          // 메타데이터 reveal — 카드가 뷰포트에 들어오면 fade in
          const project = card.closest(`.${cls.project}`) as HTMLElement | null;
          if (project) {
            const rect = card.getBoundingClientRect();
            const viewportCenter = window.innerWidth * META_REVEAL_THRESHOLD;
            const progress = gsap.utils.clamp(0, 1, 1 - (rect.left - viewportCenter * 0.3) / viewportCenter);
            const metas = project.querySelectorAll(`.${cls.metaCategory}, .${cls.metaYear}, .${cls.metaTech}, .${cls.metaRole}, .${cls.metaDesc}`);
            metas.forEach((meta, mi) => {
              const delay = mi * 0.06;
              const p = gsap.utils.clamp(0, 1, (progress - delay) / (1 - delay));
              gsap.set(meta, { opacity: p, y: (1 - p) * 20 });
            });
          }
        });

        rafId = requestAnimationFrame(animate);
      };

      let rafId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(rafId);
        gallery.removeEventListener("mousemove", handleMouseMove);
        gallery.removeEventListener("wheel", handleWheel);
        gallery.removeAttribute("data-lenis-prevent-wheel");
      };
    }, gallery);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [enabled, galleryRef, sliderRef, cls, infiniteScroll, projectCount, onActiveIndex, onIntroVisible]);
}
