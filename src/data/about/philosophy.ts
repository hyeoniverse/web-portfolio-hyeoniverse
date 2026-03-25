import type { DesignConceptItem } from "./types";

export const designPhilosophy: DesignConceptItem[] = [
  {
    id: "oval",
    title: "THE OVAL",
    subtitle: {
      ko: "사이트 전체를 관통하는 형태",
      en: "The Shape That Runs Through the Entire Site",
    },
    description: {
      ko: "포트폴리오의 정체성을 하나의 형태로 만들고 싶었습니다. 타원은 납작하게도, 길게도 변형할 수 있었습니다. 커서를 따라다니는 궤적, 버튼의 모서리, 배경에 떠다니는 오브젝트까지 — 같은 형태가 크기와 맥락만 바꿔가며 반복됩니다. 하나의 형태를 일관되게 사용하면, 설명 없이도 이 사이트만의 인상이 생긴다고 생각했습니다.",
      en: "I wanted to build the portfolio's identity around a single shape. Ovals could be squished or stretched. The trail following your cursor, button edges, floating background objects — the same shape repeats, only changing in size and context. I believed that using one shape consistently would create a distinct impression without needing explanation.",
    },
    examples: ["Cursor Trail", "Buttons", "Cards", "Floating Object"],
  },
  {
    id: "line-curve",
    title: "LINE & CURVE",
    subtitle: {
      ko: "직선 위에 곡선을 얹었습니다",
      en: "Curves Layered on Straight Lines",
    },
    description: {
      ko: "레이아웃은 직선으로 정리했습니다. 정보가 흐트러지지 않도록 구조를 고정했습니다.\n\n그 위에 움직임만 곡선을 사용했습니다. 스크롤과 호버처럼, 인터랙션이 발생하는 순간에만 부드러운 흐름이 드러납니다.\n\n정적인 구조와 유연한 움직임이 겹치면서, 질서를 유지한 채 변화를 느낄 수 있도록 구성했습니다.",
      en: "The layout is organized in straight lines. The structure is fixed so information doesn't scatter.\n\nOnly the motion uses curves. Smooth flow reveals itself only at moments of interaction — like scrolling and hovering.\n\nStatic structure and flexible motion overlap, allowing you to feel change while order is maintained.",
    },
    examples: ["Grid Layout", "Scroll Easing", "Hover Transition"],
  },
  {
    id: "depth",
    title: "DEPTH & LAYER",
    subtitle: {
      ko: "깊이는 사용자가 선택합니다",
      en: "The Viewer Chooses the Depth",
    },
    description: {
      ko: "앞에서부터 뒤로 갈수록, 정보의 깊이가 자연스럽게 이어집니다.\n\n처음에는 인상과 흐름을 중심으로, 뒤로 갈수록 설명과 코드로 넘어갑니다.\n\n어디에서 멈추든 그 지점까지가 하나의 완성으로 느껴지도록, 각 구간을 독립적으로 구성했습니다.\n\n필요한 만큼만 보고 나갈 수도 있고, 끝까지 들어가며 확인할 수도 있는 구조입니다.",
      en: "Information depth flows naturally from front to back.\n\nIt starts with impression and flow, then transitions to explanation and code as you go deeper.\n\nEach section is structured independently so that wherever you stop, it feels like a complete piece.\n\nYou can leave after seeing just what you need, or go all the way to the end.",
    },
    examples: ["Panel Order", "Card Stacking", "Progressive Depth"],
  },
  {
    id: "space",
    title: "NEGATIVE SPACE",
    subtitle: {
      ko: "비워두어 흐름을 만듭니다",
      en: "Emptiness Creates Flow",
    },
    description: {
      ko: "모든 정보를 채우기보다, 일부를 의도적으로 비워두었습니다.\n\n패널 사이의 간격, 텍스트 주변의 여백, 섹션 전환 전의 짧은 공백까지 흐름의 일부로 사용했습니다.\n\n정보가 이어지다가 잠시 멈추고, 다음 내용을 더 또렷하게 받아들이도록 만드는 장치입니다.\n\n여백은 장식이 아니라, 읽는 속도를 조절하는 요소로 설계했습니다.",
      en: "Rather than filling everything, I intentionally left parts empty.\n\nPanel gaps, margins around text, and brief pauses before section transitions are all used as part of the flow.\n\nInformation continues, then briefly pauses — a device to help you receive the next content more clearly.\n\nWhitespace is not decoration. It's designed as an element that controls reading pace.",
    },
    examples: ["Panel Gaps", "Visual Break", "Section Rhythm"],
  },
];
