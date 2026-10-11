"use client";

/* 데모의 짧은 대본 — 화면에 들어오면 정해 둔 동작을 한 번 저절로 해 보이고, 방문자가 손을 대면 그 자리에서 멈춘다.
   아무것도 누르지 않은 사람도 무엇을 하는 화면인지 알게 하고, 그다음은 직접 만지게 둔다. 움직임 줄이기면 돌리지 않는다 */
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import Pressable from "@/components/ui/Pressable";
import { RotateCcw } from "@/components/icons";
import { useL } from "../../features/shared";
import { shell } from "./data";
import { useInViewOnce } from "./useInView";
import styles from "./CmsDemos.module.css";

/** [앞 동작에서 기다릴 ms, 할 일] — 할 일은 나중에 불리므로 함수형 setState · dispatch · ref 만 쓴다 */
export type Cue = [wait: number, run: () => void];

export interface Script {
  boxRef: React.RefObject<HTMLDivElement | null>;
  playing: boolean;
  stop: () => void;
}

export function useScript(cues: () => Cue[]): Script {
  const { ref, seen } = useInViewOnce<HTMLDivElement>(0.35);
  const timers = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const stop = useCallback(() => {
    if (!timers.current.length) return;
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPlaying(false);
  }, []);
  const build = useEffectEvent(cues);
  useEffect(() => {
    if (!seen || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let at = 0;
    const ids = [window.setTimeout(() => setPlaying(true), 0)];
    for (const [wait, run] of build()) {
      at += wait;
      ids.push(window.setTimeout(run, at));
    }
    ids.push(
      window.setTimeout(() => {
        timers.current = [];
        setPlaying(false);
      }, at + 400),
    );
    timers.current = ids;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [seen]);
  return { boxRef: ref, playing, stop };
}

/** 처음부터 다시 — 데모를 띄운 쪽(About 의 관리자 장면)이 넘겨 주면 상태 칩 끝에 붙는다 */
export const DemoReplayContext = createContext<(() => void) | null>(null);

/** 대본 상태 — 데모를 띄운 쪽이 받아서 상태 칩을 자기 자리(설명 옆 등)에 그린다. 받는 쪽이 없으면 데모 위에 그린다 */
export type DemoStatus = { playing: boolean; stop: () => void };
export const DemoStatusContext = createContext<((s: DemoStatus | null) => void) | null>(null);

/** 상태 칩 — 자동 재생 중이면 깜빡이는 점과 안내, 끝나면 '해 볼 차례'와 처음부터 */
export function DemoChip({ playing, onReplay }: { playing: boolean; onReplay?: (() => void) | null }) {
  const t = useL();
  return (
    <div className={styles.auto} data-on={playing || undefined}>
      <p className={styles.autoText} aria-live="polite">
        <i aria-hidden="true" />
        {t(playing ? shell.playing : shell.yourTurn)}
      </p>
      {onReplay && !playing && (
        <Pressable className={styles.autoReplay} onClick={onReplay}>
          <RotateCcw aria-hidden="true" />
          {t(shell.replay)}
        </Pressable>
      )}
    </div>
  );
}

/** 데모 한 칸 — 대본이 도는 동안은 그렇다고 알리고, 누르거나 키를 치면 대본을 멈춘다 */
export function DemoShell({ boxRef, playing, stop, children }: Script & { children: ReactNode }) {
  const replay = useContext(DemoReplayContext);
  const report = useContext(DemoStatusContext);
  useEffect(() => {
    if (!report) return;
    report({ playing, stop });
  }, [report, playing, stop]);
  useEffect(() => () => report?.(null), [report]);
  return (
    <div ref={boxRef} className={styles.demo} onPointerDownCapture={stop} onKeyDownCapture={stop}>
      {!report && <DemoChip playing={playing} onReplay={replay} />}
      {children}
    </div>
  );
}
