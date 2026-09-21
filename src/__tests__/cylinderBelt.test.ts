import { describe, it, expect } from "vitest";
import { SLOT_ANGLE, PANEL_ARC, PLANE_WIDTH, RADIUS, slotOffset } from "@/app/works/_components/layouts/cylinder/scene";

/* 원통의 판은 띠처럼 돈다 — 칸이 몇 개든 판 크기는 같고, 앞쪽은 빈틈없이 이어지며, 같은 판이 두 번 붙지 않는다.
   띠 길이는 칸 수 × 한 칸 각이라 칸이 적으면 한 바퀴보다 짧고, 이음매는 원통 뒤쪽(±띠 길이/2)에 온다. */

const SEG = SLOT_ANGLE;

function offsets(count: number, rot: number) {
  return Array.from({ length: count }, (_, i) => slotOffset(i, SEG, SEG * count, rot));
}

describe("slotOffset — 판 띠", () => {
  it("처음에는 인트로 칸이 앞면이다", () => {
    for (const count of [1, 2, 5, 12]) expect(slotOffset(0, SEG, SEG * count, Math.PI)).toBeCloseTo(0);
  });

  it.each([2, 3, 4, 6, 9])("칸 %i 개: 어느 회전에서든 칸이 한 칸 각 간격으로 늘어서고 띠 안에 있다", (count) => {
    const loop = SEG * count;
    for (let k = 0; k < 200; k++) {
      const rot = Math.PI + (k / 200) * loop * 3 - loop;
      const sorted = offsets(count, rot).sort((a, b) => a - b);
      for (const d of sorted) {
        expect(d).toBeGreaterThanOrEqual(-loop / 2 - 1e-9);
        expect(d).toBeLessThan(loop / 2 + 1e-9);
      }
      for (let j = 1; j < sorted.length; j++) expect(sorted[j] - sorted[j - 1]).toBeCloseTo(SEG, 9);
    }
  });

  it.each([2, 3, 4, 6, 9])("칸 %i 개: 앞면 가까이(±한 칸)는 늘 판이 덮는다 — 빈 곳은 판 사이 틈뿐이다", (count) => {
    const loop = SEG * count;
    for (let k = 0; k < 120; k++) {
      const rot = Math.PI + (k / 120) * loop;
      const ds = offsets(count, rot);
      for (let x = -SEG; x <= SEG; x += SEG / 40) {
        // 이음매에 걸린 판은 반대쪽 끝에 나머지 조각이 붙는다(VerticalCylinder 의 ghost)
        const covered = ds.some((d) => [d, d - loop, d + loop].some((c) => Math.abs(x - c) <= SEG / 2 + 1e-9));
        expect(covered, `칸 ${count}, 회전 ${rot.toFixed(3)}, 자리 ${x.toFixed(3)}`).toBe(true);
      }
    }
  });

  it("판은 칸 수와 상관없이 약 3:2 가로판이다", () => {
    // 판의 원호는 한 칸 각에서만 나온다 — 칸 수로 나누지 않는다
    const aspect = PLANE_WIDTH / (RADIUS * PANEL_ARC);
    expect(aspect).toBeGreaterThan(1.4);
    expect(aspect).toBeLessThan(1.6);
  });
});
