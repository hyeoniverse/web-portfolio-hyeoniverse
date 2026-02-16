import { WebGLRenderer, WebGLRendererParameters } from "three";

/**
 * Context Lost 로그를 차단하는 WebGLRenderer 팩토리.
 * THREE.js 생성자보다 먼저 webglcontextlost 리스너를 등록하여
 * stopImmediatePropagation으로 내부 "Context Lost" 로그를 막는다.
 *
 * R3F Canvas의 `gl` prop에 직접 사용:
 * ```tsx
 * <Canvas gl={(d) => createSafeRenderer(d, { alpha: true })} />
 * ```
 */
export function createSafeRenderer(
  defaults: { canvas: EventTarget } & Record<string, unknown>,
  options?: Partial<WebGLRendererParameters>,
): WebGLRenderer {
  defaults.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    (e as Event).stopImmediatePropagation();
  });
  return new WebGLRenderer({ ...defaults, ...options });
}
