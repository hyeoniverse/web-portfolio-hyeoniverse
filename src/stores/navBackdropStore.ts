import { create } from "zustand";

/**
 * nav 로고 뒤 배경 — 상세 페이지의 커버가 로고 밑에 깔려 있는 동안의 커버 밝기.
 *
 * nav 의 글자 로고·링크는 mix-blend-mode: difference 로 어떤 배경에서도 보이지만, 업로드 이미지 로고는
 * 색이 뒤집히지 않게 blend 를 끈다. 그래서 라이트 테마에서 어두운 커버(작업물 상세 등) 위에 어두운 잉크
 * 로고가 그대로 올라가 묻혔다. 커버(DetailHero)가 제 윗부분 밝기와 로고 밑에 있는지를 여기 알리고,
 * nav 는 그동안 테마 대신 이 밝기로 로고 변형을 고른다(lib/brandLogos 의 logoOnBg).
 */
interface NavBackdropStore {
  /** 커버 윗부분 밝기 — 재기 전이거나 잴 수 없으면 null */
  heroTone: "dark" | "light" | null;
  /** 커버가 지금 nav 로고 밑에 있는가 */
  overHero: boolean;
  setHeroTone: (tone: "dark" | "light" | null) => void;
  setOverHero: (over: boolean) => void;
}

export const useNavBackdropStore = create<NavBackdropStore>((set) => ({
  heroTone: null,
  overHero: false,
  setHeroTone: (heroTone) => set({ heroTone }),
  setOverHero: (overHero) => set({ overHero }),
}));

/** 커버 위 로고 자리의 배경 — 커버가 로고 밑에 있고 밝기를 쟀으면 그 밝기, 아니면 null(테마를 따른다) */
export function heroBackdrop(state: Pick<NavBackdropStore, "heroTone" | "overHero">): "dark" | "light" | null {
  return state.overHero ? state.heroTone : null;
}
