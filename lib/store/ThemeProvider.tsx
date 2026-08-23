"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDarkMode: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("fortia_theme_dark");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem("fortia_theme_dark", String(isDarkMode));
    } catch (e) {}
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [isDarkMode]);

  const value = useMemo(() => ({ isDarkMode, toggleTheme: () => setIsDarkMode((prev) => !prev) }), [isDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}