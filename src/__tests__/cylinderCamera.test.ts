import { describe, it, expect } from "vitest";
import { cylinderCamera, CAMERA_Z, CAMERA_FOV, RADIUS } from "@/app/works/_components/layouts/cylinder/scene";

/* 원통 카메라(#940). 좁은 화면에서 카메라가 뒤로 물러나다 원통 벽(RADIUS)을 넘으면, 카메라 바로 앞의 판이 near 평면
   (0.1) 안으로 들어와 화면을 덮었다(폭 358px 이하). 이제 벽 앞에서 멈추고 시야각을 넓혀 먼 쪽 판을 같은 크기로 본다. */

const halfTan = (fov: number) => Math.tan((fov * Math.PI) / 360);
/** 옛 식 — 기준 1400×800 보다 작으면 9 ÷ 배율 만큼 물러난다 */
const oldZ = (w: number, h: number) => CAMERA_Z / Math.min(1, w / 1400, h / 800);

describe("cylinderCamera", () => {
  it("카메라는 어느 폭에서도 원통 안에 있다 — 가까운 쪽 판은 카메라 뒤", () => {
    for (let w = 200; w <= 1600; w += 1) {
      expect(cylinderCamera(w, 740).z, `폭 ${w}`).toBeLessThan(RADIUS);
    }
    expect(cylinderCamera(358, 740).z).toBeLessThan(RADIUS);
    expect(oldZ(358, 740) - RADIUS, "옛 식은 358 에서 벽 밖 0.1 을 넘었다").toBeGreaterThan(0.1);
  });

  it("먼 쪽 판은 옛 식과 같은 크기로 보인다", () => {
    for (const [w, h] of [[320, 740], [358, 740], [390, 844], [768, 1024], [1440, 900]]) {
      const { z, fov } = cylinderCamera(w, h);
      // 먼 쪽 판(축 너머 RADIUS)에서 화면 절반 높이가 덮는 길이
      expect(halfTan(fov) * (z + RADIUS), `${w}×${h}`).toBeCloseTo(halfTan(CAMERA_FOV) * (oldZ(w, h) + RADIUS), 6);
    }
  });

  it("벽에 닿지 않는 폭은 옛 식 그대로다", () => {
    for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
      expect(cylinderCamera(w, h)).toEqual({ z: oldZ(w, h), fov: CAMERA_FOV });
    }
  });

  it("크기를 아직 모르면(0) 기본값", () => {
    expect(cylinderCamera(0, 0)).toEqual({ z: CAMERA_Z, fov: CAMERA_FOV });
  });
});
