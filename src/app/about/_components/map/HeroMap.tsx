"use client";

/* 첫 화면 목차 — 장 별자리 지도. 별(이름)을 고르면 카메라가 그 별로 날아 들어간 뒤 그 장의 첫머리로 옮겨 간다 */
import { useState } from "react";
import { useLenis } from "@/providers/LenisProvider";
import { usePrezi } from "../prezi/context";
import ChapterMap, { starOrigin } from "./ChapterMap";
import styles from "./ChapterMap.module.css";

const FLY_MS = 800;

export default function HeroMap() {
  const [flying, setFlying] = useState<string | null>(null);
  const { scrollTo } = useLenis();
  const prezi = usePrezi();
  const pick = (href: string) => {
    /* 프레지 안에서는 카메라가 그 장으로 날아간다 */
    if (prezi) {
      prezi.goTo(href);
      return;
    }
    if (flying) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scrollTo(href, { immediate: true });
      return;
    }
    setFlying(href);
    window.setTimeout(() => {
      scrollTo(href, { immediate: true });
      /* 옮겨 간 뒤 지도를 제자리로 — 위로 돌아오면 다시 보인다 */
      window.setTimeout(() => setFlying(null), 50);
    }, FLY_MS);
  };
  return (
    <nav aria-label="Chapters">
      <ChapterMap
        className={styles.heroMap}
        focus={flying}
        onPick={pick}
        flying={!!flying}
        style={{ transformOrigin: flying ? starOrigin(flying) : undefined }}
      />
    </nav>
  );
}
