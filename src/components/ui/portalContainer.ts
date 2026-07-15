"use client";

import { createContext, useContext } from "react";

/** 오버레이(모달/드로어)가 자신의 stacking context 안에 있는 portal 대상 DOM 을 하위 트리에 내려준다.
 *  Popover/Select/Tooltip 이 이 값을 읽어 document.body 대신 여기로 createPortal → 자연스럽게 부모 오버레이 위에
 *  (그리고 나중에 열린 오버레이 아래에) 쌓인다. 전역 z-index 를 키우지 않아도 되는 top-layer 방식. */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

/** 현재 트리가 오버레이 안이면 그 portal 컨테이너, 아니면 null(=document.body 사용). */
export const usePortalContainer = () => useContext(PortalContainerContext);
