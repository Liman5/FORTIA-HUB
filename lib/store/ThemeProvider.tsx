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
  // Toujours démarrer sur le thème par défaut (sombre, comme le HTML serveur)
  // puis restaurer la préférence APRÈS le montage : évite une divergence
  // serveur/client (erreur d'hydratation) sur les icônes Soleil/Lune.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [themeRestored, setThemeRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fortia_theme_dark");
      if (saved !== null) setIsDarkMode(saved === "true");
    } catch (e) {
      // localStorage indisponible : on garde le thème par défaut
    }
    setThemeRestored(true);
  }, []);

  useEffect(() => {
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

    // Couleur de la barre d'état du téléphone (PWA / navigateur mobile).
    // Mode nuit : navy profond. Mode clair : gris-bleu doux (jamais blanc pur).
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", isDarkMode ? "#021231" : "#E8EDF3");

    // N'écrase la préférence stockée qu'une fois celle-ci restaurée
    if (!themeRestored) return;
    try {
      localStorage.setItem("fortia_theme_dark", String(isDarkMode));
    } catch (e) {}
  }, [isDarkMode, themeRestored]);

  const value = useMemo(() => ({ isDarkMode, toggleTheme: () => setIsDarkMode((prev) => !prev) }), [isDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}