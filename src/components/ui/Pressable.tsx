"use client";

import { forwardRef, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";
import styles from "./Pressable.module.css";

/* --------------------------------------------------------------------------
   Pressable — 눌리는 것의 동작만 담는다. 생김새는 주지 않는다.

   `Button` 은 variant·size·tone 으로 **생김새까지** 정한다. 그래서 생김새가 다른 버튼
   — 절대위치로 깔린 클릭 영역, 부모 글꼴을 물려받는 페이지 번호, 필터 행 높이에 맞춘
   탭 — 은 `Button` 에 담을 수 없어 raw `<button>` 으로 남아 있었다.

   그런데 그 자리들이 놓치고 있던 건 생김새가 아니라 동작이었다. 사운드가 안 울리고,
   `type` 이 없어 폼 안에서는 제출이 되고, disabled 처리가 제각각이었다.

   그래서 담당을 나눈다 — 동작은 여기, 생김새는 쓰는 쪽. MUI 의 `ButtonBase`,
   React Aria 의 `useButton` 과 같은 구조다.

     버튼처럼 생긴 것        → <Button variant size>
     클릭되는 영역·문맥 요소  → <Pressable className={styles.내것}>

   UA 스타일 리셋은 하지 않는다 — `globals/_base.css` 가 모든 `<button>` 에 이미 하고 있다.
   -------------------------------------------------------------------------- */

type PressableProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 클릭·호버 사운드를 끈다. 반복해서 눌리는 자리(스텝퍼 등)에 쓴다. */
  soundDisabled?: boolean;
  /** 누를 때 살짝 줄어드는 반응을 끈다. 절대위치 오버레이처럼 transform 이 자리를 흔드는 곳. */
  noTapScale?: boolean;
  children?: ReactNode;
};

const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  ({ soundDisabled, noTapScale, className, disabled, type, onClick, children,
     /* framer-motion 의 motion.button 과 이름은 같지만 시그니처가 달라 spread 시 충돌한다 */
     onDrag: _onDrag, onDragStart: _onDragStart, onDragEnd: _onDragEnd,
     onAnimationStart: _onAnimationStart, onAnimationEnd: _onAnimationEnd,
     onAnimationIteration: _onAnimationIteration,
     ...rest }, ref) => {
    const { playSound } = useSoundManager();
    void _onDrag; void _onDragStart; void _onDragEnd;
    void _onAnimationStart; void _onAnimationEnd; void _onAnimationIteration;

    const handleMouseEnter = () => {
      if (!soundDisabled && !disabled) playSound("hover");
    };
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (!soundDisabled && !disabled) playSound("click");
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        {...rest}
        /* HTML 기본값이 submit 이라 폼 안에서 의도치 않게 제출된다. 여기서 막는다. */
        type={type ?? "button"}
        disabled={disabled}
        className={className ? `${styles.pressable} ${className}` : styles.pressable}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        whileTap={!disabled && !noTapScale ? { scale: 0.97 } : undefined}
      >
        {children}
      </motion.button>
    );
  },
);

Pressable.displayName = "Pressable";
export default Pressable;
