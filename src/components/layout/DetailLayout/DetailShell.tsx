"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ImageIcon } from "@/components/icons";
import DetailHero, { type DetailHeroProps } from "./DetailHero";
import styles from "./DetailLayout.module.css";

/* 상세 경로의 레이아웃이 커버와 페이지를 함께 그린다(#946).
   페이지는 loading.tsx 의 Suspense 경계 안이라, 미리 그린 HTML 에서 셸(레이아웃 + 로딩 뼈대) 뒤에 따로 실려 React 가
   나중에 제자리로 옮긴다. React 19.2 는 셸이 먼저 칠해진 뒤 도착한 경계를 첫 칠부터 300ms 가 지나서 공개해, LCP 인 커버가
   FCP 보다 0.35초쯤 늦게 나왔다. 레이아웃은 경계 바깥이라 여기서 그리면 커버가 셸과 함께 첫 칠에 나오고, 하이드레이션도
   셸과 함께 한다. 페이지의 DetailLayout 은 heroInShell 로 커버를 건너뛴다.

   alt 는 서버가 정한 값으로 시작하고, 페이지의 DetailLayout 이 heroAlt 를 넘기면 그 값을 따른다. 글 보기 언어(KO/EN)나
   화면 언어처럼 페이지만 아는 값으로 바뀌기 때문이다. 페이지가 하이드레이션하기 전에 바뀌어도 늦은 경계를 다시 그리지
   않도록, context 에는 바뀌지 않는 저장소를 두고 커버만 구독한다(#929). */

interface AltStore {
  get: () => string;
  set: (alt: string) => void;
  subscribe: (onChange: () => void) => () => void;
}

function createAltStore(initial: string): AltStore {
  let alt = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => alt,
    set: (next) => {
      if (next === alt) return;
      alt = next;
      listeners.forEach((onChange) => onChange());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

const AltStoreContext = createContext<AltStore | null>(null);

/** 페이지의 커버 alt 를 셸의 커버에 전한다. 셸 밖(관리자 미리보기 등)에서는 아무것도 하지 않는다 */
export function useShellHeroAlt(alt: string | undefined) {
  const store = useContext(AltStoreContext);
  useEffect(() => {
    if (store && alt !== undefined) store.set(alt);
  }, [store, alt]);
}

type ShellCover = Omit<DetailHeroProps, "onError"> & { alt: string };

export default function DetailShell({
  cover,
  placeholderOnError = false,
  children,
}: {
  /** 없으면 커버 없이 페이지만 그린다 */
  cover: ShellCover | null;
  /** 커버를 받지 못하면 빈 커버로 바꾼다(글 상세). 없으면 ProgressiveImage 의 대체 화면이 커버 자리에 남는다(작업물 상세) */
  placeholderOnError?: boolean;
  children: ReactNode;
}) {
  const [store] = useState(() => createAltStore(cover?.alt ?? ""));
  return (
    <AltStoreContext.Provider value={store}>
      {cover && <ShellHero {...cover} store={store} placeholderOnError={placeholderOnError} />}
      {children}
    </AltStoreContext.Provider>
  );
}

function ShellHero({ store, placeholderOnError, ...hero }: ShellCover & { store: AltStore; placeholderOnError: boolean }) {
  const alt = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={styles.heroPlaceholder}>
        <ImageIcon size={48} strokeWidth={1} />
      </div>
    );
  }
  return <DetailHero {...hero} alt={alt} onError={placeholderOnError ? () => setFailed(true) : undefined} />;
}
