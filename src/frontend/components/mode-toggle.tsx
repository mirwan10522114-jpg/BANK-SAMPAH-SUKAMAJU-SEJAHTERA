"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const current = resolvedTheme || theme
    setTheme(current === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-zinc-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400"
        title="Ubah Tema Gelap/Terang"
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="text-zinc-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 cursor-pointer"
      title={resolvedTheme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-emerald-400 transition-transform" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500 transition-transform" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
