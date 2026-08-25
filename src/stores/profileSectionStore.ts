import { create } from "zustand";

type BunnyExpression = "normal" | "surprised" | "happy" | null;

interface ProfileSectionStore {
  activeSection: number;
  setActiveSection: (s: number) => void;
  bunnyExpression: BunnyExpression;
  setBunnyExpression: (e: BunnyExpression) => void;
  /**
   * 떠다니는 몽이가 내려앉을 자리.
   *
   * MEET 패널에는 몽이를 세워 둘 자리가 있다. 예전에는 거기에 3D 몽이를 하나 더 그려서 화면에
   * 몽이가 둘이 됐다 — 떠다니는 쪽을 그 자리로 데려오고, 패널을 벗어나면 다시 놓아준다.
   *
   * 자리는 요소로 들고 있는다. 패널이 가로로 계속 움직이므로 좌표를 한 번 재서 저장하면
   * 곧바로 어긋난다. 매 프레임 getBoundingClientRect 로 지금 위치를 읽어야 한다.
   *
   * 무한 스크롤에서는 같은 패널이 여러 벌 그려지므로 Set 으로 받는다. 그중 어느 것에
   * 앉을지는 화면 가운데에 가장 가까운 것으로 그때그때 고른다.
   */
  bunnyDockSlots: Set<HTMLElement>;
  /**
   * 끌어서 돌린 각도와 그 여세(rad).
   *
   * 매 프레임 바뀌는 값이라 상태로 두면 렌더가 계속 돈다 — 객체 하나를 만들어 두고
   * 자리 상자(입력)와 FloatingScene(그리기)이 같은 것을 제자리에서 고친다.
   */
  bunnyDrag: { x: number; y: number; vx: number; vy: number; dragging: boolean };
  addBunnyDockSlot: (el: HTMLElement) => void;
  removeBunnyDockSlot: (el: HTMLElement) => void;
}

export const useProfileSectionStore = create<ProfileSectionStore>((set) => ({
  activeSection: 0,
  setActiveSection: (s) => set({ activeSection: s }),
  bunnyExpression: null,
  setBunnyExpression: (e) => set({ bunnyExpression: e }),
  bunnyDrag: { x: 0, y: 0, vx: 0, vy: 0, dragging: false },
  bunnyDockSlots: new Set(),
  addBunnyDockSlot: (el) =>
    set((st) => {
      const next = new Set(st.bunnyDockSlots);
      next.add(el);
      return { bunnyDockSlots: next };
    }),
  removeBunnyDockSlot: (el) =>
    set((st) => {
      const next = new Set(st.bunnyDockSlots);
      next.delete(el);
      return { bunnyDockSlots: next };
    }),
}));
