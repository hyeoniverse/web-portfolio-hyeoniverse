import { clsx, type ClassValue } from "clsx";

/**
 * 클래스명 조합 유틸.
 *
 * 이 프로젝트는 CSS Modules 기반이라 `cn()` 에 들어오는 값은 전부 해시된 `styles.*` 이거나
 * 커스텀 클래스다. Tailwind 유틸리티 클래스를 병합하는 호출은 없으므로 `tailwind-merge`
 * (클래스 충돌 해결 전용, gzip 9 kB) 를 걷어내고 `clsx` 만 쓴다.
 *
 * 나중에 Tailwind 유틸을 동적으로 조합하게 되면 그때 다시 도입한다 — 지금은 전 라우트가
 * 쓰지 않는 기능의 비용만 치르고 있었다.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
