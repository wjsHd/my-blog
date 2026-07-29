'use client'

import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

const THEME_KEY = 'blog-theme'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121210' : '#FAFAF9')
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncWithSystem = () => {
      try {
        if (!window.localStorage.getItem(THEME_KEY)) {
          applyTheme(media.matches ? 'dark' : 'light')
        }
      } catch {
        applyTheme(media.matches ? 'dark' : 'light')
      }
    }

    media.addEventListener('change', syncWithSystem)
    return () => media.removeEventListener('change', syncWithSystem)
  }, [])

  function toggleTheme() {
    const nextTheme: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme)
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle pressable inline-flex items-center rounded-md text-muted hover:bg-surface-hover hover:text-primary ${
        compact ? 'h-9 w-9 justify-center' : 'h-10 w-full justify-start gap-3 px-3'
      }`}
      aria-label="切换日间或夜间模式"
      title="切换日间或夜间模式"
    >
      <Sun className="theme-icon theme-icon-light" size={17} aria-hidden="true" />
      <Moon className="theme-icon theme-icon-dark" size={17} aria-hidden="true" />
      {!compact && <span className="text-sm font-semibold">外观</span>}
    </button>
  )
}
