"use client";

import { useRef, useLayoutEffect, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./HorizontalScrollSection.module.css";

interface HorizontalScrollSectionProps {
  children: ReactNode;
  id: string;
  className?: string;
  scrub?: number | boolean;
  showProgress?: boolean;
}

export default function HorizontalScrollSection({
  children,
  id,
  className = "",
  scrub = 1,
  showProgress = true,
}: HorizontalScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    const progress = progressRef.current;

    if (!container || !wrapper) return;

    // 콘텐츠가 완전히 렌더링될 때까지 대기
    const items = Array.from(wrapper.children) as HTMLElement[];
    if (!items.length) return;

    // 치수 계산
    const getScrollDistance = () => {
      const totalWidth = wrapper.scrollWidth;
      const viewportWidth = window.innerWidth;
      return totalWidth - viewportWidth;
    };

    const ctx = gsap.context(() => {
      // 메인 수평 스크롤 애니메이션 생성
      const horizontalTween = gsap.to(wrapper, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          id: `horizontal-${id}`,
          trigger: container,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          pin: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: () => setIsActive(true),
          onLeave: () => setIsActive(false),
          onEnterBack: () => setIsActive(true),
          onLeaveBack: () => setIsActive(false),
          onUpdate: (self) => {
            // 진행률 바 업데이트
            if (progress) {
              gsap.set(progress, { scaleX: self.progress });
            }
          },
        },
      });

      // 개별 아이템이 뷰에 들어올 때 애니메이션 적용
      items.forEach((item) => {
        gsap.fromTo(
          item,
          {
            opacity: 0.5,
            scale: 0.95,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            scrollTrigger: {
              trigger: item,
              containerAnimation: horizontalTween,
              start: "left 90%",
              end: "left 50%",
              scrub: true,
            },
          }
        );
      });
    }, container);

    // 리사이즈 처리
    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", handleResize);
    };
  }, [id, scrub]);

  return (
    <section
      id={id}
      ref={containerRef}
      className={`${styles.container} ${className}`}
    >
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        data-horizontal-wrapper
      >
        {children}
      </div>

      {/* 진행률 표시기 */}
      {showProgress && (
        <div className={`${styles.progress} ${isActive ? styles.progressActive : ""}`}>
          <div ref={progressRef} className={styles.progressBar} />
        </div>
      )}
    </section>
  );
}

// 일관된 스타일링을 위한 자식 아이템 컴포넌트 내보내기
interface HorizontalItemProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalItem({ children, className = "" }: HorizontalItemProps) {
  return (
    <div className={`${styles.item} ${className}`}>
      {children}
    </div>
  );
}
