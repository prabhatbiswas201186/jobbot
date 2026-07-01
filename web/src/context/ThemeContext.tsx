import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('jobbot-theme');
    return stored ? stored === 'dark' : true;
  });

  useEffect(() => {
    document.body.classList.toggle('light', !dark);
    localStorage.setItem('jobbot-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
