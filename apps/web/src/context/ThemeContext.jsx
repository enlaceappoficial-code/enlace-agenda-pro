import { createContext, useContext, useEffect, useState } from 'react'
import { THEMES, STORAGE_KEY, DEFAULT_THEME } from './themes'

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  currentThemeMeta: THEMES[0],
  themes: THEMES,
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && THEMES.some(t => t.id === saved)) {
        return saved
      }
    } catch {}
    return DEFAULT_THEME
  })

  const applyTheme = (themeId) => {
    const valid = THEMES.some(t => t.id === themeId) ? themeId : DEFAULT_THEME
    setThemeState(valid)
    try {
      localStorage.setItem(STORAGE_KEY, valid)
    } catch {}
    document.documentElement.setAttribute('data-theme', valid)
    if (document.body) {
      document.body.setAttribute('data-theme', valid)
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (document.body) {
      document.body.setAttribute('data-theme', theme)
    }
  }, [theme])

  const currentThemeMeta = THEMES.find(t => t.id === theme) || THEMES[0]

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme, currentThemeMeta, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
