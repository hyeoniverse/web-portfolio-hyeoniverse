// 모달 스토어
import { create } from "zustand";
import { ModalItem, ModalOptions } from "@/types";
import { ReactNode } from "react";

interface ModalState {
  modals: ModalItem[];
  isModalOpen: boolean;
  currentModalId: string | null;
  openModal: (content: ReactNode, options?: ModalOptions) => void;
  closeModal: (id?: string) => void;
  closeAll: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  modals: [],
  isModalOpen: false,
  currentModalId: null,

  openModal: (content, options) =>
    set((state) => {
      const id = options?.id ?? crypto.randomUUID();

      const item: ModalItem = {
        id,
        header: options?.header,
        content,
        style: {
          ...options?.style,
          width: options?.width,
          height: options?.height,
          background: options?.background,
        },
        closeButton: options?.closeButton ?? true,
        subButtons: options?.subButtons,
      };

      // 같은 id 모달이 이미 열려 있으면 중복 추가 대신 내용을 갱신한다.
      // 재오픈으로 상태를 바꾸는 패턴(예: 비밀번호 오답 후 error 표시)을 지원하기 위함 —
      // 같은 컴포넌트 타입이면 React 가 reconcile 하므로 입력 state 는 유지되고 바뀐 prop 만 반영된다.
      const idx = state.modals.findIndex((modal) => modal.id === id);
      if (idx !== -1) {
        const modals = state.modals.slice();
        modals[idx] = item;
        return { modals, isModalOpen: true, currentModalId: id };
      }

      return {
        modals: [...state.modals, item],
        isModalOpen: true,
        currentModalId: id,
      };
    }),

  closeModal: (id?: string) =>
    set((state) => {
      const newModals = id
        ? state.modals.filter((modal) => modal.id !== id)
        : state.modals.slice(0, -1);

      return {
        modals: newModals,
        isModalOpen: newModals.length > 0,
        currentModalId:
          newModals.length > 0 ? newModals[newModals.length - 1].id : null,
      };
    }),

  closeAll: () =>
    set({
      modals: [],
      isModalOpen: false,
      currentModalId: null,
    }),
}));
