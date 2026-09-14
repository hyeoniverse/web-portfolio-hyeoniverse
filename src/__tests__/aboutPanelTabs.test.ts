import { describe, it, expect } from "vitest";
import { desktopPanels, mobileTabPanels } from "@/app/about/_config/panelConfig";

/* /about 첫 배치(#942). 서버와 하이드레이션은 모바일인지 몰라 데스크톱 순서의 한 세트를 그리고, 모바일이면 CSS 가
   첫 탭 패널만 보인다. 붙은 뒤에는 모바일 탭 목록으로 다시 그리는데, 같은 key 의 패널을 그대로 이어 쓰려면
   데스크톱 순서를 탭으로 거른 것이 모바일 탭 순서와 같아야 한다. 패널 설정을 고칠 때 이 전제를 지킨다. */

const desktopKeys = desktopPanels.map((p) => p.key);

describe("about 패널 — 데스크톱 순서와 모바일 탭", () => {
  it("모바일 탭의 패널은 모두 데스크톱 세트에 있고, 한 탭에만 속한다", () => {
    const seen = new Set<string>();
    for (const [tab, panels] of Object.entries(mobileTabPanels)) {
      for (const { key } of panels) {
        expect(desktopKeys, `${tab}.${key}`).toContain(key);
        expect(seen.has(key), `${key} 가 두 탭에 있다`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("탭마다 데스크톱 순서를 거르면 모바일 탭 순서와 같다", () => {
    for (const [tab, panels] of Object.entries(mobileTabPanels)) {
      const keys = panels.map((p) => p.key);
      expect(desktopKeys.filter((k) => keys.includes(k)), tab).toEqual(keys);
    }
  });

  it("첫 탭은 overview 다 — 서버 HTML 에서 첫 탭이 아닌 패널을 감추는 CSS 가 이 이름을 쓴다", () => {
    expect(Object.keys(mobileTabPanels)[0]).toBe("overview");
  });
});
