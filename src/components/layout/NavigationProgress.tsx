'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // 监听全站 link 点击，立即显示进度条
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || target.target === '_blank') return
      // 同站内部跳转
      if (href !== pathname) {
        setLoading(true)
        setProgress(20)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [pathname])

  // 路由变化即结束
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // 缓慢推进 (模拟加载)
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress((p) => (p < 80 ? p + (80 - p) * 0.1 : p))
    }, 200)
    return () => clearInterval(interval)
  }, [loading])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 h-[2px] bg-[#C09060] z-[9999] transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: loading ? 1 : 0,
      }}
    />
  )
}
