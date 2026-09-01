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
  /**
   * 만졌을 때의 반응. `bunnyDrag` 와 같은 이유로 상태가 아니라 제자리에서 고치는 객체다.
   *
   * 자리는 **화면 좌표(NDC)** 로만 넘긴다. 몽이가 지금 어떤 자세로 어디에 있는지는
   * FloatingScene 만 알기 때문이다 — 입력 쪽이 정면을 가정하고 로컬 좌표를 만들면
   * 몽이를 돌렸을 때 만지는 자리가 어긋난다.
   *
   * `spot` 은 그 반대 방향으로 흐르는 값이다. FloatingScene 이 광선을 쏴서 몽이의 어디를
   * 가리키는지 풀어 적어 두면, 입력 쪽이 그걸 읽어 커서와 동작을 정한다.
   */
  bunnyTouch: {
    /** 커서(-1~1). 화면 왼쪽·아래가 -1. */
    ndcX: number;
    ndcY: number;
    /** 커서가 자리 상자 안에 있는지. 밖이면 몽이를 가리키는 게 아니다. */
    over: boolean;
    /** 누른 순간의 NDC 와 그 뒤로 끌린 양. */
    grabX: number;
    grabY: number;
    pullX: number;
    pullY: number;
    /** 잡고 있는 볼(-1 왼쪽 / 0 안 잡음 / 1 오른쪽) · 쓰다듬는 중인지. */
    cheek: number;
    petting: boolean;
    /** 한 번 찌른 세기. FloatingScene 이 읽고 0 으로 되돌린다. */
    poke: number;
    /** FloatingScene 이 풀어 적는 값 — 지금 커서가 몽이의 어디에 있는가. */
    spot: "" | "pinch" | "pet" | "poke" | "grab";
    /** 커서 자리에 세울 손 모양. 빈 문자열이면 손을 안 그린다. */
    hand: "" | "pet" | "pinch" | "pinching" | "poke" | "grab";
  };
  addBunnyDockSlot: (el: HTMLElement) => void;
  removeBunnyDockSlot: (el: HTMLElement) => void;
}

export const useProfileSectionStore = create<ProfileSectionStore>((set) => ({
  activeSection: 0,
  setActiveSection: (s) => set({ activeSection: s }),
  bunnyExpression: null,
  setBunnyExpression: (e) => set({ bunnyExpression: e }),
  bunnyDrag: { x: 0, y: 0, vx: 0, vy: 0, dragging: false },
  bunnyTouch: {
    ndcX: 0, ndcY: 0, over: false,
    grabX: 0, grabY: 0, pullX: 0, pullY: 0,
    cheek: 0, petting: false, poke: 0, spot: "", hand: "",
  },
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
