import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speak } from "@/lib/speech";

/* 크롬처럼 구는 가짜 speechSynthesis — cancel 은 늦게(다음 틱) 처리되고, 그때 대기열에 있던 발화는
   읽지 않은 채 end 를 받는다. 그 사이에 새로 넣은 발화도 같이 버려진다. 읽기는 넣은 뒤 10ms 에 시작해 30ms 에 끝난다 */
class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installFakeSynth() {
  let queue: FakeUtterance[] = [];
  let cancelPending = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const synth = {
    speaking: false,
    pending: false,
    getVoices: () => [],
    speak(u: FakeUtterance) {
      queue.push(u);
      synth.pending = true;
      timers.push(setTimeout(() => {
        if (!queue.includes(u)) return;
        synth.speaking = true;
        u.onstart?.();
        timers.push(setTimeout(() => {
          if (!queue.includes(u)) return;
          queue = queue.filter((q) => q !== u);
          synth.speaking = queue.length > 0;
          synth.pending = queue.length > 0;
          u.onend?.();
        }, 20));
      }, 10));
    },
    cancel() {
      if (cancelPending) return;
      cancelPending = true;
      /* 늦은 cancel — 그 사이 들어온 발화까지 끝(end)으로 버린다 */
      timers.push(setTimeout(() => {
        cancelPending = false;
        const dropped = queue;
        queue = [];
        synth.speaking = false;
        synth.pending = false;
        dropped.forEach((u) => u.onend?.());
      }, 5));
    },
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  (globalThis as unknown as { SpeechSynthesisUtterance: typeof FakeUtterance }).SpeechSynthesisUtterance = FakeUtterance;
  return synth;
}

describe("speak — 끊은 직후 다시 읽기", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installFakeSynth();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("짧은 조각을 끊고 바로 다음 조각을 넣어도, 다음 조각이 읽히기 전에 끝난 것으로 치지 않는다", () => {
    const endA = vi.fn();
    const endB = vi.fn();
    const stopA = speak("가", endA)!;
    vi.advanceTimersByTime(12); // A 가 읽기 시작
    stopA(); // 다음 단추 — A 를 끊고
    speak("나", endB); // 바로 B 를 넣는다
    vi.advanceTimersByTime(6); // 늦은 cancel 이 처리되는 때
    expect(endA).not.toHaveBeenCalled();
    expect(endB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200); // B 가 실제로 읽히고 끝난다
    expect(endB).toHaveBeenCalledTimes(1);
  });

  it("읽기 시작하지 않은 채 버려진 발화의 end 로는 넘어가지 않는다", () => {
    const end = vi.fn();
    speak("가", end);
    window.speechSynthesis.cancel(); // 다른 쪽이 끊는다 — 대기 중이던 발화가 읽지 않은 채 end 를 받는다
    vi.advanceTimersByTime(6);
    expect(end).not.toHaveBeenCalled();
  });
});
