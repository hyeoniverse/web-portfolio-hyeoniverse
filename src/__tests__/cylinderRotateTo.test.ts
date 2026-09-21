import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useCylinderStage } from "@/app/works/_components/layouts/cylinder/useCylinderStage";
import { SLOT_ANGLE, wrapLoop } from "@/app/works/_components/layouts/cylinder/scene";

/* 키보드 목록에서 초점이 옮겨 가면 원통을 그 작업물로 돌린다(#938). scrollRef 는 칸 단위라 씬은 scrollRef × segAngle 만큼 돌고,
   무대 훅의 rAF 는 그 회전에서 정면에 가장 가까운 슬롯을 앞면으로 친다. 판들은 띠처럼 돌아서(slotOffset) 앞면도
   띠 길이로 접어 센다. 같은 식으로 앞면을 셈해, 돌린 뒤 그 슬롯이 앞면인지와 띠 반 바퀴를 넘게 돌지 않는지 본다. */

afterEach(cleanup);

function stage(slotCount: number) {
  // CylinderLayout 과 같은 값 — 한 칸 각은 칸 수와 상관없이 고정이다
  const segAngle = SLOT_ANGLE;
  const { result } = renderHook(() =>
    useCylinderStage({ slotCount, segAngle, arc: segAngle * 0.9, indicatorDotActiveClassName: "on" }),
  );
  const angle = () => result.current.scrollRef.current * segAngle;
  const front = () => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < slotCount; i++) {
      const rel = wrapLoop(angle() - i * segAngle, segAngle * slotCount);
      if (Math.abs(rel) < bestDist) {
        bestDist = Math.abs(rel);
        best = i;
      }
    }
    return best;
  };
  return { result, angle, front, segAngle };
}

describe("useCylinderStage — rotateTo", () => {
  it.each([2, 3, 4, 6, 9])("슬롯 %i 개: 어느 슬롯이든 앞면으로 온다", (slotCount) => {
    const { result, front } = stage(slotCount);
    for (const start of [0, 0.4, -2.7, 7.3]) {
      for (let slot = 0; slot < slotCount; slot++) {
        result.current.scrollRef.current = start;
        result.current.rotateTo(slot);
        expect(front(), `처음 ${start} → 슬롯 ${slot}`).toBe(slot);
      }
    }
  });

  it("가까운 쪽으로 돈다 — 인트로에서 마지막 작업물은 한 칸 뒤로", () => {
    const { result, angle, segAngle } = stage(6);
    result.current.rotateTo(5);
    expect(angle()).toBeCloseTo(-segAngle);
  });

  it("칸이 적어도 가까운 쪽으로 돈다 — 두 칸이면 한 칸만 움직인다", () => {
    const { result, angle, segAngle } = stage(2);
    result.current.rotateTo(1);
    expect(Math.abs(angle())).toBeCloseTo(segAngle);
  });

  it("여러 바퀴 돈 뒤에도 반 바퀴를 넘게 돌지 않는다", () => {
    const { result, angle } = stage(6);
    for (const start of [7.3, -4.15, 12.9]) {
      for (let slot = 0; slot < 6; slot++) {
        result.current.scrollRef.current = start;
        const before = angle();
        result.current.rotateTo(slot);
        expect(Math.abs(angle() - before), `처음 ${start} → 슬롯 ${slot}`).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});
