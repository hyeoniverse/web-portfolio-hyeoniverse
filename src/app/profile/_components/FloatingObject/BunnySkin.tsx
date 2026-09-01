"use client";

import { BODY_COLOR, BODY_EMISSIVE } from "./bunnyGeometry";

/** 가장자리 보풀의 색. 살빛보다 밝아야 빛을 스치는 잔털로 보인다. */
const SHEEN_COLOR = "#fff6ec";

/**
 * 몽이의 살 재질.
 *
 * `sheen` 은 원래 벨벳·천을 위한 값인데, 빛이 스치는 각도에서만 표면이 밝아지는 성질이라
 * 털뿌리가 은은하게 밝아 보인다. 올올이 삐져나온 실루엣은 BunnyFur 가 따로 만든다.
 *
 * 노멀맵으로 결을 흉내내 보기도 했는데, 그건 빛의 방향만 속이는 것이라 실루엣이 그대로다.
 * 그래서 털이 아니라 쭈글쭈글한 껍질로 보였다.
 *
 * 눈처럼 매끈해야 하는 부위는 이걸 쓰지 않는다.
 */
export default function BunnySkin() {
  return (
    <meshPhysicalMaterial
      color={BODY_COLOR}
      emissive={BODY_EMISSIVE}
      emissiveIntensity={0.05}
      metalness={0}
      roughness={0.95}
      sheen={0.85}
      sheenRoughness={0.8}
      sheenColor={SHEEN_COLOR}
    />
  );
}
