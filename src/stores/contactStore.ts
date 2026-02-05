import { create } from "zustand";
import { ContactForm } from "@/types";

interface ContactStore {
  isFormVisible: boolean;
  isSubmitSuccess: boolean;
  formKey: number;
  formData: ContactForm;
  openForm: () => void;
  closeForm: () => void;
  toggleForm: () => void;
  resetForm: () => void;
  setFormData: (data: ContactForm) => void;
  setSubmitSuccess: (value: boolean) => void;
}

export const useContactStore = create<ContactStore>((set) => ({
  isFormVisible: false,
  isSubmitSuccess: false,
  formKey: 0,
  formData: {
    name: "",
    email: "",
    message: "",
  },

  openForm: () => set({ isFormVisible: true }),
  closeForm: () =>
    set((state) => ({
      isFormVisible: false,
      isSubmitSuccess: false,
      formKey: state.formKey + 1,
      formData: { name: "", email: "", message: "" },
    })),
  toggleForm: () =>
    set((state) => {
      const willOpen = !state.isFormVisible;
      return {
        isFormVisible: willOpen,
        isSubmitSuccess: willOpen ? state.isSubmitSuccess : false,
        formKey: willOpen ? state.formKey : state.formKey + 1,
        formData: willOpen
          ? state.formData
          : { name: "", email: "", message: "" },
      };
    }),
  resetForm: () =>
    set((state) => ({
      formKey: state.formKey + 1,
      isSubmitSuccess: false,
      formData: { name: "", email: "", message: "" },
    })),
  setFormData: (data) => set({ formData: data }),
  setSubmitSuccess: (value) => set({ isSubmitSuccess: value }),
}));
