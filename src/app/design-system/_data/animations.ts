export const ease = [0.25, 0.1, 0.25, 1] as const;

export const staggerContainer = {
  hidden: { transition: { staggerChildren: 0.07, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.08, ...(d != null && { delayChildren: d }) },
  }),
};

export const staggerItem = {
  hidden: (d?: number) => ({
    opacity: 0, y: 20,
    transition: { duration: 0.3, ease, ...(d != null && d > 0 && { delay: d }) },
  }),
  visible: (d?: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, ...(d != null && { delay: d }), ease },
  }),
};

export const staggerItemX = {
  hidden: (d?: number | [number, number]) => ({
    opacity: 0, x: -24,
    transition: {
      duration: 0.3, ease,
      delay: Array.isArray(d) ? d[1] : (typeof d === "number" && d > 0 ? d : 0),
    },
  }),
  visible: (d?: number | [number, number]) => ({
    opacity: 1, x: 0,
    transition: {
      duration: 0.4, ease,
      delay: Array.isArray(d) ? d[0] : (typeof d === "number" ? d : 0),
    },
  }),
};

export const innerStagger = {
  hidden: { transition: { staggerChildren: 0.05, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.05, ...(d != null && { delayChildren: d }) },
  }),
};

export const innerStaggerFast = {
  hidden: { transition: { staggerChildren: 0.035, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.03, ...(d != null && { delayChildren: d }) },
  }),
};

export const viewportOpts = { once: false, amount: 0.2, margin: "-18% 0px -18% 0px" } as const;

// 시퀀스 딜레이 카운터
export function createSequence(step = 0.15) {
  let _seq = 0;
  return () => { const v = _seq; _seq += step; return v; };
}

// 단독 요소용: scrollMode 에서도 whileInView 유지
export function makeVp(ready: boolean, scrollMode: boolean, isExiting: boolean) {
  return (delay: number) =>
    isExiting
      ? { animate: "hidden" as const, custom: delay }
      : scrollMode
        ? { whileInView: "visible" as const, viewport: viewportOpts }
        : ready
          ? { animate: "visible" as const, custom: delay }
          : {};
}

// 컨테이너 부모용: scrollMode 에서는 빈 객체
export function makeVpGroup(ready: boolean, scrollMode: boolean, isExiting: boolean) {
  return (delay: number) =>
    isExiting
      ? { animate: "hidden" as const, custom: delay }
      : scrollMode
        ? {}
        : ready
          ? { animate: "visible" as const, custom: delay }
          : {};
}

// 수평 자식 (staggerItemX)
export function makeScrollChildX(scrollMode: boolean, isExiting: boolean) {
  return (i: number, total: number) =>
    !isExiting && scrollMode
      ? {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: viewportOpts,
          custom: [i * 0.05, (total - 1 - i) * 0.05] as [number, number],
        }
      : {};
}

// 수직 자식 (staggerItem)
export function makeScrollChildY(scrollMode: boolean, isExiting: boolean) {
  return (i: number) =>
    !isExiting && scrollMode
      ? {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: viewportOpts,
          custom: i * 0.05,
        }
      : {};
}
