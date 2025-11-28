import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = "default",
}: ThemeProviderProps) {
  // Support 2 themes: default (Shopee Orange) and dark (Blue)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("garagehub-theme") as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme attributes and classes first
    root.removeAttribute("data-theme");
    root.classList.remove("dark");
    
    // Apply theme
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark"); // Enable Tailwind dark: utilities
    }
    
    localStorage.setItem("garagehub-theme", theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
