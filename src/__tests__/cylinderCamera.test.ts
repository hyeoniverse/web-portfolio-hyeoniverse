import { describe, it, expect } from "vitest";
import {
  cylinderCamera,
  visibleWallAngle,
  CAMERA_Z,
  CAMERA_FOV,
  RADIUS,
  SLOT_ANGLE,
} from "@/app/works/_components/layouts/cylinder/scene";

/* 원통 카메라 — andreasantonsson.dev 의 카메라를 옮겼다. 그 원통은 반지름을 4 × 화면비로 두고 카메라를
   가로 화면 z=3, 세로 화면 z=5 에 둔다(시야각 35°). 반지름을 고정한 이 씬에서는 반지름 × 0.75/화면비(가로),
   1.25/화면비(세로)다. 판들은 띠처럼 돌아서 칸이 적으면 이음매(±띠 길이/2)가 생기는데, 그게 화면에 들면
   빈 곳이 보인다 — 그때는 카메라를 당긴다. */

const loopOf = (slots: number) => SLOT_ANGLE * slots;
const SIZES: [number, number][] = [[1440, 900], [1280, 800], [1920, 1080], [2560, 1080], [1024, 768], [768, 1024], [390, 844], [320, 568]];

describe("cylinderCamera", () => {
  it("칸이 넉넉하면 레퍼런스의 거리 그대로다", () => {
    expect(cylinderCamera(1280, 800, loopOf(8))).toEqual({ z: (RADIUS * 0.75) / 1.6, fov: CAMERA_FOV });
    expect(cylinderCamera(390, 844, loopOf(8)).z).toBeCloseTo((RADIUS * 1.25) / (390 / 844), 9);
  });

  it("세로 화면에서는 카메라가 원통 밖으로 나가 먼 쪽 벽을 넓게 본다", () => {
    expect(cylinderCamera(390, 844, loopOf(8)).z).toBeGreaterThan(RADIUS);
    expect(cylinderCamera(1280, 800, loopOf(8)).z).toBeLessThan(RADIUS);
  });

  it.each([2, 3, 4, 5, 8, 12])("칸 %i 개: 어느 화면에서도 이음매가 화면 끝보다 바깥에 있다", (slots) => {
    const seam = loopOf(slots) / 2;
    for (const [w, h] of SIZES) {
      const { z, fov } = cylinderCamera(w, h, loopOf(slots));
      expect(visibleWallAngle(z, fov), `${w}×${h}`).toBeLessThan(seam);
    }
  });

  it("이음매 때문에 당길 때만 레퍼런스보다 가깝다", () => {
    // 두 칸(90°)이면 세로 화면은 이음매가 보여 당기고, 가로 화면은 그대로 둔다
    expect(cylinderCamera(390, 844, loopOf(2)).z).toBeLessThan(cylinderCamera(390, 844, loopOf(8)).z);
    expect(cylinderCamera(1280, 800, loopOf(2)).z).toBe(cylinderCamera(1280, 800, loopOf(8)).z);
  });

  it("크기를 아직 모르면(0) 기본값", () => {
    expect(cylinderCamera(0, 0)).toEqual({ z: CAMERA_Z, fov: CAMERA_FOV });
  });
});

describe("visibleWallAngle", () => {
  it("카메라가 축에 있으면 시야각의 절반만큼 보인다", () => {
    expect(visibleWallAngle(0, 35)).toBeCloseTo((35 / 2) * (Math.PI / 180), 9);
  });

  it("멀어질수록 먼 쪽 벽이 더 넓게 보인다", () => {
    expect(visibleWallAngle(RADIUS, 35)).toBeGreaterThan(visibleWallAngle(RADIUS / 2, 35));
  });

  it("구한 각의 벽 점이 정확히 화면 위끝에 걸린다", () => {
    const z = RADIUS * 0.6;
    const th = visibleWallAngle(z, 35);
    const seen = Math.atan((RADIUS * Math.sin(th)) / (z + RADIUS * Math.cos(th)));
    expect(seen).toBeCloseTo((35 / 2) * (Math.PI / 180), 9);
  });
});
