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

  // WebGL 컨텍스트 생성 실패 시 (GPU 프로세스 다운 등) 빈 캔버스라도 반환
  try {
    return new WebGLRenderer({ ...defaults, ...options });
  } catch {
    console.warn("[createSafeRenderer] WebGL context creation failed — browser restart may be needed.");
    // fallback: 최소 옵션으로 재시도
    try {
      return new WebGLRenderer({ ...defaults });
    } catch {
      // 완전 실패 — 더미 renderer (R3F 크래시 방지)
      return new WebGLRenderer({
        canvas: document.createElement("canvas"),
      });
    }
  }
}
