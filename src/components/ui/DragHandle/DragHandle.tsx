"use client";

import type { ComponentProps } from "react";
import { GripDotsIcon } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./DragHandle.module.css";

/**
 * 순서를 바꾸는 끌기 손잡이.
 *
 * dnd-kit 의 attributes·listeners 를 그대로 펼쳐 넘겨 쓴다. 초점이 손잡이에 오므로 키보드만
 * 쓰는 경우에도 순서를 바꿀 수 있다.
 *
 * data-draggable 은 커스텀 커서(CursorTrail)에게 "여기서는 끌기 커서를 그려라" 라고 말하는 표시다.
 * 손잡이마다 따로 적으면 빠뜨리는 곳이 생기므로 여기 한 번만 둔다 — 손잡이를 새로 만드는 화면은
 * 이 컴포넌트를 쓰면 커서까지 같이 따라온다.
 */
export default function DragHandle({
  className = "",
  label,
  ...rest
}: ComponentProps<typeof Pressable> & { label?: string }) {
  const { language } = useLanguage();
  return (
    <Pressable
      className={`${styles.handle} ${className}`}
      data-draggable
      soundDisabled
      noTapScale
      aria-label={label ?? (language === "ko" ? "끌어서 순서 바꾸기" : "Drag to reorder")}
      {...rest}
    >
      <GripDotsIcon />
    </Pressable>
  );
}
