"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "@/components/icons";
import { speak, speechLangOf, warmUpVoices } from "@/lib/speech";
import Pressable from "@/components/ui/Pressable";
import styles from "./ListenButton.module.css";

/* 글 읽어 주기 — 상세 헤더 메타 줄, 공유 버튼 옆. 규격은 ShareButton 의 compact 와 같다.
   읽을 글은 누르는 순간 화면의 본문(.prose-content)에서 뽑는다 — 번역해 보여 주는 중이면 그 언어로 읽는다.
   코드 · 수식 · 코드블록 바처럼 소리로 읽어 봐야 소용없는 부분은 뺀다. */

const SKIP = "pre, code, .katex, svg, button, figure, [aria-hidden='true'], script, style";

function articleText(title: string): string {
  const prose = document.querySelector<HTMLElement>(".prose-content");
  if (!prose) return title;
  const copy = prose.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(SKIP).forEach((el) => el.remove());
  /* 블록 사이에 줄바꿈을 넣어 문장이 붙어 읽히지 않게 한다 */
  copy.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, td").forEach((el) => el.append("\n"));
  return `${title}\n${copy.textContent ?? ""}`.trim();
}

const noop = () => () => {};

export default function ListenButton({ title, className }: { title: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  /* 서버에선 그리지 않고, 음성 합성이 없는 브라우저면 버튼을 숨긴다 */
  const supported = useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    warmUpVoices();
    /* 다른 글로 옮겨 가면 읽던 것을 멈춘다 */
    return () => { stopRef.current?.(); };
  }, []);

  const toggle = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
      setPlaying(false);
      return;
    }
    const text = articleText(title);
    const done = () => { stopRef.current = null; setPlaying(false); };
    const lang = document.querySelector(".prose-content")?.closest("[lang]")?.getAttribute("lang");
    const stop = speak(text, done, done, undefined, lang?.startsWith("en") ? "en-US" : lang?.startsWith("ko") ? "ko-KR" : speechLangOf(text));
    if (!stop) return;
    stopRef.current = stop;
    setPlaying(true);
  }, [title]);

  if (!supported) return null;

  return (
    <Pressable
      type="button"
      className={`${styles.compact}${playing ? ` ${styles.playing}` : ""}${className ? ` ${className}` : ""}`}
      onClick={toggle}
      title={playing ? "Stop reading" : "Read aloud"}
      aria-pressed={playing}
      data-clickable="true"
    >
      {playing ? <Square size={11} /> : <Volume2 size={13} />}
      <span className={styles.label}>{playing ? "Stop" : "Listen"}</span>
    </Pressable>
  );
}
