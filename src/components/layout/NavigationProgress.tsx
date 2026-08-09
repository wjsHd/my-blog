'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // 监听全站 link 点击，立即显示进度条
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#') || target.target === '_blank' || target.hasAttribute('download')) return

      const destination = new URL(href, window.location.href)
      if (destination.origin !== window.location.origin) return
      const currentRoute = `${window.location.pathname}${window.location.search}`
      const nextRoute = `${destination.pathname}${destination.search}`
      if (nextRoute !== currentRoute) {
        setLoading(true)
        setProgress(20)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // 路由变化即结束
  useEffect(() => {
    if (loading) {
      const completionFrame = window.requestAnimationFrame(() => {
        setProgress(100)
      })
      const timer = window.setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
      return () => {
        window.cancelAnimationFrame(completionFrame)
        window.clearTimeout(timer)
      }
    }
  }, [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 缓慢推进 (模拟加载)
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress((p) => (p < 80 ? p + (80 - p) * 0.1 : p))
    }, 200)
    const safetyTimer = window.setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 8000)
    return () => {
      clearInterval(interval)
      window.clearTimeout(safetyTimer)
    }
  }, [loading])

  if (!loading && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 h-[2px] bg-[#C09060] z-[9999] transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: loading ? 1 : 0,
      }}
    />
  )
}
