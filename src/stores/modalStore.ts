// modalStore.ts
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

      // 같은 id 모달이 이미 있으면 추가하지 않음
      if (state.modals.some((modal) => modal.id === id)) return state;

      return {
        modals: [
          ...state.modals,
          {
            id,
            header: options?.header,
            content,
            style: {
              ...options?.style,
              width: options?.width,
              height: options?.height,
              background: options?.background,
              overflowY: options?.scrollable ? "auto" : "hidden",
            },
            closeButton: options?.closeButton ?? true,
          },
        ],
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
