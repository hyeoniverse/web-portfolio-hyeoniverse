/**
 * mulberry32 — 32비트 시드 하나로 0 이상 1 미만의 난수를 뽑는 결정적 생성기.
 *
 * 렌더 안에서 `Math.random()` 을 부르면 리렌더마다 다른 값이 나와 화면이 튄다.
 * 시드를 고정해 두면 같은 시드에 늘 같은 수열이 나오므로 렌더를 몇 번 하든 결과가 같다.
 * 서버와 클라이언트가 같은 시드를 쓰면 hydration 도 어긋나지 않는다.
 *
 * 암호용이 아니다 — 시각 효과처럼 분포만 그럴듯하면 되는 곳에 쓴다.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
