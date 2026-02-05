import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  Skill,
  Experience,
  BlogPost,
  ContactForm,
  Theme,
  TransitionDirection,
} from "@/types";
import { portfolioData } from "@/data";

interface AppState {
  currentSection: string;
  isLoading: boolean;
  theme: Theme;
  isTransitioning: boolean;
  transitionDirection: TransitionDirection;
  isSidebarVisible: boolean;

  skills: Skill[];
  experiences: Experience[];
  blogPosts: BlogPost[];
  contactForm: ContactForm;

  setCurrentSection: (section: string) => void;
  setLoading: (loading: boolean) => void;
  toggleTheme: () => void;
  startTransition: (direction: TransitionDirection) => void;
  endTransition: () => void;
  matchThemeWithSystem: () => void;
  updateContactForm: (form: Partial<ContactForm>) => void;
  submitContactForm: () => Promise<void>;
  setSidebarVisible: (visible: boolean) => void;
  updateMainLayout: () => void;
}

const isSafari = () => {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      currentSection: "hero",
      isLoading: false,
      theme: null,
      isTransitioning: false,
      transitionDirection: "down",
      isSidebarVisible: false,

      skills: portfolioData.skills,
      experiences: portfolioData.experiences,
      blogPosts: portfolioData.blogPosts,
      contactForm: { name: "", email: "", message: "" },

      setCurrentSection: (section) => set({ currentSection: section }),
      setLoading: (loading) => set({ isLoading: loading }),

      startTransition: (direction) =>
        set({ isTransitioning: true, transitionDirection: direction }),
      endTransition: () => set({ isTransitioning: false }),

      updateContactForm: (form) =>
        set((state) => ({ contactForm: { ...state.contactForm, ...form } })),

      submitContactForm: async () => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set({
          isLoading: false,
          contactForm: { name: "", email: "", message: "" },
        });
      },

      setSidebarVisible: (visible) => {
        set({ isSidebarVisible: visible });
        get().updateMainLayout();
      },

      updateMainLayout: () => {
        if (typeof window === "undefined") return;

        const mainElement = document.querySelector("main");
        if (!mainElement) return;

        const { isSidebarVisible } = get();

        if (isSidebarVisible) {
          mainElement.classList.add("has-sidebar");
        } else {
          mainElement.classList.remove("has-sidebar");
        }
      },

      toggleTheme: () => {
        const current = get().theme;
        const newTheme: Theme = current === "dark" ? "light" : "dark";
        set({ theme: newTheme });

        if (typeof window !== "undefined") {
          localStorage.setItem("theme", newTheme);

          const html = document.documentElement;
          html.setAttribute("data-theme", newTheme);

          if (isSafari()) {
            html.style.display = "none";
            void html.offsetHeight;
            html.style.display = "";
          }
        }
      },

      matchThemeWithSystem: () => {
        if (typeof window !== "undefined") {
          const savedTheme = localStorage.getItem("theme") as Theme | null;
          const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          const initialTheme: Theme =
            savedTheme || (systemPrefersDark ? "dark" : "light");

          const html = document.documentElement;
          html.setAttribute("data-theme", initialTheme);
          set({ theme: initialTheme });

          html.style.display = "none";
          void html.offsetHeight;
          html.style.display = "";

          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          const listener = (e: MediaQueryListEvent | MediaQueryList) => {
            const newTheme: Theme = e.matches ? "dark" : "light";
            set({ theme: newTheme });
            localStorage.setItem("theme", newTheme);
            html.setAttribute("data-theme", newTheme);

            if (isSafari()) {
              html.style.display = "none";
              void html.offsetHeight;
              html.style.display = "";
            }
          };

          if (mediaQuery.addEventListener)
            mediaQuery.addEventListener("change", listener);
          else if (mediaQuery.addListener) mediaQuery.addListener(listener);
        }
      },
    }),
    { name: "app-store" }
  )
);
