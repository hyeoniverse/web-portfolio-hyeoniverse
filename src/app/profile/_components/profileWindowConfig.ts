import type { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { ProfileInfoBlock } from "@/types/profile";

export interface WindowDef {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  aspect: string;
}

export const WINS: WindowDef[] = [
  { id: "a", title: "kim_jeonghyeon.webp", x: 4, y: 6, w: 28, aspect: "4/3" },
  { id: "b", title: "kim_jeonghyeon.webp", x: 34, y: 4, w: 18, aspect: "3/4" },
  { id: "c", title: "kim_jeonghyeon.webp", x: 12, y: 52, w: 20, aspect: "1/1" },
];

export interface TextBlock {
  key: string;
  x: number;
  y: number;
  w: number;
  aspect?: string;
  lines: { label: string; value: string }[];
}

/**
 * 창의 자리(x·y·너비)와 그 안에 들어갈 내용을 짝지어 준다.
 *
 * 자리는 레이아웃이라 여기 남기고 내용은 설정(profileData.infoBlocks)에서 받는다 —
 * 예전에는 학교·MBTI·취향 같은 값까지 코드에 박혀 있어 고치려면 배포를 해야 했다.
 * "a" 블록만은 계정 정보(이름·역할·연락처)라 사이트 설정에서 그대로 읽는다.
 */
const SLOTS: { key: string; x: number; y: number; w: number; aspect?: string }[] = [
  { key: "a", x: 4, y: 6, w: 28, aspect: "4/3" },
  { key: "c", x: 12, y: 52, w: 20, aspect: "1/1" },
  { key: "e1", x: 62, y: 6, w: 24 },
  { key: "e2", x: 56, y: 50, w: 26 },
  { key: "e3", x: 36, y: 72, w: 22 },
  { key: "e4", x: 70, y: 78, w: 22 },
];

export const getTextPositions = (
  siteConfig: ReturnType<typeof useSiteConfig>,
  infoBlocks: ProfileInfoBlock[] = [],
): TextBlock[] => {
  const byKey = new Map(infoBlocks.map((b) => [b.key, b]));
  const ownerLines = [
    { label: "Name", value: siteConfig.personal.name },
    { label: "Role", value: siteConfig.personal.role },
    { label: "Location", value: siteConfig.personal.location },
    { label: "Email", value: siteConfig.contact.email },
    { label: "Status", value: siteConfig.personal.status },
  ];

  return SLOTS.map((slot) => ({
    ...slot,
    lines: slot.key === "a" ? ownerLines : (byKey.get(slot.key)?.lines ?? []),
  })).filter((b) => b.lines.length > 0);
};
