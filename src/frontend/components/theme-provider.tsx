"use client"

import * as React from "react"

export type Theme = "light" | "dark" | "system"

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  forcedTheme?: string
}

export interface UseThemeProps {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
  systemTheme?: "light" | "dark"
  themes: string[]
  forcedTheme?: string
}

const ThemeContext = React.createContext<UseThemeProps>({
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
  systemTheme: "light",
  themes: ["light", "dark", "system"],
})

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
  forcedTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey) as Theme | null
        if (stored) return stored
      } catch (e) {}
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  const applyTheme = React.useCallback(
    (targetTheme: Theme) => {
      if (typeof window === "undefined") return

      const root = document.documentElement
      let effectiveTheme: "light" | "dark" = "light"

      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const sysTheme = isSystemDark ? "dark" : "light"
      setSystemTheme(sysTheme)

      if (targetTheme === "system" && enableSystem) {
        effectiveTheme = sysTheme
      } else if (targetTheme === "dark") {
        effectiveTheme = "dark"
      } else {
        effectiveTheme = "light"
      }

      setResolvedTheme(effectiveTheme)

      if (disableTransitionOnChange) {
        const css = document.createElement("style")
        css.appendChild(
          document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
          )
        )
        document.head.appendChild(css)
        setTimeout(() => {
          try {
            document.head.removeChild(css)
          } catch (_) {}
        }, 1)
      }

      if (attribute === "class") {
        root.classList.remove("light", "dark")
        root.classList.add(effectiveTheme)
      } else {
        root.setAttribute(attribute, effectiveTheme)
      }
    },
    [attribute, disableTransitionOnChange, enableSystem]
  )

  React.useEffect(() => {
    const active = forcedTheme || theme
    applyTheme(active as Theme)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if ((forcedTheme || theme) === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, forcedTheme, applyTheme])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch (e) {}
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: ["light", "dark", "system"],
      forcedTheme,
    }),
    [theme, setTheme, resolvedTheme, systemTheme, forcedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => React.useContext(ThemeContext)
