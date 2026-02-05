import { Theme } from "@/types";
import { useEffect, useState } from "react";

export const setTheme = (theme: Theme) => {
  const html = document.documentElement;

  // Safari 최적화를 위해 transition 제거
  html.style.transition = "none";

  if (theme === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
  } else {
    html.classList.add("light");
    html.classList.remove("dark");
  }

  // localStorage 저장
  localStorage.setItem("portfolio-theme", theme);

  // 바로 다음 frame에서 transition 복원
  requestAnimationFrame(() => {
    html.style.transition = "";
  });
};

export const toggleTheme = () => {
  const current = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  setTheme(current === "dark" ? "light" : "dark");
};

export const initTheme = () => {
  const saved = localStorage.getItem("portfolio-theme") as Theme | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (saved) setTheme(saved);
  else setTheme(prefersDark ? "dark" : "light");

  // 시스템 테마 변경 감지
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      const newTheme: Theme = e.matches ? "dark" : "light";
      // 사용자가 지정한 테마가 있으면 override
      if (!localStorage.getItem("portfolio-theme")) setTheme(newTheme);
    });
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // 초기화: document.documentElement.class 기반
    const html = document.documentElement;
    setThemeState(html.classList.contains("dark") ? "dark" : "light");

    const handleChange = () => {
      setThemeState(html.classList.contains("dark") ? "dark" : "light");
    };

    // Optional: 시스템 테마 변경 시도 감지
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme); // HTML class 변경
    setThemeState(newTheme); // React 상태 동기화
  };

  return { theme, toggleTheme };
}
