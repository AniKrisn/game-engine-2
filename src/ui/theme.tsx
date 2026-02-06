import { createContext, useContext, useEffect, useState } from "react";
import type { Editor } from "tldraw";

// Theme colors matching tldraw's CSS variables
export const lightTheme = {
  // Backgrounds
  background: "hsl(210, 20%, 98%)",
  panel: "hsl(0, 0%, 99%)",
  panelContrast: "hsl(0, 0%, 100%)",
  low: "hsl(204, 16%, 94%)",
  lowBorder: "hsl(204, 16%, 92%)",
  divider: "hsl(0, 0%, 91%)",
  hint: "hsl(0, 0%, 0%, 5.5%)",
  muted: "hsl(0, 0%, 0%, 10%)",

  // Text
  text: "hsl(0, 0%, 0%)",
  text0: "hsl(0, 0%, 11%)",
  text1: "hsl(0, 0%, 18%)",
  text3: "hsl(204, 4%, 45%)",

  // Accents
  selected: "hsl(214, 84%, 56%)",
  selectedContrast: "hsl(0, 0%, 100%)",
  primary: "hsl(214, 84%, 56%)",
  success: "hsl(123, 46%, 34%)",
  danger: "hsl(0, 90%, 43%)",

  // Interactive states
  hoverBg: "hsl(0, 0%, 0%, 4.3%)",
  activeBg: "hsl(0, 0%, 0%, 10%)",
};

export const darkTheme = {
  // Backgrounds
  background: "hsl(240, 5%, 6.5%)",
  panel: "hsl(240, 5%, 10%)",
  panelContrast: "hsl(240, 5%, 15%)",
  low: "hsl(260, 4.5%, 10.5%)",
  lowBorder: "hsl(207, 10%, 10%)",
  divider: "hsl(0, 0%, 20%)",
  hint: "hsl(0, 0%, 100%, 5.5%)",
  muted: "hsl(0, 0%, 100%, 10%)",

  // Text
  text: "hsl(0, 0%, 98%)",
  text0: "hsl(0, 0%, 89%)",
  text1: "hsl(0, 0%, 82%)",
  text3: "hsl(210, 7%, 56%)",

  // Accents
  selected: "hsl(214, 84%, 56%)",
  selectedContrast: "hsl(0, 0%, 100%)",
  primary: "hsl(214, 84%, 56%)",
  success: "hsl(123, 46%, 45%)",
  danger: "hsl(0, 70%, 55%)",

  // Interactive states
  hoverBg: "hsl(0, 0%, 100%, 4.3%)",
  activeBg: "hsl(0, 0%, 100%, 10%)",
};

export type Theme = typeof lightTheme;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  editor: Editor | null;
  children: React.ReactNode;
}

export function ThemeProvider({ editor, children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!editor) return;

    // Get initial dark mode state
    setIsDark(editor.user.getIsDarkMode());

    // Subscribe to store changes to detect theme changes
    const unsubscribe = editor.store.listen(
      () => {
        setIsDark(editor.user.getIsDarkMode());
      },
      { scope: "all", source: "all" }
    );

    return unsubscribe;
  }, [editor]);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
